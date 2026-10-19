import test from 'node:test';
import assert from 'node:assert/strict';
import { canStand, moveActor, setSolidObjects, isFloor } from '../src/world.js';
import { findPath, followPath } from '../src/navigation.js';
import { drawSearchables } from '../src/search-view.js';
import { CONFIG } from '../src/config.js';

test('walking, knockback and guard paths respect the same solid furniture; floor geometry stays intact', () => {
  const world = { width: 7, height: 7, tiles: new Uint8Array(49).fill(1) };
  const object = { x: 3.5, y: 3.5, tileX: 3, tileY: 3, width: 1, height: 1 };
  setSolidObjects(world, [object]);
  assert.equal(isFloor(world, 3, 3), true);
  assert.equal(canStand(world, 3.5, 3.5), false);
  const actor = { x: 2.5, y: 3.5 };
  moveActor(world, actor, 3, 0);
  assert.ok(actor.x < 3 && actor.x > 2.5);
  const path = findPath(world, { x: 2.5, y: 3.5 }, { x: 4.5, y: 3.5 });
  assert.ok(path.length > 2);
  assert.ok(path.every(p => canStand(world, p.x, p.y)));
  const guard = { x: 2.5, y: 3.5 };
  followPath(world, guard, path, 20);
  assert.equal(guard.x, 4.5); assert.ok(Math.abs(guard.y - 3.5) < 1e-9);
  // Online worlds rebuild this mask from the server's public furniture footprints.
  const clientWorld = { ...world, solidTiles: undefined };
  setSolidObjects(clientWorld, JSON.parse(JSON.stringify([object])));
  assert.deepEqual(clientWorld.solidTiles, world.solidTiles);
});

test('closed and opened chest/crate art including shadows stays inside its single floor tile', () => {
  for (const type of ['chest', 'crate']) for (const searched of [false, true]) {
    const rects = [], ctx = { save() {}, restore() {}, fillRect: (...args) => rects.push(args) };
    drawSearchables(ctx, [{ id: type, type, x: 2.5, y: 2.5, searched }], null, {}, 0, 0);
    for (const [x, y, w, h] of rects) {
      assert.ok(x >= 2 * CONFIG.tile && y >= 2 * CONFIG.tile);
      assert.ok(x + w <= 3 * CONFIG.tile && y + h <= 3 * CONFIG.tile);
    }
  }
});


test('hiding barrel body and shadow fit one floor tile; labels remain outside as UI', async () => {
  const { drawHidingSpots } = await import('../src/hiding-view.js');
  const rects = [], ctx = { fillRect: (...args) => rects.push(args), fillText() {} };
  drawHidingSpots(ctx, [{ id: 'barrel', x: 2.5, y: 2.5, occupantId: null }], null, {}, 0, 0);
  for (const [x, y, w, h] of rects) {
    assert.ok(x >= 2 * CONFIG.tile && y >= 2 * CONFIG.tile);
    assert.ok(x + w <= 3 * CONFIG.tile && y + h <= 3 * CONFIG.tile);
  }
});
