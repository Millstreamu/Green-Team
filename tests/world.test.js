import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon, isFloor, canStand, movePlayer } from '../src/world.js';

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
