import test from 'node:test';
import assert from 'node:assert/strict';
import { createCamp, craftSnare, canCraftSnare, takeSupplies, bankEscape, loadCamp, saveCamp, createLairWorld, lairTarget } from '../src/lair.js';
import { generateDungeon, canStand } from '../src/world.js';
import { createLoot, autoPickup } from '../src/loot.js';
import { createRun, finishRun, loseRun } from '../src/run.js';
import { createSearchables, createSearchSession, beginSearch, updateSearch } from '../src/search.js';

test('search, pack, escape, bank materials and craft a snare complete a conserved loop', () => {
  const camp = createCamp(); camp.counts.scrap = 0; camp.counts.cloth = 0; camp.counts.snare = 0;
  const world = generateDungeon(42), loot = createLoot(), run = createRun(world);
  const crate = createSearchables(world).find(object => object.type === 'crate');
  const player = { x: crate.x, y: crate.y, state: 'active' }, search = createSearchSession();
  assert.ok(beginSearch(search, world, player, loot, crate));
  assert.equal(updateSearch(search, world, player, loot, true, 2).type, 'completed');
  for (const item of [...loot.ground]) assert.ok(autoPickup(loot, item.id));
  assert.equal(loot.bag.length, 3);
  Object.assign(player, world.spawn);
  const result = finishRun(run, world, player, loot, 1000);
  assert.equal(bankEscape(camp, result, loot), true);
  assert.equal(loot.bag.length, 0); assert.equal(camp.counts.scrap, 2); assert.equal(camp.counts.cloth, 1);
  assert.equal(bankEscape(camp, result, loot), false);
  assert.ok(craftSnare(camp)); assert.equal(camp.counts.snare, 1);
  assert.equal(camp.counts.scrap, 0); assert.equal(camp.counts.cloth, 0);
  assert.equal(craftSnare(camp), false); assert.equal(canCraftSnare(camp), false);
});
test('normal supplies spend stock once and only unused escaped traps return', () => {
  const camp = createCamp(); camp.counts.snare = 3;
  const selected = takeSupplies(camp, { snare: 2 }, 42);
  assert.equal(camp.counts.snare, 1); assert.equal(selected.bag.length, 2);
  const snapshot = { ...camp.counts };
  assert.equal(takeSupplies(camp, { snare: 2 }, 43), null);
  assert.equal(takeSupplies(camp, { snare: 1.5 }, 43), null);
  assert.deepEqual(camp.counts, snapshot);
  selected.bag.pop(); // One deployed snare is no longer carried.
  const loot = { bag: selected.bag };
  assert.ok(bankEscape(camp, { outcome: 'escaped' }, loot)); assert.equal(camp.counts.snare, 2);
});
test('debug supplies never spend or increase real stock, including after floor transfers', () => {
  const camp = createCamp(), before = camp.counts.snare;
  const selected = takeSupplies(camp, { snare: 9 }, 42, true);
  assert.equal(camp.counts.snare, before); assert.ok(selected.bag.every(item => item.debugSupply));
  bankEscape(camp, { outcome: 'escaped' }, { bag: selected.bag.map(item => ({ ...item })) });
  assert.equal(camp.counts.snare, before);
});
test('going down loses carried supplies and loot without touching home stock', () => {
  const camp = createCamp(), world = generateDungeon(42), run = createRun(world), loot = createLoot();
  loot.bag = takeSupplies(camp, { snare: 1 }, 42).bag;
  loot.bag.push({ id: 'ruby', type: 'ruby', x: 1, y: 0, rotation: 0 });
  const before = { ...camp.counts }, result = loseRun(run, loot, 1000);
  assert.equal(result.lostItems.length, 2); assert.equal(bankEscape(camp, result, loot), false);
  assert.deepEqual(camp.counts, before); assert.equal(loot.bag.length, 0);
});
test('camp save roundtrips counts and handles blocked storage or malformed data', () => {
  const entries = new Map(), storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  const camp = createCamp(); craftSnare(camp); camp.counts.ruby = 4;
  assert.ok(saveCamp(camp, storage)); assert.deepEqual(loadCamp(storage), camp);
  assert.notEqual(loadCamp(storage).counts, camp.counts);
  for (const raw of ['invalid', '{"version":1,"counts":{"snare":-1}}', '{"version":99,"counts":{}}']) {
    storage.getItem = () => raw; assert.deepEqual(loadCamp(storage), createCamp());
  }
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.equal(saveCamp(camp, blocked), false); assert.deepEqual(loadCamp(blocked), createCamp());
  assert.equal(saveCamp(camp, undefined), false);
});
test('lair uses normal walkable world rules and station interactions require reach', () => {
  const world = createLairWorld(); assert.ok(canStand(world, world.spawn.x, world.spawn.y));
  assert.equal(lairTarget(world, world.spawn), null);
  for (const station of world.stations) {
    assert.ok(canStand(world, station.x, station.y));
    assert.equal(lairTarget(world, { x: station.x, y: station.y + 1 }).kind, station.kind);
    assert.notEqual(lairTarget(world, { x: station.x, y: station.y + 3 })?.kind, station.kind);
  }
  assert.equal(canStand(world, 0, 0), false);
});
