import { createLooseLoot as createLoot } from './fixtures.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon } from '../src/world.js';
import { createRun, atTunnel, finishRun } from '../src/run.js';
import { autoPickup, liftItem, dropHeld } from '../src/loot.js';

test('tunnel is at the entrance, requires proximity, and cannot be used through a wall', () => {
  const world = generateDungeon(42), run = createRun(world);
  assert.deepEqual(run.entrance, world.spawn);
  assert.ok(atTunnel(run, world, world.spawn));
  assert.equal(atTunnel(run, world, { x: world.spawn.x + 1, y: world.spawn.y }), false);
  const tiny = { width: 5, height: 5, spawn: { x: 2.8, y: 2.5 }, tiles: new Uint8Array(25).fill(1) };
  tiny.tiles[2 * 5 + 3] = 0;
  assert.equal(atTunnel(createRun(tiny), tiny, { x: 3.2, y: 2.5 }), false);
});

test('finishing snapshots only packed loot and counts it once', () => {
  const world = generateDungeon(42), state = createLoot(world), run = createRun(world, 1000);
  assert.ok(autoPickup(state, state.ground[0].id));
  assert.ok(autoPickup(state, state.ground.find(item => item.type === 'coin').id));
  const floorBefore = state.ground.map(item => item.id);
  const result = finishRun(run, world, world.spawn, state, 63500);
  assert.equal(run.phase, 'results'); assert.equal(result.count, 2); assert.equal(result.slots, 2); assert.equal(result.elapsed, 62);
  assert.deepEqual(state.ground.map(item => item.id), floorBefore);
  assert.notEqual(result.items[0], state.bag[0]);
  state.bag[0].rotation = 3; assert.equal(result.items[0].rotation, 0);
  assert.equal(finishRun(run, world, world.spawn, state, 64500), null);
  assert.equal(run.result, result);
});

test('cursor items must be packed or dropped before extraction; distant E cannot finish', () => {
  const world = generateDungeon(8), state = createLoot(world), run = createRun(world);
  assert.ok(liftItem(state, 'ground', state.ground[0].id));
  assert.equal(finishRun(run, world, world.spawn, state, 1000), null);
  assert.equal(run.phase, 'exploring');
  assert.ok(dropHeld(state, world, world.spawn));
  assert.equal(finishRun(run, world, { x: world.spawn.x + 2, y: world.spawn.y }, state, 1000), null);
  const result = finishRun(run, world, world.spawn, state, 2000);
  assert.equal(result.count, 0); assert.equal(result.slots, 0);
});

test('a fresh run has an empty sack and an independent entrance and result', () => {
  const a = generateDungeon(1), oldLoot = createLoot(a), oldRun = createRun(a);
  autoPickup(oldLoot, oldLoot.ground[0].id);
  finishRun(oldRun, a, a.spawn, oldLoot, 1000);
  const b = generateDungeon(2), nextLoot = createLoot(b), nextRun = createRun(b, 2000);
  assert.equal(nextLoot.bag.length, 0); assert.equal(nextLoot.held, null);
  assert.equal(nextRun.phase, 'exploring'); assert.equal(nextRun.result, null);
  assert.deepEqual(nextRun.entrance, b.spawn); assert.notEqual(nextRun.entrance, oldRun.entrance);
  assert.equal(oldRun.result.count, 1);
});
