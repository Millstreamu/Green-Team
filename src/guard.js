import { CONFIG, COMBAT, GUARD_PATTERNS } from './config.js';
import { canStand } from './world.js';
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

export function createGuard(world, options = {}) {
  const nearest = world.rooms.map((room, index) => ({ room, index })).filter(entry => entry.index !== 0)
    .sort((a, b) => Math.hypot(a.room.cx - world.rooms[0].cx, a.room.cy - world.rooms[0].cy) - Math.hypot(b.room.cx - world.rooms[0].cx, b.room.cy - world.rooms[0].cy));
  const roomIndex = options.roomIndex ?? nearest[0]?.index ?? 0;
  const homeRoom = world.rooms[roomIndex], behaviour = options.behaviour ?? 'room';
  const patrol = behaviour === 'lookout' ? [{ x: homeRoom.cx + 0.5, y: homeRoom.cy + 0.5 }] : [
    { x: homeRoom.x + 1.5, y: homeRoom.cy + 0.5 },
    { x: homeRoom.x + homeRoom.w - 1.5, y: homeRoom.cy + 0.5 }
  ];
  const doorAngles = { north: -Math.PI / 2, east: 0, south: Math.PI / 2, west: Math.PI };
  const sides = [...new Set((homeRoom.entrances ?? []).map(door => door.side))];
  const firstAngle = doorAngles[sides[0]] ?? 0;
  const watchAngles = [firstAngle, sides[1] ? doorAngles[sides[1]] : firstAngle + Math.PI];
  return { id: `${world.seed ?? 0}-guard-${roomIndex}`, roomIndex, behaviour, homeRoom, home: { ...patrol[0] }, x: patrol[0].x, y: patrol[0].y,
    angle: firstAngle, watchAngles, watchIndex: 0, watchLeft: GUARD_PATTERNS.lookPause, pauseLeft: GUARD_PATTERNS.roomPause,
    state: 'patrol', suspicion: 0, patrol, patrolIndex: behaviour === 'lookout' ? 0 : 1, path: [], repath: 0, goal: null, lastSeen: null,
    searchLeft: COMBAT.searchTime, trail: [], trailLeft: 0, trailSource: null, trailEnd: null,
    windup: 0, cooldown: 0, swing: 0, moving: false, resumeState: 'patrol' };
}

export function createGuards(world) {
  const rooms = world.rooms.map((room, index) => ({ room, index })).filter(entry => entry.index !== 0)
    .map(entry => ({ ...entry, distance: findPath(world, world.spawn, { x: entry.room.cx + 0.5, y: entry.room.cy + 0.5 }).length }))
    .sort((a, b) => a.distance - b.distance);
  const count = Math.min(GUARD_PATTERNS.count, rooms.length);
  const selected = Array.from({ length: count }, (_, i) => count === 1 ? 0 : Math.round(i * (rooms.length - 1) / (count - 1))); 
  return selected.filter(index => rooms[index]).map((index, i) => createGuard(world, { roomIndex: rooms[index].index, behaviour: i === 1 ? 'room' : 'lookout' }));
}

function turnGuard(guard, angle, dt) {
  const difference = Math.atan2(Math.sin(angle - guard.angle), Math.cos(angle - guard.angle));
  guard.angle += Math.sign(difference) * Math.min(Math.abs(difference), GUARD_PATTERNS.turnSpeed * dt);
}

function resetGuardRoutine(guard) {
  guard.watchIndex = 0; guard.watchLeft = GUARD_PATTERNS.lookPause; guard.pauseLeft = GUARD_PATTERNS.roomPause;
  guard.patrolIndex = guard.behaviour === 'lookout' ? 0 : 1; guard.path = []; guard.goal = null; guard.repath = 0;
  clearGuardTrail(guard);
}

function clearGuardTrail(guard) {
  guard.trail = []; guard.trailLeft = 0; guard.trailSource = null; guard.trailEnd = null;
}

function recordGuardTrail(world, guard, player, dt) {
  if (guard.trailLeft <= 0) return;
  const previous = guard.trailSource;
  // Trace only continuous valid movement, never a teleport or an off-map target.
  const distance = previous ? Math.hypot(player.x - previous.x, player.y - previous.y) : Infinity;
  if (previous && distance <= Math.max(0.6, CONFIG.speed * dt * 1.6) && canStand(world, player.x, player.y) && clearPath(world, previous, player)) {
    const last = guard.trailEnd;
    // Keep turns when crossing tiles, even before reaching the spacing limit.
    if (!last || Math.hypot(last.x - player.x, last.y - player.y) >= COMBAT.trailSpacing || Math.floor(last.x) !== Math.floor(player.x) || Math.floor(last.y) !== Math.floor(player.y)) {
      const point = { x: player.x, y: player.y };
      guard.trail.push(point); guard.trailEnd = { ...point };
    }
    guard.trailSource = { x: player.x, y: player.y };
  }
  guard.trailLeft = Math.max(0, guard.trailLeft - dt);
}

function updateRoutine(world, guard, dt) {
  if (guard.behaviour === 'lookout') {
    guard.watchLeft -= dt;
    if (guard.watchLeft <= 0) { guard.watchLeft += GUARD_PATTERNS.lookPause; guard.watchIndex = (guard.watchIndex + 1) % 2; }
    turnGuard(guard, guard.watchAngles[guard.watchIndex], dt);
    return;
  }
  if (guard.pauseLeft > 0) {
    guard.pauseLeft = Math.max(0, guard.pauseLeft - dt);
    turnGuard(guard, guard.watchAngles[guard.watchIndex], dt); return;
  }
  const goal = guard.patrol[guard.patrolIndex];
  if (Math.hypot(goal.x - guard.x, goal.y - guard.y) < 0.08) {
    guard.patrolIndex = (guard.patrolIndex + 1) % guard.patrol.length;
    guard.watchIndex = (guard.watchIndex + 1) % 2; guard.pauseLeft = GUARD_PATTERNS.roomPause; guard.repath = 0; return;
  }
  setGuardGoal(world, guard, goal, dt);
  guard.moving = followPath(world, guard, guard.path, COMBAT.patrolSpeed * dt, COMBAT.guardRadius) > 0;
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
    if (!guard.path.length && canStand(world, point.x, point.y, COMBAT.guardRadius) && Math.floor(point.x) === Math.floor(guard.x) && Math.floor(point.y) === Math.floor(guard.y) && clearPath(world, guard, point)) guard.path = [{ ...point }];
  }
}

export function updateGuard(world, guard, player, dt) {
  const events = { hit: false, spotted: false };
  if (player.state !== 'active' || dt <= 0) return events;
  guard.cooldown = Math.max(0, guard.cooldown - dt); guard.swing = Math.max(0, guard.swing - dt); guard.moving = false;
  const alerted = guard.state === 'chase' || guard.state === 'search';
  const sees = seesPlayer(world, guard, player, alerted);
  if (sees) {
    clearGuardTrail(guard);
    guard.lastSeen = { x: player.x, y: player.y };
    if (alerted) guard.state = 'chase';
    else {
      if (guard.state !== 'suspicious') guard.resumeState = guard.state;
      guard.state = 'suspicious'; guard.angle = Math.atan2(player.y - guard.y, player.x - guard.x);
      guard.suspicion = Math.min(1, guard.suspicion + dt / COMBAT.noticeTime);
      if (guard.suspicion >= 1) { guard.state = 'chase'; guard.repath = 0; events.spotted = true; }
    }
  } else if (guard.state === 'suspicious') {
    guard.suspicion = Math.max(0, guard.suspicion - dt * 1.5);
    if (!guard.suspicion) guard.state = guard.resumeState;
  } else if (guard.state === 'chase') {
    guard.state = 'search'; guard.searchLeft = COMBAT.searchTime; guard.repath = 0;
    guard.trail = guard.lastSeen ? [{ ...guard.lastSeen }] : [];
    guard.trailSource = guard.lastSeen ? { ...guard.lastSeen } : null;
    guard.trailEnd = guard.lastSeen ? { ...guard.lastSeen } : null;
    guard.trailLeft = COMBAT.trailSeconds;
  }
  if (guard.state === 'search') recordGuardTrail(world, guard, player, dt);
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
    while (guard.trail.length && Math.hypot(guard.trail[0].x - guard.x, guard.trail[0].y - guard.y) <= 0.35) {
      guard.trail.shift(); guard.repath = 0;
    }
    const goal = guard.trail[0];
    if (goal) {
      setGuardGoal(world, guard, goal, dt);
      guard.moving = followPath(world, guard, guard.path, COMBAT.searchSpeed * dt, COMBAT.guardRadius) > 0;
      if (!guard.path.length && !guard.moving) { guard.trail.shift(); guard.repath = 0; }
    } else if (guard.trailLeft <= 0) { guard.searchLeft -= dt; guard.angle += dt * 1.7; }
    if (guard.searchLeft <= 0) {
      guard.state = 'return'; guard.suspicion = 0; guard.repath = 0; guard.lastSeen = null; clearGuardTrail(guard);
    }
  } else if (guard.state === 'return') {
    if (Math.hypot(guard.home.x - guard.x, guard.home.y - guard.y) <= 0.05) {
      guard.x = guard.home.x; guard.y = guard.home.y; guard.state = 'patrol'; resetGuardRoutine(guard);
    } else {
      setGuardGoal(world, guard, guard.home, dt);
      guard.moving = followPath(world, guard, guard.path, COMBAT.patrolSpeed * dt, COMBAT.guardRadius) > 0;
    }
  } else if (guard.state === 'patrol') updateRoutine(world, guard, dt);

  return events;
}
