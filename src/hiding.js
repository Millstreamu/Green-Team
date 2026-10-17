import { HIDING } from './config.js';
import { canStand } from './world.js';
import { clearPath } from './loot.js';

export function createHidingSpots(world, objects = []) {
  const spots = [];
  world.rooms.forEach((room, index) => {
    if (index % HIDING.roomInterval) return;
    const points = [[room.x + 1.5, room.y + room.h - 1.5], [room.x + room.w - 1.5, room.y + 1.5], [room.x + 1.5, room.y + 1.5]];
    const point = points.map(([x, y]) => ({ x, y })).find(p => canStand(world, p.x, p.y) && Math.hypot(p.x - world.spawn.x, p.y - world.spawn.y) > 2 && objects.every(o => Math.hypot(p.x - o.x, p.y - o.y) > 1));
    if (point) spots.push({ id: `${world.seed}-hide-${index}`, ...point, occupantId: null });
  });
  return spots;
}
export function canHide(world, player, spot) {
  return player.state === 'active' && !player.hiding && !spot.occupantId && Math.hypot(player.x - spot.x, player.y - spot.y) <= HIDING.reach && clearPath(world, player, spot);
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
