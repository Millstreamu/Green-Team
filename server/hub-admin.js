import { DEFAULT_TUNING, validateTuning } from '../src/tuning.js';
import { createProfile } from '../src/profile.js';
import { LOOT_TYPES } from '../src/loot.js';
import { syncStashSlots } from '../src/lair.js';
import { validateSave } from './save-store.js';
import { freshLairState, migrateHubSave } from './hub-session.js';
import { AdminError } from './admin.js';

export function createHubAdminController(session, backups) {
  return {
    summary(lairId) { return { ...session.adminInfo(lairId), backups: backups.list() }; },
    command(command) {
      const info = session.adminInfo(command?.lairId);
      if (info.saveFailed) throw new AdminError('Saving failed. Fix the disk error and restart the server.', 409);
      if (!info.saved) throw new AdminError('Admin edits need a saved server.', 409);
      const kind = command?.type;
      if (!['backup', 'restore', 'reset-all', 'reset-lair', 'reset-goblin', 'set-stock', 'set-xp', 'end-run', 'set-tuning', 'reset-tuning'].includes(kind)) throw new AdminError('Unknown admin action.');
      const state = session.adminState();
      if (kind === 'backup') return { backupId: backups.create(state, 'Manual server backup'), message: 'All lairs and goblins backed up.' };
      if (['set-tuning', 'reset-tuning'].includes(kind)) {
        if (!state.lairs.some(l => l.id === command.lairId)) throw new AdminError('Choose a lair.');
        let values;
        try { values = validateTuning(kind === 'reset-tuning' ? DEFAULT_TUNING : command.values); } catch (error) { throw new AdminError(error.message); }
        const id = backups.create(state, `Before ${kind}`);
        session.adminSetTuning(command.lairId, values);
        return { backupId: id, message: 'Settings saved for the selected lair. They apply to its next run.' };
      }
      if (kind !== 'end-run' && info.runActive) throw new AdminError('End all active runs before changing saved data.', 409);
      const selected = state.lairs.find(l => l.id === command.lairId);
      if (['reset-lair', 'set-stock', 'end-run'].includes(kind) && !selected) throw new AdminError('Choose a lair.');
      if (kind === 'end-run') {
        if (!session.adminInfo(selected.id).selectedRunActive) throw new AdminError('The selected lair has no active run.', 409);
        const id = backups.create(state, `Before ending run in ${selected.name}`);
        session.adminEndRun(selected.id); return { backupId: id, message: 'Selected run ended. No gold or XP awarded.' };
      }
      let next = structuredClone(state);
      if (kind === 'restore') {
        const saved = backups.read(command.backupId).state;
        next = migrateHubSave(saved);
        if (saved.version === 1) {
          const original = state.lairs.find(l => l.name === 'Original Lair');
          if (original) Object.assign(next.lairs[0], { id: original.id, name: original.name, code: original.code, ownerId: original.ownerId });
        }
        if (saved.version === 2) for (const lair of next.lairs) {
          if (saved.lairs.find(l => l.id === lair.id)?.ownerId === undefined) {
            const current = state.lairs.find(l => l.id === lair.id);
            if (current) lair.ownerId = current.ownerId;
          }
        }
        for (const p of state.profiles) if (!next.profiles.some(q => q.token === p.token)) next.profiles.push({ ...p, profile: createProfile(p.id) });
        for (const l of state.lairs) if (!next.lairs.some(q => q.id === l.id)) next.lairs.push({ ...l, state: freshLairState() });
      }
      const target = next.lairs.find(l => l.id === command.lairId);
      const goblin = next.profiles.find(p => p.id === command.id);
      if (['reset-goblin', 'set-xp'].includes(kind) && !goblin) throw new AdminError('Choose an existing goblin.');
      if (['reset-all', 'reset-lair'].includes(kind)) for (const lair of next.lairs) if (kind === 'reset-all' || lair.id === target.id) {
        lair.state.camp = freshLairState().camp;
      }
      if (kind === 'set-stock') {
        if (typeof command.item !== 'string' || !Object.hasOwn(LOOT_TYPES, command.item) || LOOT_TYPES[command.item].sellValue) throw new AdminError('Choose gold, a material or crafted gear.');
        if (!Number.isSafeInteger(command.amount) || command.amount < 0) throw new AdminError('Enter a nonnegative whole quantity.');
        target.state.camp.counts[command.item] = command.amount; syncStashSlots(target.state.camp);
      }
      if (kind === 'set-xp') {
        if (!Number.isSafeInteger(command.amount) || command.amount < 0) throw new AdminError('Enter nonnegative whole XP.');
        goblin.profile.xp = command.amount; goblin.profile.earnedXp = Math.max(goblin.profile.earnedXp, command.amount);
      }
      if (kind === 'reset-all' || kind === 'reset-goblin') for (const p of next.profiles) if (kind === 'reset-all' || p.id === goblin.id) p.profile = createProfile(p.id);
      for (const l of next.lairs) {
        const previous = state.lairs.find(q => q.id === l.id);
        l.state.camp.nextItemId = Math.max(l.state.camp.nextItemId, previous?.state.camp.nextItemId ?? 1);
        for (const actor of l.state.players) {
          actor.profile = next.profiles.find(p => p.id === actor.id).profile;
          actor.interrupted = false;
          if (kind === 'reset-all' || kind === 'reset-goblin' && actor.id === goblin.id) actor.bag = [];
        }
      }
      validateSave(next);
      const id = backups.create(state, `Before ${kind}`);
      session.adminReplace(next);
      return { backupId: id, message: 'Server saves updated. A full backup was made first.' };
    }
  };
}
