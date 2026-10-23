import { setSolidObjects } from './world.js';
import { placeProp } from './prop-placement.js';
import { HIDING, SEARCH } from './config.js';
import { clearPath } from './loot.js';

export function createHidingSpots(world, objects = []) {
  setSolidObjects(world, objects);
  const spots = [];
  world.rooms.forEach((room, index) => {
    if (room.roomType!=='bedroom' && index % (world.layout?.hidingInterval ?? HIDING.roomInterval)) return;
    const point = placeProp(world, room, 'hiding', [...objects, ...spots],room.roomType==='bedroom'?{solid:true,width:1,height:1,placement:'corner'}:undefined);
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
// Barrel Anchor: one personal barrel per raid, reached from any other barrel.
export function setHidingAnchor(player) {
  if (!player.hidingAnchor || !player.hiding || player.state !== 'active') return false;
  player.anchorSpotId = player.hiding.spot.id; return true;
}
export function travelToAnchor(player, spots, guards = []) {
  if (!player.hidingAnchor || !player.hiding || player.state !== 'active') return 'unavailable';
  const from = player.hiding.spot, to = spots.find(spot => spot.id === player.anchorSpotId);
  if (!to) return 'none';
  if (to.id === from.id) return 'here';
  if (player.anchorCooldown > 0) return 'cooldown';
  if (to.occupantId != null) return 'occupied';
  // Guards who saw the goblin hide head for the barrel it left and search from there.
  for (const guard of guards) if (guard.knownHiding?.playerId === player.id) { guard.lastSeen = { x: guard.knownHiding.x, y: guard.knownHiding.y }; guard.knownHiding = null; }
  if (from.occupantId === player.id) from.occupantId = null;
  to.occupantId = player.id;
  player.hiding = { spot: to, outside: { x: to.approach.x, y: to.approach.y } };
  player.x = to.x; player.y = to.y; player.anchorCooldown = HIDING.anchorCooldown;
  return 'moved';
}
// Space returns to the anchor (or sets the first one); R / Rotate moves it to this barrel.
export function useHidingAnchor(player, spots, guards = [], moveHere = false) {
  if (moveHere || !player.anchorSpotId) return setHidingAnchor(player) ? 'set' : 'unavailable';
  return travelToAnchor(player, spots, guards);
}
export function anchorMessage(result, player) {
  return { set: 'Anchor set on this barrel. From another barrel, Space brings you back here.', moved: `Back in your anchor barrel, still hidden. Next jump in ${Math.ceil(player.anchorCooldown)}s.`,
    here: 'This is your anchor barrel. R or Rotate moves the anchor to the barrel you are in.', cooldown: `Anchor recharging · ${Math.ceil(player.anchorCooldown)}s.`,
    occupied: 'Someone is in your anchor barrel. Try again soon.', none: 'Your anchor barrel is gone.', unavailable: '' }[result] ?? '';
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
