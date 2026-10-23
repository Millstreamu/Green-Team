import test from 'node:test';
import assert from 'node:assert/strict';
import { createDungeonSession } from '../server/dungeon-session.js';
import { createCamp, bankEscape } from '../src/lair.js';
import { createProfile, teamHaulXp } from '../src/profile.js';
import { selectJob } from '../src/jobs.js';
import { createVitality, createGuard } from '../src/guard.js';
import { applyAbilityVitality, tickPassiveEffects, treasureBearing } from '../src/passive-effects.js';
import { canRig, isCrate, roomAt, sacrificeRoomObjects } from '../src/room-abilities.js';
import { ABILITY, COMBAT } from '../src/config.js';

const goblin = (id, purchases = []) => ({ id, name: id, x: 0, y: 0, ...createVitality(), connected: true, inRun: true, bag: [], profile: { ...createProfile(id), purchases, activePassives: purchases } });
function session(aAbilities, bAbilities = [], seed = 978983017) {
  const a = goblin('a', aAbilities), b = goblin('b', bAbilities);
  const d = createDungeonSession({ id: `five-${seed}`, seed, job: selectJob('manor', 'normal') }, [a, b], createCamp());
  d.danger.guards.length = 0; d.ground.length = 0; return { d, a, b };
}
function hold(d, players, seconds, keys) {
  for (let t = 0; t < seconds - .0001; t += .05) { for (const p of players) { p.inputAge = 0; Object.assign(p, keys); } d.tick(.05); }
}

test('Tough Hide starts raids with an extra heart in solo and on the server', () => {
  const solo = { ...createVitality(), extraHeart: true }; applyAbilityVitality(solo);
  assert.equal(solo.maxHealth, COMBAT.health + ABILITY.extraHearts); assert.equal(solo.health, solo.maxHealth);
  const { a, b } = session(['extraHeart']); assert.equal(a.maxHealth, 4); assert.equal(a.health, 4); assert.equal(b.maxHealth, 3);
});

test('Haggler adds 20% gold for its own sack and the cart items it loaded, without changing XP', () => {
  const camp = createCamp(), before = camp.counts.gold, result = { outcome: 'escaped' };
  bankEscape(camp, result, { bag: [{ id: 'r', type: 'ruby', rotation: 0, haggled: true }, { id: 'c', type: 'candlestick', rotation: 0 }] });
  assert.equal(camp.counts.gold - before, 25 + 5 + 12); assert.equal(result.hagglerGold, 5);
  const camp2 = createCamp(), a = goblin('a', ['haggler']), b = goblin('b');
  const d = createDungeonSession({ id: 'five-haggle', seed: 978983017, job: selectJob('manor', 'normal') }, [a, b], camp2);
  d.danger.guards.length = 0; d.ground.length = 0;
  a.bag.push({ id: 'ar', type: 'ruby', rotation: 0, x: 0, y: 0 });
  b.bag.push({ id: 'br', type: 'ruby', rotation: 0, x: 0, y: 0 });
  d.run.cart.items.push({ id: 'ac', type: 'scroll', rotation: 0, x: 0, y: 0, cartedBy: 'a' }, { id: 'bc', type: 'scroll', rotation: 0, x: 2, y: 0, cartedBy: 'b' });
  const start = camp2.counts.gold;
  for (const p of [a, b]) { Object.assign(p, d.run.entrance); p.input = { x: 0, y: 0 }; assert.equal(d.action(p, { type: 'cart-board', active: true }), true); }
  hold(d, [a, b], 3.2, {});
  assert.equal(a.result?.outcome, 'escaped'); assert.equal(a.result.hagglerGold, 5 + 2, 'own ruby 25 gives +5, own carted scroll 8 gives +2');
  assert.equal(camp2.counts.gold - start, 25 + 25 + 8 + 8 + 7); assert.equal(teamHaulXp(a.result), 25 + 25 + 8 + 8, 'XP ignores the bonus');
});

test('Treasure Sense shows a straight-line arrow for 3 seconds every 20 while the room is locked', () => {
  const player = { ...createVitality(), x: 2, y: 2.5, treasureBearing: true };
  const world = { rooms: [{ cx: 10, cy: 2 }], treasure: { roomIndex: 0, unlocked: false } };
  tickPassiveEffects(player, ABILITY.bearingEvery - .1); assert.equal(treasureBearing(world, player), null);
  tickPassiveEffects(player, .2); assert.ok(Math.abs(treasureBearing(world, player)) < .01, 'points east');
  tickPassiveEffects(player, ABILITY.bearingShow); assert.equal(treasureBearing(world, player), null);
  player.bearingLeft = 1; world.treasure.unlocked = true; assert.equal(treasureBearing(world, player), null);
  assert.equal(treasureBearing({ rooms: [] }, { ...player, bearingLeft: 1 }), null, 'no treasure room, no arrow');
});

test('Crate Trap rigs one searched crate, stuns the first close guard and adds an alert', () => {
  const { d, a } = session(['crateTrap']), crate = d.objects.find(isCrate);
  assert.ok(crate, 'map has a crate'); Object.assign(a, crate.approach); a.input = { x: 0, y: 0 };
  assert.equal(canRig(d.world, a, crate, d.objects), false, 'must be searched first'); crate.searched = true;
  assert.equal(d.action(a, { type: 'rig', id: crate.id }), true);
  hold(d, [a], ABILITY.rigSeconds - .1, { searchHeld: true }); assert.equal(crate.riggedBy, undefined);
  hold(d, [a], .2, { searchHeld: true }); assert.equal(crate.riggedBy, 'a'); assert.match(a.notice.text, /Crate rigged/);
  const other = d.objects.find(o => o !== crate && isCrate(o)); if (other) { other.searched = true; assert.equal(canRig(d.world, a, { ...other, x: a.x, y: a.y }, d.objects), false, 'one at a time'); }
  const alerts = d.danger.pressure.alerts, guard = createGuard(d.world, { roomIndex: 0, behaviour: 'lookout' });
  Object.assign(guard, { x: crate.x + 1, y: crate.y }); d.danger.guards.push(guard); d.tick(.05);
  assert.ok(guard.snareLeft > 0); assert.equal(crate.riggedBy, null); assert.equal(d.danger.pressure.alerts, alerts + 1); assert.match(a.notice.text, /sprung/);
  const snap = d.snapshot(); assert.equal(snap.objects.find(o => o.id === crate.id).riggedBy, null);
});

test('Sack Sacrifice spends a valuable worth 5+ gold after 10 seconds of Space and opens the room', () => {
  const { d, a } = session(['sackSacrifice']);
  const room = d.world.rooms.findIndex((r, i) => i > 0 && sacrificeRoomObjects(d.world, d.objects, i).length >= 1 && d.world.treasure?.roomIndex !== i);
  assert.ok(room > 0); const targets = sacrificeRoomObjects(d.world, d.objects, room), spot = targets[0].approach;
  Object.assign(a, spot); a.input = { x: 0, y: 0 };
  const copper = { id: 'cu', type: 'copperCoin', rotation: 0, x: spot.x, y: spot.y, count: 1 }, cloth = { id: 'cl', type: 'cloth', rotation: 0, x: spot.x, y: spot.y };
  d.ground.push(copper, cloth); assert.equal(roomAt(d.world, copper), room);
  assert.equal(d.action(a, { type: 'sacrifice', id: 'cu' }), false, 'a copper coin is worth too little'); assert.equal(d.action(a, { type: 'sacrifice', id: 'cl' }), false, 'materials do not count');
  const ruby = { id: 'ruby', type: 'ruby', rotation: 0, x: spot.x, y: spot.y }; d.ground.push(ruby);
  assert.equal(d.action(a, { type: 'sacrifice', id: 'ruby' }), true);
  hold(d, [a], 2, { useHeld: false }); assert.equal(a.sacrificing, null, 'letting go of Space cancels'); assert.ok(d.ground.includes(ruby));
  assert.equal(d.action(a, { type: 'sacrifice', id: 'ruby' }), true);
  hold(d, [a], ABILITY.sacrificeSeconds - .2, { useHeld: true }); assert.ok(d.ground.includes(ruby)); assert.ok(targets.every(o => !o.searched));
  hold(d, [a], .3, { useHeld: true });
  assert.ok(!d.ground.includes(ruby)); assert.ok(targets.every(o => o.searched)); assert.match(a.notice.text, /sacrificed/);
});

test('held Space is tracked by the shared input for held actions', async () => {
  const { createInput } = await import('../src/input.js');
  globalThis.document ??= new EventTarget(); globalThis.HTMLElement ??= class {};
  const target = new EventTarget(), input = createInput(target), key = (type, code) => { const e = new Event(type); e.code = code; e.preventDefault = () => {}; target.dispatchEvent(e); };
  key('keydown', 'Space'); assert.equal(input.held('Space'), true); key('keyup', 'Space'); assert.equal(input.held('Space'), false);
});
