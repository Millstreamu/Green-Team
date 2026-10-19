import test from 'node:test';
import assert from 'node:assert/strict';
import { LOOT_TYPES, autoPickup, liftItem, placeHeld, dropHeld, itemCount, itemSaleValue, unitSaleValue, itemLabel, validItemCount } from '../src/loot.js';
import { createCamp, bankEscape, takeStashItem, returnStashItem, saveCamp, loadCamp } from '../src/lair.js';
import { createProfile, teamHaulXp } from '../src/profile.js';
import { createRun, finishRun } from '../src/run.js';
import { restoreSave, openSaveStore } from '../server/save-store.js';
import { createDungeonSession } from '../server/dungeon-session.js';
import { selectJob } from '../src/jobs.js';
import { createSearchables } from '../src/search.js';
import { generateDungeon } from '../src/world.js';
import { drawItem } from '../src/item-view.js';
const coin = (id, type = 'coin', count = 1, x = 0, y = 0, extra = {}) => ({ id, type, count, rotation: 0, x, y, ...extra });
const fillers = () => Array.from({ length: 8 }, (_, i) => ({ id: `ruby-${i}`, type: 'ruby', rotation: 0, x: (i + 1) % 3, y: Math.floor((i + 1) / 3) }));
const total = items => items.reduce((n, item) => n + itemCount(item), 0);

test('each metal auto-stacks to nine then uses a new square; a full sack can still top up a partial stack', () => {
  for (const type of ['coin', 'silverCoin', 'copperCoin']) {
    const s = { bag: [coin('old', type, 8)], ground: [coin('new', type, 4)], held: null };
    assert.ok(autoPickup(s, 'new')); assert.deepEqual(s.bag.map(i => i.count), [9, 3]); assert.equal(s.ground.length, 0);
    assert.equal(new Set(s.bag.map(i => `${i.x},${i.y}`)).size, 2);
    const full = { bag: [coin('old', type, 8), ...fillers()], ground: [coin('new', type, 9)], held: null };
    assert.ok(autoPickup(full, 'new')); assert.equal(full.bag[0].count, 9); assert.equal(full.ground[0].count, 8);
    assert.equal(autoPickup(full, 'new'), false); assert.equal(total(full.bag) + total(full.ground), 25);
  }
});
test('manual stacking leaves overflow in hand; different metals, prices and debug status do not merge', () => {
  const s = { bag: [coin('old', 'coin', 8)], held: coin('held', 'coin', 5), ground: [] };
  assert.ok(placeHeld(s, 0, 0)); assert.equal(s.bag[0].count, 9); assert.equal(s.held.count, 4);
  assert.equal(placeHeld(s, 0, 0), false); assert.ok(placeHeld(s, 1, 0)); assert.equal(s.held, null);
  for (const extra of [{ type: 'silverCoin' }, { saleMultiplier: 1.5 }, { debugSupply: true }]) {
    const state = { bag: [coin('old', 'coin', 2)], held: { ...coin('new'), ...extra } };
    assert.equal(placeHeld(state, 0, 0), false); assert.equal(state.bag[0].count, 2); assert.equal(state.held.count, 1);
  }
});
test('shared server pickups of a partial floor stack conserve quantities; floor sharing and escape preserve value/XP', () => {
  const camp = createCamp(), a = { id: 'a', name: 'A', connected: true, bag: [], profile: createProfile('a') }, b = { id: 'b', name: 'B', connected: true, bag: [], profile: createProfile('b') };
  const d = createDungeonSession({ id: 'coins', seed: 42, job: selectJob('manor', 'normal') }, [a, b], camp);
  a.bag.push(coin('old', 'silverCoin', 8), ...fillers());
  d.ground.push(coin('floor', 'silverCoin', 9, a.x, a.y));
  assert.ok(d.action(a, { type: 'pickup', id: 'floor', count: 9999 }));
  assert.equal(a.bag[0].count, 9); assert.equal(d.snapshot().ground[0].count, 8);
  assert.ok(d.action(b, { type: 'pickup', id: 'floor' })); assert.equal(b.bag[0].count, 8);
  assert.equal(d.action(a, { type: 'pickup', id: 'floor' }), false);
  assert.ok(d.action(b, { type: 'lift', source: 'bag', id: 'floor' })); assert.ok(d.action(b, { type: 'drop' }));
  assert.equal(d.ground[0].count, 8); assert.ok(d.action(b, { type: 'pickup', id: 'floor' }));
  assert.ok(d.action(a, { type: 'extract' }));
  assert.equal(camp.counts.gold, 17 * 2 + 8 * 25); assert.equal(a.profile.xp, camp.counts.gold); assert.equal(b.profile.xp, camp.counts.gold);
  assert.equal(d.action(a, { type: 'extract' }), false);
});
test('coin stacks sell and award XP per coin with per-coin difficulty rounding; result slots remain physical squares', () => {
  const world = { width: 8, height: 8, tiles: new Uint8Array(64).fill(1), spawn: { x: 2.5, y: 2.5 } }, run = createRun(world);
  const loot = { held: null, bag: ['coin', 'silverCoin', 'copperCoin'].map((type, i) => coin(type, type, 9, i, 0, { saleMultiplier: 1.5 })) };
  assert.deepEqual(loot.bag.map(unitSaleValue), [5, 3, 2]); assert.deepEqual(loot.bag.map(itemSaleValue), [45, 27, 18]);
  const result = finishRun(run, world, { ...world.spawn }, loot, 1000);
  assert.equal(result.count, 27); assert.equal(result.slots, 3); assert.equal(teamHaulXp(result), 90);
  const camp = createCamp(); assert.ok(bankEscape(camp, result, loot)); assert.equal(camp.counts.gold, 90);
  assert.equal(bankEscape(camp, result, loot), false);
});
test('old saves accept missing new coin types; new stacks survive solo/server restoration and invalid quantities are rejected', () => {
  const camp = createCamp(), loot = { held: null, bag: camp.preparedBag };
  camp.counts.coin = 9; for (let i = 0; i < 9; i++) assert.ok(takeStashItem(camp, loot, 'coin'));
  assert.equal(loot.bag.length, 1); assert.equal(loot.bag[0].count, 9);
  const storage = { setItem(k, v) { this.value = v; }, getItem() { return this.value; } };
  assert.ok(saveCamp(camp, storage)); assert.equal(loadCamp(storage).preparedBag[0].count, 9);
  const saved = { version: 1, camp, players: [{ token: 'test-token', id: 'p', name: 'P', profile: createProfile('p'), bag: loot.bag, interrupted: false }] };
  assert.equal(restoreSave(saved).players[0].bag[0].count, 9);
  const store = openSaveStore(':memory:'); store.save(saved);
  assert.equal(restoreSave(store.load()).players[0].bag[0].count, 9); store.close();
  const legacy = structuredClone(saved); delete legacy.camp.counts.silverCoin; delete legacy.camp.counts.copperCoin; delete legacy.players[0].bag[0].count;
  assert.equal(restoreSave(legacy).camp.counts.silverCoin, 0); assert.equal(restoreSave(legacy).players[0].bag[0].count, undefined);
  assert.equal(Object.hasOwn(legacy.camp.counts, 'silverCoin'), false);
  for (const count of [0, 10, -1, 1.5, '9']) { const bad = structuredClone(saved); bad.players[0].bag[0].count = count; assert.throws(() => restoreSave(bad), /Invalid/); }
  assert.equal(validItemCount({ type: 'snare', count: 2 }), false);
  assert.ok(returnStashItem(camp, loot, loot.bag[0].id)); assert.equal(camp.counts.coin, 9);
});
test('searches can produce all three denominations and shared displays show stack quantities', () => {
  const types = new Set();
  for (let seed = 0; seed < 50; seed++) for (const box of createSearchables(generateDungeon(seed))) for (const type of box.contents) types.add(type);
  for (const type of ['coin', 'silverCoin', 'copperCoin']) { assert.ok(types.has(type)); assert.equal(LOOT_TYPES[type].stackLimit, 9); }
  const labels = [], ctx = { fillRect() {}, fillText(t) { labels.push(t); } };
  drawItem(ctx, coin('nine', 'copperCoin', 9), 0, 0, 28);
  assert.ok(labels.includes('9')); assert.match(itemLabel(coin('nine', 'copperCoin', 9)), /Copper coin × 9/);
});


test('downing and expired disconnect spill whole stacks once without losing held quantities', () => {
  for (const reason of ['down', 'disconnect']) {
    const a = { id: 'a', name: 'A', connected: true, bag: [], profile: createProfile('a') }, b = { id: 'b', name: 'B', connected: true, bag: [], profile: createProfile('b') };
    const d = createDungeonSession({ id: reason, seed: 42, job: selectJob('manor', 'normal') }, [a, b], createCamp());
    a.bag.push(coin('packed', 'copperCoin', 9)); a.loot.held = coin('held', 'copperCoin', 3);
    if (reason === 'down') { a.state = 'down'; a.health = 0; d.tick(.1); }
    else { a.connected = false; d.disconnect(a); d.tick(60); }
    assert.equal(total(d.ground), 12); assert.equal(a.bag.length, 0); assert.equal(a.loot.held, null);
    d.tick(.1); assert.equal(total(d.ground), 12);
    for (const item of [...d.ground]) assert.ok(d.action(b, { type: 'pickup', id: item.id }));
    assert.equal(total(b.bag), 12); assert.ok(b.bag.every(i => i.count <= 9));
  }
});
