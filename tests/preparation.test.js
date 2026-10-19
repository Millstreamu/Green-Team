import test from 'node:test';
import assert from 'node:assert/strict';
import { createCamp, takeStashItem, returnStashItem, craftForSack, departWithSack, saveCamp, loadCamp, bankEscape } from '../src/lair.js';
import { createLoot, fits } from '../src/loot.js';
import { createProfile } from '../src/profile.js';
import { generateDungeon } from '../src/world.js';
import { createRun, finishRun, loseRun } from '../src/run.js';
const prepare = camp => ({ ...createLoot(), bag: camp.preparedBag });

test('taking and returning conserves actual stock, rejects competing takes and cannot overfill a sack', () => {
  const camp = createCamp(), loot = prepare(camp), other = createLoot();
  const first = takeStashItem(camp, loot, 'snare'); assert.ok(first);
  assert.equal(camp.counts.snare, 0); assert.equal(takeStashItem(camp, other, 'snare'), null);
  assert.equal(loot.bag.length, 1); assert.equal(other.bag.length, 0);
  assert.ok(returnStashItem(camp, loot, first.id)); assert.equal(camp.counts.snare, 1);
  assert.equal(returnStashItem(camp, loot, first.id), false); assert.equal(camp.counts.snare, 1);
  camp.counts.snare = 10;
  for (let i = 0; i < 9; i++) assert.ok(takeStashItem(camp, loot, 'snare'));
  const before = { ...camp.counts }; assert.equal(takeStashItem(camp, loot, 'snare'), null);
  assert.deepEqual(camp.counts, before); assert.equal(new Set(loot.bag.map(i => i.id)).size, 9);
});

test('sack packing reuses rotation and footprints and invalid transfers preserve both inventories', () => {
  const camp = createCamp(), loot = prepare(camp); camp.counts.sword = 1;
  const sword = takeStashItem(camp, loot, 'sword'); assert.ok(sword); assert.ok(fits([], sword, sword.x, sword.y));
  assert.equal(camp.counts.sword, 0);
  loot.held = { type: 'ruby' }; const before = { ...camp.counts };
  assert.equal(takeStashItem(camp, loot, 'scrap'), null); assert.equal(returnStashItem(camp, loot, sword.id), false);
  assert.deepEqual(camp.counts, before); assert.equal(loot.bag.length, 1);
  assert.equal(takeStashItem(camp, loot, 'constructor'), null);
});

test('crafts go to sack first, overflow to stash, and failed knowledge/material checks spend nothing', () => {
  const camp = createCamp(), loot = prepare(camp), profile = createProfile();
  const before = { ...camp.counts }; assert.equal(craftForSack(camp, loot, 'smoke', profile), null); assert.deepEqual(camp.counts, before);
  assert.equal(craftForSack(camp, loot, 'snare', profile).destination, 'sack');
  assert.equal(loot.bag[0].type, 'snare'); assert.equal(camp.counts.snare, 1);
  assert.equal(camp.counts.scrap, 0); assert.equal(camp.counts.cloth, 0);
  for (let i = 0; i < 8; i++) takeStashItem(camp, loot, 'smoke', true);
  camp.counts.scrap = 2; camp.counts.cloth = 1;
  assert.equal(craftForSack(camp, loot, 'snare', profile).destination, 'stash');
  assert.equal(loot.bag.length, 9); assert.equal(camp.counts.snare, 2);
  assert.equal(craftForSack(camp, loot, 'snare', profile), null); assert.equal(camp.counts.snare, 2);
  assert.equal(profile.xp, 0); assert.equal(camp.counts.gold, 0);
});

test('prepared gear and its IDs persist atomically with deducted stock; launch never withdraws twice', () => {
  const camp = createCamp(), loot = prepare(camp); takeStashItem(camp, loot, 'snare');
  let raw; const storage = { getItem: () => raw, setItem: (key, value) => { raw = value; } };
  saveCamp(camp, storage); const restored = loadCamp(storage), reloaded = prepare(restored);
  assert.equal(restored.counts.snare, 0); assert.deepEqual(reloaded.bag, loot.bag); assert.equal(restored.nextItemId, camp.nextItemId);
  // Cancelling a departure dialog never calls departWithSack: bag and stock stay.
  const bag = departWithSack(restored, reloaded); assert.equal(bag.length, 1); assert.equal(restored.counts.snare, 0);
  assert.equal(restored.preparedBag.length, 0); assert.equal(departWithSack(restored, reloaded), null);
  saveCamp(restored, storage); assert.equal(loadCamp(storage).preparedBag.length, 0);
});

test('unused escaped prepared gear returns once, while loss and debug returns cannot inflate stock', () => {
  const world = generateDungeon(42), camp = createCamp(), loot = prepare(camp);
  takeStashItem(camp, loot, 'snare'); const debug = takeStashItem(camp, loot, 'smoke', true);
  assert.ok(returnStashItem(camp, loot, debug.id)); assert.equal(camp.counts.smoke, 0);
  const bag = departWithSack(camp, loot), runLoot = { ...createLoot(), bag };
  const result = finishRun(createRun(world), world, { ...world.spawn, state: 'active' }, runLoot, 1000);
  assert.ok(bankEscape(camp, result, runLoot)); assert.equal(camp.counts.snare, 1); assert.equal(bankEscape(camp, result, runLoot), false);
  const next = prepare(camp); takeStashItem(camp, next, 'snare'); departWithSack(camp, next);
  loseRun(createRun(world), next, 1000); assert.equal(camp.counts.snare, 0); assert.equal(camp.preparedBag.length, 0);
});

test('older saves migrate to empty prep bags and invalid overlapping saved bags are rejected', () => {
  for (const version of [1, 2, 3]) {
    const camp = loadCamp({ getItem: () => JSON.stringify({ version, counts: { snare: 2, gold: 7 } }) });
    assert.equal(camp.counts.snare, 2); assert.equal(camp.counts.gold, 7); assert.deepEqual(camp.preparedBag, []);
  }
  const item = { id: 'one', type: 'snare', rotation: 0, x: 0, y: 0 };
  const bad = { version: 4, counts: { snare: 0 }, nextItemId: 3, preparedBag: [item, { ...item, id: 'two' }] };
  assert.deepEqual(loadCamp({ getItem: () => JSON.stringify(bad) }), createCamp());
});
