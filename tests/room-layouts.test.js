import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomPassFixture } from '../workshop/door-test-room.js';
import { createDungeonPreview } from '../src/dungeon-preview.js';
import { GENERATOR_PRESETS } from '../src/generator-settings.js';
import { selectJob } from '../src/jobs.js';
import { canStand, generateDungeon, setSolidObjects } from '../src/world.js';
import { findPath, followPath } from '../src/navigation.js';
import { applyRoomDoors } from '../src/room-doors.js';
import { createDungeonSession } from '../server/dungeon-session.js';
import { createCamp } from '../src/lair.js';
import { createProfile } from '../src/profile.js';
import { createSearchables } from '../src/search.js';
import { dungeonConfig } from '../src/generator-settings.js';

const walkTo=(w,from,to)=>{
 const actor={...from},path=findPath(w,from,to);assert.ok(path.length);
 followPath(w,actor,path,w.tiles.length*2);
 assert.ok(Math.hypot(actor.x-to.x,actor.y-to.y)<.02);
};
test('dining proof has a long table, aligned bench, an aisle and walking routes around both ends',()=>{
 const f=createRoomPassFixture('dining',selectJob('manor','normal')),w=f.world;
 applyRoomDoors(w,[]);
 const table=f.objects.find(o=>o.roomFurniture==='table'),bench=f.objects.find(o=>o.roomFurniture==='bench');
 assert.equal(table.width,3);assert.equal(bench.width,3);assert.equal(table.tileX,bench.tileX);assert.equal(Math.abs(table.tileY-bench.tileY),2);
 for(const x of [table.tileX-1,table.tileX+table.width]){
  const a={x:x+.5,y:table.tileY-.5},b={x:x+.5,y:table.tileY+1.5};
  assert.ok(canStand(w,a.x,a.y));assert.ok(canStand(w,b.x,b.y));walkTo(w,a,b);
 }
 for(const x of [table.tileX,table.tileX+1,table.tileX+2])assert.ok(canStand(w,x+.5,(table.tileY+bench.tileY)/2+.5));
 for(const o of f.objects)walkTo(w,w.spawn,o.approach);
 assert.ok(canStand(w,f.guards[0].x,f.guards[0].y));
});
test('storage proof has two shelf rows with reachable aisles and space at each end',()=>{
 const f=createRoomPassFixture('storage',selectJob('manor','normal')),w=f.world;applyRoomDoors(w,[]);
 const shelves=f.objects.filter(o=>o.roomFurniture==='stores');assert.equal(shelves.length,2);
 assert.ok(shelves.every(o=>o.height===2));assert.ok(Math.abs(shelves[0].tileX-shelves[1].tileX)>=2);
 for(const shelf of shelves){
  for(const y of [shelf.tileY-1,shelf.tileY+shelf.height]){const point={x:shelf.x,y:y+.5};assert.ok(canStand(w,point.x,point.y));walkTo(w,w.spawn,point);}
 }
 for(const o of f.objects)walkTo(w,w.spawn,o.approach);
});
test('arranged rooms retain searchable counts, grid routes, key access and valid guards across maps and seeds',()=>{
 for(const id of Object.keys(GENERATOR_PRESETS))for(let seed=0;seed<30;seed++){
  const p=createDungeonPreview(seed,GENERATOR_PRESETS[id],id);assert.equal(p.checks.errors,0,`${id}/${seed}: ${JSON.stringify(p.checks.issues)}`);
  const legacy=generateDungeon(seed,dungeonConfig(GENERATOR_PRESETS[id]));legacy.job=selectJob(id,'normal');const base=createSearchables(legacy);
  assert.equal(p.objects.length,base.length);
  assert.equal(p.ground.filter(i=>i.type==='treasureKey').length,1);
 }
});
test('server snapshots reproduce the same multi-tile furniture and collision as the solo preview',()=>{
 const p={id:'a',connected:true,bag:[],profile:createProfile('a')};
 const s=createDungeonSession({id:'layout',seed:42,job:selectJob('hold','normal')},[p],createCamp());
 const preview=createDungeonPreview(42,GENERATOR_PRESETS.hold,'hold'),snap=s.snapshot();
 assert.deepEqual(s.objects,preview.objects);assert.deepEqual(s.ground,preview.ground);
 assert.ok(snap.objects.some(o=>o.width>1||o.height>1));
 const client=generateDungeon(snap.seed,snap.layout);setSolidObjects(client,[...snap.objects,...snap.hidingSpots]);
 assert.deepEqual(client.solidTiles,s.world.solidTiles);
 assert.ok(snap.objects.every(o=>!Object.hasOwn(o,'contents')));
});

test('prayer, bedroom, kitchen and armoury proofs have distinct arrangements and reachable furniture',()=>{
 for(const type of ['prayer','bedroom','kitchen','armoury']){
  const f=createRoomPassFixture(type,selectJob('manor','normal')),w=f.world;applyRoomDoors(w,[]);
  assert.equal(w.rooms[1].furnitureLayout,type);
  for(const o of f.objects)walkTo(w,w.spawn,o.approach);
  for(const h of f.hidingSpots)walkTo(w,w.spawn,h.approach);
  if(type==='prayer'){
   const altar=f.objects.find(o=>o.roomFurniture==='altar'),pews=f.objects.filter(o=>o.roomFurniture==='pew');assert.equal(altar.width,2);assert.equal(altar.tileY,w.rooms[1].y);assert.ok(pews.every(o=>o.width===2));assert.ok(pews[0].tileX<w.rooms[1].cx&&pews[1].tileX>w.rooms[1].cx);
  }else if(type==='bedroom'){
   assert.equal(f.objects.find(o=>o.roomFurniture==='bed').height,2);assert.ok(f.hidingSpots.some(h=>h.tileY<w.rooms[1].y+w.rooms[1].h));
  }else if(type==='kitchen'){
   const counter=f.objects.find(o=>o.roomFurniture==='counter');assert.equal(counter.width,2);assert.ok(counter.tileY>w.rooms[1].y);assert.equal(f.objects.find(o=>o.roomFurniture==='stove').tileY,w.rooms[1].y);
  }else{const racks=f.objects.filter(o=>o.roomFurniture==='rack');assert.ok(racks.every(o=>o.height===2));assert.ok(racks[0].tileX!==racks[1].tileX);}
 }
});
