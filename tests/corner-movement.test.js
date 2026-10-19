import test from 'node:test';
import assert from 'node:assert/strict';
import { moveActor, movePlayer, canStand, setSolidObjects } from '../src/world.js';
import { CONFIG } from '../src/config.js';
const room = () => ({ width: 10, height: 10, tiles: Uint8Array.from({ length: 100 }, (_, i) => i % 10 > 0 && i % 10 < 9 && Math.floor(i / 10) > 0 && Math.floor(i / 10) < 9 ? 1 : 0) });
const turn = (p, n) => { for (let i = 0; i < n; i++) p = { x: 9 - p.y, y: p.x }; return p; };

test('brushing each outside corner slides past for walls and solid props without extra speed or penetration', () => {
  for (const solidProp of [false, true]) for (let angle = 0; angle < 4; angle++) for (const offset of [.1, .2, .25]) {
    const w = room();
    if (solidProp) setSolidObjects(w, [{ x: 4.5, y: 4.5 }]); else w.tiles[44] = 0;
    const p = turn({ x: 3, y: 4 - offset }, angle), direction = turn({ x: 5.5, y: 4.5 }, angle);
    const dx = direction.x - 4.5, dy = direction.y - 4.5;
    for (let i = 0; i < 100; i++) {
      const before = { ...p }; moveActor(w, p, dx * .04, dy * .04);
      assert.ok(canStand(w, p.x, p.y));
      assert.ok(Math.hypot(p.x - before.x, p.y - before.y) <= .040002);
    }
    const expected = turn({ x: 6.8, y: 4 - CONFIG.radius }, angle);
    assert.ok(Math.hypot(p.x - expected.x, p.y - expected.y) < .25, `stuck at ${JSON.stringify(p)}`);
  }
});

test('flat walls and inside corners stop movement, while diagonal pressure slides along a wall', () => {
  const w = room(); for (let y = 1; y < 9; y++) w.tiles[y * 10 + 5] = 0;
  const p = { x: 4.5, y: 3.5 };
  moveActor(w, p, 10, 0); assert.ok(p.x <= 5 - CONFIG.radius && canStand(w, p.x, p.y));
  const startY = p.y;
  moveActor(w, p, 2, 2); assert.ok(p.y > startY + 1.8 && p.x < 5 && canStand(w, p.x, p.y));
  for (let x = 1; x < 5; x++) w.tiles[6 * 10 + x] = 0;
  moveActor(w, p, 5, 5);
  assert.ok(p.x < 5 && p.y < 6 && canStand(w, p.x, p.y));
});

test('a one-tile doorway accepts slightly off-centre entry and corner sliding is consistent across frame rates', () => {
  for (const rate of [30, 60, 120]) {
    const w = room(); for (let x = 1; x < 9; x++) if (x !== 4) w.tiles[4 * 10 + x] = 0;
    const p = { x: 4.2, y: 2.5, phase: 0 };
    for (let i = 0; i < rate; i++) movePlayer(w, p, { x: 0, y: 1 }, 1 / rate);
    assert.ok(p.y > 6 && canStand(w, p.x, p.y));
  }
  const positions = [];
  for (const rate of [30, 60, 120]) {
    const w = room(); w.tiles[44] = 0; const p = { x: 3, y: 3.8, phase: 0 };
    for (let i = 0; i < rate * .7; i++) movePlayer(w, p, { x: 1, y: 0 }, 1 / rate);
    assert.ok(p.x > 5.8); positions.push(p);
  }
  assert.ok(Math.max(...positions.map(p => p.x)) - Math.min(...positions.map(p => p.x)) < .08);
});

test('repeated movement through mixed wall/furniture contacts stays legal and within the requested distance', () => {
  const w = room(); w.tiles[33] = 0; w.tiles[34] = 0; w.tiles[63] = 0;
  setSolidObjects(w, [{ x: 5.5, y: 5.5 }, { x: 6.5, y: 5.5 }]);
  let seed = 41;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const p = { x: 4.5, y: 4.5 };
  for (let i = 0; i < 10000; i++) {
    const angle = random() * Math.PI * 2, distance = random() * .6, before = { ...p };
    moveActor(w, p, Math.cos(angle) * distance, Math.sin(angle) * distance);
    assert.ok(canStand(w, p.x, p.y));
    assert.ok(Math.hypot(p.x - before.x, p.y - before.y) <= distance + 1e-5);
  }
});
