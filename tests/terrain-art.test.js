import { createRenderer } from '../src/render.js';
import { createLairWorld } from '../src/lair.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { terrainFrames, terrainTile, terrainLayers, loadHumanTerrain, drawTerrainTile } from '../src/terrain-art.js';
import { generateDungeon } from '../src/world.js';
const metadata = JSON.parse(readFileSync(new URL('../assets/human/GreenTeam-tileset.json', import.meta.url), 'utf8'));
function arena(floors) {
  const tiles = new Uint8Array(49);
  for (const [x, y] of floors) tiles[y * 7 + x] = 1;
  return { width: 7, height: 7, tiles };
}
test('actual Proplet JSON identifies five bounded 32px frames, including the second sheet row', () => {
  const frames = terrainFrames(metadata, 128, 64);
  assert.deepEqual(frames.floor, { x: 0, y: 0, width: 32, height: 32 });
  assert.deepEqual(frames.wall_corner_top_left, { x: 96, y: 0, width: 32, height: 32 });
  assert.deepEqual(frames.wall_bottom_horz, { x: 0, y: 32, width: 32, height: 32 });
  const spaced = { ...metadata, padding: 2, spacing: 1 };
  assert.deepEqual(terrainFrames(spaced, 135, 69).wall_bottom_horz, { x: 2, y: 35, width: 32, height: 32 });
  for (const change of [m => m.tileWidth = 0, m => m.spacing = -1, m => m.tiles.floor.index = 20, m => delete m.tiles.wall_vert, m => m.tiles.floor.tags = ['dwarf']]) {
    const bad = structuredClone(metadata); change(bad); assert.throws(() => terrainFrames(bad, 128, 64));
  }
  assert.throws(() => terrainFrames(metadata, 64, 32));
});
test('floor-facing edges and all outer corners select the agreed original or mirrored tiles', () => {
  const world = arena([[2,2],[3,2],[4,2],[2,3],[3,3],[4,3],[2,4],[3,4],[4,4]]);
  for (const [x,y,name,flipX] of [
    [3,3,'floor',false], [3,1,'wall_top_horz',false], [3,5,'wall_bottom_horz',false],
    [1,3,'wall_vert',false], [5,3,'wall_vert',true], [1,1,'wall_corner_top_left',false],
    [5,1,'wall_corner_top_left',true], [1,5,'wall_bottom_horz',false], [5,5,'wall_bottom_horz',false]
  ]) assert.deepEqual(terrainTile(world,x,y),{name,flipX});
  assert.equal(terrainTile(world,0,0),null);
  assert.deepEqual(terrainTile(arena([[3,4],[4,3]]),3,3),{name:'wall_top_horz',flipX:false});
});
test('every generated Human floor/adjacent wall selects valid art without changing any collision tile', () => {
  const frames = terrainFrames(metadata, 128, 64);
  for (let seed=0;seed<40;seed++) {
    const world = generateDungeon(seed), before = world.tiles.slice();
    for(let y=0;y<world.height;y++) for(let x=0;x<world.width;x++) {
      const tile=terrainTile(world,x,y);
      const neighbour = [-1,0,1].some(dy=>[-1,0,1].some(dx=>world.tiles[(y+dy)*world.width+x+dx]===1 && x+dx>=0 && x+dx<world.width));
      if(tile) assert.ok(frames[tile.name]);
      assert.equal(!!tile,neighbour);
    }
    assert.deepEqual(world.tiles,before);
  }
});
test('mirrored drawing crops the source frame and restores the canvas transform', () => {
  const calls=[], ctx=Object.fromEntries(['save','translate','scale','drawImage','restore'].map(name=>[name,(...args)=>calls.push([name,...args])])), image={};
  const art={image,frames:terrainFrames(metadata,128,64)}, world=arena([[3,3]]);
  assert.equal(drawTerrainTile(ctx,art,world,4,2,48,24,24),true);
  assert.deepEqual(calls,[['save'],['translate',72,24],['scale',-1,1],['drawImage',image,96,0,32,32,0,0,24,24],['restore']]);
  assert.equal(drawTerrainTile(ctx,art,world,0,0,0,0,24),false);
});
test('asset loader reads the supplied manifest/image once and rejects broken exports or failed images', async () => {
  const paths=[], image={naturalWidth:128,naturalHeight:64,async decode(){}};
  const art=await loadHumanTerrain(async path=>{paths.push(path);return{ok:true,json:async()=>metadata};},()=>image);
  assert.deepEqual(paths,['assets/human/GreenTeam-tileset.json']);assert.equal(image.src,'assets/human/GreenTeam-tileset.png');assert.equal(art.image,image);
  await assert.rejects(loadHumanTerrain(async()=>({ok:false}),()=>image),/Could not load/);
  await assert.rejects(loadHumanTerrain(async()=>({ok:true,json:async()=>({...metadata,image:'other.png'})}),()=>image),/unexpected image/);
  await assert.rejects(loadHumanTerrain(async()=>({ok:true,json:async()=>metadata}),()=>({decode:async()=>{throw Error('Image failed');}})),/Image failed/);
});


test('the real renderer uses supplied art only for Human runs, loads once, and retains playable fallback on failure', async t => {
  const old = { Image: globalThis.Image, fetch: globalThis.fetch, ResizeObserver: globalThis.ResizeObserver, warn: console.warn };
  t.after(() => Object.assign(globalThis, { Image: old.Image, fetch: old.fetch, ResizeObserver: old.ResizeObserver }));
  t.after(() => { console.warn = old.warn; });
  const calls = [], warnings = []; let loads = 0, fail = false;
  globalThis.Image = class { naturalWidth = 128; naturalHeight = 64; async decode() {} };
  globalThis.fetch = async () => { loads++; return { ok: !fail, json: async () => metadata }; };
  globalThis.ResizeObserver = class { constructor(fn) { this.fn = fn; } observe() { this.fn(); } };
  console.warn = (...args) => warnings.push(args);
  const ctx = () => new Proxy({}, { get: (object, key) => object[key] ?? (key === 'drawImage' ? (...args) => calls.push(args) : () => {}) });
  const canvas = { getContext: ctx, getBoundingClientRect: () => ({ width: 800, height: 600 }) }, map = { getContext: ctx };
  const render = await createRenderer(canvas, map), world = generateDungeon(42);
  const p = { ...world.spawn, facing: -1, moving: false, phase: 0, state: 'active' };
  const draw = w => render(w, p, { ground: [], bag: [], held: null }, null, { entrance: w.spawn, cages: [], rescues: [] }, false, [], [], null, { active: null });
  world.job = { jobId: 'manor' }; draw(world);
  assert.ok(calls.some(args => args[0].src === 'assets/human/GreenTeam-tileset.png'));
  calls.length = 0; world.job = { jobId: 'hold' }; draw(world); draw(createLairWorld());
  assert.ok(calls.every(args => args[0].src !== 'assets/human/GreenTeam-tileset.png'));
  assert.equal(loads, 1);
  fail = true; const fallback = await createRenderer(canvas, map);
  world.job = { jobId: 'manor' }; calls.length = 0;
  fallback(world, p, { ground: [], bag: [], held: null }, null, { entrance: world.spawn }, false, [], [], null, { active: null });
  assert.equal(warnings.length, 1); assert.ok(calls.every(args => args[0].src !== 'assets/human/GreenTeam-tileset.png'));
});


test('corridor mouths retain side walls beneath transparent caps and use square inside joins', () => {
  for (const dx of [-1, 1]) {
    const lower = terrainLayers(arena([[3,2],[3+dx,3]]),3,3);
    assert.equal(lower[0].name,'wall_vert'); assert.equal(lower[0].flipX,dx<0);
    assert.equal(lower.at(-1).name,'wall_bottom_horz');
    const upper = terrainLayers(arena([[3,4],[3+dx,3]]),3,3);
    assert.equal(upper[0].name,'wall_top_horz');
    assert.ok(upper.some(layer=>layer.name==='wall_vert' && layer.flipX===(dx<0)));
    assert.ok(upper.every(layer=>layer.name!=='wall_corner_top_left'));
  }
});
test('all sixteen cardinal wall configurations retain opaque support where a side or top face is exposed', () => {
  const neighbours=[[3,2],[3,4],[4,3],[2,3]];
  for(let mask=0;mask<16;mask++) {
    const world=arena(neighbours.filter((_,i)=>mask & 1<<i)), before=world.tiles.slice();
    const layers=terrainLayers(world,3,3);
    if(mask & 14) assert.ok(['wall_vert','wall_top_horz'].includes(layers[0].name),`unsupported face mask ${mask}`);
    for(const layer of layers) if(layer.crop) {
      const c=layer.crop; assert.ok(c.x>=0&&c.y>=0&&c.width>0&&c.height>0&&c.x+c.width<=1&&c.y+c.height<=1);
    }
    assert.deepEqual(world.tiles,before);
  }
});
test('screenshot layout keeps connected inner joins without changing its generated floors', async () => {
  const { dungeonConfig } = await import('../src/generator-settings.js');
  const world=generateDungeon(2828433373,dungeonConfig()), before=world.tiles.slice();let joins=0;
  for(let y=0;y<world.height;y++) for(let x=0;x<world.width;x++) if(!world.tiles[y*world.width+x]) {
    const layers=terrainLayers(world,x,y);
    if(layers.length>1) {joins++;assert.ok(layers.every(layer=>layer.name!=='wall_corner_top_left'));}
  }
  assert.ok(joins>0);assert.deepEqual(world.tiles,before);
});
