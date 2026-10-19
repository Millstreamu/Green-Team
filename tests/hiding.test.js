import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon, canStand, movePlayer, setSolidObjects } from '../src/world.js';
import { createSearchables, selectInteraction, canSearch } from '../src/search.js';
import { createHidingSpots, canHide, enterHiding, leaveHiding, beginHiding, updateHiding } from '../src/hiding.js';
import { createGuard, createVitality, seesPlayer, updateGuard, tickVitality, guardStrikeHits } from '../src/guard.js';
import { useSmoke } from '../src/smoke.js';
import { createPlacement, updatePlacement } from '../src/traps.js';
import { findPath } from '../src/navigation.js';

function scenario() {
  const world = { seed: 1, width: 20, height: 20, tiles: new Uint8Array(400).fill(1), spawn: { x: 4.5, y: 4.5 }, rooms: [{ x: 1, y: 1, w: 16, h: 16, cx: 8, cy: 8 }] };
  const player = { id: 'one', x: 7.5, y: 5.5, facing: 1, ...createVitality() };
  const spot = { id: 'barrel', x: 8.5, y: 5.5, occupantId: null };
  setSolidObjects(world, [spot]);
  const guard = createGuard(world, { roomIndex: 0, behaviour: 'lookout' });
  Object.assign(guard, { x: 3.5, y: 5.5, angle: 0 });
  return { world, player, spot, guard };
}

test('hiding barrels are deterministic reachable non-overlapping furniture on 100 maps', () => {
  for (let seed = 0; seed < 100; seed++) {
    const world = generateDungeon(seed), objects = createSearchables(world), spots = createHidingSpots(world, objects);
    assert.ok(spots.length >= 4); assert.deepEqual(spots, createHidingSpots(world, objects));
    assert.equal(new Set(spots.map(s => s.id)).size, spots.length);
    for (const spot of spots) {
      assert.equal(canStand(world, spot.x, spot.y), false);
      assert.ok(canStand(world, spot.approach.x, spot.approach.y));
      assert.ok(findPath(world, world.spawn, spot.approach).length);
      assert.ok(objects.every(o => Math.hypot(o.x - spot.x, o.y - spot.y) > 1));
    }
  }
});

test('unseen hiding defeats sight, strikes and new footprints while guards still finish searching', () => {
  const { world, player, spot, guard } = scenario();
  Object.assign(guard, { state: 'chase', lastSeen: { x: 6.5, y: 5.5 } });
  assert.ok(enterHiding(world, player, spot));
  assert.equal(seesPlayer(world, guard, player, true), false);
  assert.equal(guardStrikeHits(world, guard, player), false);
  let moved = false;
  for (let i = 0; i < 300; i++) {
    const before = guard.x;
    const event = updateGuard(world, guard, player, 0.05);
    moved ||= guard.x !== before;
    assert.equal(event.hit, false); assert.ok(player.hiding);
    assert.ok(guard.trail.every(p => p.x !== spot.x));
  }
  assert.ok(moved); assert.equal(guard.state, 'patrol'); assert.equal(player.health, 3);
});

test('a witnessing guard approaches and pulls the goblin out; an unwitnessing guard has no knowledge', () => {
  const { world, player, spot, guard } = scenario();
  const other = createGuard(world, { roomIndex: 0 });
  assert.ok(seesPlayer(world, guard, player));
  assert.ok(enterHiding(world, player, spot, [guard]));
  assert.equal(other.knownHiding, undefined);
  guard.snareLeft = 0.5;
  for (let i = 0; i < 5; i++) updateGuard(world, guard, player, 0.05);
  assert.equal(guard.x, 3.5); assert.ok(player.hiding);
  let exposed = false;
  for (let i = 0; i < 100 && player.hiding; i++) exposed ||= !!updateGuard(world, guard, player, 0.05).exposed;
  assert.ok(exposed); assert.equal(player.hiding, null); assert.equal(spot.occupantId, null);
  assert.equal(player.x, 7.5); assert.equal(player.health, 3);
  for (let i = 0; i < 20; i++) { tickVitality(player, 0.05, world); updateGuard(world, guard, player, 0.05); }
  assert.ok(player.health < 3, 'normal chase/attacks resume after being exposed');
});

test('hiding blocks movement, knockback, searches, smoke and placement without consuming items', () => {
  const { world, player, spot } = scenario();
  assert.ok(enterHiding(world, player, spot));
  const before = { x: player.x, y: player.y };
  movePlayer(world, player, { x: 1, y: 1 }, 1);
  player.knockbackLeft = 0.1; player.knockbackX = 5;
  tickVitality(player, 0.1, world);
  assert.equal(player.x, before.x); assert.equal(player.y, before.y);
  assert.equal(canSearch(world, player, { ...spot, searched: false }), false);
  assert.equal(selectInteraction(world, player, [], [], null, [spot]), null);
  const loot = { held: null, bag: [{ id: 'smoke', type: 'smoke' }, { id: 'snare', type: 'snare' }] }, clouds = [], traps = [];
  assert.equal(useSmoke(loot, player, clouds), false);
  const placement = { ...createPlacement(), itemId: 'snare', ready: true };
  assert.equal(updatePlacement(placement, world, player, loot, traps, [], spot, true, 2), null);
  assert.equal(loot.bag.length, 2); assert.equal(clouds.length, 0); assert.equal(traps.length, 0);
  assert.ok(leaveHiding(player)); assert.equal(player.x, 7.5); assert.equal(player.y, 5.5);
  assert.equal(leaveHiding(player), false);
});

test('spot occupancy, reach and walls prevent conflicting entry; leaving frees the same spot', () => {
  const { world, player, spot } = scenario();
  const other = { ...player, id: 'two' };
  assert.equal(selectInteraction(world, player, [], [], null, [spot]).kind, 'hide');
  assert.ok(enterHiding(world, player, spot));
  assert.equal(enterHiding(world, other, spot), false);
  leaveHiding(player); assert.ok(enterHiding(world, other, spot)); leaveHiding(other);
  player.x = 1.5; assert.equal(canHide(world, player, spot), false);
  player.x = 6.9; spot.x = 8.1; world.tiles[5 * 20 + 7] = 0;
  assert.equal(canHide(world, player, spot), false);
});


test('entry requires a full half-second, stays vulnerable, and remembers any witness during the hold', () => {
  const { world, player, spot, guard } = scenario();
  assert.ok(beginHiding(world, player, spot));
  assert.equal(updateHiding(world, player, true, 0.2, [guard]), null);
  assert.equal(player.hiding, undefined); assert.equal(spot.occupantId, null);
  assert.ok(seesPlayer(world, guard, player));
  assert.equal(updateHiding(world, player, true, 0.299), null);
  assert.deepEqual(updateHiding(world, player, true, 0.001), { type: 'hidden', witnessed: true });
  assert.equal(spot.occupantId, player.id); assert.equal(guard.knownHiding.spotId, spot.id);
  assert.equal(player.enteringHide, null);
});

test('release, movement, damage, downing and other actions reset entry rather than banking progress', () => {
  for (const reason of ['release', 'move', 'hit', 'down', 'blocked']) {
    const { world, player, spot } = scenario();
    beginHiding(world, player, spot); updateHiding(world, player, true, 0.4);
    if (reason === 'move') player.x += 0.1;
    if (reason === 'hit') player.health--;
    if (reason === 'down') player.state = 'down';
    assert.deepEqual(updateHiding(world, player, reason !== 'release', 0.2, [], reason === 'blocked'), { type: 'cancelled' });
    assert.equal(player.hiding, undefined); assert.equal(spot.occupantId, null);
    player.state = 'active'; assert.ok(beginHiding(world, player, spot));
    assert.equal(updateHiding(world, player, true, 0.1), null);
    assert.equal(player.hiding, undefined);
  }
});

test('two goblins completing entry cannot occupy the same spot; leaving makes it available again', () => {
  const { world, player, spot } = scenario(), other = { ...player, id: 'two' };
  assert.ok(beginHiding(world, player, spot)); assert.ok(beginHiding(world, other, spot));
  assert.equal(updateHiding(world, player, true, 0.5).type, 'hidden');
  assert.equal(updateHiding(world, other, true, 0.5).type, 'cancelled');
  assert.equal(spot.occupantId, 'one'); assert.equal(other.hiding, undefined);
  leaveHiding(player); assert.ok(beginHiding(world, other, spot));
  assert.equal(updateHiding(world, other, true, 0.5).type, 'hidden'); assert.equal(spot.occupantId, 'two');
});

test('occupied indicator is drawn for a different goblin and clears when the occupant leaves', async () => {
  const { drawHidingSpots } = await import('../src/hiding-view.js');
  const { world, player, spot } = scenario();
  const labels = [], colors = [];
  const ctx = { fillRect() { colors.push(this.fillStyle); }, strokeRect() {}, fillText(text) { labels.push(text); } };
  enterHiding(world, player, spot);
  drawHidingSpots(ctx, [spot], null, { id: 'other' }, 0, 0);
  assert.ok(labels.includes('OCCUPIED')); assert.ok(colors.includes('#91c66c'));
  leaveHiding(player); labels.length = 0; colors.length = 0;
  drawHidingSpots(ctx, [spot], null, { id: 'other' }, 0, 0);
  assert.ok(!labels.includes('OCCUPIED')); assert.ok(!colors.includes('#91c66c'));
});


test('solid barrels stop walking; deliberate entry and exit preserve a safe outside position', () => {
  const { world, player, spot } = scenario();
  movePlayer(world, player, { x: 1, y: 0 }, 1);
  assert.ok(player.x < 8 && canStand(world, player.x, player.y));
  const outside = { x: player.x, y: player.y };
  assert.ok(beginHiding(world, player, spot));
  assert.equal(updateHiding(world, player, true, .5).type, 'hidden');
  assert.equal(canStand(world, spot.x, spot.y), false);
  assert.ok(leaveHiding(player));
  assert.deepEqual({ x: player.x, y: player.y }, outside);
  assert.ok(canStand(world, player.x, player.y));
});
