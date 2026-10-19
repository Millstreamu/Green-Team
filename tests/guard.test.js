import { createLooseLoot as createLoot } from './fixtures.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon, canStand } from '../src/world.js';
import { COMBAT, GUARD_PATTERNS } from '../src/config.js';
import { createGuard, createGuards, createVitality, tickVitality, hurtPlayer, seesPlayer, updateGuard } from '../src/guard.js';
import { findPath, followPath } from '../src/navigation.js';
import { createRun, finishRun, loseRun } from '../src/run.js';
import { autoPickup, liftItem } from '../src/loot.js';

const arena = () => ({ width: 20, height: 20, tiles: Uint8Array.from({ length: 400 }, (_, i) => i % 20 > 0 && i % 20 < 19 && Math.floor(i / 20) > 0 && Math.floor(i / 20) < 19 ? 1 : 0), spawn: { x: 4.5, y: 4.5 }, rooms: [{ x: 2, y: 2, w: 5, h: 5, cx: 4, cy: 4 }, { x: 10, y: 10, w: 5, h: 5, cx: 12, cy: 12 }] });
const enemy = world => ({ ...createGuard(world), x: 5.5, y: 5.5, angle: 0 });
const goblin = (x, y) => ({ x, y, ...createVitality() });
const step = (world, guard, player, dt = 0.05) => { tickVitality(player, dt, world); return updateGuard(world, guard, player, dt); };

test('guard routes stay on walkable tiles and reach all patrol goals across 100 generated maps', () => {
  for (let seed = 0; seed < 100; seed++) {
    const world = generateDungeon(seed);
    for (const guard of createGuards(world)) {
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
  for (let i = 0; i < 1400 && guard.state !== 'patrol'; i++) step(world, guard, player);
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
  assert.ok(firstHitAt >= Math.ceil(COMBAT.windup / .05)); assert.ok(firstHitAt < 10); assert.equal(hits, 3); assert.equal(player.health, 0); assert.equal(player.state, 'down');
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

test('guard placement is deterministic, leaves the starting room unassigned and retains quiet rooms', () => {
  for (let seed = 0; seed < 100; seed++) {
    const world = generateDungeon(seed), guards = createGuards(world);
    assert.equal(guards.filter(g => g.behaviour !== 'roamer').length, GUARD_PATTERNS.count);
    assert.equal(guards.filter(g => g.behaviour === 'roamer').length, 1);
    assert.equal(new Set(guards.map(g => g.roomIndex)).size, guards.length);
    assert.ok(guards.every(g => g.roomIndex !== 0));
    assert.ok(world.rooms.length - guards.length >= 2);
    assert.ok(guards.some(g => g.behaviour === 'lookout') && guards.some(g => g.behaviour === 'room'));
    assert.deepEqual(guards, createGuards(world));
  }
});

test('lookouts remain on their post and repeat two timed directions without random turns', () => {
  const world = arena(), guard = createGuard(world, { roomIndex: 1, behaviour: 'lookout' });
  const other = createGuard(world, { roomIndex: 1, behaviour: 'lookout' }), player = goblin(-100, -100);
  const position = { x: guard.x, y: guard.y }, seenAngles = new Set();
  for (let i = 0; i < 250; i++) {
    step(world, guard, player); step(world, other, player);
    assert.equal(guard.x, position.x); assert.equal(guard.y, position.y); assert.equal(guard.moving, false);
    assert.equal(guard.angle, other.angle); assert.equal(guard.watchIndex, other.watchIndex);
    seenAngles.add(guard.watchIndex);
    if (guard.watchLeft < GUARD_PATTERNS.lookPause - 0.6) {
      const target = guard.watchAngles[guard.watchIndex];
      assert.ok(Math.abs(Math.atan2(Math.sin(guard.angle - target), Math.cos(guard.angle - target))) < 0.001);
    }
  }
  assert.equal(seenAngles.size, 2);
});

test('room patrols pause at their ends and stay inside their assigned room while undisturbed', () => {
  const world = arena(), guard = createGuard(world, { roomIndex: 1, behaviour: 'room' }), player = goblin(-100, -100);
  const room = guard.homeRoom, home = { ...guard.home }; let walking = 0, waiting = 0; const endpoints = new Set();
  for (let i = 0; i < 900; i++) {
    step(world, guard, player);
    if (i < 20) { assert.equal(guard.x, home.x); assert.equal(guard.y, home.y); }
    assert.ok(guard.x >= room.x && guard.x < room.x + room.w && guard.y >= room.y && guard.y < room.y + room.h);
    assert.ok(canStand(world, guard.x, guard.y, COMBAT.guardRadius));
    if (guard.moving) walking++; else waiting++;
    guard.patrol.forEach((point, index) => { if (Math.hypot(guard.x - point.x, guard.y - point.y) < 0.1) endpoints.add(index); });
  }
  assert.ok(walking > 0 && waiting > 0); assert.equal(endpoints.size, 2);
});

test('pursuit can leave an assigned room, then a lost player sends the guard back to its own post', () => {
  const world = arena(), guard = createGuard(world, { roomIndex: 1, behaviour: 'lookout' }), player = goblin(8.5, 12.5);
  guard.state = 'chase'; guard.lastSeen = { x: player.x, y: player.y };
  for (let i = 0; i < 20; i++) step(world, guard, player);
  assert.ok(guard.x < guard.homeRoom.x); // The unassigned room boundary is not a magical chase barrier.
  player.x = -100; player.y = -100; let returning = false;
  for (let i = 0; i < 900; i++) {
    step(world, guard, player); returning ||= guard.state === 'return';
    if (returning && guard.state === 'patrol') break;
  }
  assert.ok(returning); assert.equal(guard.state, 'patrol');
  assert.ok(Math.hypot(guard.x - guard.home.x, guard.y - guard.home.y) < 0.01);
  const returned = { x: guard.x, y: guard.y };
  for (let i = 0; i < 200; i++) step(world, guard, player);
  assert.equal(guard.x, returned.x); assert.equal(guard.y, returned.y);
});

test('simultaneous guard strikes share player damage immunity instead of stacking hits', () => {
  const world = arena(), player = goblin(6.2, 5.5), guards = [enemy(world), enemy(world)];
  for (const guard of guards) { guard.state = 'chase'; guard.windup = 0.01; }
  tickVitality(player, 0.05);
  const events = guards.map(guard => updateGuard(world, guard, player, 0.05));
  assert.equal(events.filter(event => event.hit).length, 1); assert.equal(player.health, 2);
});

test('guard commits to its swing direction so moving behind it can dodge the hit', () => {
  const world = arena(), guard = enemy(world), player = goblin(6.2, 5.5);
  guard.state = 'chase'; step(world, guard, player, .02);
  assert.equal(guard.attackAngle, 0);
  player.x = 4.8;
  for (let i = 0; i < 11; i++) step(world, guard, player, .02);
  assert.equal(guard.attackAngle, 0); assert.equal(player.health, 3);
  assert.ok(guard.swing > 0); assert.equal(guard.x, 5.5);
});
test('guard resumes chasing after the short swing even while its attack cooldown remains', () => {
  const world = arena(), guard = enemy(world), player = goblin(6.2, 5.5);
  guard.state = 'chase'; updateGuard(world, guard, player, .02);
  let hit = false;
  for (let i = 0; i < 20 && !hit; i++) hit = updateGuard(world, guard, player, .02).hit;
  assert.ok(hit); assert.equal(player.health, 2);
  const position = guard.x; player.x = 8;
  updateGuard(world, guard, player, .05); assert.equal(guard.x, position);
  for (let i = 0; i < 3; i++) updateGuard(world, guard, player, .05);
  assert.ok(guard.x > position); assert.ok(guard.cooldown > 0); assert.equal(guard.state, 'chase');
});
test('successful hits cause a short consistent knockback without changing goblin facing', () => {
  const simulate = dt => {
    const world = arena(), guard = enemy(world), player = { ...goblin(6.2, 5.5), facing: -1 };
    guard.state = 'chase'; updateGuard(world, guard, player, .02);
    let hit = false;
    for (let i = 0; i < 20 && !hit; i++) hit = updateGuard(world, guard, player, .02).hit;
    assert.ok(hit); const start = player.x;
    for (let time = 0; time < .3; time += dt) tickVitality(player, dt, world);
    assert.ok(Math.abs(player.x - start - COMBAT.knockbackDistance) < .00001);
    assert.equal(player.facing, -1); assert.equal(player.knockbackLeft, 0); assert.equal(player.health, 2);
    return player.x;
  };
  assert.ok(Math.abs(simulate(.01) - simulate(.04)) < .00001);
});
test('knockback stops at walls and simultaneous hits cannot reverse or stack the push', () => {
  const world = arena(), player = goblin(6.6, 5.5), guard = enemy(world);
  guard.x = 5.9; guard.state = 'chase'; guard.attackAngle = 0; guard.windup = .01;
  for (let y = 0; y < world.height; y++) world.tiles[y * world.width + 7] = 0;
  assert.ok(updateGuard(world, guard, player, .02).hit);
  for (let i = 0; i < 20; i++) tickVitality(player, .02, world);
  assert.ok(player.x < 7 - .26); assert.ok(canStand(world, player.x, player.y));
  const otherWorld = arena(), otherPlayer = goblin(6.2, 5.5), first = enemy(otherWorld), second = enemy(otherWorld);
  Object.assign(first, { state: 'chase', windup: .01, attackAngle: 0 });
  Object.assign(second, { x: 6.9, state: 'chase', windup: .01, attackAngle: Math.PI });
  assert.ok(updateGuard(otherWorld, first, otherPlayer, .02).hit);
  const push = otherPlayer.knockbackX;
  assert.equal(updateGuard(otherWorld, second, otherPlayer, .02).hit, false);
  assert.ok(push > 0); assert.equal(otherPlayer.knockbackX, push); assert.equal(otherPlayer.health, 2);
});
