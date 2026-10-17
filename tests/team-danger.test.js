import test from 'node:test';
import assert from 'node:assert/strict';
import { createDungeonSession } from '../server/dungeon-session.js';
import { createLairSession } from '../server/lair-session.js';
import { createCamp, createLairWorld as openRoom } from '../src/lair.js';
import { createProfile } from '../src/profile.js';
import { selectJob } from '../src/jobs.js';
import { createGuard, createVitality, seesPlayer } from '../src/guard.js';
import { updateTeamGuard } from '../server/team-guards.js';
import { enterHiding } from '../src/hiding.js';

const actor = (id, x, y) => ({ id, name: id, x, y, ...createVitality(), connected: true, inRun: true, bag: [], profile: createProfile(id) });
function fixture() {
  const camp = createCamp(), a = actor('a'), b = actor('b');
  const d = createDungeonSession({ id: 'danger-test', seed: 978983017, job: selectJob('manor', 'normal') }, [a, b], camp);
  return { d, a, b, camp };
}
function step(d, players, seconds, held = false) {
  for (let t = 0; t < seconds - .0001; t += .05) {
    for (const p of players) { p.inputAge = 0; p.searchHeld = held; }
    d.tick(.05);
  }
}
function quiet(d) { d.danger.guards.length = 0; }
function atSpot(p, spot) { p.x = spot.x + .7; p.y = spot.y; p.input = { x: 0, y: 0 }; }
function snare(p, id = 'test-snare') { p.bag.push({ id, type: 'snare', rotation: 0, x: 0, y: 0 }); return id; }
function smoke(p) { p.bag.push({ id: 'test-smoke', type: 'smoke', rotation: 0, x: 0, y: 0 }); }
function guardNear(d, p, distance = .7) {
  const g = createGuard(d.world, { roomIndex: 0, behaviour: 'lookout' });
  Object.assign(g, { x: p.x - distance, y: p.y, angle: 0, state: 'chase', targetId: p.id });
  d.danger.guards.push(g); return g;
}

test('a guard advances once for a party, keeps its visible target and can choose another goblin', () => {
  const world = openRoom(), a = actor('a', 8.5, 5.5), b = actor('b', 9.5, 5.5);
  const g = createGuard(world, { roomIndex: 0, behaviour: 'lookout' }); Object.assign(g, { x: 5.5, y: 5.5, angle: 0 });
  updateTeamGuard(world, g, [a, b], .1, [], 0);
  assert.ok(Math.abs(g.suspicion - .1 / .8) < .0001);
  assert.equal(g.targetId, 'a');
  b.x = 6.8; updateTeamGuard(world, g, [a, b], .1, [], 0); assert.equal(g.targetId, 'a');
  a.connected = false; updateTeamGuard(world, g, [a, b], .1, [], 0); assert.equal(g.targetId, 'b');
  assert.ok(g.suspicion <= .1 / .8 + .0001);
});
test('hidden/downed/disconnected goblins do not freeze patrol or become guard targets', () => {
  const world = openRoom(), a = actor('a', 8.5, 5.5), b = actor('b', 7.5, 5.5);
  a.state = 'down'; b.connected = false;
  const g = createGuard(world, { roomIndex: 0, behaviour: 'lookout' }); Object.assign(g, { x: 5.5, y: 5.5, watchLeft: .05 });
  updateTeamGuard(world, g, [a, b], .1, [], 0);
  assert.equal(g.state, 'patrol'); assert.equal(g.watchIndex, 1); assert.equal(g.targetId, null);
});
test('committed swings stay directional, can hit either goblin, and ghosts are immune', () => {
  const world = openRoom(), a = actor('a', 6.2, 5.5), b = actor('b', 6.3, 5.6);
  const g = createGuard(world, { roomIndex: 0, behaviour: 'lookout' });
  Object.assign(g, { x: 5.5, y: 5.5, state: 'chase', targetId: 'a', windup: .05, attackAngle: 0 });
  const e = updateTeamGuard(world, g, [a, b], .05, [], 0);
  assert.deepEqual(e.hitIds, ['a', 'b']); assert.equal(a.health, 2); assert.equal(b.health, 2); assert.ok(a.knockbackLeft > 0);
  a.invulnerable = 0; a.connected = false; b.x = 4.8; b.invulnerable = 0;
  g.windup = .05; g.swing = 0; g.attackAngle = 0;
  updateTeamGuard(world, g, [a, b], .05, [], 0);
  assert.equal(a.health, 2); assert.equal(b.health, 2); assert.equal(g.attackAngle, 0);
});
test('guard search trails track only their target, not an unseen teammate or ghost', () => {
  const world = openRoom(), a = actor('a', 8.5, 5.5), b = actor('b', 9, 6);
  const g = createGuard(world, { roomIndex: 0, behaviour: 'lookout' });
  Object.assign(g, { x: 5.5, y: 5.5, state: 'search', targetId: 'a', lastSeen: { x: 8, y: 5.5 }, trailSource: { x: 8, y: 5.5 }, trailLeft: 2.5 });
  a.connected = false; b.hiding = { spot: { id: 'hidden' } };
  updateTeamGuard(world, g, [a, b], .1, [], 0);
  assert.equal(g.trail.length, 0); assert.ok(g.trailLeft < 2.5); assert.equal(g.state, 'search');
});
test('one hide spot accepts one goblin after half a second; movement/release cancel safely', () => {
  const { d, a, b } = fixture(); quiet(d); const spot = d.danger.hidingSpots[0]; assert.ok(spot);
  atSpot(a, spot); atSpot(b, spot);
  assert.equal(d.action(a, { type: 'hide', id: spot.id }), true);
  assert.equal(d.action(b, { type: 'hide', id: spot.id }), true);
  step(d, [a, b], .45, true); assert.equal(spot.occupantId, null);
  step(d, [a, b], .05, true); assert.equal(spot.occupantId, a.id); assert.ok(a.hiding); assert.equal(b.hiding, null);
  assert.equal(d.action(a, { type: 'search', id: d.objects[0].id }), false);
  assert.equal(d.action(a, { type: 'equip', id: 'x' }), false);
  assert.equal(d.action(a, { type: 'hide' }), true); assert.equal(spot.occupantId, null);
  d.action(b, { type: 'hide', id: spot.id }); d.action(b, { type: 'cancel-search' }); step(d, [b], .6);
  assert.equal(b.hiding, null);
  d.action(b, { type: 'hide', id: spot.id }); b.input = { x: -1, y: 0 }; step(d, [b], .6, true); assert.equal(b.hiding, null);
});
test('a witness can pull a hidden goblin out, while unseen hiding leaves others targetable', () => {
  const { d, a, b } = fixture(); quiet(d); const spot = d.danger.hidingSpots[0]; atSpot(a, spot); atSpot(b, spot);
  const g = guardNear(d, a, 1.5); g.snareLeft = 1;
  assert.equal(d.action(a, { type: 'hide', id: spot.id }), true);
  step(d, [a], .5, true); assert.ok(a.hiding); assert.equal(g.knownHiding.playerId, a.id);
  b.connected = false; // Isolate the witness following its known spot, without another visible distraction.
  step(d, [a], 2); assert.equal(a.hiding, null);
  assert.equal(d.danger.hidingSpots[0].occupantId, null);
});
test('disconnect releases hiding occupancy and cancels trap placement without losing equipment', () => {
  const { d, a, b } = fixture(); quiet(d); const spot = d.danger.hidingSpots[0]; atSpot(a, spot);
  enterHiding(d.world, a, spot); a.connected = false; d.disconnect(a);
  assert.equal(spot.occupantId, null); assert.equal(a.hiding, null); assert.equal(a.state, 'active');
  a.connected = true; snare(a); d.action(a, { type: 'equip', id: 'test-snare' });
  a.connected = false; d.disconnect(a); assert.equal(a.placement.itemId, null); assert.equal(a.bag.length, 1);
});
test('snare has keyboard aiming, release-then-hold placement, one-item consumption and owner clearance', () => {
  const { d, a, b } = fixture(); quiet(d); snare(a);
  assert.equal(d.action(a, { type: 'equip', id: 'test-snare' }), true);
  const origin = { x: a.x, y: a.y };
  a.input = { x: 1, y: 0 }; step(d, [a], .2, true);
  assert.deepEqual({ x: a.x, y: a.y }, origin); assert.ok(a.placement.aimPoint.x > origin.x);
  a.input = { x: 0, y: 0 }; d.action(a, { type: 'aim', x: a.x, y: a.y });
  step(d, [a], 1.2, true); assert.equal(a.bag.length, 1); assert.equal(d.danger.traps.length, 0);
  step(d, [a], .05, false); step(d, [a], 1.05, true);
  assert.equal(a.bag.length, 0); assert.equal(d.danger.traps.length, 1);
  const trap = d.danger.traps[0]; assert.equal(trap.phase, 'arming'); step(d, [a], .5); assert.equal(trap.phase, 'arming');
  a.x += 1.2; b.x = trap.x + 2; b.y = trap.y; step(d, [a, b], .3);
  assert.equal(trap.phase, 'armed'); b.x = trap.x; b.y = trap.y; const health = b.health;
  step(d, [a, b], .05); assert.equal(trap.phase, 'spent'); assert.equal(trap.triggeredBy, 'goblin'); assert.equal(b.health, health);
});
test('simultaneous traps cannot finish overlapping; cancellation and invalid aim conserve stock', () => {
  const { d, a, b } = fixture(); quiet(d); snare(a, 'a-trap'); snare(b, 'b-trap');
  for (const p of [a, b]) { d.action(p, { type: 'equip', id: p.bag[0].id }); d.action(p, { type: 'aim', x: a.x, y: a.y }); }
  assert.equal(d.action(a, { type: 'aim', x: NaN, y: 0 }), false);
  step(d, [a, b], .05); step(d, [a, b], 1.05, true);
  assert.equal(d.danger.traps.length, 1); assert.equal(a.bag.length + b.bag.length, 1);
  const remaining = a.bag.length ? a : b;
  d.action(remaining, { type: 'cancel-placement' }); assert.equal(remaining.bag.length, 1);
});
test('guard-triggered snares stop movement and attack once; disconnected ghosts do not waste traps', () => {
  const { d, a, b } = fixture(); quiet(d);
  const g = guardNear(d, a, 2);
  const trap = { id: 'armed', x: g.x, y: g.y, phase: 'armed', ownerId: a.id, ownerClear: true };
  d.danger.traps.push(trap); a.connected = false;
  step(d, [b], .05); assert.equal(trap.phase, 'spent'); assert.equal(trap.triggeredBy, 'guard'); assert.ok(g.snareLeft > 2.9);
  const x = g.x; step(d, [b], 1); assert.equal(g.x, x); assert.equal(g.windup, 0);
});
test('smoke consumes one carried copy and blocks sight for both guards without stopping committed strikes', () => {
  const { d, a, b } = fixture(); quiet(d); smoke(a);
  const g = guardNear(d, a, 2);
  assert.equal(d.action(a, { type: 'smoke' }), false);
  assert.equal(d.action(a, { type: 'equip', id: 'test-smoke' }), true);
  assert.equal(d.action(a, { type: 'smoke' }), true);
  assert.equal(d.action(a, { type: 'smoke' }), false);
  assert.equal(d.danger.clouds.length, 1); assert.equal(a.bag.length, 0);
  assert.equal(seesPlayer(d.world, g, a, true, d.danger.clouds), false);
  assert.equal(seesPlayer(d.world, g, b, true, d.danger.clouds), false);
  g.x = a.x - .7; g.y = a.y; g.targetId = a.id; g.windup = .05; g.attackAngle = 0;
  const health = a.health; step(d, [a, b], .05); assert.equal(a.health, health - 1);
  d.danger.guards.length = 0; step(d, [a, b], 5.05); assert.equal(d.danger.clouds.length, 0);
});
test('shared heat and each guard alert are counted once, with a reinforcement every third alert', () => {
  const { d, a, b } = fixture(); quiet(d);
  for (let i = 0; i < 3; i++) { const g = guardNear(d, a, 3 + i * .1); g.id = `alert-${i}`; }
  step(d, [a, b], .1); assert.equal(d.danger.pressure.alerts, 3); assert.equal(d.danger.pressure.pending.length, 1);
  const heat = d.danger.pressure.heat; step(d, [a, b], .1); assert.equal(d.danger.pressure.alerts, 3); assert.ok(d.danger.pressure.heat > heat);
  step(d, [a, b], 2.05); assert.equal(d.danger.pressure.reinforcements, 1); assert.ok(d.danger.guards.some(g => g.reinforcement));
});
test('downing spills bag and held item once, blocks actions and does not block teammate exit', () => {
  const { d, a, b, camp } = fixture(); quiet(d); snare(a); smoke(a);
  d.action(a, { type: 'lift', source: 'bag', id: 'test-smoke' });
  a.health = 1; const g = guardNear(d, a); g.windup = .05; g.attackAngle = 0;
  step(d, [b], .05); assert.equal(a.state, 'down'); assert.equal(a.bag.length, 0); assert.equal(a.loot.held, null);
  assert.equal(d.ground.length, 2); step(d, [b], .05); assert.equal(d.ground.length, 2);
  assert.equal(d.action(a, { type: 'pickup', id: 'test-snare' }), false);
  d.danger.guards.length = 0;
  d.action(b, { type: 'pickup', id: 'test-snare' }); Object.assign(b, d.run.entrance);
  const result = d.action(b, { type: 'extract' }); assert.equal(result.outcome, 'escaped'); assert.equal(camp.counts.snare, 2);
  assert.equal(a.result.leftBehind, true); assert.ok(!a.result.lostItems.some(i => i.id === 'test-snare'));
});
test('all downed fails, but an active disconnected teammate retains its remaining grace', () => {
  const { d, a, b } = fixture(); quiet(d); b.connected = false; d.disconnect(b);
  a.state = 'down'; a.health = 0; assert.equal(d.tick(.05), null);
  b.disconnectedFor = 59.95; const result = d.tick(.05); assert.equal(result.outcome, 'down');
  const f = fixture(); quiet(f.d); f.a.state = f.b.state = 'down'; assert.equal(f.d.tick(.05).outcome, 'down');
});
test('local-test debug gear never creates shared stock and home health resets after a run', () => {
  const s = createLairSession(), a = s.connect(), b = s.connect();
  assert.equal(s.action(a, { type: 'debug-pack', item: 'smoke' }), true);
  assert.equal(s.action(a, { type: 'debug-pack', item: 'ruby' }), false);
  const item = a.bag[0]; assert.equal(item.debugSupply, true);
  s.action(a, { type: 'return', id: item.id }); assert.equal(s.snapshot(a).camp.counts.smoke, 0);
  for (const p of [a, b]) { p.x = 9; p.y = 2.5; s.action(p, { type: 'board' }); }
  for (let i = 0; i < 61; i++) s.tick(.05);
  a.health = 0; a.state = 'down'; s.tick(.05);
  s.action(b, { type: 'extract' }); assert.equal(a.state, 'active'); assert.equal(a.health, 3);
});

test('damage interrupts search, hide entry and trap setup without spending a reserved trap', () => {
  const { d, a, b } = fixture(); quiet(d); snare(a);
  d.action(a, { type: 'equip', id: 'test-snare' }); d.action(a, { type: 'aim', x: a.x, y: a.y });
  step(d, [a], .05); step(d, [a], .4, true);
  assert.ok(a.placement.elapsed > .3);
  const g = guardNear(d, a); g.windup = .05; g.attackAngle = 0; step(d, [a], .05, true);
  assert.equal(a.health, 2); assert.equal(a.placement.elapsed, 0); assert.equal(a.bag.length, 1);
  d.danger.guards.length = 0; step(d, [a], 1.1, true);
  assert.equal(a.bag.length, 1); assert.equal(d.danger.traps.length, 0);
  for (const kind of ['search', 'hide']) {
    const f = fixture(); quiet(f.d);
    const object = kind === 'search' ? f.d.objects[0] : f.d.danger.hidingSpots[0];
    atSpot(f.a, object);
    assert.equal(f.d.action(f.a, { type: kind, id: object.id }), true);
    const guard = guardNear(f.d, f.a); guard.windup = .05; guard.attackAngle = 0;
    step(f.d, [f.a], .05, true);
    assert.equal(f.a.search.active, null); assert.equal(f.a.enteringHide, null);
    assert.equal(f.a.health, 2);
  }
});

test('offline goblins receive no new immunity or health on reconnect and retain down state', () => {
  const { d, a, b } = fixture(); quiet(d);
  a.health = 2; a.invulnerable = 1; a.connected = false; d.disconnect(a);
  d.tick(2); assert.equal(a.invulnerable, 0); assert.equal(a.health, 2);
  a.connected = true; a.disconnectedFor = 0; assert.equal(a.state, 'active');
  a.state = 'down'; a.health = 0; a.connected = false; d.disconnect(a);
  step(d, [b], 1); a.connected = true;
  assert.equal(a.state, 'down'); assert.equal(a.health, 0);
});
