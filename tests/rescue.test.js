import test from 'node:test';
import assert from 'node:assert/strict';
import { createDungeonSession } from '../server/dungeon-session.js';
import { createCamp } from '../src/lair.js';
import { createProfile } from '../src/profile.js';
import { selectJob } from '../src/jobs.js';
import { createCages, rescueCandidate } from '../src/rescue.js';
import { generateDungeon, canStand } from '../src/world.js';
import { createGuard, createGuards } from '../src/guard.js';
import { createSearchables } from '../src/search.js';
import { createHidingSpots, enterHiding, leaveHiding } from '../src/hiding.js';
import { findPath } from '../src/navigation.js';
import { RESCUE } from '../src/config.js';

function fixture(count = 2) {
  const camp = createCamp();
  const players = Array.from({ length: count }, (_, i) => ({ id: `g${i}`, name: `Goblin ${i}`, connected: true, bag: [], profile: createProfile(`g${i}`) }));
  const d = createDungeonSession({ id: 'rescue-run', seed: 978983017, job: selectJob('manor', 'normal') }, players, camp);
  d.danger.guards.length = 0;
  return { d, camp, players, a: players[0], b: players[1], c: players[2] };
}
function step(d, players, seconds, held = true) {
  for (let t = 0; t < seconds - .00001; t += .05) {
    for (const p of players) { p.searchHeld = held; p.inputAge = 0; }
    d.tick(.05);
  }
}
function lunch(p, id = 'lunch') { p.bag.push({ id, type: 'lunch', rotation: 0, x: p.bag.length % 3, y: Math.floor(p.bag.length / 3) }); }
function down(d, p) { p.state = 'down'; p.health = 0; d.tick(.05); }
function hideHelper(d, p) { const spot = d.danger.hidingSpots[0]; Object.assign(p, spot.approach); assert.ok(enterHiding(d.world, p, spot)); }
function carrier(d, p) {
  const g = createGuard(d.world, { roomIndex: 0, behaviour: 'lookout', patrol: [{ x: p.x - .3, y: p.y }] });
  Object.assign(g, { id: 'carrier', x: p.x - .3, y: p.y, angle: 0 }); d.danger.guards.push(g); return g;
}
function cageBody(d, p, cage = d.danger.rescue.cages[0]) {
  p.state = 'caged'; p.health = 0; p.cageId = cage.id; p.downSpilled = true; p.x = cage.x; p.y = cage.y; cage.prisoners.push(p.id); return cage;
}

test('cage sites are deterministic, outside entrance, reachable, and nearest selection uses walking routes', () => {
  for (let seed = 0; seed < 100; seed++) {
    const world = generateDungeon(seed), objects = createSearchables(world);
    const obstacles = [...objects, ...createHidingSpots(world, objects), ...createGuards(world).map(g => g.home)];
    const cages = createCages(world, obstacles);
    assert.deepEqual(cages, createCages(world, obstacles)); assert.ok(cages.length > 0 && cages.length <= RESCUE.cages);
    for (const c of cages) { assert.notEqual(c.roomIndex, 0); assert.ok(canStand(world, c.x, c.y)); assert.ok(canStand(world, c.post.x, c.post.y)); assert.ok(findPath(world, world.spawn, c.entry).length); }
  }
  const { d, a } = fixture();
  const nearest = d.danger.rescue.nearestCage(a);
  const distance = findPath(d.world, a, nearest.entry).length;
  assert.equal(distance, Math.min(...d.danger.rescue.cages.map(c => findPath(d.world, a, c.entry).length)));
});
test('Packed Lunch is spent only on a completed floor revive; one health and empty sack rejoin extraction', () => {
  const { d, a, b } = fixture(); lunch(b); a.bag.push({ id: 'ruby', type: 'ruby', rotation: 0, x: 0, y: 0 });
  down(d, a); a.x += 2; b.x = a.x + .5;
  assert.equal(d.action(b, { type: 'rescue', id: a.id }), true);
  step(d, [b], 1.95); assert.equal(a.state, 'down'); assert.equal(b.bag.length, 1);
  step(d, [b], .05); assert.equal(a.state, 'active'); assert.equal(a.health, 1); assert.equal(a.invulnerable, 0); assert.equal(a.bag.length, 0); assert.equal(b.bag.length, 0);
  assert.equal(d.ground.filter(i => i.id === 'ruby').length, 1);
  Object.assign(b, d.run.entrance); assert.equal(d.action(b, { type: 'extract' }), false);
});
test('release, movement, damage, disconnect and losing lunch cancel without spending or reviving', () => {
  for (const reason of ['release', 'movement', 'damage', 'disconnect', 'target-disconnect', 'missing-lunch', 'stale-input']) {
    const { d, a, b } = fixture(); lunch(b); down(d, a);
    assert.equal(d.action(b, { type: 'rescue', id: a.id }), true); step(d, [b], .5);
    if (reason === 'release') d.action(b, { type: 'cancel-search' });
    if (reason === 'movement') b.x += .2;
    if (reason === 'damage') b.health--;
    if (reason === 'disconnect') { b.connected = false; d.disconnect(b); }
    if (reason === 'target-disconnect') { a.connected = false; d.disconnect(a); }
    if (reason === 'missing-lunch') b.bag.length = 0;
    if (reason === 'stale-input') d.tick(.45); else step(d, [b], .05);
    assert.equal(a.state, 'down', reason); assert.equal(b.rescueAttempt, null, reason);
    assert.equal(b.bag.length, reason === 'missing-lunch' ? 0 : 1, reason);
  }
});
test('simultaneous helpers reserve one target and consume exactly one of their lunches', () => {
  const { d, a, b, c } = fixture(3); lunch(b, 'b-lunch'); lunch(c, 'c-lunch'); down(d, a);
  assert.equal(d.action(b, { type: 'rescue', id: a.id }), true);
  assert.equal(d.action(c, { type: 'rescue', id: a.id }), false);
  step(d, [b, c], 2.05); assert.equal(a.health, 1); assert.equal(b.bag.length + c.bag.length, 1);
  assert.equal(d.action(c, { type: 'rescue', id: a.id }), false);
});
test('rescue rejects missing lunch, held items, far targets, ghosts and carried bodies', () => {
  const { d, a, b } = fixture(); down(d, a);
  assert.equal(d.action(b, { type: 'rescue', id: a.id }), false); lunch(b);
  b.x += 10; assert.equal(d.action(b, { type: 'rescue', id: a.id }), false); b.x = a.x;
  b.loot.held = { id: 'held', type: 'coin', rotation: 0 }; assert.equal(d.action(b, { type: 'rescue', id: a.id }), false); b.loot.held = null;
  a.connected = false; assert.equal(d.action(b, { type: 'rescue', id: a.id }), false); a.connected = true;
  a.state = 'carried'; a.carrierId = 'carrier'; assert.equal(d.action(b, { type: 'rescue', id: a.id }), false);
});
test('guard carries to nearest predetermined cage while spilled items stay at the original down site', () => {
  const { d, a, b } = fixture(); a.bag.push({ id: 'loot', type: 'ruby', rotation: 0, x: 0, y: 0 }); down(d, a); hideHelper(d, b);
  const ground = { ...d.ground[0] }, g = carrier(d, a), expected = d.danger.rescue.nearestCage(g);
  step(d, [b], 1.05); assert.equal(a.state, 'carried'); assert.equal(a.carrierId, g.id); assert.equal(g.destinationCageId, expected.id);
  for (let i = 0; i < 2400 && a.state !== 'caged'; i++) d.tick(.05);
  assert.equal(a.state, 'caged'); assert.equal(a.cageId, expected.id); assert.equal(a.health, 0); assert.ok(expected.prisoners.includes(a.id)); assert.equal(g.captiveId, null);
  assert.equal(d.ground.length, 1); assert.equal(d.ground[0].x, ground.x); assert.equal(d.ground[0].y, ground.y);
});
test('a visible standing distraction makes carrier drop captive and chase, without respilling loot', () => {
  const { d, a, b } = fixture(); down(d, a); hideHelper(d, b); const g = carrier(d, a);
  step(d, [b], 1.05); assert.equal(a.state, 'carried'); const at = { x: g.x, y: g.y };
  leaveHiding(b); g.angle = 0; b.x = g.x + 2; b.y = g.y; const count = d.ground.length;
  d.tick(.05); assert.equal(a.state, 'down'); assert.equal(a.carrierId, null); assert.equal(a.x, at.x); assert.equal(a.y, at.y);
  assert.equal(g.state, 'chase'); assert.equal(g.targetId, b.id); assert.equal(d.ground.length, count);
});
test('carriers ignore goblins behind even at close range and immediately after pickup', () => {
  for (const distance of [.7, 2]) for (const state of ['capture', 'carry']) {
    const { d, a, b } = fixture(); down(d, a); hideHelper(d, b); const g = carrier(d, a);
    step(d, [b], 1.05); assert.equal(a.state, 'carried');
    leaveHiding(b); Object.assign(g, { angle: Math.PI, state });
    b.x = g.x + distance; b.y = g.y;
    assert.ok(canStand(d.world, b.x, b.y));
    assert.equal(d.danger.rescue.guardTick(g, 0, []), true);
    assert.equal(a.state, 'carried'); assert.equal(g.captiveId, a.id);
    assert.equal(g.state, 'carry');
  }
});
test('carrier forward vision still respects smoke before dropping the captive', () => {
  const { d, a, b } = fixture(); down(d, a); hideHelper(d, b); const g = carrier(d, a);
  step(d, [b], 1.05); leaveHiding(b); g.angle = 0; b.x = g.x + .7; b.y = g.y;
  d.danger.rescue.guardTick(g, 0, [{ x: b.x, y: b.y, radius: 2, left: 5 }]);
  assert.equal(a.state, 'carried');
  assert.equal(d.danger.rescue.guardTick(g, 0, []), false);
  assert.equal(a.state, 'down'); assert.equal(g.state, 'chase'); assert.equal(g.targetId, b.id);
});
test('visible standing goblins prevent pickup; snared carriers cannot move', () => {
  const { d, a, b } = fixture(); down(d, a); const g = carrier(d, a);
  step(d, [b], 1.2); assert.equal(a.state, 'down'); assert.equal(g.captiveId, undefined);
  hideHelper(d, b); g.state = 'patrol'; g.x = a.x - .3; g.y = a.y; g.angle = 0;
  step(d, [b], 1.05); assert.equal(a.state, 'carried'); g.snareLeft = 3; const x = g.x, y = g.y;
  step(d, [b], 1); assert.equal(g.x, x); assert.equal(g.y, y); assert.equal(a.x, x); assert.equal(a.y, y);
});
test('cage rescue takes longer, needs no lunch, restores one health and releases only one captive', () => {
  const { d, a, b, c } = fixture(3); const cage = cageBody(d, a); cageBody(d, c, cage); b.x = cage.entry.x + .5; b.y = cage.entry.y;
  assert.equal(d.action(b, { type: 'rescue', id: a.id }), true); step(d, [b], 2.95); assert.equal(a.state, 'caged');
  step(d, [b], .05); assert.equal(a.state, 'active'); assert.equal(a.health, 1); assert.equal(a.cageId, null); assert.equal(b.bag.length, 0);
  assert.equal(c.state, 'caged'); assert.deepEqual(cage.prisoners, [c.id]); assert.ok(rescueCandidate(d.world, b, c, d.danger.rescue.cages));
  lunch(b); d.action(b, { type: 'rescue', id: c.id }); step(d, [b], 3.05);
  assert.equal(c.health, 1); assert.equal(b.bag.length, 1); assert.equal(cage.prisoners.length, 0);
});
test('cage rescue cancels on damage/movement and jail guard stays at its post but can attack', () => {
  const { d, a, b } = fixture(); const cage = cageBody(d, a); b.x = cage.entry.x; b.y = cage.entry.y;
  d.action(b, { type: 'rescue', id: a.id }); step(d, [b], 1); b.health--; step(d, [b], .05); assert.equal(b.rescueAttempt, null); assert.equal(a.state, 'caged');
  const g = createGuard(d.world, { roomIndex: cage.roomIndex, behaviour: 'lookout', patrol: [{ ...cage.post }] });
  Object.assign(g, { jailer: true, stationary: true, angle: 0, state: 'chase', targetId: b.id }); d.danger.guards.push(g);
  b.x = g.x + 2; b.y = g.y; const home = { x: g.x, y: g.y }; step(d, [b], 2);
  assert.deepEqual({ x: g.x, y: g.y }, home);
  b.x = g.x + .7; b.invulnerable = 0; g.attackAngle = 0; g.windup = .05; const health = b.health; d.tick(.05);
  assert.equal(b.health, health - 1);
});
test('disconnect drops a carried goblin without revival; caged ghosts stay caged and expire cleanly', () => {
  const { d, a, b } = fixture(); down(d, a); hideHelper(d, b); const g = carrier(d, a); step(d, [b], 1.05);
  a.connected = false; d.disconnect(a); assert.equal(a.state, 'down'); assert.equal(g.captiveId, null); assert.equal(a.carrierId, null);
  a.connected = true; d.danger.guards.length = 0; const cage = cageBody(d, a);
  a.connected = false; d.disconnect(a); b.x = cage.entry.x; b.y = cage.entry.y;
  assert.equal(d.action(b, { type: 'rescue', id: a.id }), false);
  a.connected = true; a.disconnectedFor = 0; assert.equal(a.state, 'caged'); assert.equal(a.health, 0);
  a.connected = false; d.disconnect(a); d.tick(60);
  assert.equal(a.inRun, false); assert.equal(a.waiting, true); assert.ok(!cage.prisoners.includes(a.id)); assert.equal(a.cageId, null);
});
test('revived goblin can recover its items and a second down spills them once again', () => {
  const { d, a, b } = fixture(); lunch(b, 'first'); lunch(b, 'second');
  a.bag.push({ id: 'ruby', type: 'ruby', rotation: 0, x: 0, y: 0 }); down(d, a);
  d.action(b, { type: 'rescue', id: a.id }); step(d, [b], 2.05);
  assert.equal(d.action(a, { type: 'pickup', id: 'ruby' }), true); down(d, a);
  assert.equal(d.ground.filter(i => i.id === 'ruby').length, 1);
  d.action(b, { type: 'rescue', id: a.id }); step(d, [b], 2.05);
  assert.equal(a.health, 1); assert.equal(b.bag.length, 0); assert.equal(d.ground.filter(i => i.id === 'ruby').length, 1);
});
