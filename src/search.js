import { placeRoomFurniture } from './room-layouts.js';
import { ROOM_TYPES, assignRoomTypes, roomLootPools, roomMaterialContainer, roomFurnitureFor } from './room-types.js';
import { canOpenRoomDoor } from './room-doors.js';
import { completeSearchPassive } from './passive-effects.js';
import { resourcePool } from './resource-profiles.js';
import { breakDisguise } from './potions.js';
import { canApproachTreasure } from './treasure.js';
import { placeProp } from './prop-placement.js';
import { canHide } from './hiding.js';
import { findPath } from './navigation.js';
import { SEARCH, SEARCH_LOOT, FOOD, LUCKY } from './config.js';
import { canStand, setSolidObjects } from './world.js';
import { clearPath, reachable, LOOT_TYPES } from './loot.js';

export const SEARCHABLE_TYPES = Object.freeze({
  chest: { name: 'Chest', duration: SEARCH.chestTime, color: '#b79055', pool: ['coin', 'silverCoin', 'copperCoin', 'horn'], rarePool: ['ruby', 'candlestick'] },
  cupboard: { materialPool: FOOD.materialPool, name: 'Cupboard', duration: SEARCH.cupboardTime, color: '#889e86', pool: ['scroll', 'silverCoin', 'copperCoin', 'coin'], rarePool: ['candlestick', 'horn'] },
  crate: { materialPool: FOOD.materialPool, name: 'Crate', duration: SEARCH.crateTime, color: '#ab815c', pool: ['scroll', 'silverCoin', 'copperCoin', 'coin'], rarePool: ['sword', 'horn'] }
});

export function createSearchables(world) {
  assignRoomTypes(world);
  setSolidObjects(world);
  let state = (world.seed ^ 0x9e3779b9) >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const objects = [];
  const types = Object.keys(SEARCHABLE_TYPES);
  world.rooms.forEach((room, index) => {
    const count = index === 0 ? Math.max(3, world.layout?.searchablesPerRoom ?? 1) : world.layout?.searchablesPerRoom ?? 1;
    const choices=Array.from({length:count},(_,i)=>({type:types[(index===0?i:index-1+i)%types.length],roomFurniture:Object.hasOwn(ROOM_TYPES,room.roomType)?roomFurnitureFor(room.roomType,i):undefined}));
    for(const point of placeRoomFurniture(world,room,count,choices,objects))objects.push({id:`${world.seed}-search-${objects.length}`,...point,...(Object.hasOwn(ROOM_TYPES,room.roomType)?{roomType:room.roomType}:{}),contents:[],searched:false});
  });
  setSolidObjects(world, objects);
  const depths = searchRewardDepths(world, objects);
  objects.forEach((object, index) => {
    Object.assign(object, depths[index]);
    const profile = searchRewardProfile(object.depth, world.tuning?.loot), definition = SEARCHABLE_TYPES[object.type];
    const materials = resourcePool(world.job?.jobId, roomMaterialContainer(object.roomType,object.type), definition.materialPool ?? ['scrap', 'cloth']);
    const pools=roomLootPools(object.roomType,definition,materials);
    const count = random() < profile.emptyChance ? 0 : random() < (world.tuning?.loot ?? SEARCH_LOOT).twoItemChance ? 2 : 1;
    object.contents = Array.from({ length: count }, () => {
      const pool = random() < profile.materialChance ? pools.materials : random() < Math.min(1, profile.rareChance + (world.job?.rareBonus ?? 0)) ? pools.rarePool : pools.pool;
      return pool[Math.floor(random() * pool.length)];
    });
  });
  return objects;
}

export function searchRewardDepths(world, objects) {
  const distances = objects.map(object => findPath(world, world.spawn, object.approach ?? object).length);
  const farthest = Math.max(1, ...distances);
  return distances.map(distance => ({ distance, depth: distance / farthest }));
}
export function searchRewardProfile(depth, values = SEARCH_LOOT) {
  const t = Math.max(0, Math.min(1, depth));
  const blend = (near, far) => near + (far - near) * t;
  return { emptyChance: blend(values.nearEmptyChance, values.farEmptyChance), materialChance: blend(values.nearMaterialChance, values.farMaterialChance), rareChance: blend(values.nearRareChance, values.farRareChance) };
}

// Probability of at least one gold coin in the original whole-container roll.
// Calibrate the extra roll against this, so +.05 means percentage points rather
// than a relative multiplier or +5% only among already coin-free searches.
export function searchGoldChance(world, object) {
  if (object.treasure) return 0;
  const definition = SEARCHABLE_TYPES[object.type];
  if (!definition) return 0;
  const values = world.tuning?.loot ?? SEARCH_LOOT;
  const profile = searchRewardProfile(object.depth ?? 0, values);
  const rare = Math.min(1, profile.rareChance + (world.job?.rareBonus ?? 0));
  const pools=roomLootPools(object.roomType,definition,[]);
  const coinShare = pool => pool.filter(type => type === 'coin').length / pool.length;
  const q = (1 - profile.materialChance) * ((1 - rare) * coinShare(pools.pool) + rare * coinShare(pools.rarePool));
  return (1 - profile.emptyChance) * ((1 - values.twoItemChance) * q + values.twoItemChance * (1 - (1 - q) ** 2));
}
export function luckySearchChance(world, object, bonus = LUCKY.goldChanceBonus) {
  const base = searchGoldChance(world, object);
  return base >= 1 ? 0 : Math.min(1, bonus / (1 - base));
}
function luckySearchRoll(world, object) {
  // Independent deterministic stream: cancellation, player swaps and retries
  // cannot reroll it; ordinary generated loot consumes exactly its old RNG.
  let hash = (world.seed ^ 0x6c75636b) >>> 0;
  for (const char of String(object.id)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  hash ^= hash >>> 16; hash = Math.imul(hash, 0x7feb352d); hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b); hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}
export function applyLuckyFind(world, player, object) {
  const bonus = (player.lucky === true ? LUCKY.goldChanceBonus : 0) + (player.passiveLuck === true ? LUCKY.passiveGoldChanceBonus : 0);
  if (!bonus || object.luckyResolved || object.contents.includes('coin')) return false;
  object.luckyResolved = true;
  if (luckySearchRoll(world, object) >= luckySearchChance(world, object, bonus)) return false;
  // Preserve materials, keys and prizes. At most one extra coin; even an empty
  // container may gain it. The shared searched flag prevents all further rolls.
  object.contents.push('coin'); return true;
}

export function canSearch(world, player, object) {
  return !player.hiding && !object.searched && player.state !== 'down' && Math.hypot(player.x - object.x, player.y - object.y) <= SEARCH.reach && clearPath(world, player, object);
}

export function selectInteraction(world, player, ground, objects, pointer = null, hidingSpots = []) {
  if (player.hiding) return null;
  const candidates = [
    ...(world.roomDoors ?? []).filter(d => canOpenRoomDoor(world,player,d)).map(item => ({kind:'door',item})),
    ...(canApproachTreasure(world, player) ? [{ kind: 'unlock', item: world.treasure }] : []),
    ...ground.filter(item => reachable(world, player, item)).map(item => ({ kind: 'loot', item })),
    ...objects.filter(item => canSearch(world, player, item)).map(item => ({ kind: 'search', item })),
    ...hidingSpots.filter(item => canHide(world, player, item)).map(item => ({ kind: 'hide', item }))
  ];
  const distance = (candidate, point) => candidate.kind === 'unlock' ? Math.min(...candidate.item.cells.map(c => Math.hypot(c.x + .5 - point.x, c.y + .5 - point.y))) : Math.hypot(candidate.item.x - point.x, candidate.item.y - point.y);
  if (pointer) {
    const hovered = candidates.filter(candidate => distance(candidate, pointer) <= 0.8);
    if (hovered.length) return hovered.sort((a, b) => distance(a, pointer) - distance(b, pointer))[0];
  }
  return candidates.sort((a, b) => distance(a, player) - distance(b, player))[0] ?? null;
}

export function createSearchSession() { return { active: null, elapsed: 0, origin: null, duration: 0 }; }
export function cancelSearch(session) { session.active = null; session.elapsed = 0; session.origin = null; session.duration = 0; }

export function beginSearch(session, world, player, loot, object) {
  if (session.active || loot.held || !canSearch(world, player, object)) return false;
  const invisible = player.quietHands === true ? player.vanishLeft : 0;
  breakDisguise(player);
  if (invisible > 0) player.vanishLeft = invisible;
  const rate = Number.isFinite(player.searchRate) && player.searchRate > 0 ? player.searchRate : 1;
  session.duration = (world.tuning?.search?.[`${object.type}Time`] ?? SEARCHABLE_TYPES[object.type].duration) / rate;
  session.active = object; session.elapsed = 0; session.origin = { x: player.x, y: player.y };
  return true;
}

function spillContents(world, object, loot) {
  const origin = object.approach ?? { x: object.x, y: object.y + 1 };
  const offsets = [[0, 0], [-.35, 0], [.35, 0], [0, -.35], [0, .35]];
  const points = offsets.map(([dx, dy]) => ({ x: origin.x + dx, y: origin.y + dy }))
    .filter(point => canStand(world, point.x, point.y, 0.15) && clearPath(world, origin, point));
  object.contents.forEach((type, i) => {
    const point = points.find(p => loot.ground.every(item => Math.hypot(item.x - p.x, item.y - p.y) >= 0.3)) ?? points[0] ?? origin;
    loot.ground.push({ id: `${object.id}-loot-${i}`, type, ...(type === 'treasureKey' ? { keyId: world.treasure.keyId } : {}), rotation: 0, x: point.x, y: point.y, spillAge: 0, ...(LOOT_TYPES[type].sellValue ? { saleMultiplier: world.job?.goldMultiplier ?? 1 } : {}) });
  });
}

export function updateSearch(session, world, player, loot, holdingE, dt) {
  const object = session.active;
  if (!object) return null;
  const moved = Math.hypot(player.x - session.origin.x, player.y - session.origin.y) > SEARCH.movementTolerance;
  if (!holdingE || moved || loot.held || !canSearch(world, player, object)) {
    cancelSearch(session); return { type: 'cancelled', object };
  }
  session.elapsed += Math.max(0, dt);
  if (session.elapsed + 0.000001 < session.duration) return null;
  object.searched = true;
  completeSearchPassive(player);
  applyLuckyFind(world, player, object);
  spillContents(world, object, loot);
  cancelSearch(session);
  return { type: 'completed', object, count: object.contents.length };
}
