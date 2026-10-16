import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon, isFloor, canStand, movePlayer } from '../src/world.js';
import { CONFIG } from '../src/config.js';
import { roomEntrances } from '../src/dungeon-layout.js';
import { findPath } from '../src/navigation.js';

test('200 dungeon seeds have connected floors, valid spawn and closed boundaries', () => {
  for (let seed = 0; seed < 200; seed++) {
    const w = generateDungeon(seed);
    assert.ok(w.rooms.length >= 10);
    assert.ok(canStand(w, w.spawn.x, w.spawn.y));
    const seen = new Set(), queue = [[Math.floor(w.spawn.x), Math.floor(w.spawn.y)]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i], key = y * w.width + x;
      if (seen.has(key)) continue;
      seen.add(key);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (isFloor(w, x + dx, y + dy) && !seen.has((y + dy) * w.width + x + dx)) queue.push([x + dx, y + dy]);
    }
    assert.equal(seen.size, w.tiles.reduce((sum, n) => sum + n, 0));
    for (let x = 0; x < w.width; x++) { assert.equal(isFloor(w, x, 0), false); assert.equal(isFloor(w, x, w.height - 1), false); }
    for (let y = 0; y < w.height; y++) { assert.equal(isFloor(w, 0, y), false); assert.equal(isFloor(w, w.width - 1, y), false); }
  }
});
test('same seed reproduces a layout; different seeds vary', () => {
  assert.deepEqual(generateDungeon(123), generateDungeon(123));
  assert.notDeepEqual(generateDungeon(123).tiles, generateDungeon(124).tiles);
});

test('200 layouts add useful alternate routes and preserve two single-entrance rooms', () => {
  for (let seed = 0; seed < 200; seed++) {
    const world = generateDungeon(seed);
    assert.equal(world.shortcuts.length, 3, `Missing shortcuts for seed ${seed}`);
    assert.equal(world.preservedDeadEnds.length, 2);
    for (const index of world.preservedDeadEnds) assert.equal(roomEntrances(world, world.rooms[index]).length, 1);
    for (const shortcut of world.shortcuts) assert.ok(shortcut.oldDistance - shortcut.newDistance >= CONFIG.minLoopDetour);
    // Block a multi-entrance room completely. Its outside doors must still be
    // linked around it, proving a real bypass instead of two isolated branches.
    const bypass = world.rooms.some(room => {
      const doors = roomEntrances(world, room);
      if (doors.length < 2) return false;
      const blocked = { ...world, tiles: world.tiles.slice() };
      for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) blocked.tiles[y * world.width + x] = 0;
      const a = doors[0].cells[0];
      return doors.slice(1).some(door => {
        const b = door.cells[0];
        return Math.hypot(a.x - b.x, a.y - b.y) >= 3 && findPath(blocked, { x: a.x + 0.5, y: a.y + 0.5 }, { x: b.x + 0.5, y: b.y + 0.5 }).length > 0;
      });
    });
    assert.ok(bypass, `No physical room bypass for seed ${seed}`);
  }
});

test('loop parameters can be disabled or reduced without changing room placement or disconnecting floors', () => {
  const base = generateDungeon(42, { ...CONFIG, extraConnections: 0 });
  const one = generateDungeon(42, { ...CONFIG, extraConnections: 1 });
  const three = generateDungeon(42);
  assert.equal(base.shortcuts.length, 0); assert.equal(one.shortcuts.length, 1);
  const shape = room => [room.x, room.y, room.w, room.h];
  assert.deepEqual(base.rooms.map(shape), three.rooms.map(shape));
  assert.deepEqual(base.spawn, three.spawn);
  base.tiles.forEach((tile, i) => { if (tile) assert.equal(three.tiles[i], 1); });
  for (const room of one.rooms) assert.ok(findPath(one, one.spawn, { x: room.cx + 0.5, y: room.cy + 0.5 }).length || room.cx + 0.5 === one.spawn.x && room.cy + 0.5 === one.spawn.y);
});
const arena = () => ({ width: 12, height: 12, tiles: Uint8Array.from({ length: 144 }, (_, i) => i % 12 > 0 && i % 12 < 11 && Math.floor(i / 12) > 0 && Math.floor(i / 12) < 11 ? 1 : 0) });
const goblin = () => ({ x: 5, y: 5, phase: 0, facing: 1 });
test('diagonal speed equals straight speed and frame rates agree', () => {
  const w = arena(), a = goblin(), b = goblin(), c = goblin();
  movePlayer(w, a, { x: 1, y: 0 }, 0.5); movePlayer(w, b, { x: 1, y: 1 }, 0.5);
  for (let i = 0; i < 30; i++) movePlayer(w, c, { x: 1, y: 0 }, 1 / 60);
  assert.ok(Math.abs(Math.hypot(b.x - 5, b.y - 5) - (a.x - 5)) < 1e-8);
  assert.ok(Math.abs(a.x - c.x) < 1e-8);
});
test('long movement cannot cross walls; idle stops hop', () => {
  const w = arena(), p = goblin();
  movePlayer(w, p, { x: 1, y: 0 }, 3);
  assert.ok(p.x <= 10.74 && canStand(w, p.x, p.y));
  movePlayer(w, p, { x: 0, y: 0 }, 1);
  assert.equal(p.moving, false); assert.equal(p.phase, 0);
});
