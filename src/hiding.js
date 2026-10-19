import { setSolidObjects } from './world.js';
import { placeProp } from './prop-placement.js';
import { HIDING, SEARCH } from './config.js';
import { clearPath } from './loot.js';

export function createHidingSpots(world, objects = []) {
  setSolidObjects(world, objects);
  const spots = [];
  world.rooms.forEach((room, index) => {
    if (index % (world.layout?.hidingInterval ?? HIDING.roomInterval)) return;
    const point = placeProp(world, room, 'hiding', [...objects, ...spots]);
    if (point) spots.push({ id: `${world.seed}-hide-${index}`, ...point, occupantId: null });
  });
  setSolidObjects(world, [...objects, ...spots]);
  return spots;
}
export function canHide(world, player, spot) {
  return player.state === 'active' && !player.hiding && spot.occupantId == null && Math.hypot(player.x - spot.x, player.y - spot.y) <= HIDING.reach && clearPath(world, player, spot);
}
export function enterHiding(world, player, spot, witnesses = []) {
  if (!canHide(world, player, spot)) return false;
  player.hiding = { spot, outside: { x: player.x, y: player.y } };
  spot.occupantId = player.id;
  for (const guard of witnesses) {
    guard.knownHiding = { spotId: spot.id, playerId: player.id, x: player.x, y: player.y };
    guard.state = 'chase'; guard.suspicion = 1; guard.repath = 0;
    guard.windup = 0; guard.swing = 0;
  }
  player.x = spot.x; player.y = spot.y; player.moving = false; player.phase = 0; player.knockbackLeft = 0;
  return true;
}
export function leaveHiding(player) {
  if (!player.hiding) return false;
  const { spot, outside } = player.hiding;
  if (spot.occupantId === player.id) spot.occupantId = null;
  player.x = outside.x; player.y = outside.y; player.hiding = null; player.moving = false; player.phase = 0;
  return true;
}

// Same held-E, stationary, reset-on-cancel pattern as furniture searching.
export function beginHiding(world, player, spot, witnesses = []) {
  if (player.enteringHide || !canHide(world, player, spot)) return false;
  player.enteringHide = { spot, elapsed: 0, origin: { x: player.x, y: player.y }, health: player.health, witnesses: new Set(witnesses) };
  return true;
}
export function cancelHiding(player) { player.enteringHide = null; }
export function updateHiding(world, player, holdingE, dt, witnesses = [], blocked = false) {
  const attempt = player.enteringHide;
  if (!attempt) return null;
  if (!holdingE || blocked || player.health !== attempt.health || !canHide(world, player, attempt.spot)
    || Math.hypot(player.x - attempt.origin.x, player.y - attempt.origin.y) > SEARCH.movementTolerance) {
    cancelHiding(player); return { type: 'cancelled' };
  }
  for (const guard of witnesses) attempt.witnesses.add(guard);
  attempt.elapsed += Math.max(0, dt);
  if (attempt.elapsed + 0.000001 < HIDING.enterTime) return null;
  const seen = [...attempt.witnesses];
  const entered = enterHiding(world, player, attempt.spot, seen);
  cancelHiding(player);
  return entered ? { type: 'hidden', witnessed: seen.length > 0 } : { type: 'cancelled' };
}
