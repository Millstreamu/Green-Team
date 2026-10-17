import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { createCamp, syncStashSlots } from '../src/lair.js';
import { createProfile, PERSONAL_UPGRADES } from '../src/profile.js';
import { LOOT_TYPES, fits } from '../src/loot.js';
import { selectJob } from '../src/jobs.js';

const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const natural = value => Number.isSafeInteger(value) && value >= 0;
function requireSave(condition) { if (!condition) throw new Error('Invalid Green Team save. The existing file has been left in place.'); }

// Only durable home state crosses this boundary. Live dungeons, readiness,
// positions, results, claims and connection timers are deliberately excluded.
export function restoreSave(saved) {
  if (saved === null) return { camp: createCamp(), players: [] };
  requireSave(saved?.version === 1 && saved.camp && Array.isArray(saved.players));
  const c = saved.camp;
  requireSave(c.counts && Object.keys(LOOT_TYPES).every(type => natural(c.counts[type]))
    && Number.isSafeInteger(c.nextItemId) && c.nextItemId >= 1
    && Array.isArray(c.slots) && c.slots.length === 36
    && c.slots.every(type => type === null || Object.hasOwn(LOOT_TYPES, type))
    && selectJob(c.destination?.jobId, c.destination?.difficultyId));
  const camp = { ...createCamp(), ...structuredClone(c), preparedBag: [] };
  syncStashSlots(camp);
  const ids = new Set(), tokens = new Set(), itemIds = new Set();
  const players = saved.players.map(p => {
    requireSave(validId(p?.token) && p.token.length <= 64 && validId(p.id) && validId(p.name)
      && !ids.has(p.id) && !tokens.has(p.token) && Array.isArray(p.bag) && p.bag.length <= 9
      && typeof p.interrupted === 'boolean');
    ids.add(p.id); tokens.add(p.token);
    const profile = p.profile;
    requireSave(profile?.id === p.id && natural(profile.xp) && natural(profile.earnedXp) && profile.earnedXp >= profile.xp
      && Array.isArray(profile.purchases) && new Set(profile.purchases).size === profile.purchases.length
      && profile.purchases.every(id => typeof id === 'string' && Object.hasOwn(PERSONAL_UPGRADES, id)));
    const bag = [];
    for (const item of p.bag) {
      requireSave(validId(item?.id) && !itemIds.has(item.id) && Object.hasOwn(LOOT_TYPES, item.type)
        && Number.isInteger(item.rotation) && item.rotation >= 0 && item.rotation <= 3
        && Number.isInteger(item.x) && Number.isInteger(item.y) && fits(bag, item, item.x, item.y)
        && (item.debugSupply === undefined || typeof item.debugSupply === 'boolean'));
      itemIds.add(item.id); bag.push(structuredClone(item));
    }
    requireSave(!p.interrupted || bag.length === 0);
    return { token: p.token, id: p.id, name: p.name, bag, profile: { ...createProfile(p.id), ...structuredClone(profile) }, interrupted: p.interrupted };
  });
  return { camp, players };
}

export function openSaveStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  try {
    if (filename !== ':memory:') chmodSync(filename, 0o600);
    db.exec('PRAGMA busy_timeout=3000; PRAGMA synchronous=FULL;');
    const version = db.prepare('PRAGMA user_version').get().user_version;
    if (![0, 1].includes(version)) throw new Error('This save needs a newer Green Team version.');
    db.exec('CREATE TABLE IF NOT EXISTS home_save (id INTEGER PRIMARY KEY CHECK(id = 1), state TEXT NOT NULL); PRAGMA user_version=1;');
    const read = db.prepare('SELECT state FROM home_save WHERE id=1');
    const write = db.prepare('INSERT INTO home_save(id,state) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state');
    let last = read.get()?.state ?? null;
    // Check before any game action can replace an unreadable or unsupported save.
    if (last !== null) restoreSave(JSON.parse(last));
    return {
      load() { return last === null ? null : JSON.parse(last); },
      save(state) {
        const text = JSON.stringify(state);
        if (text === last) return;
        write.run(text); // A single SQLite statement commits the entire home atomically.
        last = text;
      },
      close() { db.close(); }
    };
  } catch (error) { db.close(); throw error; }
}
