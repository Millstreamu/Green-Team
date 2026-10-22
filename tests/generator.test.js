import test from 'node:test';
import assert from 'node:assert/strict';
import { GENERATOR_PRESETS, GENERATOR_FIELDS, validateGenerator, generatorSettings, dungeonConfig } from '../src/generator-settings.js';
import { generateDungeon, canStand, isFloor, isWalkable } from '../src/world.js';
import { createDungeonPreview, drawDungeonPreview } from '../src/dungeon-preview.js';
import { reservedRoomTiles, propCells, placeProp } from '../src/prop-placement.js';
import { createDungeonSession } from '../server/dungeon-session.js';
import { createCamp } from '../src/lair.js';
import { selectJob } from '../src/jobs.js';
import { findPath } from '../src/navigation.js';

function checkLayout(p) {
  const { world: generatedWorld, objects, hidingSpots, cages } = p, used = new Set();
  // Full-layout invariants apply once the optional treasure door is opened.
  const world = { ...generatedWorld, lockedTiles: undefined };
  const queue = [Math.floor(world.spawn.y) * world.width + Math.floor(world.spawn.x)], reached = new Set(queue);
  for (let i = 0; i < queue.length; i++) {
    const key = queue[i], x = key % world.width, y = Math.floor(key / world.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (isFloor(world, x + dx, y + dy)) {
      const next = (y + dy) * world.width + x + dx; if (!reached.has(next)) { reached.add(next); queue.push(next); }
    }
  }
  assert.equal(reached.size, world.tiles.reduce((a, b) => a + b, 0));
  for (let x = 0; x < world.width; x++) { assert.equal(isFloor(world, x, 0), false); assert.equal(isFloor(world, x, world.height - 1), false); }
  for (let y = 0; y < world.height; y++) { assert.equal(isFloor(world, 0, y), false); assert.equal(isFloor(world, world.width - 1, y), false); }
  const walkQueue = [queue[0]], walkReached = new Set(walkQueue);
  for (let i = 0; i < walkQueue.length; i++) {
    const key = walkQueue[i], x = key % world.width, y = Math.floor(key / world.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (isWalkable(world, x + dx, y + dy)) {
      const next = (y + dy) * world.width + x + dx;
      if (!walkReached.has(next)) { walkReached.add(next); walkQueue.push(next); }
    }
  }
  assert.equal(walkReached.size, world.tiles.reduce((n, floor, i) => n + Number(!!floor && !world.solidTiles[i]), 0));
  for (const guard of p.guards ?? []) {
    assert.ok(canStand(world, guard.x, guard.y));
    for (const point of [...guard.patrol, ...(guard.roamRoute ?? [])]) assert.ok(canStand(world, point.x, point.y));
  }
  for (const prop of [...objects, ...hidingSpots, ...cages]) {
    assert.equal(prop.x,prop.tileX+(prop.width??1)/2); assert.equal(prop.y,prop.tileY+(prop.height??1)/2);
    const room = world.rooms.find(r => prop.tileX >= r.x && prop.tileX < r.x + r.w && prop.tileY >= r.y && prop.tileY < r.y + r.h);
    assert.ok(room);
    if (objects.includes(prop) || hidingSpots.includes(prop)) {
      assert.equal(canStand(world, prop.x, prop.y), false);
      assert.equal(world.corridorTiles[prop.tileY * world.width + prop.tileX], 0);
      if (prop.type === 'cupboard' && prop.placement !== 'free') { assert.equal(prop.tileY, room.y); assert.equal(isFloor(world, prop.tileX, prop.tileY - 1), false); assert.equal(prop.facing, 'south'); }
    }
    const reserved = reservedRoomTiles(world, room);
    for (const cell of propCells(prop)) {
      const key = cell.y * world.width + cell.x; assert.ok(!used.has(key)); used.add(key);
      assert.ok(!reserved.has(key)); assert.ok(isFloor(world, cell.x, cell.y));
    }
    if(prop.placement!=='free')assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !isFloor(world, prop.tileX + dx, prop.tileY + dy)));
    assert.ok(canStand(world, prop.approach.x, prop.approach.y)); assert.ok(findPath(world, world.spawn, prop.approach).length);
  }
}
test('all three architectures generate connected bounded layouts with grid-aligned furniture and reserved doorway lanes', () => {
  for (const [id, values] of Object.entries(GENERATOR_PRESETS)) for (let seed = 0; seed < 30; seed++) {
    const preview = createDungeonPreview(seed, values, id); checkLayout(preview);
    assert.ok(preview.world.rooms.length >= 4); assert.ok(preview.hidingSpots.length > 0); assert.ok(preview.cages.length > 0);
    assert.deepEqual(preview.world.tiles, generateDungeon(seed, dungeonConfig(values)).tiles);
  }
});
test('preview exactly matches a real run layout, furniture, hiding, cages and guard doors for each difficulty', () => {
  for (const id of Object.keys(GENERATOR_PRESETS)) for (const difficulty of ['normal', 'hard']) {
    const values = { ...GENERATOR_PRESETS[id], searchablesPerRoom: 3, hidingInterval: 1 };
    const preview = createDungeonPreview(42, values, id, difficulty);
    const run = createDungeonSession({ seed: 42, id: 'preview-test', job: selectJob(id, difficulty), layout: dungeonConfig(values) }, [], createCamp());
    assert.deepEqual(run.world.tiles, preview.world.tiles); assert.deepEqual(run.objects, preview.objects);
    assert.deepEqual(run.danger.hidingSpots, preview.hidingSpots); assert.deepEqual(run.danger.rescue.cages, preview.cages);
    assert.deepEqual(run.danger.pressure.doors, preview.doors);
    const drawCalls = [], canvas = { getContext: () => ({ fillRect: (...args) => drawCalls.push(args) }) };
    assert.match(drawDungeonPreview(canvas, preview), /rooms.*searchables.*hiding spots/); assert.ok(drawCalls.length > 100);
    assert.equal(canvas.width, preview.world.width * 8);
  }
});
test('parameter extremes remain deterministic and usable; generation reports actual counts when constrained', () => {
  for (const settings of [
    { ...GENERATOR_PRESETS.manor, width: 40, height: 32, rooms: 24, maxCorridorLength: 8, corridorWidth: 3, extraConnections: 8 },
    { ...GENERATOR_PRESETS.hold, width: 120, height: 90, rooms: 24, extraConnections: 8, corridorWidth: 2 },
    { ...GENERATOR_PRESETS.sanctuary, minRoomWidth: 16, maxRoomWidth: 16, minRoomHeight: 14, maxRoomHeight: 14, searchablesPerRoom: 4, hidingInterval: 1 }
  ]) {
    validateGenerator(settings); const a = createDungeonPreview(20, settings, 'manor'); checkLayout(a);
    assert.deepEqual(a, createDungeonPreview(20, settings, 'manor'));
    assert.ok(a.world.rooms.length <= settings.rooms);
  }
  const human = createDungeonPreview(42, GENERATOR_PRESETS.manor, 'manor');
  const dwarf = createDungeonPreview(42, GENERATOR_PRESETS.hold, 'hold');
  assert.notDeepEqual(human.world.tiles, dwarf.world.tiles);
});
test('shared prop rules reserve multi-tile footprints and reject unavailable wall space', () => {
  const world = generateDungeon(42), room = world.rooms[0];
  const rule = { width: 2, height: 1, placement: 'wall' };
  const a = placeProp(world, room, 'future-shelf', [], rule); assert.ok(a); assert.equal(propCells(a).length, 2);
  const b = placeProp(world, room, 'future-shelf', [a], rule);
  if (b) assert.ok(propCells(b).every(c => !propCells(a).some(d => c.x === d.x && c.y === d.y)));
  assert.equal(placeProp(world, room, 'too-large', [], { width: 100, height: 100, placement: 'wall' }), null);
});
test('settings validation rejects unknown, fractional, out-of-range and inconsistent presets, while old saves get defaults', () => {
  assert.deepEqual(generatorSettings(), GENERATOR_PRESETS);
  for (const values of [null, {}, [], { ...GENERATOR_PRESETS.manor, width: 1000 }, { ...GENERATOR_PRESETS.manor, rooms: 8.5 }, { ...GENERATOR_PRESETS.manor, width: '80' }, { ...GENERATOR_PRESETS.manor, minRoomWidth: 14, maxRoomWidth: 6 }, { ...GENERATOR_PRESETS.manor, extra: 1 }]) assert.throws(() => validateGenerator(values), /Invalid dungeon/);
  assert.throws(() => generatorSettings({ manor: GENERATOR_PRESETS.manor }), /Invalid dungeon/);
  assert.equal(GENERATOR_FIELDS.length, Object.keys(GENERATOR_PRESETS.manor).length);
});
