import test from 'node:test';
import assert from 'node:assert/strict';
import { createDungeonPreview } from '../src/dungeon-preview.js';
import { GENERATOR_PRESETS } from '../src/generator-settings.js';
import { reachableTreasureTiles, unlockTreasure, canApproachTreasure } from '../src/treasure.js';
import { selectInteraction, beginSearch, updateSearch, createSearchSession } from '../src/search.js';
import { autoPickup, createLoot, liftItem, dropHeld, clearPath, reachable } from '../src/loot.js';
import { createDungeonSession } from '../server/dungeon-session.js';
import { createProfile } from '../src/profile.js';
import { createCamp } from '../src/lair.js';
import { selectJob } from '../src/jobs.js';
import { lootSurface } from '../src/room-types.js';

const preview=(id='manor',seed=1)=>createDungeonPreview(seed,GENERATOR_PRESETS[id],id);
test('placed keys and coins are deterministic, reachable and on actual surfaces across maps',()=>{
 for(const id of Object.keys(GENERATOR_PRESETS))for(let seed=0;seed<20;seed++){
  const p=preview(id,seed),q=preview(id,seed),w=p.world,seen=reachableTreasureTiles(w);
  assert.equal(p.checks.errors,0);assert.deepEqual(p.ground,q.ground);
  const keys=p.ground.filter(i=>i.type==='treasureKey');assert.equal(keys.length,1);
  assert.ok(p.objects.every(o=>!o.contents.includes('treasureKey')));
  for(const item of p.ground){
   const source=p.objects.find(o=>o.id===item.surfaceId);assert.ok(source&&lootSurface(source));
   assert.ok(seen.has(Math.floor(source.approach.y)*w.width+Math.floor(source.approach.x)));
   assert.ok(reachable(w,source.approach,item));assert.ok(clearPath(w,source.approach,item));
   assert.ok(item.surfaceDepth>source.tileY+source.height);
  }
  assert.ok(p.ground.filter(i=>i.type!=='treasureKey').every(i=>['copperCoin','silverCoin'].includes(i.type)));
 }
});
test('tap pickup wins over searching its furniture; searching never creates another key',()=>{
 const p=preview(),key=p.ground.find(i=>i.type==='treasureKey'),source=p.objects.find(o=>o.id===key.surfaceId),actor={...source.approach,state:'active'};
 const loot={...createLoot(),ground:p.ground},interaction=selectInteraction(p.world,actor,loot.ground,p.objects);
 assert.equal(interaction.kind,'loot');assert.equal(interaction.item.id,key.id);
 assert.ok(autoPickup(loot,key.id));assert.equal(autoPickup(loot,key.id),false);
 assert.ok(loot.bag.some(i=>i.keyId===p.world.treasure.keyId));assert.equal(loot.bag[0].surfaceId,undefined);
 const session=createSearchSession();assert.ok(beginSearch(session,p.world,actor,loot,source));
 assert.equal(updateSearch(session,p.world,actor,loot,true,10).type,'completed');
 assert.equal(loot.ground.filter(i=>i.type==='treasureKey').length,0);
 assert.equal(source.searched,true);
});
test('full sack leaves the key visible; lifting and dropping clears furniture anchors',()=>{
 const p=preview(),key=p.ground.find(i=>i.type==='treasureKey'),source=p.objects.find(o=>o.id===key.surfaceId);
 const loot={...createLoot(),ground:p.ground,bag:Array.from({length:9},(_,i)=>({id:`full-${i}`,type:'ruby',x:i%3,y:Math.floor(i/3),rotation:0}))};
 assert.equal(autoPickup(loot,key.id),false);assert.ok(loot.ground.includes(key));
 assert.ok(liftItem(loot,'ground',key.id));assert.equal(loot.held.surfaceId,undefined);
 assert.ok(dropHeld(loot,p.world,source.approach));const dropped=loot.ground.find(i=>i.id===key.id);assert.equal(dropped.surfaceDepth,undefined);assert.equal(dropped.keyId,key.keyId);
});
test('multiplayer shares one placed key, validates reach and consumes it once at the lock',()=>{
 const a={id:'a',connected:true,bag:[],profile:createProfile('a')},b={id:'b',connected:true,bag:[],profile:createProfile('b')};
 const s=createDungeonSession({id:'surface',seed:1,job:selectJob('manor','normal')},[a,b],createCamp()),key=s.ground.find(i=>i.type==='treasureKey'),source=s.objects.find(o=>o.id===key.surfaceId);
 assert.ok(key);assert.equal(JSON.stringify(s.snapshot()).includes('contents'),false);
 assert.ok(s.snapshot().ground.some(i=>i.id===key.id&&i.surfaceId===source.id));
 Object.assign(a,{x:-10,y:-10});assert.equal(s.action(a,{type:'pickup',id:key.id}),false);
 Object.assign(a,source.approach);Object.assign(b,source.approach);
 assert.ok(s.action(a,{type:'pickup',id:key.id}));assert.equal(s.action(b,{type:'pickup',id:key.id}),false);
 const door=s.world.treasure;
 const adjacent=door.cells.flatMap(c=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:c.x+.5+dx,y:c.y+.5+dy,state:'active'}))).find(p=>canApproachTreasure(s.world,p));assert.ok(adjacent);
 Object.assign(a,adjacent);assert.ok(s.action(a,{type:'unlock'}));assert.equal(s.action(b,{type:'unlock'}),false);assert.equal(s.snapshot().treasure.unlocked,true);assert.equal(a.bag.length,0);
});
