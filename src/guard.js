import { COMBAT } from './config.js';
import { clearPath } from './loot.js';
import { findPath, followPath } from './navigation.js';

export function createVitality() { return { health: COMBAT.health, maxHealth: COMBAT.health, invulnerable: 0, state: 'active' }; }
export function tickVitality(player, dt) { player.invulnerable = Math.max(0, player.invulnerable - dt); }
export function hurtPlayer(player, damage = 1) {
  if (player.state !== 'active' || player.invulnerable > 0) return false;
  player.health = Math.max(0, player.health - damage); player.invulnerable = COMBAT.invulnerable;
  if (!player.health) { player.state = 'down'; player.moving = false; player.phase = 0; }
  return true;
}

export function createGuard(world) {
  const rooms = world.rooms.slice(1).sort((a, b) => Math.hypot(a.cx + 0.5 - world.spawn.x, a.cy + 0.5 - world.spawn.y) - Math.hypot(b.cx + 0.5 - world.spawn.x, b.cy + 0.5 - world.spawn.y));
  const home = rooms[0] ?? world.rooms[0];
  const destinations = [home, world.rooms[0], ...rooms.slice(1, 2)].map(room => ({ x: room.cx + 0.5, y: room.cy + 0.5 }));
  if (destinations.length === 1) destinations.push({ x: home.x + 1.5, y: home.y + 1.5 });
  return { x: home.cx + 0.5, y: home.cy + 0.5, angle: 0, state: 'patrol', suspicion: 0, patrol: destinations, patrolIndex: 1, path: [], repath: 0, goal: null, lastSeen: null, searchLeft: COMBAT.searchTime, windup: 0, cooldown: 0, swing: 0, moving: false };
}

export function seesPlayer(world, guard, player, alerted = false) {
  const dx = player.x - guard.x, dy = player.y - guard.y, distance = Math.hypot(dx, dy);
  if (distance > (alerted ? COMBAT.alertSight : COMBAT.sight) || !clearPath(world, guard, player)) return false;
  if (alerted || distance < 1.2) return true;
  return (dx * Math.cos(guard.angle) + dy * Math.sin(guard.angle)) / distance >= Math.cos(COMBAT.halfCone);
}

function setGuardGoal(world, guard, point, dt) {
  guard.repath -= dt;
  const changed = !guard.goal || Math.floor(guard.goal.x) !== Math.floor(point.x) || Math.floor(guard.goal.y) !== Math.floor(point.y);
  if (changed || guard.repath <= 0) {
    guard.path = findPath(world, guard, point); guard.goal = { ...point }; guard.repath = 0.5;
  }
}

export function updateGuard(world, guard, player, dt) {
  const events = { hit: false, spotted: false };
  if (player.state !== 'active' || dt <= 0) return events;
  guard.cooldown = Math.max(0, guard.cooldown - dt); guard.swing = Math.max(0, guard.swing - dt); guard.moving = false;
  const alerted = guard.state === 'chase' || guard.state === 'search';
  const sees = seesPlayer(world, guard, player, alerted);
  if (sees) {
    guard.lastSeen = { x: player.x, y: player.y };
    if (alerted) guard.state = 'chase';
    else {
      guard.state = 'suspicious'; guard.angle = Math.atan2(player.y - guard.y, player.x - guard.x);
      guard.suspicion = Math.min(1, guard.suspicion + dt / COMBAT.noticeTime);
      if (guard.suspicion >= 1) { guard.state = 'chase'; guard.repath = 0; events.spotted = true; }
    }
  } else if (guard.state === 'suspicious') {
    guard.suspicion = Math.max(0, guard.suspicion - dt * 1.5);
    if (!guard.suspicion) guard.state = 'patrol';
  } else if (guard.state === 'chase') {
    guard.state = 'search'; guard.searchLeft = COMBAT.searchTime; guard.repath = 0;
  }
  // A strike has a visible wind-up. Stepping out of range makes it miss.
  if (guard.windup > 0) {
    guard.windup = Math.max(0, guard.windup - dt);
    if (!guard.windup) {
      guard.swing = 0.18; guard.cooldown = COMBAT.cooldown;
      if (Math.hypot(player.x - guard.x, player.y - guard.y) <= COMBAT.attackRange && clearPath(world, guard, player)) events.hit = hurtPlayer(player);
    }
    return events;
  }
  if (guard.state === 'suspicious') return events;
  if (guard.state === 'chase' && sees) {
    const distance = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (distance <= COMBAT.attackRange) {
      guard.angle = Math.atan2(player.y - guard.y, player.x - guard.x);
      if (!guard.cooldown) guard.windup = COMBAT.windup;
      return events;
    }
    // Navigate to the target's tile; approach precisely once inside that tile.
    if (Math.floor(player.x) === Math.floor(guard.x) && Math.floor(player.y) === Math.floor(guard.y)) guard.path = [{ x: player.x, y: player.y }];
    else setGuardGoal(world, guard, player, dt);
    guard.moving = followPath(world, guard, guard.path, COMBAT.chaseSpeed * dt, COMBAT.guardRadius) > 0;
  } else if (guard.state === 'search') {
    const goal = guard.lastSeen;
    if (goal && Math.hypot(goal.x - guard.x, goal.y - guard.y) > 0.6) {
      setGuardGoal(world, guard, goal, dt);
      guard.moving = followPath(world, guard, guard.path, COMBAT.chaseSpeed * dt, COMBAT.guardRadius) > 0;
      // Unreachable or exhausted routes cannot leave the guard searching forever.
      if (!guard.path.length && !guard.moving) guard.searchLeft -= dt;
    } else { guard.searchLeft -= dt; guard.angle += dt * 1.7; }
    if (guard.searchLeft <= 0) { guard.state = 'patrol'; guard.suspicion = 0; guard.repath = 0; guard.lastSeen = null; }
  } else if (guard.state === 'patrol') {
    const goal = guard.patrol[guard.patrolIndex];
    if (Math.hypot(goal.x - guard.x, goal.y - guard.y) < 0.2) { guard.patrolIndex = (guard.patrolIndex + 1) % guard.patrol.length; guard.repath = 0; }
    setGuardGoal(world, guard, guard.patrol[guard.patrolIndex], dt);
    guard.moving = followPath(world, guard, guard.path, COMBAT.patrolSpeed * dt, COMBAT.guardRadius) > 0;
  }
  return events;
}
