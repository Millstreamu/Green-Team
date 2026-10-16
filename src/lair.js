import { LOOT_TYPES } from './loot.js';
import { buildTrapLoadout } from './loadout.js';
import { clearPath } from './loot.js';

export const SNARE_RECIPE = Object.freeze({ scrap: 2, cloth: 1 });
export function createCamp() { return { counts: Object.fromEntries(Object.keys(LOOT_TYPES).map(type => [type, type === 'scrap' ? 2 : type === 'cloth' || type === 'snare' ? 1 : 0])) }; }
export function canCraftSnare(camp) { return Object.entries(SNARE_RECIPE).every(([type, count]) => camp.counts[type] >= count); }
export function craftSnare(camp) {
  if (!canCraftSnare(camp)) return false;
  for (const [type, count] of Object.entries(SNARE_RECIPE)) camp.counts[type] -= count;
  camp.counts.snare++;
  return true;
}
export function takeSupplies(camp, quantities, seed, debug = false) {
  const loadout = buildTrapLoadout(quantities, seed);
  if (!loadout || !debug && loadout.bag.length > camp.counts.snare) return null;
  if (debug) loadout.bag.forEach(item => { item.debugSupply = true; });
  else camp.counts.snare -= loadout.bag.length;
  return loadout;
}
export function bankEscape(camp, result, loot) {
  if (result.outcome !== 'escaped' || result.banked) return false;
  for (const item of loot.bag) if (!item.debugSupply) camp.counts[item.type]++;
  loot.bag.length = 0; result.banked = true;
  return true;
}
const CAMP_SAVE_KEY = 'green-team-camp-v1';
export function loadCamp(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(CAMP_SAVE_KEY) ?? 'null');
    if (saved?.version !== 1 || !saved.counts) return createCamp();
    const camp = createCamp();
    for (const type of Object.keys(LOOT_TYPES)) {
      const count = saved.counts[type] ?? 0;
      if (!Number.isSafeInteger(count) || count < 0) return createCamp();
      camp.counts[type] = count;
    }
    return camp;
  } catch { return createCamp(); }
}
export function saveCamp(camp, storage) {
  try { storage?.setItem(CAMP_SAVE_KEY, JSON.stringify({ version: 1, counts: camp.counts })); return !!storage; }
  catch { return false; }
}
export function createLairWorld() {
  const width = 18, height = 14, tiles = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) tiles[y * width + x] = 1;
  return { seed: 0, width, height, tiles, rooms: [{ x: 1, y: 1, w: 16, h: 12, cx: 9, cy: 7 }], shortcuts: [], spawn: { x: 9, y: 9.5 }, lair: true,
    stations: [{ kind: 'stash', name: 'Lair stash', x: 5, y: 6 }, { kind: 'craft', name: 'Workbench', x: 13, y: 6 }, { kind: 'tunnel', name: 'Dungeon tunnel', x: 9, y: 2.5 }] };
}
export function lairTarget(world, player) {
  return world.stations.filter(station => Math.hypot(station.x - player.x, station.y - player.y) <= 1.6 && clearPath(world, player, station))
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0] ?? null;
}
