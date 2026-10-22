import test from 'node:test';
import assert from 'node:assert/strict';
import {ROOM_TYPES,assignRoomTypes,roomLootPools,roomMaterialContainer} from '../src/room-types.js';
import {generateDungeon,canStand} from '../src/world.js';
import {dungeonConfig,GENERATOR_PRESETS} from '../src/generator-settings.js';
import {createSearchables,searchGoldChance,searchRewardProfile} from '../src/search.js';
import {resourcePool} from '../src/resource-profiles.js';
import {LOOT_TYPES} from '../src/loot.js';
import {selectJob} from '../src/jobs.js';
import {createWorkshopDraft,workshopLootOdds} from '../workshop/model.js';
import {createRoomPassFixture} from '../workshop/door-test-room.js';
import {runTuning} from '../src/tuning.js';
import {reservedRoomTiles,propCells} from '../src/prop-placement.js';
import {findPath} from '../src/navigation.js';
import {applyRoomDoors} from '../src/room-doors.js';
import {createDungeonSession} from '../server/dungeon-session.js';
import {createCamp} from '../src/lair.js';
import {createProfile} from '../src/profile.js';

const make=(id,seed=42,roomThemes=true)=>{const w=generateDungeon(seed,dungeonConfig(GENERATOR_PRESETS[id]));w.job=selectJob(id,'normal');w.roomThemes=roomThemes;return w;};
test('all six room purposes are seeded, repeatable and preserve geometry, furniture counts and valid loot',()=>{
 for(const id of Object.keys(GENERATOR_PRESETS))for(let seed=0;seed<8;seed++){
  const w=make(id,seed),legacy=make(id,seed,false),before=Uint8Array.from(w.tiles),objects=createSearchables(w),base=createSearchables(legacy);
  assert.equal(w.rooms[0].roomType,undefined);assert.ok(w.rooms.slice(1).every(r=>Object.hasOwn(ROOM_TYPES,r.roomType)));
  if(w.rooms.length>=7)assert.equal(new Set(w.rooms.slice(1).map(r=>r.roomType)).size,6);
  const twin=make(id,seed);createSearchables(twin);assert.deepEqual(w.rooms.map(r=>r.roomType),twin.rooms.map(r=>r.roomType));
  assert.deepEqual(w.tiles,before);assert.equal(objects.length,base.length);
  objects.forEach((o,i)=>{assert.ok(o.contents.length<=2);assert.ok(o.contents.every(t=>Object.hasOwn(LOOT_TYPES,t)));assert.ok(canStand(w,o.approach.x,o.approach.y));});
 }
});
test('room material biases retain map identity and match the workshop exact odds for all maps, rooms and depths',()=>{
 const draft=createWorkshopDraft();
 for(const id of Object.keys(GENERATOR_PRESETS))for(const roomType of Object.keys(ROOM_TYPES))for(const depth of [0,.5,1])for(const difficulty of ['normal','hard']){
  const w=make(id),object={type:'chest',roomType,depth};w.job=selectJob(id,difficulty);
  const odds=workshopLootOdds(draft,id,'chest',depth,difficulty,roomType);
  assert.ok(Math.abs((odds.items.coin?.chance??0)-searchGoldChance(w,object))<1e-12);
  assert.ok(Math.abs(Object.values(odds.items).reduce((n,x)=>n+x.expected,0)-(odds.one+2*odds.two))<1e-12);
  const p=searchRewardProfile(depth);assert.equal(odds.empty,p.emptyChance);
 }
 const odds=room=>workshopLootOdds(draft,'manor','chest',.5,'normal',room).items;
 assert.ok(odds('kitchen').meat.expected>odds('bedroom').meat.expected);
 assert.ok(odds('bedroom').cloth.expected>odds('kitchen').cloth.expected);
 assert.ok(odds('armoury').scrap.expected>odds('kitchen').scrap.expected);
 assert.ok(odds('armoury').sword.expected>0);assert.ok(odds('prayer').scroll.expected>0);
 const elf=workshopLootOdds(draft,'sanctuary','cupboard',.5,'normal','kitchen').items;
 assert.ok(elf.berries.expected>elf.meat.expected);
});
test('each playable room fixture preserves approach lanes, hiding and door reach',()=>{
 for(const type of Object.keys(ROOM_TYPES)){
  const f=createRoomPassFixture(type,selectJob('manor','normal'),runTuning()),w=f.world;
  assert.equal(w.rooms[1].roomType,type);assert.equal(f.objects.length,6);assert.equal(f.hidingSpots.length,1);
  assert.ok(f.objects.some(o=>o.roomFurniture===ROOM_TYPES[type].furniture));
  const door=w.roomDoors[0];applyRoomDoors(w,[]);
  for(const o of f.objects){const r=w.rooms.find(r=>o.x>=r.x&&o.x<r.x+r.w&&o.y>=r.y&&o.y<r.y+r.h),reserved=reservedRoomTiles(w,r);assert.ok(propCells(o).every(c=>!reserved.has(c.y*w.width+c.x)));assert.ok(findPath(w,w.spawn,o.approach).length>0);}
  applyRoomDoors(w,[door]);assert.ok(canStand(w,f.start.x,f.start.y));
 }
});
test('authoritative snapshots carry matching room identities and furniture without revealing container contents',()=>{
 const p={id:'a',connected:true,bag:[],profile:createProfile('a')},s=createDungeonSession({id:'rooms',seed:42,job:selectJob('manor','normal')},[p],createCamp()),snap=s.snapshot();
 assert.deepEqual(snap.roomTypes,s.world.rooms.map(r=>r.roomType??null));
 assert.ok(snap.objects.some(o=>o.roomFurniture));assert.ok(snap.objects.every(o=>!Object.hasOwn(o,'contents')));
 for(const o of snap.objects){const real=s.objects.find(r=>r.id===o.id);assert.equal(o.roomType,real.roomType);assert.equal(o.roomFurniture,real.roomFurniture);}
});
test('unknown room ids fall back to ordinary loot and cannot use object prototype names',()=>{
 const def={pool:['coin'],rarePool:['ruby']},materials=['scrap'];
 for(const id of ['constructor','__proto__','future-room',null]){assert.deepEqual(roomLootPools(id,def,materials),{materials,pool:def.pool,rarePool:def.rarePool});assert.equal(roomMaterialContainer(id,'chest'),'chest');}
});
