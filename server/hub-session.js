import { randomUUID, randomInt, timingSafeEqual } from 'node:crypto';
import { createLairSession } from './lair-session.js';
import { createProfile, profileLevel } from '../src/profile.js';
import { createCamp } from '../src/lair.js';
import { validateSave } from './save-store.js';

import { GENERATOR_PRESETS, generatorSettings, validateGenerator, dungeonConfig } from '../src/generator-settings.js';
import { DEFAULT_TUNING, validateTuning, restoreTuning } from '../src/tuning.js';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = () => Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
export function migrateHubSave(saved) {
  if (!saved) return { version: 2, profiles: [], lairs: [] };
  validateSave(saved);
  if (saved.version === 2) {
    const next = structuredClone(saved);
    // V39 inserted the creator as the first lair member before acknowledging
    // creation. Older empty groups have no identifiable creator to grant access.
    for (const lair of next.lairs) if (lair.ownerId === undefined) lair.ownerId = lair.state.players[0]?.id ?? null;
    return next;
  }
  return { version: 2, profiles: saved.players.map(({ token, id, name, profile }) => ({ token, id, name, profile })),
    lairs: [{ id: randomUUID(), name: 'Original Lair', code: code(), ownerId: saved.players[0]?.id ?? null, state: structuredClone(saved) }] };
}
export function freshLairState() {
  const { counts, slots, destination, nextItemId } = createCamp();
  return { version: 1, camp: { counts, slots, destination, nextItemId }, players: [] };
}
export function createHubSession({ store = null, beforeMigration = () => {} } = {}) {
  const profiles = new Map(), lairs = new Map();
  let failure = null;
  const loaded = store?.load() ?? null;
  if (loaded?.version === 1 || loaded?.version === 2 && loaded.lairs.some(l => l.ownerId === undefined || l.tuning && !Object.hasOwn(l.tuning, 'nearMaterialChance'))) beforeMigration(loaded);
  function install(saved) {
    const oldViews = new Map([...profiles].map(([token, p]) => [token, { lairId: p.lairId, connected: p.connected }]));
    lairs.clear();
    for (const record of saved.profiles) {
      const current = profiles.get(record.token) ?? {};
      Object.assign(current, structuredClone(record), { connected: oldViews.get(record.token)?.connected ?? false, actor: null, lairId: null, error: null });
      profiles.set(record.token, current);
    }
    for (const record of saved.lairs) {
      const savedState = structuredClone(record.state);
      const lair = { id: record.id, name: record.name, code: record.code, ownerId: record.ownerId ?? null, generator: generatorSettings(record.generator), tuning: restoreTuning(record.tuning) };
      lair.engine = createLairSession({ store: { load: () => savedState, save() {} }, getTuning: () => lair.tuning, getLayout: id => dungeonConfig(lair.generator[id]) });
      const engine = lair.engine;
      lairs.set(lair.id, lair);
      for (const p of profiles.values()) engine.bindIdentity(p);
    }
    for (const p of profiles.values()) {
      const old = oldViews.get(p.token), lair = old?.connected && lairs.get(old.lairId);
      if (lair) { p.actor = lair.engine.connectIdentity(p); p.lairId = lair.id; }
    }
  }
  function durableState() {
    return { version: 2,
      profiles: [...profiles.values()].map(({ token, id, name, profile }) => ({ token, id, name, profile })),
      lairs: [...lairs.values()].map(({ id, name, code, ownerId, tuning, generator, engine }) => ({ id, name, code, ownerId, tuning, generator, state: engine.exportState() })) };
  }
  function checkpoint() { if (store) store.save(durableState()); }
  function reject(p, text) { p.error = text; return false; }
  function attach(p, lair) { p.actor = lair.engine.connectIdentity(p); p.lairId = lair.id; return true; }
  function leave(p) {
    const lair = lairs.get(p.lairId);
    if (lair && p.actor) { p.actor.result = null; lair.engine.disconnect(p.actor); }
    p.actor = null; p.lairId = null;
  }
  install(migrateHubSave(loaded));
  checkpoint(); // Commit migration before a welcome or game snapshot can escape.
  const api = {
    connect(token) {
      let p = profiles.get(token);
      if (!p) {
        const id = randomUUID();
        p = { token: randomUUID(), id, name: `Goblin ${profiles.size + 1}`, profile: createProfile(id), connected: false, actor: null, lairId: null };
        profiles.set(p.token, p);
      }
      if (p.connected) return null;
      p.connected = true;
      if (p.actor?.inRun && lairs.has(p.lairId)) p.actor = lairs.get(p.lairId).engine.connect(p.token);
      else leave(p);
      return p;
    },
    disconnect(p) {
      p.connected = false;
      const lair = lairs.get(p.lairId);
      if (lair && p.actor) lair.engine.disconnect(p.actor);
      if (!p.actor?.inRun) { p.lairId = null; p.actor = null; }
    },
    rejection(p) { return p.error; },
    action(p, message) {
      if (!p?.connected || profiles.get(p.token) !== p || !message || typeof message.type !== 'string') return false;
      p.error = null;
      if (message.type === 'leave-lair') {
        if (!p.lairId) return false;
        if (p.actor?.inRun) return reject(p, 'Finish this run before returning to the home screen.');
        leave(p); return true;
      }
      if (p.lairId) return lairs.get(p.lairId).engine.action(p.actor, message);
      if (message.type === 'enter-owned-lair') {
        const lair = lairs.get(message.id);
        if (!lair || lair.ownerId !== p.id) return reject(p, 'That lair belongs to another goblin. Join with its name and code.');
        return attach(p, lair);
      }
      if (!['create-lair', 'join-lair'].includes(message.type)) return reject(p, 'Join a lair before playing.');
      if (typeof message.name !== 'string') return reject(p, 'Enter a lair name.');
      const name = message.name.trim();
      if (!name || name.length > 32 || /\p{C}/u.test(name)) return reject(p, 'Use a lair name from 1 to 32 characters.');
      const existing = [...lairs.values()].find(l => l.name.toLowerCase() === name.toLowerCase());
      if (message.type === 'create-lair') {
        if (existing) return reject(p, 'That lair name is already in use. Join it with its code, or choose another name.');
        const record = { id: randomUUID(), name, code: code(), ownerId: p.id, generator: generatorSettings(), tuning: { ...DEFAULT_TUNING } };
        record.engine = createLairSession({ store: { load: freshLairState, save() {} }, getTuning: () => record.tuning, getLayout: id => dungeonConfig(record.generator[id]) });
        lairs.set(record.id, record); return attach(p, record);
      }
      if (existing?.ownerId === p.id) return attach(p, existing);
      p.joinFailures ??= 0; p.joinCooldown ??= 0;
      if (p.joinCooldown > 0) return reject(p, 'Too many incorrect codes. Wait a few seconds, then try again.');
      const supplied = typeof message.code === 'string' ? message.code.trim().toUpperCase() : '';
      const expected = existing?.code ?? '------';
      if (!existing || !/^[A-Z2-9]{6}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
        p.joinFailures++;
        if (p.joinFailures >= 5) { p.joinCooldown = 10; p.joinFailures = 0; }
        return reject(p, 'No lair matches that name and code.');
      }
      p.joinFailures = 0; return attach(p, existing);
    },
    tick(dt) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      for (const p of profiles.values()) p.joinCooldown = Math.max(0, (p.joinCooldown ?? 0) - dt);
      for (const lair of lairs.values()) lair.engine.tick(dt);
    },
    snapshot(p) {
      const meta = { selfId: p.id, name: p.name, profile: p.profile, level: profileLevel(p.profile), saving: store ? 'saved' : 'temporary' };
      if (p.lairId) {
        const lair = lairs.get(p.lairId);
        return { ...lair.engine.snapshot(p.actor), ...meta, screen: 'game', lair: { id: lair.id, name: lair.name, code: lair.code } };
      }
      return { type: 'state', ...meta, screen: 'home', location: 'menu', players: [], bag: [], held: null, result: null,
        ownedLairs: [...lairs.values()].filter(l => l.ownerId === p.id).map(l => ({ id: l.id, name: l.name })),
        recentLairs: [...lairs.values()].filter(l => l.ownerId !== p.id && l.engine.hasIdentity(p.token)).map(l => ({ id: l.id, name: l.name })) };
    },
    adminState() { return structuredClone(durableState()); },
    adminInfo(lairId) {
      const selected = lairs.get(lairId) ?? lairs.values().next().value;
      const info = selected?.engine.adminInfo();
      const empty = createCamp(); for (const type of Object.keys(empty.counts)) empty.counts[type] = 0;
      return { saved: !!store, saveFailed: !!failure, runActive: [...lairs.values()].some(l => l.engine.adminInfo().runActive),
        generator: selected ? structuredClone(selected.generator) : null,
        tuning: selected ? { ...selected.tuning } : null,
        selectedRunActive: info?.runActive ?? false, selectedLairId: selected?.id ?? null,
        lairs: [...lairs.values()].map(l => ({ id: l.id, name: l.name, code: l.code, runActive: l.engine.adminInfo().runActive })),
        camp: info?.camp ?? empty,
        players: [...profiles.values()].map(p => ({ id: p.id, name: p.name, connected: p.connected, location: p.actor?.location ?? 'menu',
          xp: p.profile.xp, purchases: [...p.profile.purchases], bagCount: info?.players.find(a => a.id === p.id)?.bagCount ?? 0 })) };
    },
    adminReplace(saved) {
      if (api.adminInfo().runActive) throw Error('End all active runs before editing saves.');
      validateSave(saved); install(saved); return true;
    },
    adminSetGenerator(lairId, jobId, values) {
      const lair = lairs.get(lairId);
      if (!lair || !Object.hasOwn(GENERATOR_PRESETS, jobId)) throw Error('Choose a lair and dungeon type.');
      lair.generator[jobId] = validateGenerator(values); return true;
    },
    adminSetTuning(lairId, values) {
      const lair = lairs.get(lairId);
      if (!lair) throw Error('Choose a lair.');
      lair.tuning = validateTuning(values); return true;
    },
    adminEndRun(lairId) {
      const lair = lairs.get(lairId);
      if (!lair) throw Error('Choose a lair.');
      lair.engine.adminEndRun(); return true;
    }
  };
  for (const name of ['connect', 'disconnect', 'action', 'tick', 'adminReplace', 'adminEndRun', 'adminSetTuning', 'adminSetGenerator']) {
    const operation = api[name];
    api[name] = (...args) => {
      if (failure) throw failure;
      const result = operation(...args);
      try { checkpoint(); } catch (error) { failure = error; throw error; }
      return result;
    };
  }
  return api;
}
