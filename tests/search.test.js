import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon, canStand } from '../src/world.js';
import { SEARCH } from '../src/config.js';
import { createLoot, LOOT_TYPES } from '../src/loot.js';
import { createSearchables, createSearchSession, canSearch, selectInteraction, beginSearch, cancelSearch, updateSearch, SEARCHABLE_TYPES } from '../src/search.js';

const setup = (seed = 42) => {
  const world = generateDungeon(seed), loot = createLoot(), objects = createSearchables(world), object = objects[0];
  const player = { x: world.spawn.x + 1, y: world.spawn.y, state: 'active' }, session = createSearchSession();
  return { world, loot, objects, object, player, session };
};

test('100 generated maps start with hidden loot in reachable searchable objects, not floor valuables', () => {
  for (let seed = 0; seed < 100; seed++) {
    const { world, loot, objects } = setup(seed);
    assert.equal(loot.ground.length, 0); assert.equal(loot.bag.length, 0);
    assert.ok(objects.length >= world.rooms.length);
    assert.equal(new Set(objects.map(o => o.id)).size, objects.length);
    for (const object of objects) {
      assert.ok(canStand(world, object.x, object.y, 0.2)); assert.equal(object.searched, false);
      assert.ok(object.contents.every(type => LOOT_TYPES[type]));
    }
    assert.deepEqual(objects, createSearchables(world));
  }
});

test('search requires a held input and enough time; it spills once without automatically packing', () => {
  const { world, loot, object, player, session } = setup();
  object.contents = ['ruby', 'coin']; // Explicit two-item fixture for spill semantics.
  assert.ok(beginSearch(session, world, player, loot, object));
  assert.equal(updateSearch(session, world, player, loot, true, 1), null); assert.equal(loot.ground.length, 0);
  const completed = updateSearch(session, world, player, loot, true, SEARCHABLE_TYPES.chest.duration - 1);
  assert.equal(completed.type, 'completed'); assert.equal(object.searched, true);
  assert.equal(loot.ground.length, 2); assert.equal(loot.bag.length, 0); assert.equal(loot.held, null);
  assert.ok(loot.ground.every(item => canStand(world, item.x, item.y, 0.15) && item.spillAge === 0));
  assert.equal(beginSearch(session, world, player, loot, object), false);
  assert.equal(updateSearch(session, world, player, loot, true, 20), null); assert.equal(loot.ground.length, 2);
});

test('release, movement, distance, wall obstruction, held items and going down cancel search without loot', () => {
  const cases = [
    state => ({ held: false }),
    state => { state.player.x += SEARCH.movementTolerance + 0.01; return {}; },
    state => { state.player.x += 5; return {}; },
    state => { state.world.tiles[Math.floor(state.object.y) * state.world.width + Math.floor(state.object.x)] = 0; return {}; },
    state => { state.loot.held = { id: 'cursor', type: 'coin' }; return {}; },
    state => { state.player.state = 'down'; return {}; }
  ];
  for (const change of cases) {
    const state = setup(), { world, loot, object, player, session } = state;
    beginSearch(session, world, player, loot, object); updateSearch(session, world, player, loot, true, 0.5);
    const input = change(state);
    assert.equal(updateSearch(session, world, player, loot, input.held ?? true, 0.1).type, 'cancelled');
    assert.equal(session.active, null); assert.equal(session.elapsed, 0); assert.equal(object.searched, false); assert.equal(loot.ground.length, 0);
  }
});

test('cancel and restart require a full new hold; a full sack does not stop the spill', () => {
  const { world, loot, object, player, session } = setup();
  object.contents = ['ruby', 'coin'];
  beginSearch(session, world, player, loot, object); updateSearch(session, world, player, loot, true, 2);
  cancelSearch(session);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) loot.bag.push({ id: `${x},${y}`, type: 'coin', rotation: 0, x, y });
  beginSearch(session, world, player, loot, object);
  assert.equal(updateSearch(session, world, player, loot, true, 0.6), null);
  assert.equal(loot.ground.length, 0);
  assert.equal(updateSearch(session, world, player, loot, true, 2).type, 'completed');
  assert.equal(loot.bag.length, 9); assert.equal(loot.ground.length, 2);
});

test('object targeting uses reach and cursor preference and ignores searched furniture', () => {
  const { world, loot, objects, object, player } = setup();
  assert.ok(canSearch(world, player, object));
  assert.equal(selectInteraction(world, player, loot.ground, objects, object).item.id, object.id);
  object.searched = true;
  assert.notEqual(selectInteraction(world, player, loot.ground, objects, object)?.item.id, object.id);
  loot.ground.push({ id: 'loose', type: 'coin', rotation: 0, x: player.x, y: player.y });
  assert.equal(selectInteraction(world, player, loot.ground, objects, player).kind, 'loot');
  player.x = -100;
  assert.equal(selectInteraction(world, player, loot.ground, objects), null);
});

test('all container contents spill to accessible floor on 100 maps', () => {
  for (let seed = 0; seed < 100; seed++) {
    const { world, loot, objects } = setup(seed); const expected = objects.reduce((n, o) => n + o.contents.length, 0);
    for (const object of objects) {
      const player = { x: object.x, y: object.y, state: 'active' }, session = createSearchSession();
      assert.ok(beginSearch(session, world, player, loot, object));
      assert.equal(updateSearch(session, world, player, loot, true, 10).type, 'completed');
    }
    assert.equal(loot.ground.length, expected);
    assert.equal(new Set(loot.ground.map(item => item.id)).size, expected);
    assert.ok(loot.ground.every(item => canStand(world, item.x, item.y, 0.15)));
  }
});


test('empty searches take full time, finish normally and cannot be searched again', () => {
  const { world, loot, object, player, session } = setup(42);
  assert.deepEqual(object.contents, []);
  assert.ok(beginSearch(session, world, player, loot, object));
  assert.equal(updateSearch(session, world, player, loot, true, SEARCHABLE_TYPES.chest.duration - .1), null);
  assert.equal(object.searched, false);
  const result = updateSearch(session, world, player, loot, true, .1);
  assert.equal(result.type, 'completed'); assert.equal(result.count, 0);
  assert.equal(object.searched, true); assert.equal(loot.ground.length, 0);
  assert.equal(beginSearch(session, world, player, loot, object), false);
  assert.equal(updateSearch(session, world, player, loot, true, 100), null);
});

test('reward generation produces sparse loot, occasional materials and no entrance freebies', () => {
  let containers = 0, empty = 0, items = 0, materials = 0, entranceEmpty = 0;
  for (let i = 0; i < 200; i++) {
    const world = generateDungeon(Math.imul(i + 1, 2654435761) >>> 0);
    const objects = createSearchables(world);
    assert.deepEqual(objects, createSearchables(world));
    entranceEmpty += Number(objects[0].contents.length === 0);
    for (const object of objects) {
      containers++; empty += Number(object.contents.length === 0);
      assert.ok(object.contents.length <= 2);
      for (const type of object.contents) { items++; materials += Number(!!LOOT_TYPES[type].material); }
    }
  }
  assert.ok(empty / containers > .54 && empty / containers < .66);
  assert.ok(items / containers < .55);
  assert.ok(materials / items > .35 && materials / items < .55);
  assert.ok(entranceEmpty > 0 && entranceEmpty < 200);
});

test('reward depth follows corridor distance rather than straight-line proximity', async () => {
  const { searchRewardDepths, searchRewardProfile } = await import('../src/search.js');
  const width = 9, height = 7, tiles = new Uint8Array(width * height);
  const floor = (x, y) => { tiles[y * width + x] = 1; };
  for (let x = 1; x <= 7; x++) { floor(x, 1); floor(x, 5); }
  for (let y = 1; y <= 5; y++) floor(7, y);
  for (let y = 3; y <= 5; y++) floor(1, y);
  const world = { width, height, tiles, spawn: { x: 1.5, y: 1.5 } };
  const [detour, direct] = searchRewardDepths(world, [{ x: 1.5, y: 3.5 }, { x: 6.5, y: 1.5 }]);
  assert.ok(detour.distance > direct.distance * 3); assert.equal(detour.depth, 1);
  const deep = searchRewardProfile(detour.depth), near = searchRewardProfile(direct.depth);
  assert.ok(deep.emptyChance < near.emptyChance);
  assert.ok(deep.materialChance < near.materialChance);
  assert.ok(deep.rareChance > near.rareChance);
  assert.deepEqual(searchRewardProfile(-1), searchRewardProfile(0));
  assert.deepEqual(searchRewardProfile(2), searchRewardProfile(1));
});
test('near containers favour materials and deep ones favour rarer valuables across generated maps', () => {
  const near = { containers: 0, empty: 0, materials: 0, items: 0, rare: 0 }, far = { ...near };
  for (let i = 0; i < 300; i++) {
    const world = generateDungeon(Math.imul(i + 1, 2654435761) >>> 0);
    for (const object of createSearchables(world)) {
      const bucket = object.depth <= .25 ? near : object.depth >= .75 ? far : null;
      if (!bucket) continue;
      bucket.containers++; bucket.empty += Number(object.contents.length === 0);
      for (const type of object.contents) {
        bucket.items++; bucket.materials += Number(!!LOOT_TYPES[type].material);
        bucket.rare += Number(SEARCHABLE_TYPES[object.type].rarePool.includes(type));
      }
    }
  }
  assert.ok(near.materials / near.items > far.materials / far.items + .25);
  assert.ok(far.rare / (far.items - far.materials) > near.rare / (near.items - near.materials) + .25);
  assert.ok(near.empty / near.containers > far.empty / far.containers + .08);
  assert.ok(near.empty > 0 && far.empty > 0);
});
