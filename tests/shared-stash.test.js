import test from 'node:test';
import assert from 'node:assert/strict';
import { LOOT_TYPES } from '../src/loot.js';
import { createCamp, bankEscape, syncStashSlots, moveStashStack, unlockRecipe, craftRecipe, takeSupplies, loadCamp, saveCamp } from '../src/lair.js';

test('returning sells valuables once, stacks gold/materials and keeps crafted supplies', () => {
  const camp = createCamp(), result = { outcome: 'escaped' };
  const loot = { bag: [{ type: 'ruby' }, { type: 'coin' }, { type: 'scrap' }, { type: 'smoke' }, { type: 'snare', debugSupply: true }] };
  assert.ok(bankEscape(camp, result, loot));
  assert.equal(result.soldGold, LOOT_TYPES.ruby.sellValue + LOOT_TYPES.coin.sellValue);
  assert.equal(camp.counts.gold, result.soldGold); assert.equal(camp.counts.ruby, 0); assert.equal(camp.counts.coin, 0);
  assert.equal(camp.counts.scrap, 3); assert.equal(camp.counts.smoke, 1); assert.equal(camp.counts.snare, 1);
  const slots = camp.slots.filter(Boolean); assert.equal(new Set(slots).size, slots.length);
  assert.equal(slots.filter(type => type === 'gold').length, 1);
  assert.equal(loot.bag.length, 0);
  assert.equal(bankEscape(camp, result, loot), false); assert.equal(camp.counts.gold, result.soldGold);
});
test('moving a whole stash stack preserves quantities and rejects occupied or invalid cells', () => {
  const camp = createCamp(), before = { ...camp.counts }, origin = camp.slots.indexOf('scrap');
  assert.ok(moveStashStack(camp, 'scrap', 35)); assert.equal(camp.slots[origin], null); assert.equal(camp.slots[35], 'scrap');
  assert.equal(moveStashStack(camp, 'cloth', 35), false);
  for (const cell of [-1, 36, 1.5]) assert.equal(moveStashStack(camp, 'scrap', cell), false);
  assert.deepEqual(camp.counts, before); syncStashSlots(camp); assert.equal(camp.slots[35], 'scrap');
  camp.counts.scrap += 20; syncStashSlots(camp);
  assert.equal(camp.slots.filter(type => type === 'scrap').length, 1); assert.equal(camp.counts.scrap, 22);
});
test('gold buys a shared recipe once, then materials craft smoke without another gold payment', () => {
  const camp = createCamp(); camp.counts.scrap = 4; camp.counts.cloth = 4;
  assert.equal(unlockRecipe(camp, 'smoke'), false); assert.equal(craftRecipe(camp, 'smoke'), false);
  camp.counts.gold = 25;
  assert.ok(unlockRecipe(camp, 'smoke')); assert.equal(camp.counts.gold, 5);
  assert.equal(unlockRecipe(camp, 'smoke'), false); assert.equal(camp.counts.gold, 5);
  assert.ok(craftRecipe(camp, 'smoke')); assert.equal(camp.counts.smoke, 1);
  assert.equal(camp.counts.scrap, 3); assert.equal(camp.counts.cloth, 2); assert.equal(camp.counts.gold, 5);
  assert.ok(craftRecipe(camp, 'smoke')); assert.equal(craftRecipe(camp, 'smoke'), false);
  assert.equal(craftRecipe(camp, 'constructor'), false); assert.equal(unlockRecipe(camp, 'constructor'), false);
});
test('mixed equipment spends individual stock and rejects a combined overfull bag atomically', () => {
  const camp = createCamp(); camp.counts.snare = 7; camp.counts.smoke = 7;
  const before = { ...camp.counts };
  assert.equal(takeSupplies(camp, { snare: 6, smoke: 4 }, 42), null); assert.deepEqual(camp.counts, before);
  assert.equal(takeSupplies(camp, { snare: 0, smoke: 8 }, 42), null); assert.deepEqual(camp.counts, before);
  const supplies = takeSupplies(camp, { snare: 4, smoke: 5 }, 42);
  assert.equal(supplies.bag.length, 9); assert.equal(new Set(supplies.bag.map(item => `${item.x},${item.y}`)).size, 9);
  assert.equal(camp.counts.snare, 3); assert.equal(camp.counts.smoke, 2);
});
test('old saves sell legacy loot once and new saves preserve recipe unlocks and stack positions', () => {
  let raw = JSON.stringify({ version: 1, counts: { ruby: 2, coin: 1, scrap: 8, cloth: 5, snare: 3 } });
  const storage = { getItem: () => raw, setItem: (key, value) => { raw = value; } };
  const camp = loadCamp(storage);
  assert.equal(camp.counts.gold, 53); assert.equal(camp.counts.ruby, 0); assert.equal(camp.counts.snare, 3);
  unlockRecipe(camp, 'smoke'); craftRecipe(camp, 'smoke'); moveStashStack(camp, 'gold', 35);
  assert.ok(saveCamp(camp, storage)); assert.equal(JSON.parse(raw).version, 2);
  const restored = loadCamp(storage); assert.deepEqual(restored, camp);
  assert.equal(restored.counts.gold, 33); assert.equal(restored.slots[35], 'gold'); assert.ok(restored.unlocked.smoke);
  assert.deepEqual(loadCamp(storage), restored);
});
