import { canStand, isWalkable } from './world.js';
import { findPath } from './navigation.js';
import { clearPath } from './loot.js';

const inside = (room, p) => p.x >= room.x && p.x < room.x + room.w && p.y >= room.y && p.y < room.y + room.h;
export function reachableTreasureTiles(world) {
  const start = Math.floor(world.spawn.y) * world.width + Math.floor(world.spawn.x), seen = new Set([start]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const key = queue[i], x = key % world.width, y = Math.floor(key / world.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, next = ny * world.width + nx;
      if (!seen.has(next) && isWalkable(world, nx, ny)) { seen.add(next); queue.push(next); }
    }
  }
  return seen;
}
export function applyTreasureState(world, state) {
  const changed = world.treasure?.id !== state?.id || world.treasure?.unlocked !== state?.unlocked || !world.lockedTiles;
  world.treasure = state ?? null;
  if (!changed) return;
  world.lockedTiles = new Uint8Array(world.tiles.length);
  if (state && !state.unlocked) for (const cell of state.cells) world.lockedTiles[cell.y * world.width + cell.x] = 1;
  world.sightVersion = (world.sightVersion ?? 0) + 1;
}
export function publicTreasure(world) {
  const door = world.treasure;
  if (!door) return null;
  const { id, keyId, roomIndex, cells, side, x, y, unlocked } = door;
  return { id, keyId, roomIndex, cells, side, x, y, unlocked };
}
export function createTreasureRoom(world, objects) {
  if (world.treasure) return world.treasure;
  const openWorld = { ...world, lockedTiles: undefined };
  const candidates = world.rooms.map((room, roomIndex) => ({ room, roomIndex,
    distance: findPath(openWorld, world.spawn, { x: room.cx + .5, y: room.cy + .5 }).length }))
    .filter(c => c.roomIndex !== 0 && c.room.entrances?.length >= 1 && objects.some(o => inside(c.room, o)))
    .sort((a, b) => Number(b.room.entrances.length === 1) - Number(a.room.entrances.length === 1) || b.distance - a.distance || a.roomIndex - b.roomIndex);
  for (const candidate of candidates) {
    const { room, roomIndex } = candidate, entrance = room.entrances[0];
    // Gate the inside threshold, leaving passing hallway tiles completely clear.
    const cells = [...new Map(room.entrances.flatMap(e => e.cells).map(p => {
      const cell = { x: Math.max(room.x, Math.min(room.x + room.w - 1, p.x)), y: Math.max(room.y, Math.min(room.y + room.h - 1, p.y)) };
      return [`${cell.x},${cell.y}`, cell];
    })).values()];
    const door = { id: `${world.seed}-treasure`, keyId: `${world.seed}-treasure-key`, roomIndex, cells, side: entrance.side,
      x: cells.reduce((n, p) => n + p.x + .5, 0) / cells.length, y: cells.reduce((n, p) => n + p.y + .5, 0) / cells.length, unlocked: false };
    const lockedTiles = new Uint8Array(world.tiles.length);
    for (const cell of cells) lockedTiles[cell.y * world.width + cell.x] = 1;
    const closedWorld = { ...world, lockedTiles }, reached = reachableTreasureTiles(closedWorld);
    // An optional-room lock may remove only its own floor and the gate, never a bypass.
    let safe = true;
    for (let i = 0; i < world.tiles.length; i++) if (isWalkable(closedWorld, i % world.width, Math.floor(i / world.width))
      && !inside(room, { x: i % world.width + .5, y: Math.floor(i / world.width) + .5 }) && !reached.has(i)) { safe = false; break; }
    if (!safe || reached.has(room.cy * world.width + room.cx)) continue;
    let sources = objects.filter(o => !inside(room, o) && o.approach && reached.has(Math.floor(o.approach.y) * world.width + Math.floor(o.approach.x)));
    const awayFromEntrance = sources.filter(o => !inside(world.rooms[0], o));
    if (awayFromEntrance.length) sources = awayFromEntrance;
    if (!sources.length) continue;
    const source = sources[(Math.imul(world.seed ^ 0x51a7, 2654435761) >>> 0) % sources.length];
    door.keyContainerId = source.id; source.contents.push('treasureKey');
    const prizes = ['ruby', 'candlestick', 'horn', 'sword'];
    objects.filter(o => inside(room, o)).forEach((o, i) => { o.treasure = true; o.contents = [prizes[i % prizes.length]]; });
    applyTreasureState(world, door);
    return door;
  }
  return null; // Very constrained custom layouts skip the lock rather than trap progression.
}
export function canApproachTreasure(world, player) {
  const door = world.treasure;
  if (!door || door.unlocked || player.hiding || player.state !== 'active') return false;
  const room = world.rooms[door.roomIndex];
  return door.cells.some(c => {
    const centre = { x: c.x + .5, y: c.y + .5 };
    return Math.hypot(player.x - centre.x, player.y - centre.y) <= 1.6 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const approach = { x: centre.x + dx, y: centre.y + dy };
      return !inside(room, approach) && canStand(world, approach.x, approach.y) && clearPath(world, player, approach);
    });
  });
}
export function unlockTreasure(world, player, loot) {
  if (loot.held || !canApproachTreasure(world, player)) return false;
  const index = loot.bag.findIndex(item => item.type === 'treasureKey' && item.keyId === world.treasure.keyId);
  if (index < 0) return false;
  loot.bag.splice(index, 1);
  applyTreasureState(world, { ...world.treasure, unlocked: true });
  return true;
}
