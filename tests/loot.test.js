import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon, canStand } from '../src/world.js';
import { LOOT_TYPES, itemCells, fits, findSpace, bagItemAt, createLoot, selectTarget, autoPickup, liftItem, placeHeld, dropHeld } from '../src/loot.js';

const piece = (type, id = type, x = 0, y = 0, rotation = 0) => ({ id, type, x, y, rotation });
const stateWith = (...ground) => ({ ground, bag: [], held: null });
const ids = state => [...state.ground, ...state.bag, ...(state.held ? [state.held] : [])].map(item => item.id).sort();

test('four rotations preserve every footprint and its area', () => {
  for (const type of Object.keys(LOOT_TYPES)) {
    const original = piece(type);
    for (let rotation = 0; rotation < 4; rotation++) {
      const cells = itemCells({ ...original, rotation });
      assert.equal(cells.length, LOOT_TYPES[type].cells.length);
      assert.equal(new Set(cells.map(c => c.join(','))).size, cells.length);
      assert.ok(cells.every(([x, y]) => x >= 0 && y >= 0));
    }
    assert.deepEqual(itemCells({ ...original, rotation: 4 }), itemCells(original));
  }
  assert.equal(new Set([0, 1, 2, 3].map(rotation => JSON.stringify(itemCells(piece('horn', 'h', 0, 0, rotation)).sort()))).size, 4);
});

test('automatic packing rotates a sword into the only free row', () => {
  const bag = [];
  for (let y = 1; y < 3; y++) for (let x = 0; x < 3; x++) bag.push(piece('coin', `${x}-${y}`, x, y));
  const placement = findSpace(bag, piece('sword'));
  assert.equal(placement.rotation, 1); assert.equal(placement.x, 0); assert.equal(placement.y, 0);
  assert.ok(fits(bag, placement, placement.x, placement.y));
});

test('fragmented bag rejects a large item without deleting it; shuffling permits it', () => {
  const sword = piece('sword'), state = stateWith(sword);
  state.bag = [piece('coin', 'a', 0, 0), piece('coin', 'b', 1, 1), piece('coin', 'c', 2, 2)];
  const before = ids(state);
  assert.equal(autoPickup(state, sword.id), false); assert.equal(state.ground.length, 1);
  assert.ok(liftItem(state, 'bag', 'b')); assert.ok(placeHeld(state, 1, 0));
  assert.ok(liftItem(state, 'bag', 'c')); assert.ok(placeHeld(state, 2, 0));
  assert.ok(autoPickup(state, sword.id)); assert.deepEqual(ids(state), before);
});

test('invalid placement keeps the held item; occupied cells and edges cannot be overwritten', () => {
  const state = stateWith(piece('horn'));
  state.bag = [piece('coin', 'occupied', 0, 0)];
  assert.ok(liftItem(state, 'ground', 'horn'));
  assert.equal(placeHeld(state, 0, 0), false); assert.equal(placeHeld(state, 2, 2), false);
  assert.equal(state.held.id, 'horn'); assert.equal(state.bag.length, 1);
  assert.ok(placeHeld(state, 1, 0));
  assert.equal(state.held, null);
  assert.equal(bagItemAt(state.bag, 2, 1).id, 'horn');
  assert.equal(bagItemAt(state.bag, 2, 0), null);
});

test('full bag and an already-held item cannot lose or duplicate loot', () => {
  const state = stateWith(piece('ruby'));
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) state.bag.push(piece('coin', `${x}-${y}`, x, y));
  const before = ids(state);
  assert.equal(autoPickup(state, 'ruby'), false);
  assert.ok(liftItem(state, 'ground', 'ruby'));
  assert.equal(liftItem(state, 'bag', '0-0'), false);
  assert.equal(autoPickup(state, 'ruby'), false);
  assert.deepEqual(ids(state), before);
});

test('loot starts on floor and remains conserved through repeated lift, rotation, drop and pickup', () => {
  for (let seed = 0; seed < 100; seed++) {
    const world = generateDungeon(seed), state = createLoot(world), player = { ...world.spawn };
    assert.ok(state.ground.every(item => canStand(world, item.x, item.y, 0.15)));
    const before = ids(state);
    for (let i = 0; i < 20; i++) {
      const item = state.ground[0];
      assert.ok(liftItem(state, 'ground', item.id));
      state.held.rotation = (state.held.rotation + 1) % 4;
      assert.ok(dropHeld(state, world, player));
      const dropped = state.ground.find(p => p.id === item.id);
      assert.ok(canStand(world, dropped.x, dropped.y, 0.15));
      assert.ok(Math.hypot(dropped.x - player.x, dropped.y - player.y) <= 1.7);
      assert.ok(autoPickup(state, item.id));
      assert.ok(liftItem(state, 'bag', item.id));
      assert.ok(dropHeld(state, world, player));
      assert.deepEqual(ids(state), before);
    }
  }
});

test('reticle prefers cursor-near loot within reach, otherwise nearest; walls block pickup', () => {
  const world = { width: 7, height: 7, tiles: new Uint8Array(49).fill(1) }, player = { x: 2.5, y: 2.5 };
  const a = piece('coin', 'a', 2.8, 2.5), b = piece('ruby', 'b', 3.7, 2.5), far = piece('ruby', 'far', 6, 6);
  assert.equal(selectTarget(world, player, [a, b, far]).id, 'a');
  assert.equal(selectTarget(world, player, [a, b, far], { x: 3.8, y: 2.5 }).id, 'b');
  assert.equal(selectTarget(world, player, [a, b, far], { x: 6, y: 6 }).id, 'a');
  world.tiles[2 * 7 + 3] = 0;
  assert.equal(selectTarget(world, player, [b]), null);
  assert.equal(selectTarget(world, player, [far]), null);
});
