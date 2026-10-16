import { SEARCH } from './config.js';
import { canStand } from './world.js';
import { clearPath, reachable } from './loot.js';

export const SEARCHABLE_TYPES = Object.freeze({
  chest: { name: 'Chest', duration: SEARCH.chestTime, count: 2, color: '#b79055', pool: ['ruby', 'coin', 'candlestick', 'horn'] },
  cupboard: { name: 'Cupboard', duration: SEARCH.cupboardTime, count: 3, color: '#889e86', pool: ['scroll', 'candlestick', 'horn', 'coin', 'cloth'] },
  crate: { name: 'Crate', duration: SEARCH.crateTime, count: 1, color: '#ab815c', pool: ['sword', 'scroll', 'horn', 'coin', 'scrap', 'cloth'] }
});

export function createSearchables(world) {
  let state = (world.seed ^ 0x9e3779b9) >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const objects = [];
  const add = (type, x, y) => {
    if (!canStand(world, x, y, 0.2) || objects.some(o => Math.hypot(o.x - x, o.y - y) < 0.8)) return;
    const definition = SEARCHABLE_TYPES[type];
    const contents = Array.from({ length: definition.count }, () => definition.pool[Math.floor(random() * definition.pool.length)]);
    objects.push({ id: `${world.seed}-search-${objects.length}`, type, x, y, contents, searched: false });
  };
  const first = world.rooms[0];
  add('chest', world.spawn.x + 1.5, world.spawn.y);
  // Two small valuables in the first chest make the controls quick to learn.
  objects[0].contents = ['ruby', 'coin'];
  add('cupboard', first.x + 1.5, first.y + 1.5);
  add('crate', first.x + first.w - 1.5, first.y + first.h - 1.5);
  objects.find(object => object.type === 'crate').contents = ['scrap', 'scrap', 'cloth'];
  const types = Object.keys(SEARCHABLE_TYPES);
  world.rooms.slice(1).forEach((room, i) => add(types[i % types.length], i % 2 ? room.x + room.w - 1.5 : room.x + 1.5, room.cy + 0.5));
  return objects;
}

export function canSearch(world, player, object) {
  return !object.searched && player.state !== 'down' && Math.hypot(player.x - object.x, player.y - object.y) <= SEARCH.reach && clearPath(world, player, object);
}

export function selectInteraction(world, player, ground, objects, pointer = null) {
  const candidates = [
    ...ground.filter(item => reachable(world, player, item)).map(item => ({ kind: 'loot', item })),
    ...objects.filter(item => canSearch(world, player, item)).map(item => ({ kind: 'search', item }))
  ];
  const distance = (candidate, point) => Math.hypot(candidate.item.x - point.x, candidate.item.y - point.y);
  if (pointer) {
    const hovered = candidates.filter(candidate => distance(candidate, pointer) <= 0.8);
    if (hovered.length) return hovered.sort((a, b) => distance(a, pointer) - distance(b, pointer))[0];
  }
  return candidates.sort((a, b) => distance(a, player) - distance(b, player))[0] ?? null;
}

export function createSearchSession() { return { active: null, elapsed: 0, origin: null }; }
export function cancelSearch(session) { session.active = null; session.elapsed = 0; session.origin = null; }

export function beginSearch(session, world, player, loot, object) {
  if (session.active || loot.held || !canSearch(world, player, object)) return false;
  session.active = object; session.elapsed = 0; session.origin = { x: player.x, y: player.y };
  return true;
}

function spillContents(world, object, loot) {
  const offsets = [[-0.6, 0.5], [0.6, 0.5], [0, -0.65], [-0.65, -0.4], [0.65, -0.4], [0, 0]];
  const points = offsets.map(([dx, dy]) => ({ x: object.x + dx, y: object.y + dy }))
    .filter(point => canStand(world, point.x, point.y, 0.15) && clearPath(world, object, point));
  object.contents.forEach((type, i) => {
    const point = points.find(p => loot.ground.every(item => Math.hypot(item.x - p.x, item.y - p.y) >= 0.3)) ?? points[0] ?? object;
    loot.ground.push({ id: `${object.id}-loot-${i}`, type, rotation: 0, x: point.x, y: point.y, spillAge: 0 });
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
  if (session.elapsed + 0.000001 < SEARCHABLE_TYPES[object.type].duration) return null;
  object.searched = true;
  spillContents(world, object, loot);
  cancelSearch(session);
  return { type: 'completed', object, count: object.contents.length };
}
