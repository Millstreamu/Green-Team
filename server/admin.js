import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, lstatSync, openSync, fsyncSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { createCamp, syncStashSlots } from '../src/lair.js';
import { createProfile } from '../src/profile.js';
import { LOOT_TYPES } from '../src/loot.js';
import { validateSave } from './save-store.js';

export class AdminError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const backupId = /^\d{13}-[a-f0-9-]{36}\.json$/;
export function createBackupStore(directory) {
  function read(id) {
    if (typeof id !== 'string' || !backupId.test(id)) throw new AdminError('Choose a backup from the list.');
    const path = join(directory, id);
    if (!lstatSync(path).isFile()) throw new AdminError('That backup is not a regular file.');
    const value = JSON.parse(readFileSync(path, 'utf8'));
    if (value?.format !== 1 || typeof value.createdAt !== 'string' || typeof value.label !== 'string') throw new AdminError('This backup format is not supported.');
    validateSave(value.state);
    return value;
  }
  return {
    create(state, label) {
      validateSave(state);
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      const id = `${Date.now()}-${randomUUID()}.json`;
      const fd = openSync(join(directory, id), 'wx', 0o600);
      try { writeFileSync(fd, JSON.stringify({ format: 1, createdAt: new Date().toISOString(), label, state })); fsyncSync(fd); }
      finally { closeSync(fd); }
      const dir = openSync(directory, 'r');
      try { fsyncSync(dir); } finally { closeSync(dir); }
      return id;
    },
    read,
    list() {
      let names; try { names = readdirSync(directory); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
      return names.filter(id => backupId.test(id)).sort().reverse().map(id => {
        try { const b = read(id); return { id, createdAt: b.createdAt, label: b.label, valid: true }; }
        catch { return { id, label: 'Unreadable backup', valid: false }; }
      });
    }
  };
}

function amount(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new AdminError('Enter a whole number of zero or more, within the supported limit.');
  return value;
}
export function createAdminController(session, backups) {
  return {
    summary() { return { ...session.adminInfo(), backups: backups.list() }; },
    command(command) {
      if (session.adminInfo().saveFailed) throw new AdminError('Saving failed. Fix the disk error and restart the server before using admin tools.', 409);
      const state = session.adminState();
      if (!session.adminInfo().saved) throw new AdminError('Admin edits need a saved server home.', 409);
      if (!command || typeof command !== 'object') throw new AdminError('Choose an admin action.');
      const kind = command.type;
      if (!['backup', 'restore', 'reset-all', 'reset-lair', 'reset-goblin', 'set-stock', 'set-xp', 'end-run'].includes(kind)) throw new AdminError('Unknown admin action.');
      if (kind === 'backup') return { backupId: backups.create(state, 'Manual backup'), message: 'Backup saved on the server.' };
      if (kind !== 'end-run' && session.adminInfo().runActive) throw new AdminError('End the active run before changing the saved home.', 409);
      if (kind === 'end-run') {
        if (!session.adminInfo().runActive) throw new AdminError('There is no active run.', 409);
        const backup = backups.create(state, 'Before ending run');
        session.adminEndRun(); return { backupId: backup, message: 'Run ended. Everyone returned home; no gold or XP awarded.' };
      }
      let next = structuredClone(state);
      const goblin = ['reset-goblin', 'set-xp'].includes(kind) ? next.players.find(p => p.id === command.id) : null;
      if (['reset-goblin', 'set-xp'].includes(kind) && !goblin) throw new AdminError('Choose an existing goblin.');
      if (kind === 'restore') {
        next = backups.read(command.backupId).state;
        // Keep identity keys for goblins created since the backup, but reset their
        // progress/sacks. Connected browsers can keep using the same actors.
        for (const p of state.players) if (!next.players.some(q => q.token === p.token)) next.players.push({ ...p, bag: [], profile: createProfile(p.id) });
      }
      if (kind === 'reset-all' || kind === 'reset-lair') {
        const fresh = createCamp();
        next.camp = { counts: fresh.counts, slots: fresh.slots, destination: fresh.destination, nextItemId: state.camp.nextItemId };
      }
      if (kind === 'reset-all') for (const p of next.players) { p.bag = []; p.profile = createProfile(p.id); }
      if (kind === 'reset-goblin') { goblin.bag = []; goblin.profile = createProfile(goblin.id); }
      if (kind === 'set-stock') {
        if (typeof command.item !== 'string' || !Object.hasOwn(LOOT_TYPES, command.item) || LOOT_TYPES[command.item].sellValue) throw new AdminError('Choose gold, a material or crafted gear.');
        next.camp.counts[command.item] = amount(command.amount);
        syncStashSlots(next.camp);
      }
      if (kind === 'set-xp') { goblin.profile.xp = amount(command.amount); goblin.profile.earnedXp = Math.max(goblin.profile.earnedXp, goblin.profile.xp); }
      next.camp.nextItemId = Math.max(next.camp.nextItemId, state.camp.nextItemId);
      for (const p of next.players) p.interrupted = false;
      validateSave(next); // Validate the plan before making a backup or changing live state.
      const labels = { restore: 'restoring backup', 'reset-all': 'resetting all progress', 'reset-lair': 'resetting lair', 'reset-goblin': 'resetting goblin', 'set-stock': 'changing stock', 'set-xp': 'changing XP' };
      const backup = backups.create(state, `Before ${labels[kind]}`);
      session.adminReplace(next);
      return { backupId: backup, message: 'Saved home updated. A backup was made first.' };
    }
  };
}
