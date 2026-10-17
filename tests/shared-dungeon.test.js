import test from 'node:test';
import assert from 'node:assert/strict';
import { createDungeonSession } from '../server/dungeon-session.js';
import { createLairSession } from '../server/lair-session.js';
import { createCamp } from '../src/lair.js';
import { createProfile } from '../src/profile.js';
import { selectJob } from '../src/jobs.js';
import { generateDungeon } from '../src/world.js';

function fixture(difficulty = 'normal') {
  const camp = createCamp(), a = { id: 'a', name: 'A', connected: true, bag: [], profile: createProfile('a') }, b = { id: 'b', name: 'B', connected: true, bag: [], profile: createProfile('b') };
  const launch = { id: 'test-run', seed: 978983017, job: selectJob('manor', difficulty), participants: [a.id, b.id] };
  return { a, b, camp, d: createDungeonSession(launch, [a, b], camp) };
}
function hold(d, p, seconds) {
  for (let t = 0; t < seconds - .001; t += .05) { p.inputAge = 0; p.searchHeld = true; d.tick(.05); }
}
function searchRuby(d, a) {
  const chest = d.objects[0]; assert.deepEqual(chest.contents, ['ruby']);
  assert.equal(d.action(a, { type: 'search', id: chest.id }), true); hold(d, a, 2.55);
  assert.equal(chest.searched, true); assert.equal(d.ground[0].type, 'ruby'); return d.ground[0];
}
test('shared deterministic dungeon conceals contents and reserves searches with observable progress', () => {
  const { d, a, b } = fixture();
  assert.deepEqual(d.world.tiles, generateDungeon(978983017).tiles);
  const chest = d.objects[0];
  assert.equal(d.snapshot().objects[0].contents, undefined);
  assert.equal(d.action(a, { type: 'search', id: chest.id }), true);
  assert.equal(d.action(b, { type: 'search', id: chest.id }), false);
  hold(d, a, 1);
  assert.equal(d.snapshot().objects[0].searcherId, a.id);
  assert.ok(d.snapshot().objects[0].elapsed > .9);
  assert.equal(d.ground.length, 0);
  d.action(a, { type: 'cancel-search' });
  assert.equal(d.action(b, { type: 'search', id: chest.id }), true);
  hold(d, b, 2.55);
  assert.equal(d.ground.length, 1);
  assert.equal(d.snapshot().objects[0].searcherId, undefined);
  assert.equal(d.action(a, { type: 'search', id: chest.id }), false);
  hold(d, b, 3); assert.equal(d.ground.length, 1);
});
test('search release, movement, missing heartbeat and disconnect cancel and release reservations', () => {
  for (const mode of ['release', 'move', 'stale', 'disconnect']) {
    const { d, a, b } = fixture(); const id = d.objects[0].id;
    d.action(a, { type: 'search', id }); hold(d, a, .5);
    if (mode === 'release') a.searchHeld = false;
    if (mode === 'move') a.input = { x: -1, y: 0 };
    if (mode === 'stale') a.inputAge = .5;
    if (mode === 'disconnect') { a.connected = false; d.disconnect(a); }
    d.tick(.05);
    assert.equal(a.search.active, null, mode);
    assert.equal(d.action(b, { type: 'search', id }), true, mode);
    assert.equal(d.ground.length, 0);
  }
});
test('racing pickups, cursor lifting, rotation, packing and floor sharing conserve each item', () => {
  const { d, a, b } = fixture(); const item = searchRuby(d, a);
  assert.equal(d.action(a, { type: 'pickup', id: item.id }), true);
  assert.equal(d.action(b, { type: 'pickup', id: item.id }), false);
  assert.equal(d.action(b, { type: 'lift', source: 'bag', id: item.id }), false);
  assert.equal(d.action(a, { type: 'lift', source: 'bag', id: item.id }), true);
  assert.equal(d.action(a, { type: 'rotate' }), true);
  assert.equal(d.action(a, { type: 'place', x: NaN, y: 0 }), false);
  assert.equal(d.action(a, { type: 'place', x: 3, y: 0 }), false);
  assert.equal(d.action(a, { type: 'place', x: 2, y: 2 }), true);
  assert.equal(a.bag[0].rotation, 1);
  d.action(a, { type: 'lift', source: 'bag', id: item.id });
  assert.equal(d.action(a, { type: 'drop' }), true);
  assert.equal(d.action(a, { type: 'drop' }), false);
  assert.equal(d.action(b, { type: 'lift', source: 'ground', id: item.id }), true);
  assert.equal(d.action(a, { type: 'pickup', id: item.id }), false);
  assert.equal(d.action(b, { type: 'place', x: 0, y: 0 }), true);
  assert.equal(a.bag.length, 0); assert.equal(b.bag.length, 1); assert.equal(d.ground.length, 0);
});
test('full sacks leave loot on floor; rearranging then retrying works; distance checked on server', () => {
  const { d, a, b } = fixture(); const item = searchRuby(d, a);
  a.bag.push(...Array.from({ length: 9 }, (_, i) => ({ id: `supply-${i}`, type: 'snare', rotation: 0, x: i % 3, y: Math.floor(i / 3) })));
  assert.equal(d.action(a, { type: 'pickup', id: item.id }), false);
  assert.equal(d.ground.length, 1);
  d.action(a, { type: 'lift', source: 'bag', id: 'supply-8' }); d.action(a, { type: 'drop' });
  assert.equal(d.action(a, { type: 'pickup', id: item.id }), true);
  const ground = d.ground[0]; b.x += 10;
  assert.equal(d.action(b, { type: 'pickup', id: ground.id }), false);
  assert.equal(d.action(b, { type: 'search', id: d.objects[1].id }), false);
  assert.equal(d.action(a, { type: 'lift', source: '__proto__', id: item.id }), false);
});
test('all active goblins gather to extract; bank shared haul once and preserve unused gear', () => {
  const { d, a, b, camp } = fixture('hard');
  const item = searchRuby(d, a); d.action(a, { type: 'pickup', id: item.id });
  b.bag.push({ id: 'packed', type: 'snare', rotation: 0, x: 0, y: 0 });
  b.x += 2; assert.equal(d.action(a, { type: 'extract' }), false);
  b.x -= 2;
  d.action(a, { type: 'lift', source: 'bag', id: item.id });
  assert.equal(d.action(b, { type: 'extract' }), false);
  d.action(a, { type: 'place', x: 0, y: 0 });
  const result = d.action(b, { type: 'extract' });
  assert.equal(result.soldGold, 38); assert.equal(camp.counts.gold, 38); assert.equal(camp.counts.snare, 2);
  assert.equal(a.bag.length + b.bag.length, 0);
  assert.equal(d.action(a, { type: 'extract' }), false); assert.equal(camp.counts.gold, 38);
  assert.equal(a.profile.xp, 38); assert.equal(b.profile.xp, 38);
  assert.equal(a.result.personalXp.earned, 38); assert.equal(b.result.personalXp.earned, 38);
});
test('dungeon ghost lasts sixty seconds, retains sack on return, and spills once on expiry', () => {
  const { d, a, b } = fixture(); const item = searchRuby(d, a); d.action(a, { type: 'pickup', id: item.id });
  a.connected = false; d.disconnect(a);
  d.tick(30); assert.equal(a.inRun, true); assert.equal(a.bag.length, 1);
  a.connected = true; a.disconnectedFor = 0; d.tick(.05); assert.equal(a.bag.length, 1);
  a.connected = false; d.disconnect(a);
  d.tick(59.9); assert.equal(a.inRun, true);
  d.tick(.1); assert.equal(a.inRun, false); assert.equal(a.waiting, true); assert.equal(a.bag.length, 0);
  assert.equal(d.ground.filter(i => i.id === item.id).length, 1);
  d.tick(2); assert.equal(d.ground.filter(i => i.id === item.id).length, 1);
  assert.equal(d.action(b, { type: 'pickup', id: item.id }), true);
});
test('a survivor can extract without a ghost but its sack never banks; all ghosts keep run open until expiry', () => {
  const { d, a, b, camp } = fixture(); const item = searchRuby(d, a); d.action(a, { type: 'pickup', id: item.id });
  a.connected = false; d.disconnect(a);
  const result = d.action(b, { type: 'extract' });
  assert.equal(result.soldGold, 0); assert.equal(camp.counts.gold, 0); assert.equal(a.bag.length, 0);
  const f = fixture(); f.a.connected = false; f.b.connected = false; f.d.disconnect(f.a); f.d.disconnect(f.b);
  assert.equal(f.d.tick(59.9), null);
  assert.equal(f.d.tick(.1).outcome, 'down');
});
test('lair lifecycle launches one shared dungeon, hides it from arrivals, returns as team and can launch again', () => {
  const s = createLairSession(), a = s.connect(), b = s.connect();
  // Only tests position actors directly; network clients cannot send coordinates.
  for (const p of [a, b]) { p.x = 9; p.y = 2.5; s.action(p, { type: 'board' }); }
  for (let i = 0; i < 61; i++) s.tick(.05);
  const first = s.snapshot(a).dungeon;
  assert.ok(first); assert.deepEqual(first, s.snapshot(b).dungeon);
  const newcomer = s.connect(); assert.equal(s.snapshot(newcomer).dungeon, null); assert.equal(newcomer.waiting, true);
  assert.equal(s.action(newcomer, { type: 'extract' }), false);
  assert.equal(s.action(a, { type: 'take', item: 'snare' }), false);
  s.action(a, { type: 'move', x: 1, y: 0 }); s.tick(.1);
  assert.equal(s.snapshot(b).players.find(p => p.id === a.id).x, a.x);
  s.action(a, { type: 'move', x: 0, y: 0 });
  Object.assign(a, first.entrance); Object.assign(b, first.entrance);
  assert.equal(s.action(a, { type: 'extract' }), true);
  assert.equal(s.snapshot(a).dungeon, null); assert.equal(newcomer.waiting, false);
  assert.ok(s.snapshot(b).result.team);
  assert.equal(s.action(a, { type: 'extract' }), false);
  for (const p of [a, b]) s.action(p, { type: 'dismiss-result' });
  for (const p of [a, b, newcomer]) { p.x = 9; p.y = 2.5; s.action(p, { type: 'board' }); }
  for (let i = 0; i < 61; i++) s.tick(.05);
  assert.notEqual(s.snapshot(a).dungeon.id, first.id);
});
