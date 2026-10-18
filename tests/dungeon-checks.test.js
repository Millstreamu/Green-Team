import test from 'node:test';
import assert from 'node:assert/strict';
import { createDungeonPreview, drawDungeonPreview } from '../src/dungeon-preview.js';
import { checkDungeon, dungeonCheckSummary } from '../src/dungeon-checks.js';
import { GENERATOR_PRESETS } from '../src/generator-settings.js';

const example = () => createDungeonPreview(42, GENERATOR_PRESETS.manor, 'manor');
test('route diagnostics reuse real generated data without mutation across cultures and difficulties', () => {
  for (const [id, preset] of Object.entries(GENERATOR_PRESETS)) for (const difficulty of ['normal', 'hard']) {
    const p = createDungeonPreview(19731, preset, id, difficulty), before = structuredClone(p);
    assert.deepEqual(checkDungeon(p), p.checks); assert.deepEqual(p, before);
    assert.equal(p.checks.errors, 0); assert.equal(p.checks.warnings, 0);
    assert.equal(p.checks.reachable, p.checks.walkable); assert.equal(dungeonCheckSummary(p.checks), 'Route checks passed');
  }
});
test('diagnostics catch disconnected floor, blocked interactions, prop overlap/grid/path violations and broken guard routes', () => {
  const mutations = [
    ['isolated-floor', p => { const r = p.world.rooms.at(-1); for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) p.world.tiles[y * p.world.width + x] = Number(x === r.cx && y === r.cy); }],
    ['unreachable', p => { p.objects[0].approach = { ...p.objects[0] }; }],
    ['grid', p => { p.objects[0].x += .2; }],
    ['overlap', p => { const a = p.objects[0], b = p.objects[1]; Object.assign(b, { x: a.x, y: a.y, tileX: a.tileX, tileY: a.tileY }); }],
    ['corridor', p => { const a = p.objects[0]; p.world.corridorTiles[a.tileY * p.world.width + a.tileX] = 1; }],
    ['route', p => { p.guards[0].patrol[0] = { ...p.objects[0] }; }],
    ['route', p => { p.guards.find(g => g.roamRoute).roamRoute[0] = { ...p.objects[0] }; }],
    ['unreachable', p => { p.doors[0].spawn = { ...p.objects[0] }; }],
    ['unreachable', p => { p.cages[0].entry = { ...p.objects[0] }; }],
    ['back-wall', p => { const a = p.objects.find(o => o.type === 'cupboard'); a.tileY++; a.y++; }]
  ];
  for (const [code, mutate] of mutations) {
    const p = example(); mutate(p); const report = checkDungeon(p);
    assert.ok(report.errors > 0); assert.ok(report.issues.some(i => i.code === code), `${code}: ${JSON.stringify(report.issues)}`);
  }
});
test('missing gameplay locations are warnings and preview outlines identify a deliberately blocked target', () => {
  const p = example(); p.hidingSpots = []; p.cages = []; p.doors = [];
  let report = checkDungeon(p);
  assert.equal(report.warnings, 3); assert.equal(report.errors, 0);
  assert.match(dungeonCheckSummary(report), /0 problems · 3 warnings/);
  p.objects[0].approach = { ...p.objects[0] }; p.checks = checkDungeon(p);
  const marks = [], ctx = { fillRect(...rect) { if (this.fillStyle === '#ff405e') marks.push(rect); } };
  const canvas = { getContext: () => ctx };
  drawDungeonPreview(canvas, p);
  assert.ok(marks.length >= 4);
  assert.ok(marks.some(([x, y]) => x === p.objects[0].tileX * 8 && y === p.objects[0].tileY * 8));
});
