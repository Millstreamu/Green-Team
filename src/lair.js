import { selectJob } from './jobs.js';
import { PROGRESSION } from './config.js';
import { knowsRecipe } from './profile.js';
import { LOOT_TYPES, itemSaleValue, fits, itemCount, validItemCount, packItem, matchingStack } from './loot.js';
import { buildTrapLoadout } from './loadout.js';
import { clearPath } from './loot.js';

export const STASH = Object.freeze({ width: 6, height: 6 });
export const RECIPES = Object.freeze({
  snare: { name: 'Snare trap', xpCost: PROGRESSION.recipeCosts.snare, materials: { scrap: 2, cloth: 1 } },
  smoke: { name: 'Smoke bomb', xpCost: PROGRESSION.recipeCosts.smoke, materials: { scrap: 1, cloth: 2 } }
});
export const SNARE_RECIPE = RECIPES.snare.materials;
export function syncStashSlots(camp) {
  const used = new Set();
  camp.slots = Array.from({ length: STASH.width * STASH.height }, (_, i) => {
    const type = camp.slots?.[i];
    if (!Object.hasOwn(LOOT_TYPES, type) || !Number.isSafeInteger(camp.counts[type]) || camp.counts[type] <= 0 || used.has(type)) return null;
    used.add(type); return type;
  });
  for (const [type, count] of Object.entries(camp.counts)) if (count > 0 && !used.has(type)) {
    const index = camp.slots.indexOf(null);
    if (index !== -1) { camp.slots[index] = type; used.add(type); }
  }
}
export function createCamp() {
  const camp = { counts: Object.fromEntries(Object.keys(LOOT_TYPES).map(type => [type, type === 'scrap' ? 2 : type === 'cloth' || type === 'snare' ? 1 : 0])), slots: [], preparedBag: [], nextItemId: 1, destination: { jobId: 'manor', difficultyId: 'normal' } };
  syncStashSlots(camp); return camp;
}
export function moveStashStack(camp, type, target) {
  if (!Number.isInteger(target) || target < 0 || target >= camp.slots.length || camp.counts[type] <= 0) return false;
  const origin = camp.slots.indexOf(type);
  if (origin < 0 || camp.slots[target] && camp.slots[target] !== type) return false;
  camp.slots[origin] = null; camp.slots[target] = type; return true;
}
export function canCraftRecipe(camp, type, profile) {
  return Object.hasOwn(RECIPES, type) && knowsRecipe(profile, type) && Object.entries(RECIPES[type].materials).every(([material, count]) => camp.counts[material] >= count);
}
export function craftRecipe(camp, type, profile) {
  if (!canCraftRecipe(camp, type, profile)) return false;
  for (const [material, count] of Object.entries(RECIPES[type].materials)) camp.counts[material] -= count;
  camp.counts[type]++; syncStashSlots(camp); return true;
}
export function canCraftSnare(camp, profile) { return canCraftRecipe(camp, 'snare', profile); }
export function craftSnare(camp, profile) { return craftRecipe(camp, 'snare', profile); }
// Local preparation transfers conserve stock immediately; launch moves the
// already-paid bag without withdrawing stock a second time.
export function takeStashItem(camp, loot, type, debug = false) {
  if (!Object.hasOwn(LOOT_TYPES, type) || LOOT_TYPES[type].runOnly || debug && !LOOT_TYPES[type].equipment || loot.held || !debug && camp.counts[type] < 1 || !Number.isSafeInteger(camp.nextItemId) || camp.nextItemId >= Number.MAX_SAFE_INTEGER) return null;
  const item = { id: `lair-item-${camp.nextItemId}`, type, rotation: 0, ...(debug ? { debugSupply: true } : {}) };
  const target = loot.bag.find(p => matchingStack(p, item) && itemCount(p) < LOOT_TYPES[type].stackLimit);
  if (!packItem(loot.bag, item)) return null;
  camp.nextItemId++; if (!debug) camp.counts[type]--;
  camp.preparedBag = loot.bag; syncStashSlots(camp); return target ?? loot.bag.find(p => p.id === item.id);
}
export function returnStashItem(camp, loot, id) {
  if (loot.held) return false;
  const index = loot.bag.findIndex(item => item.id === id);
  if (index < 0) return false;
  const item = loot.bag[index];
  if (!Object.hasOwn(LOOT_TYPES, item.type) || LOOT_TYPES[item.type].runOnly || !item.debugSupply && camp.counts[item.type] > Number.MAX_SAFE_INTEGER - itemCount(item)) return false;
  loot.bag.splice(index, 1); if (!item.debugSupply) camp.counts[item.type] += itemCount(item);
  camp.preparedBag = loot.bag; syncStashSlots(camp); return true;
}
export function craftForSack(camp, loot, type, profile) {
  if (loot.held || !craftRecipe(camp, type, profile)) return null;
  const item = takeStashItem(camp, loot, type);
  return { destination: item ? 'sack' : 'stash', item };
}
export function departWithSack(camp, loot) {
  if (loot.held || loot.bag !== camp.preparedBag) return null;
  const bag = loot.bag; camp.preparedBag = []; return bag;
}
export function takeSupplies(camp, quantities, seed, debug = false) {
  const loadout = buildTrapLoadout(quantities, seed);
  if (!loadout) return null;
  const required = {};
  for (const item of loadout.bag) required[item.type] = (required[item.type] ?? 0) + 1;
  if (!debug && Object.entries(required).some(([type, count]) => count > camp.counts[type])) return null;
  if (debug) loadout.bag.forEach(item => { item.debugSupply = true; });
  else for (const [type, count] of Object.entries(required)) camp.counts[type] -= count;
  syncStashSlots(camp); return loadout;
}
export function bankEscape(camp, result, loot) {
  if (result.outcome !== 'escaped' || result.banked) return false;
  let gold = 0;
  for (const item of loot.bag) if (!item.debugSupply && !LOOT_TYPES[item.type].runOnly) {
    if (LOOT_TYPES[item.type].sellValue) gold += itemSaleValue(item);
    else camp.counts[item.type]++;
  }
  camp.counts.gold += gold; result.soldGold = gold;
  loot.bag.length = 0; result.banked = true; syncStashSlots(camp); return true;
}
const CAMP_SAVE_KEY = 'green-team-camp-v1';
export function loadCamp(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(CAMP_SAVE_KEY) ?? 'null');
    if (![1, 2, 3, 4].includes(saved?.version) || !saved.counts) return createCamp();
    const camp = createCamp();
    for (const type of Object.keys(LOOT_TYPES)) {
      const count = saved.counts[type] ?? 0;
      if (!Number.isSafeInteger(count) || count < 0) return createCamp();
      camp.counts[type] = count;
    }
    // Existing saves kept unsold valuables. Convert them once during migration.
    if (saved.version === 1) for (const [type, definition] of Object.entries(LOOT_TYPES)) if (definition.sellValue) {
      camp.counts.gold += camp.counts[type] * definition.sellValue; camp.counts[type] = 0;
    }
    // Retire the old shared smoke unlock and refund its one-time gold price.
    if (saved.version === 2 && saved.unlocked?.smoke === true) camp.counts.gold += 20;
    if (!Number.isSafeInteger(camp.counts.gold)) return createCamp();
    if (saved.version === 4) {
      if (!Number.isSafeInteger(saved.nextItemId) || saved.nextItemId < 1 || !Array.isArray(saved.preparedBag) || saved.preparedBag.length > 9) return createCamp();
      const bag = [], ids = new Set();
      for (const item of saved.preparedBag) {
        if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || !Object.hasOwn(LOOT_TYPES, item.type)
          || !validItemCount(item) || !Number.isInteger(item.rotation) || item.rotation < 0 || item.rotation > 3 || !Number.isInteger(item.x) || !Number.isInteger(item.y) || !fits(bag, item, item.x, item.y)) return createCamp();
        bag.push({ ...item }); ids.add(item.id);
      }
      camp.preparedBag = bag; camp.nextItemId = saved.nextItemId;
    }
    const destination = saved.destination && selectJob(saved.destination.jobId, saved.destination.difficultyId);
    if (destination) camp.destination = { jobId: destination.jobId, difficultyId: destination.difficultyId };
    camp.slots = Array.isArray(saved.slots) ? saved.slots : [];
    syncStashSlots(camp); return camp;
  } catch { return createCamp(); }
}
export function saveCamp(camp, storage) {
  try { syncStashSlots(camp); storage?.setItem(CAMP_SAVE_KEY, JSON.stringify({ version: 4, counts: camp.counts, slots: camp.slots, preparedBag: camp.preparedBag, nextItemId: camp.nextItemId, destination: camp.destination })); return !!storage; }
  catch { return false; }
}
export function createLairWorld() {
  const width = 18, height = 14, tiles = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) tiles[y * width + x] = 1;
  return { seed: 0, width, height, tiles, rooms: [{ x: 1, y: 1, w: 16, h: 12, cx: 9, cy: 7 }], shortcuts: [], spawn: { x: 9, y: 9.5 }, lair: true,
    stations: [{ kind: 'stash', name: 'Lair stash', x: 5, y: 6 }, { kind: 'craft', name: 'Workbench', x: 13, y: 6 }, { kind: 'campfire', name: 'Campfire', x: 9, y: 11.5 }, { kind: 'planning', name: 'Map planning', x: 5, y: 2.5 }, { kind: 'tunnel', name: 'Departure minecart', x: 9, y: 2.5 }] };
}
export function lairTarget(world, player) {
  return world.stations.filter(station => Math.hypot(station.x - player.x, station.y - player.y) <= 1.6 && clearPath(world, player, station))
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0] ?? null;
}
