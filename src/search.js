import { canHide } from './hiding.js';
import { findPath } from './navigation.js';
import { SEARCH, SEARCH_LOOT } from './config.js';
import { canStand } from './world.js';
import { clearPath, reachable, LOOT_TYPES } from './loot.js';

export const SEARCHABLE_TYPES = Object.freeze({
  chest: { name: 'Chest', duration: SEARCH.chestTime, color: '#b79055', pool: ['coin', 'horn'], rarePool: ['ruby', 'candlestick'] },
  cupboard: { name: 'Cupboard', duration: SEARCH.cupboardTime, color: '#889e86', pool: ['scroll', 'coin'], rarePool: ['candlestick', 'horn'] },
  crate: { name: 'Crate', duration: SEARCH.crateTime, color: '#ab815c', pool: ['scroll', 'coin'], rarePool: ['sword', 'horn'] }
});

export function createSearchables(world) {
  let state = (world.seed ^ 0x9e3779b9) >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const objects = [];
  const add = (type, x, y) => {
    if (!canStand(world, x, y, 0.2) || objects.some(o => Math.hypot(o.x - x, o.y - y) < 0.8)) return;
    objects.push({ id: `${world.seed}-search-${objects.length}`, type, x, y, contents: [], searched: false });
  };
  const first = world.rooms[0];
  add('chest', world.spawn.x + 1.5, world.spawn.y);
  add('cupboard', first.x + 1.5, first.y + 1.5);
  add('crate', first.x + first.w - 1.5, first.y + first.h - 1.5);
  const types = Object.keys(SEARCHABLE_TYPES);
  world.rooms.slice(1).forEach((room, i) => add(types[i % types.length], i % 2 ? room.x + room.w - 1.5 : room.x + 1.5, room.cy + 0.5));
  const depths = searchRewardDepths(world, objects);
  objects.forEach((object, index) => {
    Object.assign(object, depths[index]);
    const profile = searchRewardProfile(object.depth), definition = SEARCHABLE_TYPES[object.type];
    const count = random() < profile.emptyChance ? 0 : random() < SEARCH_LOOT.twoItemChance ? 2 : 1;
    object.contents = Array.from({ length: count }, () => {
      const pool = random() < profile.materialChance ? ['scrap', 'cloth'] : random() < Math.min(1, profile.rareChance + (world.job?.rareBonus ?? 0)) ? definition.rarePool : definition.pool;
      return pool[Math.floor(random() * pool.length)];
    });
  });
  return objects;
}

export function searchRewardDepths(world, objects) {
  const distances = objects.map(object => findPath(world, world.spawn, object).length);
  const farthest = Math.max(1, ...distances);
  return distances.map(distance => ({ distance, depth: distance / farthest }));
}
export function searchRewardProfile(depth) {
  const t = Math.max(0, Math.min(1, depth));
  const blend = (near, far) => near + (far - near) * t;
  return { emptyChance: blend(SEARCH_LOOT.nearEmptyChance, SEARCH_LOOT.farEmptyChance), materialChance: blend(SEARCH_LOOT.nearMaterialChance, SEARCH_LOOT.farMaterialChance), rareChance: blend(SEARCH_LOOT.nearRareChance, SEARCH_LOOT.farRareChance) };
}

export function canSearch(world, player, object) {
  return !player.hiding && !object.searched && player.state !== 'down' && Math.hypot(player.x - object.x, player.y - object.y) <= SEARCH.reach && clearPath(world, player, object);
}

export function selectInteraction(world, player, ground, objects, pointer = null, hidingSpots = []) {
  if (player.hiding) return null;
  const candidates = [
    ...ground.filter(item => reachable(world, player, item)).map(item => ({ kind: 'loot', item })),
    ...objects.filter(item => canSearch(world, player, item)).map(item => ({ kind: 'search', item })),
    ...hidingSpots.filter(item => canHide(world, player, item)).map(item => ({ kind: 'hide', item }))
  ];
  const distance = (candidate, point) => Math.hypot(candidate.item.x - point.x, candidate.item.y - point.y);
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
  const rate = Number.isFinite(player.searchRate) && player.searchRate > 0 ? player.searchRate : 1;
  session.duration = SEARCHABLE_TYPES[object.type].duration / rate;
  session.active = object; session.elapsed = 0; session.origin = { x: player.x, y: player.y };
  return true;
}

function spillContents(world, object, loot) {
  const offsets = [[-0.6, 0.5], [0.6, 0.5], [0, -0.65], [-0.65, -0.4], [0.65, -0.4], [0, 0]];
  const points = offsets.map(([dx, dy]) => ({ x: object.x + dx, y: object.y + dy }))
    .filter(point => canStand(world, point.x, point.y, 0.15) && clearPath(world, object, point));
  object.contents.forEach((type, i) => {
    const point = points.find(p => loot.ground.every(item => Math.hypot(item.x - p.x, item.y - p.y) >= 0.3)) ?? points[0] ?? object;
    loot.ground.push({ id: `${object.id}-loot-${i}`, type, rotation: 0, x: point.x, y: point.y, spillAge: 0, ...(LOOT_TYPES[type].sellValue ? { saleMultiplier: world.job?.goldMultiplier ?? 1 } : {}) });
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
  spillContents(world, object, loot);
  cancelSearch(session);
  return { type: 'completed', object, count: object.contents.length };
}
