import { createDeparture, setDestination, toggleCartSeat, tickDeparture } from '../src/jobs.js';
import { loadCamp, saveCamp } from '../src/lair.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { selectJob } from '../src/jobs.js';
import { generateDungeon } from '../src/world.js';
import { createGuards } from '../src/guard.js';
import { createSearchables, createSearchSession, beginSearch, updateSearch, SEARCHABLE_TYPES } from '../src/search.js';
import { LOOT_TYPES, createLoot, autoPickup, itemSaleValue } from '../src/loot.js';
import { createCamp, bankEscape } from '../src/lair.js';
import { createRun, finishRun } from '../src/run.js';

const jobWorld = (seed, difficulty) => ({ ...generateDungeon(seed), job: selectJob('manor', difficulty) });
test('job profiles validate selections and leave Normal equal to existing guard coverage', () => {
  assert.equal(selectJob('unknown', 'normal'), null); assert.equal(selectJob('manor', 'unknown'), null);
  assert.equal(selectJob('constructor', 'normal'), null);
  assert.ok(Object.isFrozen(selectJob('manor', 'hard')));
  for (let seed = 0; seed < 30; seed++) {
    const base = generateDungeon(seed), normal = jobWorld(seed, 'normal');
    assert.deepEqual(createGuards(base), createGuards(normal));
    assert.deepEqual(createSearchables(base), createSearchables(normal));
  }
});
test('Hard retains the original routines and adds two reachable guards outside existing coverage', () => {
  for (let i = 0; i < 100; i++) {
    const seed = Math.imul(i + 1, 2654435761) >>> 0;
    const normal = createGuards(jobWorld(seed, 'normal')), hardWorld = jobWorld(seed, 'hard'), hard = createGuards(hardWorld);
    assert.equal(normal.length, 4); assert.equal(hard.length, 6);
    assert.deepEqual(hard.slice(0, normal.length), normal);
    assert.equal(new Set(hard.map(guard => guard.id)).size, hard.length);
    const normalRooms = new Set(normal.flatMap(guard => [guard.roomIndex, ...(guard.roamRooms ?? [])]));
    for (const guard of hard.slice(normal.length)) { assert.ok(!normalRooms.has(guard.roomIndex)); assert.notEqual(guard.roomIndex, 0); }
    const busy = new Set(hard.flatMap(guard => [guard.roomIndex, ...(guard.roamRooms ?? [])]));
    assert.ok(hardWorld.rooms.length - busy.size >= 2);
  }
});
test('Hard increases rare treasure odds while preserving container positions and sparse item counts', () => {
  let normalRare = 0, hardRare = 0;
  for (let i = 0; i < 100; i++) {
    const seed = Math.imul(i + 1, 2654435761) >>> 0;
    const normal = createSearchables(jobWorld(seed, 'normal')), hard = createSearchables(jobWorld(seed, 'hard'));
    assert.equal(normal.length, hard.length);
    normal.forEach((object, index) => {
      assert.equal(object.x, hard[index].x); assert.equal(object.y, hard[index].y);
      assert.equal(object.contents.length, hard[index].contents.length);
      const pool = SEARCHABLE_TYPES[object.type].rarePool;
      normalRare += object.contents.filter(type => pool.includes(type)).length;
      hardRare += hard[index].contents.filter(type => pool.includes(type)).length;
    });
  }
  assert.ok(hardRare > normalRare * 1.15);
});
test('Hard sale price stays with found loot through packing, results and one-time shared gold sale', () => {
  const world = jobWorld(42, 'hard'), object = createSearchables(world)[0], loot = createLoot();
  object.contents = ['ruby', 'coin'];
  const player = { x: object.x, y: object.y, state: 'active' }, session = createSearchSession();
  beginSearch(session, world, player, loot, object); updateSearch(session, world, player, loot, true, 10);
  assert.ok(loot.ground.every(item => item.saleMultiplier === 1.5));
  const expected = loot.ground.reduce((total, item) => total + itemSaleValue(item), 0);
  assert.equal(expected, Math.round(LOOT_TYPES.ruby.sellValue * 1.5) + Math.round(LOOT_TYPES.coin.sellValue * 1.5));
  for (const item of [...loot.ground]) autoPickup(loot, item.id);
  Object.assign(player, world.spawn);
  const run = createRun(world), result = finishRun(run, world, player, loot, 1000), camp = createCamp();
  assert.equal(result.job.difficultyName, 'Hard'); assert.notEqual(result.job, world.job);
  assert.ok(bankEscape(camp, result, loot)); assert.equal(result.soldGold, expected); assert.equal(camp.counts.gold, expected);
  assert.equal(bankEscape(camp, result, loot), false); assert.equal(camp.counts.gold, expected);
});

test('cart waits for every participating goblin, ignores waiting arrivals and departs once after three seconds', () => {
  const cart = createDeparture(['one', 'two']);
  assert.equal(toggleCartSeat(cart, 'waiting-player'), null);
  assert.equal(toggleCartSeat(cart, 'one'), true); assert.equal(cart.countdown, null);
  assert.equal(tickDeparture(cart, 20), null);
  assert.equal(toggleCartSeat(cart, 'two'), true); assert.equal(cart.countdown, 3);
  assert.equal(tickDeparture(cart, 2.99), null);
  const selected = tickDeparture(cart, .01); assert.equal(selected.difficultyId, 'normal');
  assert.equal(tickDeparture(cart, 5), null); assert.equal(toggleCartSeat(cart, 'one'), null);
});
test('hopping out cancels the countdown and reboarding starts a full fresh countdown', () => {
  const cart = createDeparture(['one', 'two']); toggleCartSeat(cart, 'one'); toggleCartSeat(cart, 'two');
  tickDeparture(cart, 2); assert.equal(toggleCartSeat(cart, 'one'), false);
  assert.equal(cart.countdown, null); assert.equal(tickDeparture(cart, 10), null);
  toggleCartSeat(cart, 'one'); assert.equal(cart.countdown, 3); assert.equal(tickDeparture(cart, 2.9), null);
  assert.ok(tickDeparture(cart, .1)); assert.equal(createDeparture([]).countdown, null);
});
test('changing the plan preserves readiness and countdown, with the latest selection frozen at departure', () => {
  const cart = createDeparture(['one']); toggleCartSeat(cart, 'one'); tickDeparture(cart, 1);
  assert.ok(setDestination(cart, 'manor', 'hard'));
  assert.equal(cart.aboard.has('one'), true); assert.equal(cart.countdown, 2);
  assert.equal(setDestination(cart, 'missing', 'normal'), false); assert.equal(cart.selection.difficultyId, 'hard');
  const snapshot = tickDeparture(cart, 2); assert.equal(snapshot.difficultyId, 'hard'); assert.ok(Object.isFrozen(snapshot));
  assert.equal(setDestination(cart, 'manor', 'normal'), false); assert.equal(snapshot.difficultyId, 'hard');
});
test('the confirmed destination saves with the lair while a new cart never restores old readiness', () => {
  const camp = createCamp(); camp.destination = { jobId: 'manor', difficultyId: 'hard' };
  let raw; const storage = { getItem: () => raw, setItem: (key, value) => { raw = value; } };
  saveCamp(camp, storage); const restored = loadCamp(storage);
  assert.deepEqual(restored.counts, camp.counts); assert.deepEqual(restored.destination, camp.destination);
  const cart = createDeparture(['one'], restored.destination); assert.equal(cart.selection.difficultyId, 'hard');
  assert.equal(cart.aboard.size, 0); assert.equal(cart.countdown, null);
  assert.equal(createDeparture(['one'], { jobId: 'bad' }).selection.difficultyId, 'normal');
});
