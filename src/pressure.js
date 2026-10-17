import { HEAT, COMBAT } from './config.js';
import { isFloor, canStand } from './world.js';
import { findPath } from './navigation.js';
import { createGuard } from './guard.js';

export function createReinforcementDoors(world, obstacles = []) {
  const doors = [];
  world.rooms.forEach((room, index) => {
    if (!index || index % HEAT.doorRoomInterval !== 1) return;
    const columns = Array.from({ length: room.w - 2 }, (_, i) => room.x + i + 1)
      .sort((a, b) => Math.abs(a - room.cx) - Math.abs(b - room.cx));
    const x = columns.find(x => !isFloor(world, x, room.y - 1) && canStand(world, x + .5, room.y + .5, COMBAT.guardRadius)
      && obstacles.every(o => Math.hypot(o.x - x - .5, o.y - room.y - .5) > .9));
    if (x !== undefined) doors.push({ id: `${world.seed}-guard-door-${index}`, roomIndex: index, x: x + .5, y: room.y, spawn: { x: x + .5, y: room.y + .5 } });
  });
  return doors;
}
export function createPressure(world, obstacles = []) {
  return { alertsPerGuard: (world.tuning?.heat ?? HEAT).alertsPerGuard, heat: 0, quiet: 0, alerts: 0, reinforcements: 0, scheduled: 0, pending: [], doors: world.lair ? [] : createReinforcementDoors(world, obstacles) };
}
export function createReinforcement(world, door, serial) {
  const start = { ...door.spawn }, stops = [start], outbound = [start];
  // Cache a sweep through the rooms; never path towards an unseen player.
  const remaining = world.rooms.map((room, index) => ({ index, x: room.cx + .5, y: room.cy + .5 })).filter(p => p.index !== 0);
  let from = start;
  while (remaining.length) {
    remaining.sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y) || a.index - b.index);
    const stop = remaining.shift(), path = findPath(world, from, stop);
    if (!path.length) continue;
    outbound.push(...path); stops.push({ x: stop.x, y: stop.y }); from = stop;
  }
  const guard = createGuard(world, { roomIndex: door.roomIndex, behaviour: 'reinforcement', patrol: stops });
  Object.assign(guard, { id: `${world.seed}-reinforcement-${serial}`, x: start.x, y: start.y, home: start, angle: Math.PI / 2,
    roamRoute: [...outbound, ...outbound.slice(1, -1).reverse().map(p => ({ ...p }))], roamIndex: 1, pauseLeft: 0, reinforcement: true });
  return guard;
}
export function updatePressure(world, pressure, guards, dt) {
  const events = [];
  if (dt <= 0) return events;
  for (const pending of pressure.pending) pending.left -= dt;
  for (let i = 0; i < pressure.pending.length;) {
    const pending = pressure.pending[i];
    if (pending.left > 0.000001) { i++; continue; }
    const door = pressure.doors.find(d => d.id === pending.doorId);
    if (!door) { i++; continue; }
    const guard = createReinforcement(world, door, pending.serial);
    guards.push(guard); pressure.reinforcements++; pressure.pending.splice(i, 1);
    events.push({ type: 'arrived', door, guard });
  }
  // One count per guard per full alert cycle. Returning to routine rearms it.
  for (const guard of guards) {
    if (!['chase', 'search'].includes(guard.state) || guard.alertRecorded) continue;
    guard.alertRecorded = true; pressure.alerts++; events.push({ type: 'alert', guard });
  }
  const due = Math.floor(pressure.alerts / (world.tuning?.heat ?? HEAT).alertsPerGuard);
  while (pressure.scheduled < due && pressure.doors.length) {
    const door = pressure.doors[pressure.scheduled % pressure.doors.length];
    pressure.scheduled++;
    pressure.pending.push({ doorId: door.id, serial: pressure.scheduled, left: HEAT.arrivalWarning });
    events.push({ type: 'incoming', door });
  }
  const pursuit = guards.some(g => g.state === 'chase' || g.state === 'search' && (g.trailLeft > 0 || g.trail.length > 0));
  if (pursuit) { pressure.quiet = 0; pressure.heat = Math.min(1, pressure.heat + dt / HEAT.riseSeconds); }
  else {
    const before = pressure.quiet; pressure.quiet += dt;
    const cooling = Math.max(0, pressure.quiet - HEAT.coolDelay) - Math.max(0, before - HEAT.coolDelay);
    pressure.heat = Math.max(0, pressure.heat - cooling / HEAT.coolSeconds);
  }
  return events;
}
