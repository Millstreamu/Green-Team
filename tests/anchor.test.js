import test from 'node:test';
import assert from 'node:assert/strict';
import { setHidingAnchor, travelToAnchor, leaveHiding } from '../src/hiding.js';
import { createVitality } from '../src/guard.js';
import { tickPassiveEffects, passiveStatus } from '../src/passive-effects.js';
import { HIDING } from '../src/config.js';

const spot = (id, x, y) => ({ id, x, y, approach: { x, y: y + 1 }, occupantId: null });
function hidden(spots, at, extra = {}) {
  const player = { id: 'g1', x: 0, y: 0, ...createVitality(), hidingAnchor: true, ...extra };
  player.hiding = { spot: spots[at], outside: { x: 9, y: 9 } }; spots[at].occupantId = player.id;
  Object.assign(player, { x: spots[at].x, y: spots[at].y }); return player;
}

test('anchor is set in a barrel and travel lands hidden in it, then waits out the cooldown', () => {
  const spots = [spot('a', 2.5, 2.5), spot('b', 10.5, 4.5)], player = hidden(spots, 0);
  assert.equal(setHidingAnchor(player), true); assert.equal(player.anchorSpotId, 'a');
  assert.equal(travelToAnchor(player, spots), 'here');
  leaveHiding(player); assert.equal(spots[0].occupantId, null);
  player.hiding = { spot: spots[1], outside: { x: 9, y: 9 } }; spots[1].occupantId = player.id;
  assert.equal(travelToAnchor(player, spots), 'moved');
  assert.equal(player.hiding.spot.id, 'a'); assert.equal(spots[0].occupantId, 'g1'); assert.equal(spots[1].occupantId, null);
  assert.deepEqual({ x: player.x, y: player.y }, { x: 2.5, y: 2.5 }); assert.deepEqual(player.hiding.outside, spots[0].approach);
  assert.equal(player.anchorCooldown, HIDING.anchorCooldown); assert.match(passiveStatus(player), /ANCHOR 30s/);
  // Leaving the anchor barrel puts the goblin at that barrel's own legal approach.
  leaveHiding(player); assert.deepEqual({ x: player.x, y: player.y }, spots[0].approach);
  player.hiding = { spot: spots[1], outside: { x: 9, y: 9 } }; spots[1].occupantId = player.id;
  assert.equal(travelToAnchor(player, spots), 'cooldown'); assert.equal(player.hiding.spot.id, 'b');
  tickPassiveEffects(player, HIDING.anchorCooldown); assert.equal(travelToAnchor(player, spots), 'moved');
});

test('anchor is personal, needs the ability, refuses occupied barrels and sends witnesses to the old barrel', () => {
  const spots = [spot('a', 2.5, 2.5), spot('b', 10.5, 4.5)];
  const without = hidden(spots, 0, { hidingAnchor: false });
  assert.equal(setHidingAnchor(without), false); assert.equal(travelToAnchor(without, spots), 'unavailable');
  leaveHiding(without);
  const player = hidden(spots, 1, { anchorSpotId: 'a' });
  assert.equal(travelToAnchor({ ...player, anchorSpotId: undefined }, spots), 'none');
  spots[0].occupantId = 'teammate'; assert.equal(travelToAnchor(player, spots), 'occupied'); assert.equal(player.anchorCooldown, 0);
  spots[0].occupantId = null;
  const guard = { knownHiding: { spotId: 'b', playerId: 'g1', x: 10.5, y: 5.5 } }, other = { knownHiding: { spotId: 'a', playerId: 'teammate', x: 1, y: 1 } };
  assert.equal(travelToAnchor(player, spots, [guard, other]), 'moved');
  assert.equal(guard.knownHiding, null); assert.deepEqual(guard.lastSeen, { x: 10.5, y: 5.5 }); assert.equal(other.knownHiding.playerId, 'teammate');
  const fresh = createVitality(); assert.equal(fresh.anchorSpotId, null); assert.equal(fresh.anchorCooldown, 0);
});

import { createDungeonSession } from '../server/dungeon-session.js';
import { createCamp } from '../src/lair.js';
import { createProfile } from '../src/profile.js';
import { selectJob } from '../src/jobs.js';
import { inShadow } from '../src/shadows.js';
import { litTorches } from '../src/lighting.js';

const teamGoblin = (id, purchases) => { const profile = { ...createProfile(id), purchases, activePassives: purchases }; return { id, name: id, x: 0, y: 0, ...createVitality(), connected: true, inRun: true, bag: [], profile }; };
function session(purchases = ['hidingAnchor']) {
  const a = teamGoblin('a', purchases), b = teamGoblin('b', []);
  const d = createDungeonSession({ id: 'anchor-test', seed: 978983017, job: selectJob('manor', 'normal') }, [a, b], createCamp());
  d.danger.guards.length = 0; return { d, a, b };
}
function hideIn(d, p, spot) {
  Object.assign(p, spot.approach); p.input = { x: 0, y: 0 };
  assert.equal(d.action(p, { type: 'hide', id: spot.id }), true);
  for (let t = 0; t < .55; t += .05) { p.inputAge = 0; p.searchHeld = true; d.tick(.05); }
  assert.equal(p.hiding?.spot.id, spot.id);
}

test('server anchor: set, travel, cooldown notice, personal to its owner', () => {
  const { d, a, b } = session(), [first, second] = d.danger.hidingSpots; assert.ok(first && second, 'needs two barrels');
  assert.equal(a.hidingAnchor, true); assert.equal(b.hidingAnchor, false);
  hideIn(d, a, first); assert.equal(d.action(a, { type: 'anchor' }), true); assert.equal(a.anchorSpotId, first.id); assert.match(a.notice.text, /Anchor set/);
  assert.equal(d.action(a, { type: 'hide' }), true);
  hideIn(d, a, second); assert.equal(d.action(a, { type: 'anchor' }), true);
  assert.equal(a.hiding.spot.id, first.id); assert.equal(first.occupantId, 'a'); assert.equal(second.occupantId, null); assert.match(a.notice.text, /still hidden/);
  assert.equal(d.action(a, { type: 'anchor', here: true }), true);
  hideIn(d, b, second); assert.equal(d.action(b, { type: 'anchor' }), false, 'teammates cannot use or set an anchor'); assert.equal(b.hiding.spot.id, second.id);
});

test('server shadow stillness hides a still goblin in a dark spot and the snapshot reports it', () => {
  const { d, a } = session(['shadowStillness']), world = d.world;
  const torches = litTorches(world, [...d.objects, ...d.danger.hidingSpots, ...d.danger.rescue.cages, ...d.danger.pressure.doors.map(x => x.spawn)]);
  const dark = world.rooms.flatMap(r => Array.from({ length: r.w * r.h }, (_, i) => ({ x: r.x + i % r.w + .5, y: r.y + Math.floor(i / r.w) + .5 })))
    .find(p => inShadow(torches, p) && ![...d.objects, ...d.danger.hidingSpots].some(o => Math.abs(o.x - p.x) < 1 && Math.abs(o.y - p.y) < 1));
  assert.ok(dark, 'a reachable dark floor tile exists');
  Object.assign(a, dark); a.input = { x: 0, y: 0 };
  for (let t = 0; t < 1.2; t += .05) { a.inputAge = 0; d.tick(.05); }
  assert.equal(a.inShadow, true); assert.equal(a.shadowHidden, true);
});
