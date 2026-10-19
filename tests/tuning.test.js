import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TUNING, runTuning } from '../src/tuning.js';
import { createGuard, createVitality, seesPlayer, updateGuard } from '../src/guard.js';
import { createPressure, updatePressure } from '../src/pressure.js';
import { pressureLabel } from '../src/pressure-view.js';
import { generateDungeon } from '../src/world.js';
import { createSearchables, createSearchSession, beginSearch } from '../src/search.js';
import { createLoot } from '../src/loot.js';

const arena = () => ({ seed: 4, width: 30, height: 30, tiles: new Uint8Array(900).fill(1), spawn: { x: 5.5, y: 5.5 }, rooms: [{ x: 2, y: 2, w: 10, h: 10, cx: 7, cy: 7 }, { x: 14, y: 14, w: 10, h: 10, cx: 19, cy: 19 }] });
const guard = w => ({ ...createGuard(w), x: 5.5, y: 5.5, angle: 0, home: { x: 5.5, y: 5.5 }, patrol: [{ x: 5.5, y: 5.5 }, { x: 15.5, y: 5.5 }], pauseLeft: 0 });

test('world tuning changes real guard sight, notice, committed attack timing and all three movement speeds', () => {
  const world = arena(); world.tuning = runTuning({ ...DEFAULT_TUNING, sight: 2, alertSight: 10, noticeTime: 2, windup: .7, cooldown: 1.2, patrolSpeed: 1, searchSpeed: 2, chaseSpeed: 3 });
  const p = { ...createVitality(), x: 9.5, y: 5.5 }, g = guard(world);
  assert.equal(seesPlayer(world, g, p), false); assert.equal(seesPlayer(world, g, p, true), true);
  p.x = 6; updateGuard(world, g, p, .1); assert.equal(g.state, 'suspicious'); assert.ok(Math.abs(g.suspicion - .05) < 1e-9);
  g.state = 'chase'; updateGuard(world, g, p, .1); assert.equal(g.windup, .7);
  updateGuard(world, g, p, .6); assert.equal(p.health, 3);
  updateGuard(world, g, p, .11); assert.equal(p.health, 2); assert.equal(g.cooldown, 1.2);
  for (const [state, speed] of [['patrol', 1], ['search', 2], ['chase', 3]]) {
    const enemy = guard(world); enemy.state = state;
    enemy.trail = [{ x: 15.5, y: 5.5 }]; enemy.trailLeft = 1;
    const target = { ...createVitality(), x: 15.5, y: 5.5, unavailable: state !== 'chase' };
    updateGuard(world, enemy, target, .1);
    assert.ok(Math.abs(enemy.x - 5.5 - speed * .1) < 1e-6, `${state}: ${enemy.x}`);
  }
  // World-local values never mutate another game or solo defaults.
  assert.equal(seesPlayer(arena(), guard(arena()), { ...createVitality(), x: 9.5, y: 5.5 }), true);
});

test('run settings change actual generated loot, search durations/bonuses and reinforcement thresholds/labels', () => {
  const world = generateDungeon(42);
  world.tuning = runTuning({ ...DEFAULT_TUNING, nearEmptyChance: 1, farEmptyChance: 1, chestTime: 8, cupboardTime: 6, crateTime: 4, alertsPerGuard: 1 });
  assert.ok(createSearchables(world).every(o => o.contents.length === 0));
  world.tuning.loot.nearEmptyChance = world.tuning.loot.farEmptyChance = 0; world.tuning.loot.twoItemChance = 1;
  const objects = createSearchables(world); assert.ok(objects.every(o => o.contents.length === 2));
  for (const type of ['chest', 'cupboard', 'crate']) {
    const object = objects.find(o => o.type === type), session = createSearchSession();
    const p = { ...createVitality(), x: object.x, y: object.y, searchRate: 2 };
    assert.ok(beginSearch(session, world, p, createLoot(), object));
    assert.equal(session.duration, world.tuning.search[type + 'Time'] / 2);
  }
  const pressure = createPressure(world), g = guard(world); g.state = 'chase';
  updatePressure(world, pressure, [g], .1);
  assert.equal(pressure.alerts, 1); assert.equal(pressure.scheduled, 1);
  assert.match(pressureLabel(pressure), /\(0\/1\)/);
});
