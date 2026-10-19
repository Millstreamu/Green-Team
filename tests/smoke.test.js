import test from 'node:test';
import assert from 'node:assert/strict';
import { useSmoke, updateSmoke, smokeBlocksSight } from '../src/smoke.js';
import { createGuard, createVitality, seesPlayer, updateGuard } from '../src/guard.js';
import { SMOKE } from '../src/config.js';

const arena = () => ({ width: 18, height: 12, tiles: new Uint8Array(216).fill(1), rooms: [{ x: 0, y: 0, w: 18, h: 12, cx: 9, cy: 6 }], spawn: { x: 9.5, y: 6.5 } });
test('Space-style use consumes one carried bomb, creates a cloud and keeps spare copies separate', () => {
  const player = { x: 5.5, y: 5.5, ...createVitality() }, clouds = [], loot = { held: null, bag: [{ id: 'a', type: 'smoke' }, { id: 'b', type: 'smoke' }] };
  assert.ok(useSmoke(loot, player, clouds)); assert.equal(loot.bag.length, 1); assert.equal(clouds.length, 1);
  assert.deepEqual(clouds[0], { id: 'a', x: 5.5, y: 5.5, radius: SMOKE.radius, left: SMOKE.duration });
  assert.ok(useSmoke(loot, player, clouds)); assert.equal(loot.bag.length, 0);
  assert.equal(useSmoke(loot, player, clouds), false);
  updateSmoke(clouds, SMOKE.duration - .01); assert.equal(clouds.length, 2);
  updateSmoke(clouds, .02); assert.equal(clouds.length, 0);
});
test('smoke blocks sight inside and across a cloud, then guard sight returns after expiration', () => {
  const world = arena(), guard = createGuard(world, { roomIndex: 0, behaviour: 'lookout' }), player = { x: 8.5, y: 5.5, ...createVitality() };
  Object.assign(guard, { x: 4.5, y: 5.5, angle: 0, state: 'chase' });
  const clouds = [{ x: 6.5, y: 5.5, radius: 1, left: 5 }];
  assert.ok(seesPlayer(world, guard, player, true));
  assert.equal(seesPlayer(world, guard, player, true, clouds), false);
  updateGuard(world, guard, player, .02, clouds); assert.equal(guard.state, 'search');
  assert.equal(smokeBlocksSight({ x: 6.5, y: 5.5 }, player, clouds), true);
  assert.equal(smokeBlocksSight(guard, { x: 4.5, y: 9.5 }, clouds), false);
  updateSmoke(clouds, 5); assert.ok(seesPlayer(world, guard, player, true, clouds));
  updateGuard(world, guard, player, .02, clouds); assert.equal(guard.state, 'chase');
});
test('held cursor loot and downed players cannot spend a bomb', () => {
  const loot = { bag: [{ id: 'bomb', type: 'smoke' }], held: { type: 'coin' } }, player = { x: 5, y: 5, ...createVitality() }, clouds = [];
  assert.equal(useSmoke(loot, player, clouds), false); loot.held = null; player.state = 'down';
  assert.equal(useSmoke(loot, player, clouds), false); assert.equal(loot.bag.length, 1); assert.equal(clouds.length, 0);
});
