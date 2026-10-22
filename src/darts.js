import { sceneViewport } from './viewport.js';
import { sweepProjectiles } from './projectiles.js';
import { breakDisguise } from './potions.js';
import { DART, COMBAT, CONFIG } from './config.js';
import { canStand } from './world.js';
import { cancelPlacement, placementPoint } from './traps.js';

export function equipDart(aim, loot, player, id) {
  if (loot.held || player.hiding || player.state !== 'active' || !loot.bag.some(i => i.id === id && i.type === 'dart')) return false;
  cancelPlacement(aim); player.berryId = null; player.orbId = null; player.potionId = null; player.bellId = null; player.dartId = id;
  return true;
}
export function beginDartAim(aim, loot, player, id = player.dartId) {
  if (!id || id !== player.dartId || loot.held || player.hiding || player.state !== 'active' || !loot.bag.some(i => i.id === id && i.type === 'dart')) return false;
  if (aim.itemId) return false;
  Object.assign(aim, { itemId: id, kind: 'dart', aimPoint: placementPoint(player, null, DART.range) });
  return true;
}
export function fireDart(world, player, loot, aim, darts, id) {
  if (aim.kind !== 'dart' || aim.itemId !== id || player.dartId !== id || player.state !== 'active' || player.hiding || loot.held) return false;
  const index = loot.bag.findIndex(i => i.id === id && i.type === 'dart'), point = aim.aimPoint;
  if (index < 0 || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return false;
  const dx = point.x - player.x, dy = point.y - player.y, length = Math.hypot(dx, dy);
  if (length < .1 || length > DART.range + .001 || !canStand(world, player.x, player.y, .06)) return false;
  breakDisguise(player);
  loot.bag.splice(index, 1);
  darts.push({ id, ownerId: player.id, x: player.x, y: player.y, dx: dx / length, dy: dy / length, remaining: DART.range });
  player.dartId = null; cancelPlacement(aim); return true;
}
export function sleepGuard(guard, onSleep = () => {}) {
  if (guard.sleepLeft > 0) return false;
  onSleep(guard);
  Object.assign(guard, { blindLeft: 0, sleepLeft: DART.sleepSeconds, state: 'sleep', moving: false, suspicion: 0, windup: 0, swing: 0,
    bellTarget: null, bellLeft: 0, bellWasAlerted: false, attackAngle: null, knownHiding: null, targetId: null, trail: [], trailLeft: 0, trailSource: null, trailEnd: null, lastSeenPending: false, path: [], repath: 0 });
  return true;
}
export function updateDarts(world, darts, guards, dt, onSleep = () => {}) {
  return sweepProjectiles(world, darts, guards, dt, DART.speed, (guard, dart) => {
    const slept = sleepGuard(guard, onSleep); if (slept) guard.sleepOwnerId = dart.ownerId; return { slept };
  });
}

// Reticle stays visible on narrow/short game viewports. This bounds UI aim,
// never enlarges server range or auto-targets a guard.
export function boundDartAim(aim, player, canvas) {
  if (!['dart', 'bell', 'berries'].includes(aim?.kind) || !aim.aimPoint) return;
  const { width, height } = sceneViewport(canvas);
  const halfX = Math.max(.25, width / CONFIG.tile / 2 - .5);
  const halfY = Math.max(.25, height / CONFIG.tile / 2 - .65);
  aim.aimPoint = { x: Math.max(player.x - halfX, Math.min(player.x + halfX, aim.aimPoint.x)),
    y: Math.max(player.y - halfY, Math.min(player.y + halfY, aim.aimPoint.y)) };
}
