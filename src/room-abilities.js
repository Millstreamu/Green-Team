import { ABILITY, SEARCH } from './config.js';
import { clearPath, reachable, LOOT_TYPES, itemSaleValue } from './loot.js';
import { breakDisguise } from './potions.js';
import { openContainer } from './search.js';

// Crate Trap: rig one searched crate (plain or supply crate) by holding E. The first
// guard to come within ABILITY.trapReach of it is stunned and adds one alert.
export const isCrate = object => object.roomFurniture ? object.roomFurniture === 'crate' : object.type === 'crate';
export function canRig(world, player, object, objects) {
  return player.crateTrap === true && player.state === 'active' && !player.hiding && object.searched && isCrate(object) && !object.riggedBy
    && !objects.some(o => o.riggedBy === player.id) && Math.hypot(player.x - object.x, player.y - object.y) <= SEARCH.reach && clearPath(world, player, object);
}
export function beginRig(world, player, object, objects) {
  if (player.rigging || !canRig(world, player, object, objects)) return false;
  breakDisguise(player);
  player.rigging = { object, elapsed: 0, origin: { x: player.x, y: player.y } }; return true;
}
export function updateRig(world, player, holding, dt, objects) {
  const attempt = player.rigging; if (!attempt) return null;
  if (!holding || Math.hypot(player.x - attempt.origin.x, player.y - attempt.origin.y) > SEARCH.movementTolerance || !canRig(world, player, attempt.object, objects)) {
    player.rigging = null; return { type: 'cancelled' };
  }
  attempt.elapsed += Math.max(0, dt);
  if (attempt.elapsed + .000001 < ABILITY.rigSeconds) return null;
  attempt.object.riggedBy = player.id; player.rigging = null; return { type: 'rigged', object: attempt.object };
}
export function updateCrateTraps(objects, guards, pressure) {
  const events = [];
  for (const object of objects) {
    if (!object.riggedBy) continue;
    const guard = guards.find(g => Number.isFinite(g.x) && Math.hypot(g.x - object.x, g.y - object.y) <= ABILITY.trapReach);
    if (!guard) continue;
    guard.snareLeft = Math.max(guard.snareLeft ?? 0, ABILITY.trapStun); guard.moving = false; guard.windup = 0; guard.swing = 0;
    events.push({ type: 'sprung', object, guard, ownerId: object.riggedBy });
    object.riggedBy = null; object.trapSprung = true;
    if (pressure) pressure.alerts++;
  }
  return events;
}

// Sack Sacrifice: hold Space by a dropped valuable (worth ABILITY.sacrificeMinGold or
// more) to spend it and open every unsearched container in its room.
export function roomAt(world, point) {
  return world.rooms.findIndex(r => point.x >= r.x && point.x < r.x + r.w && point.y >= r.y && point.y < r.y + r.h);
}
export function sacrificeRoomObjects(world, objects, roomIndex) {
  const room = world.rooms[roomIndex];
  if (!room || world.treasure && !world.treasure.unlocked && world.treasure.roomIndex === roomIndex) return [];
  return objects.filter(o => !o.searched && o.x >= room.x && o.x < room.x + room.w && o.y >= room.y && o.y < room.y + room.h);
}
export function canSacrifice(world, player, item, objects) {
  return player.sackSacrifice === true && player.state === 'active' && !player.hiding && !!item && !LOOT_TYPES[item.type]?.runOnly && !!LOOT_TYPES[item.type]?.sellValue
    && itemSaleValue(item) >= ABILITY.sacrificeMinGold && reachable(world, player, item) && sacrificeRoomObjects(world, objects, roomAt(world, item)).length > 0;
}
export function sacrificeTarget(world, player, ground, objects) {
  return ground.filter(item => canSacrifice(world, player, item, objects)).sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0] ?? null;
}
export function beginSacrifice(world, player, item, objects) {
  if (player.sacrificing || !canSacrifice(world, player, item, objects)) return false;
  player.sacrificing = { item, elapsed: 0, origin: { x: player.x, y: player.y }, health: player.health }; return true;
}
export function updateSacrifice(world, player, holding, dt, loot, objects) {
  const attempt = player.sacrificing; if (!attempt) return null;
  if (!holding || player.health !== attempt.health || Math.hypot(player.x - attempt.origin.x, player.y - attempt.origin.y) > SEARCH.movementTolerance
    || !loot.ground.includes(attempt.item) || !canSacrifice(world, player, attempt.item, objects)) { player.sacrificing = null; return { type: 'cancelled' }; }
  attempt.elapsed += Math.max(0, dt);
  if (attempt.elapsed + .000001 < ABILITY.sacrificeSeconds) return null;
  const opened = sacrificeRoomObjects(world, objects, roomAt(world, attempt.item));
  loot.ground.splice(loot.ground.indexOf(attempt.item), 1);
  breakDisguise(player);
  for (const object of opened) openContainer(world, player, object, loot);
  player.sacrificing = null;
  return { type: 'sacrificed', item: attempt.item, opened };
}
