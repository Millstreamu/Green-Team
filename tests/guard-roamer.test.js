import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon, canStand } from '../src/world.js';
import { createGuards, createVitality, updateGuard } from '../src/guard.js';
import { createRoamingRoute } from '../src/guard-routes.js';
import { GUARD_PATTERNS, COMBAT } from '../src/config.js';

const absent = () => ({ x: -100, y: -100, ...createVitality() });
const contains = (room, point) => point.x >= room.x && point.x < room.x + room.w && point.y >= room.y && point.y < room.y + room.h;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('200 generated dungeons have one bounded repeatable roaming route outside the entrance', () => {
  for (let i = 0; i < 200; i++) {
    const world = generateDungeon(Math.imul(i + 1, 2654435761) >>> 0), guards = createGuards(world);
    const guard = guards.find(g => g.behaviour === 'roamer');
    assert.ok(guard); assert.equal(guards.length, 4);
    assert.ok(guard.roamRooms.length >= 2 && guard.roamRooms.length <= GUARD_PATTERNS.roamRooms);
    assert.deepEqual(guard.home, guard.roamRoute[0]);
    for (let j = 0; j < guard.roamRoute.length; j++) {
      const point = guard.roamRoute[j], next = guard.roamRoute[(j + 1) % guard.roamRoute.length];
      assert.ok(canStand(world, point.x, point.y, COMBAT.guardRadius));
      assert.equal(contains(world.rooms[0], point), false);
      assert.equal(Math.abs(point.x - next.x) + Math.abs(point.y - next.y), 1);
    }
    const busy = new Set([...guards.map(g => g.roomIndex), ...guard.roamRooms]);
    assert.ok(world.rooms.length - busy.size >= 2);
    assert.deepEqual(guard, createGuards(world).find(g => g.behaviour === 'roamer'));
  }
});
test('roamers actually complete two cycles, pause at every stop and stay on their cached route', () => {
  for (let seed = 0; seed < 10; seed++) {
    const world = generateDungeon(seed), guard = createGuards(world).find(g => g.behaviour === 'roamer'), player = absent();
    const route = structuredClone(guard.roamRoute), seen = new Set();
    let laps = 0, wasHome = true;
    for (let frame = 0; frame < 16000 && laps < 2; frame++) {
      const before = { x: guard.x, y: guard.y }, paused = guard.pauseLeft > 0;
      updateGuard(world, guard, player, .05);
      if (paused) assert.equal(distance(before, guard), 0);
      assert.equal(guard.state, 'patrol'); assert.ok(canStand(world, guard.x, guard.y, COMBAT.guardRadius));
      assert.equal(contains(world.rooms[0], guard), false);
      assert.ok(route.some(point => distance(point, guard) < .51));
      guard.patrol.forEach((point, index) => { if (distance(point, guard) < .01 && guard.pauseLeft > 0) seen.add(index); });
      const home = distance(guard.home, guard) < .01 && guard.pauseLeft > 0;
      if (home && !wasHome) laps++;
      wasHome = home;
    }
    assert.equal(laps, 2); assert.equal(seen.size, guard.patrol.length);
    assert.deepEqual(guard.roamRoute, route);
  }
});
test('roamer survives snaring and lost-sight investigation then returns home and restarts its route', () => {
  const world = generateDungeon(42), guard = createGuards(world).find(g => g.behaviour === 'roamer'), player = absent();
  for (let i = 0; i < 200; i++) updateGuard(world, guard, player, .05);
  const point = { x: guard.x, y: guard.y }, index = guard.roamIndex;
  guard.snareLeft = 3;
  for (let i = 0; i < 60; i++) updateGuard(world, guard, player, .05);
  assert.equal(distance(point, guard), 0); assert.equal(guard.roamIndex, index);
  guard.snareLeft = 0; guard.state = 'chase'; guard.lastSeen = { ...point };
  updateGuard(world, guard, player, .05); assert.equal(guard.state, 'search');
  let returned = false;
  for (let i = 0; i < 12000; i++) {
    updateGuard(world, guard, player, .05);
    if (guard.state === 'patrol') { returned = true; break; }
  }
  assert.ok(returned); assert.ok(distance(guard.home, guard) < .001);
  assert.equal(guard.roamIndex, 1); assert.equal(guard.pauseLeft, GUARD_PATTERNS.roamPause);
  for (let i = 0; i < 100; i++) updateGuard(world, guard, player, .05);
  assert.ok(distance(guard.home, guard) > .1); assert.equal(guard.state, 'patrol');
});
test('route builder safely declines a layout whose only connection crosses the entrance room', () => {
  const width = 15, height = 7, tiles = new Uint8Array(width * height);
  for (let y = 1; y < 6; y++) for (let x = 1; x < 14; x++) tiles[y * width + x] = 1;
  const world = { width, height, tiles, rooms: [{ x: 5, y: 1, w: 5, h: 5, cx: 7, cy: 3 }, { x: 1, y: 1, w: 4, h: 5, cx: 2, cy: 3 }, { x: 10, y: 1, w: 4, h: 5, cx: 12, cy: 3 }] };
  const before = tiles.slice();
  assert.equal(createRoamingRoute(world), null); assert.deepEqual(tiles, before);
});
