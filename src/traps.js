import { breakDisguise } from './potions.js';
import { CONFIG, TRAPS, DART, BELL, BERRY } from './config.js';
import { canStand } from './world.js';
import { clearPath } from './loot.js';

export function createPlacement() { return { itemId: null, kind: null, elapsed: 0, ready: false, point: null, origin: null, aimPoint: null }; }
export function cancelPlacement(placement) { Object.assign(placement, createPlacement()); }
export function interruptPlacement(placement) { placement.elapsed = 0; placement.ready = false; placement.origin = null; }
export function equipSnare(placement, loot, id) {
  if (loot.held || !loot.bag.some(item => item.id === id && item.type === 'snare')) return false;
  cancelPlacement(placement); placement.itemId = id;
  // Keep the sack cell reserved until completion, so cancel never loses an item.
  return true;
}
export function placementPoint(player, pointer = null, reach = TRAPS.reach) {
  const dx = pointer ? pointer.x - player.x : player.facing || 1, dy = pointer ? pointer.y - player.y : 0;
  const distance = Math.hypot(dx, dy), scale = distance > reach ? reach / distance : 1;
  return { x: player.x + dx * scale, y: player.y + dy * scale };
}
export function validTrapPosition(world, player, point, traps, objects = []) {
  return !!point && Math.hypot(point.x - player.x, point.y - player.y) <= TRAPS.reach + 0.001 && canStand(world, point.x, point.y, TRAPS.triggerRadius)
    && clearPath(world, player, point) && traps.every(trap => trap.phase === 'spent' || Math.hypot(trap.x - point.x, trap.y - point.y) >= 0.8)
    && objects.every(object => Math.hypot(object.x - point.x, object.y - point.y) >= 0.65);
}
export function updatePlacement(placement, world, player, loot, traps, objects, point, heldE, dt) {
  if (!placement.itemId || ['dart', 'bell', 'berries'].includes(placement.kind)) return null;
  if (player.hiding || player.state === 'down' || !loot.bag.some(item => item.id === placement.itemId)) { cancelPlacement(placement); return null; }
  if (placement.point && Math.hypot(placement.point.x - point.x, placement.point.y - point.y) > 0.1) { placement.elapsed = 0; placement.origin = null; }
  placement.point = { ...point };
  if (!heldE) { placement.ready = true; placement.elapsed = 0; placement.origin = null; return null; }
  if (!placement.ready || player.moving || !validTrapPosition(world, player, point, traps, objects)) { placement.elapsed = 0; placement.origin = null; return null; }
  placement.origin ??= { x: player.x, y: player.y };
  if (Math.hypot(placement.origin.x - player.x, placement.origin.y - player.y) > 0.08) { interruptPlacement(placement); return null; }
  placement.elapsed += Math.max(0, dt);
  if (placement.elapsed + 0.000001 < TRAPS.placeTime) return null;
  const index = loot.bag.findIndex(item => item.id === placement.itemId);
  const trap = { id: placement.itemId, ...point, phase: 'arming', ownerId: player.id ?? 'goblin', ownerClear: false, armLeft: TRAPS.armDelay };
  breakDisguise(player);
  loot.bag.splice(index, 1); traps.push(trap); cancelPlacement(placement);
  return { type: 'placed', trap };
}
export function updateTraps(traps, goblins, guards, dt) {
  const events = [];
  for (const trap of traps) {
    if (trap.phase === 'spent') continue;
    if (trap.phase === 'arming') {
      const owner = goblins.find(g => (g.id ?? 'goblin') === trap.ownerId);
      if (!owner || Math.hypot(owner.x - trap.x, owner.y - trap.y) > TRAPS.triggerRadius + CONFIG.radius + TRAPS.clearMargin) trap.ownerClear = true;
      if (!trap.ownerClear) continue;
      trap.armLeft = Math.max(0, trap.armLeft - dt);
      if (trap.armLeft > 0) continue;
      trap.phase = 'armed'; events.push({ type: 'armed', trap });
    }
    const goblin = goblins.find(g => g.state !== 'down' && !g.hiding && Math.hypot(g.x - trap.x, g.y - trap.y) <= TRAPS.triggerRadius + CONFIG.radius);
    const guard = guards.find(g => Math.hypot(g.x - trap.x, g.y - trap.y) <= TRAPS.triggerRadius + CONFIG.radius);
    if (!goblin && !guard) continue;
    trap.phase = 'spent'; trap.triggeredBy = goblin ? 'goblin' : 'guard';
    if (!goblin) { guard.snareLeft = TRAPS.holdTime; guard.windup = 0; guard.moving = false; }
    events.push({ type: goblin ? 'goblin-triggered' : 'guard-triggered', trap, guard: goblin ? null : guard });
  }
  return events;
}

export function moveTrapAim(placement, player, direction, dt) {
  const length = Math.hypot(direction.x, direction.y);
  if (!length) return false;
  const current = placement.aimPoint ?? placement.point ?? placementPoint(player);
  placement.aimPoint = placementPoint(player, { x: current.x + direction.x / length * 2.5 * dt, y: current.y + direction.y / length * 2.5 * dt }, placement.kind === 'dart' ? DART.range : placement.kind === 'bell' ? BELL.range : placement.kind === 'berries' ? BERRY.range : TRAPS.reach);
  placement.elapsed = 0; placement.origin = null;
  return true;
}
