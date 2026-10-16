import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon } from '../src/world.js';
import { createLoot } from '../src/loot.js';
import { createRun, finishRun } from '../src/run.js';
import { createGuards, updateGuard, createVitality } from '../src/guard.js';
import { addStartingSnare, createPlacement, equipSnare, cancelPlacement, updatePlacement, updateTraps, validTrapPosition, placementPoint } from '../src/traps.js';

const setup = () => {
  const world = generateDungeon(42), player = { ...world.spawn, ...createVitality(), id: 'goblin', facing: 1, moving: false }, loot = createLoot(), placement = createPlacement(), traps = [];
  addStartingSnare(loot, 42); equipSnare(placement, loot, loot.bag[0].id);
  return { world, player, loot, placement, traps };
};
test('equip requires release, a full stationary second and consumes exactly once', () => {
  const { world, player, loot, placement, traps } = setup();
  const point = { ...player };
  const step = (held, dt) => updatePlacement(placement, world, player, loot, traps, [], point, held, dt);
  assert.equal(step(true, 2), null); assert.equal(loot.bag.length, 1);
  step(false, .01); step(true, .6); player.moving = true; step(true, .5); player.moving = false;
  step(true, .6); assert.equal(traps.length, 0);
  assert.equal(step(true, .4).type, 'placed'); assert.equal(loot.bag.length, 0);
  step(true, 2); assert.equal(traps.length, 1);
});
test('cancelling or invalid positioning preserves the snare and clamps preview reach', () => {
  const { world, player, loot, placement, traps } = setup();
  assert.equal(validTrapPosition(world, player, { x: -10, y: -10 }, traps), false);
  assert.equal(validTrapPosition(world, player, player, traps, [{ ...player }]), false);
  const point = placementPoint(player, { x: player.x + 100, y: player.y });
  assert.ok(Math.hypot(point.x - player.x, point.y - player.y) <= 1.501);
  updatePlacement(placement, world, player, loot, traps, [], point, false, .01);
  updatePlacement(placement, world, player, loot, traps, [], { x: -10, y: -10 }, true, 5);
  cancelPlacement(placement); assert.equal(loot.bag.length, 1); assert.equal(traps.length, 0);
});
test('setter overlap waits for full clearance; later goblin passage wastes trap without harm', () => {
  const { player } = setup();
  const trap = { ...player, phase: 'arming', ownerId: player.id, ownerClear: false, armLeft: .25 };
  assert.deepEqual(updateTraps([trap], [player], [], 2), []);
  player.x += .1; updateTraps([trap], [player], [], 2); assert.equal(trap.phase, 'arming');
  player.x += 2; updateTraps([trap], [player], [], .1); assert.equal(trap.phase, 'arming');
  updateTraps([trap], [player], [], .2); assert.equal(trap.phase, 'armed');
  player.x = trap.x; const health = player.health;
  assert.equal(updateTraps([trap], [player], [], .01)[0].type, 'goblin-triggered');
  assert.equal(player.health, health); assert.equal(player.state, 'active');
  assert.deepEqual(updateTraps([trap], [player], [], 1), []);
});
test('snared guard cannot move or strike during the three second hold', () => {
  const { world, player } = setup(), guard = createGuards(world)[0];
  Object.assign(guard, { x: player.x, y: player.y, state: 'chase', windup: .1 });
  const trap = { x: guard.x, y: guard.y, phase: 'armed' };
  assert.equal(updateTraps([trap], [], [guard], .01)[0].type, 'guard-triggered');
  const health = player.health, x = guard.x, y = guard.y;
  for (let i = 0; i < 59; i++) updateGuard(world, guard, player, .05);
  assert.equal(player.health, health); assert.equal(guard.x, x); assert.equal(guard.y, y);
  updateGuard(world, guard, player, .05); assert.ok(guard.snareLeft < .001);
  assert.equal(trap.phase, 'spent');
});
test('unused supplies occupy sack space but are not counted as stolen treasure', () => {
  const { world, player, loot } = setup();
  const result = finishRun(createRun(world), world, player, loot, 1000);
  assert.equal(result.count, 0); assert.equal(loot.bag.length, 1);
});
