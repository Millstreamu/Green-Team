import { breakDisguise } from './potions.js';
import { BELL, COMBAT } from './config.js';
import { canStand } from './world.js';
import { clearPath } from './loot.js';
import { findPath, followPath } from './navigation.js';
import { cancelPlacement, placementPoint } from './traps.js';
import { seesPlayer } from './guard.js';

export function equipBell(aim, loot, player, id) {
  if (loot.held || player.hiding || player.state !== 'active' || !loot.bag.some(i => i.id === id && i.type === 'bell')) return false;
  cancelPlacement(aim); player.berryId = null; player.orbId = null; player.potionId = null; player.dartId = null; player.bellId = id; return true;
}
export function beginBellAim(aim, loot, player, id = player.bellId) {
  if (!id || id !== player.bellId || aim.itemId || loot.held || player.hiding || player.state !== 'active' || !loot.bag.some(i => i.id === id && i.type === 'bell')) return false;
  Object.assign(aim, { itemId: id, kind: 'bell', aimPoint: placementPoint(player, null, BELL.range) }); return true;
}
export function validBellPosition(world, player, point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return false;
  const distance = Math.hypot(point.x - player.x, point.y - player.y);
  const steps = Math.max(1, Math.ceil(distance * 20));
  for (let i = 0; i <= steps; i++) if (!canStand(world, player.x + (point.x - player.x) * i / steps, player.y + (point.y - player.y) * i / steps, .04)) return false;
  return distance >= .1 && distance <= BELL.range + .001 && canStand(world, player.x, player.y, .06)
    && canStand(world, point.x, point.y, COMBAT.guardRadius) && clearPath(world, player, point)
    && (Math.floor(player.x) === Math.floor(point.x) && Math.floor(player.y) === Math.floor(point.y) || findPath(world, player, point).length > 0);
}
export function throwBell(world, player, loot, aim, bells, id) {
  if (aim.kind !== 'bell' || aim.itemId !== id || player.bellId !== id || player.state !== 'active' || player.hiding || loot.held || !validBellPosition(world, player, aim.aimPoint)) return false;
  const index = loot.bag.findIndex(i => i.id === id && i.type === 'bell'); if (index < 0) return false;
  breakDisguise(player);
  const point = aim.aimPoint; loot.bag.splice(index, 1);
  bells.push({ id, ownerId: player.id, x: point.x, y: point.y, fromX: player.x, fromY: player.y, flightLeft: BELL.flightSeconds, left: BELL.investigateSeconds, rung: false });
  player.bellId = null; cancelPlacement(aim); return true;
}
function bellPath(world, guard, point) {
  const path = findPath(world, guard, point);
  if (!path.length && Math.floor(guard.x) === Math.floor(point.x) && Math.floor(guard.y) === Math.floor(point.y)) path.push({ ...point });
  else if (path.length) path.push({ x: point.x, y: point.y });
  // Validate full-width approaches as well as the tile route.
  let distance = 0, previous = guard;
  for (const step of path) { distance += Math.hypot(step.x - previous.x, step.y - previous.y); previous = step; }
  const probe = { x: guard.x, y: guard.y, angle: guard.angle };
  const remaining = path.map(p => ({ ...p })); followPath(world, probe, remaining, distance + .01, COMBAT.guardRadius);
  return path.length && !remaining.length && distance <= BELL.hearingRange + .001 ? path : null;
}
export function updateBells(world, bells, guards, players, dt, clouds = []) {
  const rings = [];
  for (let i = bells.length - 1; i >= 0; i--) {
    const b = bells[i]; let elapsed = Math.max(0, dt);
    if (!b.rung) {
      const flight = Math.min(b.flightLeft, elapsed); b.flightLeft -= flight; elapsed -= flight;
      if (b.flightLeft > .000001) continue;
      b.rung = true; rings.push(b);
      for (const g of guards) {
        if (g.sleepLeft > 0 || g.blindLeft > 0 || g.snareLeft > 0 || g.windup > 0 || g.swing > 0 || g.captiveId || g.captureTargetId || g.stationary || g.jailer || g.knownHiding || ['carry', 'capture'].includes(g.state)) continue;
        const alerted = ['chase', 'search'].includes(g.state) || !!g.bellWasAlerted;
        if (players.some(p => p.connected !== false && p.inRun !== false && seesPlayer(world, g, p, alerted, clouds))) continue;
        const path = bellPath(world, g, b); if (!path) continue;
        Object.assign(g, { bellTarget: { x: b.x, y: b.y }, bellLeft: BELL.investigateSeconds, bellLook: 0, bellWasAlerted: alerted,
          state: 'investigate', suspicion: 0, path, goal: null, repath: 0, trail: [], trailLeft: 0, trailSource: null, trailEnd: null, lastSeenPending: false });
      }
    }
    b.left = Math.max(0, b.left - elapsed); if (!b.left) bells.splice(i, 1);
  }
  return rings;
}
export function cancelBellInvestigation(guard) {
  guard.bellTarget = null; guard.bellLeft = 0; guard.bellLook = 0; guard.bellWasAlerted = false;
  guard.state = 'return'; guard.path = []; guard.goal = null; guard.repath = 0;
}
export function updateBellInvestigation(world, guard, dt) {
  const combat = world.tuning?.combat ?? COMBAT;
  guard.bellLeft = Math.max(0, guard.bellLeft - dt);
  if (!guard.bellLeft || !canStand(world, guard.bellTarget.x, guard.bellTarget.y, combat.guardRadius)) { cancelBellInvestigation(guard); return; }
  if (Math.hypot(guard.x - guard.bellTarget.x, guard.y - guard.bellTarget.y) <= .08) {
    guard.bellLook += dt; guard.angle += dt * 1.7; guard.moving = false;
    if (guard.bellLook >= BELL.inspectSeconds) cancelBellInvestigation(guard);
    return;
  }
  guard.moving = followPath(world, guard, guard.path, combat.searchSpeed * dt, combat.guardRadius) > 0;
  if (!guard.path.length && Math.hypot(guard.x - guard.bellTarget.x, guard.y - guard.bellTarget.y) > .08) cancelBellInvestigation(guard);
}
