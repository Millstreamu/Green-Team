import test from 'node:test';
import assert from 'node:assert/strict';
import { HEAT, CONFIG, COMBAT } from '../src/config.js';
import { generateDungeon, isFloor, canStand } from '../src/world.js';
import { createSearchables, selectInteraction } from '../src/search.js';
import { createHidingSpots, enterHiding } from '../src/hiding.js';
import { createPressure, createReinforcement, updatePressure } from '../src/pressure.js';
import { createGuard, createVitality, updateGuard, heatedChaseSpeed } from '../src/guard.js';
import { findPath } from '../src/navigation.js';
import { pressureLabel, drawReinforcementDoors } from '../src/pressure-view.js';

function setup(seed = 42) {
  const world = generateDungeon(seed), objects = createSearchables(world), hiding = createHidingSpots(world, objects);
  return { world, pressure: createPressure(world, [...objects, ...hiding]) };
}
const activeGuard = id => ({ id, state: 'chase', trail: [], trailLeft: 0 });

test('100 layouts place repeatable guard-only doors in solid north walls with reachable clear spawns', () => {
  for (let seed = 0; seed < 100; seed++) {
    const { world, pressure } = setup(seed);
    assert.ok(pressure.doors.length >= 2);
    assert.deepEqual(pressure.doors, setup(seed).pressure.doors);
    for (const door of pressure.doors) {
      assert.notEqual(door.roomIndex, 0);
      assert.equal(door.y, world.rooms[door.roomIndex].y);
      assert.equal(isFloor(world, Math.floor(door.x), door.y - 1), false);
      assert.ok(canStand(world, door.spawn.x, door.spawn.y));
      assert.ok(findPath(world, world.spawn, door.spawn).length);
      assert.equal(selectInteraction(world, { ...door.spawn, state: 'active' }, [], [], null, []), null);
    }
  }
});

test('each full guard alert counts separately, carries remainder, warns before arrival and never removes extra guards', () => {
  const { world, pressure } = setup(), guards = [activeGuard('one'), activeGuard('two')];
  updatePressure(world, pressure, guards, .05);
  assert.equal(pressure.alerts, 2); assert.equal(pressure.pending.length, 0);
  guards.push(activeGuard('three'), activeGuard('four'));
  const events = updatePressure(world, pressure, guards, .05);
  assert.equal(pressure.alerts, 4); assert.equal(events.filter(e => e.type === 'incoming').length, 1);
  assert.equal(guards.length, 4); assert.equal(pressure.pending[0].left, HEAT.arrivalWarning);
  assert.match(pressureLabel(pressure), /Alerts 4 \(1\/3\).*GUARD INCOMING/);
  for (let i = 0; i < 20; i++) updatePressure(world, pressure, guards, .05);
  assert.equal(pressure.alerts, 4); assert.equal(guards.length, 4);
  for (let i = 0; i < 20; i++) updatePressure(world, pressure, guards, .05);
  assert.equal(guards.length, 5); assert.equal(pressure.reinforcements, 1);
  const added = guards[4]; assert.equal(added.state, 'patrol'); assert.equal(added.reinforcement, true);
  for (const g of guards) { g.state = 'patrol'; g.trail = []; }
  updatePressure(world, pressure, guards, 100);
  assert.equal(pressure.heat, 0); assert.equal(pressure.alerts, 4); assert.equal(guards.length, 5);
});

test('heat rises once for team pursuit, holds through brief sight breaks, cools only after grace and caps chase speed', () => {
  const { world, pressure } = setup(), guards = [activeGuard('one'), activeGuard('two')];
  updatePressure(world, pressure, guards, HEAT.riseSeconds / 2);
  assert.equal(pressure.heat, .5);
  guards.forEach(g => { g.state = 'search'; g.trailLeft = 1; });
  updatePressure(world, pressure, guards, HEAT.riseSeconds);
  assert.equal(pressure.heat, 1);
  guards.forEach(g => { g.trailLeft = 0; });
  updatePressure(world, pressure, guards, HEAT.coolDelay - .1);
  assert.equal(pressure.heat, 1);
  updatePressure(world, pressure, guards, .2);
  assert.ok(Math.abs(pressure.heat - (1 - .1 / HEAT.coolSeconds)) < .000001);
  assert.equal(heatedChaseSpeed(0), COMBAT.chaseSpeed);
  assert.equal(heatedChaseSpeed(2), CONFIG.speed * HEAT.maxSpeedRatio);
  assert.ok(heatedChaseSpeed(1) > CONFIG.speed);
  guards[0].state = 'chase'; updatePressure(world, pressure, guards, .05);
  assert.equal(pressure.quiet, 0); assert.equal(pressure.alerts, 2);
});

test('a real guard counts on full notice, does not recount reacquisition, and rearms only after returning to its routine', () => {
  const world = { seed: 7, width: 30, height: 30, tiles: new Uint8Array(900).fill(1), spawn: { x: 3.5, y: 3.5 }, rooms: [{ x: 1, y: 1, w: 26, h: 26, cx: 5, cy: 5 }] };
  const pressure = createPressure(world), guard = createGuard(world, { roomIndex: 0, behaviour: 'lookout' });
  const player = { id: 'goblin', x: guard.x + 3, y: guard.y, ...createVitality() }, guards = [guard];
  guard.angle = 0;
  const step = () => { updateGuard(world, guard, player, .05); updatePressure(world, pressure, guards, .05); };
  for (let i = 0; i < 10; i++) step(); assert.equal(pressure.alerts, 0);
  for (let i = 0; i < 8; i++) step(); assert.equal(pressure.alerts, 1);
  player.hiding = {}; step(); assert.equal(guard.state, 'search');
  player.hiding = null; step(); assert.equal(guard.state, 'chase'); assert.equal(pressure.alerts, 1);
  player.hiding = {}; Object.assign(guard, { state: 'search', searchLeft: 0, trailLeft: 0, trail: [] });
  step(); assert.equal(guard.state, 'return'); assert.equal(guard.alertRecorded, true);
  guard.x = guard.home.x; guard.y = guard.home.y; step();
  assert.equal(guard.state, 'patrol'); assert.equal(guard.alertRecorded, false);
  player.hiding = null; player.x = guard.x + 3; player.y = guard.y; guard.angle = 0;
  for (let i = 0; i < 18; i++) step(); assert.equal(pressure.alerts, 2);
});

test('witnessing entry alerts a guard once and heat changes pursuit speed without changing attack timing', () => {
  const world = { seed: 1, width: 30, height: 30, tiles: new Uint8Array(900).fill(1), spawn: { x: 2.5, y: 2.5 }, rooms: [{ x: 1, y: 1, w: 26, h: 26, cx: 5, cy: 5 }] };
  const guard = createGuard(world, { roomIndex: 0 }), pressure = createPressure(world);
  const player = { id: 'one', x: 8.5, y: 5.5, ...createVitality() }, spot = { id: 'hide', x: 9.5, y: 5.5, occupantId: null };
  enterHiding(world, player, spot, [guard]); updatePressure(world, pressure, [guard], .05);
  assert.equal(pressure.alerts, 1);
  const cold = { ...guard, path: [], goal: null, repath: 0 }, hot = { ...guard, path: [], goal: null, repath: 0 };
  updateGuard(world, cold, player, .05, [], 0); updateGuard(world, hot, player, .05, [], 1);
  assert.ok(Math.hypot(hot.x - guard.x, hot.y - guard.y) > Math.hypot(cold.x - guard.x, cold.y - guard.y));
  player.hiding = null; player.x = 6; player.y = 5.5;
  Object.assign(hot, { knownHiding: null, x: 5.5, y: 5.5, windup: 0, cooldown: 0, swing: 0 });
  updateGuard(world, hot, player, .05, [], 1); assert.equal(hot.windup, COMBAT.windup);
});

test('reinforcements have unique identities, follow broad cached sweeps and pause to search without tracking hidden goblins', () => {
  const { world, pressure } = setup(), door = pressure.doors[0];
  const guard = createReinforcement(world, door, 1), other = createReinforcement(world, door, 2);
  assert.notEqual(guard.id, other.id); assert.ok(guard.patrol.length >= world.rooms.length - 1);
  assert.ok(guard.roamRoute.every(p => canStand(world, p.x, p.y)));
  const player = { id: 'goblin', ...world.spawn, ...createVitality(), hiding: {} };
  let moved = false, paused = false, previousIndex = 1, looped = false;
  for (let i = 0; i < 16000 && !looped; i++) {
    updateGuard(world, guard, player, .05);
    moved ||= guard.moving; paused ||= guard.pauseLeft > 0;
    assert.ok(canStand(world, guard.x, guard.y)); assert.equal(guard.state, 'patrol');
    looped ||= guard.roamIndex < previousIndex; previousIndex = guard.roamIndex;
  }
  assert.ok(moved && paused && looped); assert.equal(guard.lastSeen, null);
});

test('reinforcement scheduling has no population cap and a fresh run resets heat, alerts and arrivals', () => {
  const { world, pressure } = setup(), guards = Array.from({ length: 60 }, (_, i) => activeGuard(`guard-${i}`));
  updatePressure(world, pressure, guards, .05); assert.equal(pressure.pending.length, 20);
  updatePressure(world, pressure, guards, HEAT.arrivalWarning);
  assert.equal(pressure.reinforcements, 20); assert.equal(guards.length, 80);
  assert.equal(new Set(guards.map(g => g.id)).size, 80);
  const fresh = createPressure(world); assert.equal(fresh.alerts, 0); assert.equal(fresh.heat, 0); assert.equal(fresh.pending.length, 0);
  const labels = [], ctx = { fillRect() {}, fillText(text) { labels.push(text); } };
  pressure.pending.push({ doorId: pressure.doors[0].id, left: 2 });
  drawReinforcementDoors(ctx, pressure, 0, 0); assert.ok(labels.includes('GUARD INCOMING'));
});
