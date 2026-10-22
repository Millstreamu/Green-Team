import { BERRY } from './config.js';
import { canStand } from './world.js';
import { cancelPlacement, placementPoint } from './traps.js';
import { breakDisguise } from './potions.js';
import { sweepProjectiles } from './projectiles.js';

export function equipBerries(aim, loot, player, id) {
  if (loot.held || player.hiding || player.state !== 'active' || !loot.bag.some(i => i.id === id && i.type === 'berries')) return false;
  cancelPlacement(aim); player.orbId = null; player.potionId = null; player.bellId = null; player.dartId = null; player.berryId = id; return true;
}
export function beginBerryAim(aim, loot, player, id = player.berryId) {
  if (!id || id !== player.berryId || aim.itemId || loot.held || player.hiding || player.state !== 'active' || !loot.bag.some(i => i.id === id && i.type === 'berries')) return false;
  Object.assign(aim, { itemId: id, kind: 'berries', aimPoint: placementPoint(player, null, BERRY.range) }); return true;
}
export function throwBerry(world, player, loot, aim, shots, id) {
  if (aim.kind !== 'berries' || aim.itemId !== id || player.berryId !== id || player.state !== 'active' || player.hiding || loot.held) return false;
  const index = loot.bag.findIndex(i => i.id === id && i.type === 'berries'), point = aim.aimPoint;
  if (index < 0 || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return false;
  const dx = point.x - player.x, dy = point.y - player.y, length = Math.hypot(dx, dy);
  if (length < .1 || length > BERRY.range + .001 || !canStand(world, player.x, player.y, .06)) return false;
  breakDisguise(player); loot.bag.splice(index, 1);
  shots.push({ id, ownerId: player.id, x: player.x, y: player.y, dx: dx / length, dy: dy / length, remaining: BERRY.range });
  player.berryId = null; cancelPlacement(aim); return true;
}
export function blindGuard(guard) {
  if (guard.sleepLeft > 0 || guard.blindLeft > 0) return false;
  Object.assign(guard, { blindLeft: BERRY.blindSeconds, state: 'blind', moving: false, suspicion: 0, windup: 0, swing: 0, attackAngle: null,
    bellTarget: null, bellLeft: 0, bellWasAlerted: false, knownHiding: null, targetId: null, lastSeen: null,
    trail: [], trailLeft: 0, trailSource: null, trailEnd: null, lastSeenPending: false, path: [], goal: null, repath: 0 });
  return true;
}
export function updateBerries(world, shots, guards, dt) {
  return sweepProjectiles(world, shots, guards, dt, BERRY.speed, (guard, shot) => {
    const blinded = blindGuard(guard); if (blinded) guard.blindOwnerId = shot.ownerId; return { blinded };
  });
}
