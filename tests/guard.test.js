import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon, canStand } from '../src/world.js';
import { COMBAT } from '../src/config.js';
import { createGuard, createVitality, tickVitality, hurtPlayer, seesPlayer, updateGuard } from '../src/guard.js';
import { findPath, followPath } from '../src/navigation.js';
import { createRun, finishRun, loseRun } from '../src/run.js';
import { createLoot, autoPickup, liftItem } from '../src/loot.js';

const arena = () => ({ width: 20, height: 20, tiles: Uint8Array.from({ length: 400 }, (_, i) => i % 20 > 0 && i % 20 < 19 && Math.floor(i / 20) > 0 && Math.floor(i / 20) < 19 ? 1 : 0), spawn: { x: 4.5, y: 4.5 }, rooms: [{ x: 2, y: 2, w: 5, h: 5, cx: 4, cy: 4 }, { x: 10, y: 10, w: 5, h: 5, cx: 12, cy: 12 }] });
const enemy = world => ({ ...createGuard(world), x: 5.5, y: 5.5, angle: 0 });
const goblin = (x, y) => ({ x, y, ...createVitality() });
const step = (world, guard, player, dt = 0.05) => { tickVitality(player, dt); return updateGuard(world, guard, player, dt); };

test('guard routes stay on walkable tiles and reach all patrol goals across 100 generated maps', () => {
  for (let seed = 0; seed < 100; seed++) {
    const world = generateDungeon(seed), guard = createGuard(world);
    assert.ok(canStand(world, guard.x, guard.y, COMBAT.guardRadius));
    for (const goal of guard.patrol) {
      const path = findPath(world, guard, goal);
      assert.ok(path.length || Math.hypot(goal.x - guard.x, goal.y - guard.y) < 0.01);
      while (path.length) {
        followPath(world, guard, path, 0.2, COMBAT.guardRadius);
        assert.ok(canStand(world, guard.x, guard.y, COMBAT.guardRadius));
      }
      assert.ok(Math.hypot(guard.x - goal.x, guard.y - goal.y) < 0.01);
    }
  }
});

test('actual patrol updates move and visit the first waypoint on ten generated maps', () => {
  for (let seed = 0; seed < 10; seed++) {
    const world = generateDungeon(seed), guard = createGuard(world), player = goblin(-100, -100);
    const firstGoal = { ...guard.patrol[1] }; let reached = false;
    for (let i = 0; i < 2400 && !reached; i++) {
      step(world, guard, player, 1 / 30);
      assert.ok(canStand(world, guard.x, guard.y, COMBAT.guardRadius));
      reached = Math.hypot(guard.x - firstGoal.x, guard.y - firstGoal.y) < 0.25;
    }
    assert.ok(reached, `Guard did not reach its waypoint on seed ${seed}`);
    assert.equal(guard.state, 'patrol');
  }
});

test('sight respects facing, distance and walls; alert vision is wider but not through walls', () => {
  const world = arena(), guard = enemy(world);
  assert.ok(seesPlayer(world, guard, goblin(8.5, 5.5)));
  assert.equal(seesPlayer(world, guard, goblin(2.5, 5.5)), false);
  assert.equal(seesPlayer(world, guard, goblin(5.5, 9.5)), false);
  assert.equal(seesPlayer(world, guard, goblin(15.5, 5.5)), false);
  assert.ok(seesPlayer(world, guard, goblin(2.5, 5.5), true));
  world.tiles[5 * 20 + 6] = 0;
  assert.equal(seesPlayer(world, guard, goblin(8.5, 5.5)), false);
  assert.equal(seesPlayer(world, guard, goblin(8.5, 5.5), true), false);
});

test('notice takes time and becomes a chase rather than an instant failure', () => {
  const world = arena(), guard = enemy(world), player = goblin(8.5, 5.5);
  step(world, guard, player, 0.1);
  assert.equal(guard.state, 'suspicious'); assert.ok(guard.suspicion > 0 && guard.suspicion < 1);
  for (let i = 0; i < 20; i++) step(world, guard, player);
  assert.equal(guard.state, 'chase'); assert.equal(player.state, 'active'); assert.equal(player.health, 3);
  assert.ok(guard.x > 5.5);
});

test('lost sight searches the last seen position and eventually resumes patrol', () => {
  const world = arena(), guard = enemy(world), player = goblin(8.5, 5.5);
  guard.state = 'chase'; step(world, guard, player);
  const seen = { ...guard.lastSeen };
  player.x = -100; player.y = -100;
  step(world, guard, player);
  assert.equal(guard.state, 'search'); assert.deepEqual(guard.lastSeen, seen);
  for (let i = 0; i < 200; i++) step(world, guard, player);
  assert.equal(guard.state, 'patrol'); assert.equal(guard.lastSeen, null);
});

test('attack windup can miss if the player moves out of range', () => {
  const world = arena(), guard = enemy(world), player = goblin(6.2, 5.5);
  guard.state = 'chase'; step(world, guard, player);
  assert.ok(guard.windup > 0); assert.equal(player.health, 3);
  player.x = 9;
  for (let i = 0; i < 12; i++) step(world, guard, player);
  assert.equal(player.health, 3); assert.ok(guard.cooldown > 0);
});

test('strikes damage health with recovery time; zero health puts the goblin down', () => {
  const world = arena(), guard = enemy(world), player = goblin(6.2, 5.5);
  guard.state = 'chase';
  let hits = 0, firstHitAt = null;
  for (let i = 0; i < 180 && player.state !== 'down'; i++) {
    const event = step(world, guard, player);
    if (event.hit) { hits++; if (firstHitAt === null) firstHitAt = i; assert.equal(hurtPlayer(player), false); }
  }
  assert.ok(firstHitAt >= 10); assert.equal(hits, 3); assert.equal(player.health, 0); assert.equal(player.state, 'down');
  assert.equal(hurtPlayer(player), false);
});

test('attacks cannot damage through a wall even within range', () => {
  const world = arena(), guard = enemy(world), player = goblin(6.2, 5.5);
  guard.state = 'chase'; guard.windup = 0.01;
  world.tiles[5 * 20 + 6] = 0;
  assert.equal(step(world, guard, player).hit, false); assert.equal(player.health, 3);
});

test('solo downed outcome loses bag and cursor loot exactly once and cannot extract', () => {
  const world = generateDungeon(8), run = createRun(world), loot = createLoot(world), player = { ...world.spawn, ...createVitality() };
  autoPickup(loot, loot.ground[0].id); liftItem(loot, 'ground', loot.ground[0].id);
  player.health = 0; player.state = 'down';
  assert.equal(finishRun(run, world, player, loot, 1000), null);
  const result = loseRun(run, loot, 1000);
  assert.equal(result.outcome, 'down'); assert.equal(result.count, 0); assert.equal(result.items.length, 0); assert.equal(result.lostItems.length, 2);
  assert.equal(loot.bag.length, 0); assert.equal(loot.held, null); assert.equal(run.phase, 'results');
  assert.equal(loseRun(run, loot, 2000), null); assert.equal(run.result, result);
  assert.equal(createVitality().health, 3); assert.equal(createVitality().state, 'active');
});

test('navigation returns safely for unreachable goals', () => {
  const world = arena(); world.tiles[5 * 20 + 8] = 0;
  assert.deepEqual(findPath(world, { x: 5.5, y: 5.5 }, { x: 8.5, y: 5.5 }), []);
});
