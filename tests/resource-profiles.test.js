import test from 'node:test';
import assert from 'node:assert/strict';
import { RESOURCE_PROFILES, resourcePool, commonFinds } from '../src/resource-profiles.js';
import { LOOT_TYPES } from '../src/loot.js';
import { generateDungeon } from '../src/world.js';
import { createSearchables } from '../src/search.js';
import { dungeonConfig, GENERATOR_PRESETS } from '../src/generator-settings.js';
import { selectJob } from '../src/jobs.js';
import { createDungeonSession } from '../server/dungeon-session.js';
import { createCamp } from '../src/lair.js';
import { createProfile } from '../src/profile.js';

test('resource profiles keep all basic resources available and are extensible data keyed by map/container',()=>{
 for(const [id,profile] of Object.entries(RESOURCE_PROFILES)){
  assert.ok(Object.isFrozen(profile));for(const container of ['cupboard','crate'])for(const type of ['scrap','cloth','meat','berries','mushroom'])assert.ok(resourcePool(id,container,[]).includes(type));
  for(const weights of Object.values(profile.containers))for(const [type,n] of Object.entries(weights)){assert.ok(LOOT_TYPES[type].material);assert.ok(n>0&&Number.isInteger(n));}
 }
 const fallback=['scrap','cloth'];assert.equal(resourcePool('future-map','future-container',fallback),fallback);assert.equal(resourcePool('manor','future-container',fallback),fallback);assert.equal(resourcePool('constructor','constructor',fallback),fallback);
 assert.equal(commonFinds('manor'),'Meat and Cloth');assert.equal(commonFinds('hold'),'Metal scrap and Meat');assert.equal(commonFinds('sanctuary'),'Berries and Mushrooms');
});

test('generated map biases preserve empty/item/valuable rolls across both difficulties and retain all resources',()=>{
 const totals={};
 for(const id of Object.keys(RESOURCE_PROFILES)){
  const counts=totals[id]={scrap:0,cloth:0,meat:0,berries:0,mushroom:0};
  for(const difficulty of ['normal','hard'])for(let seed=0;seed<30;seed++){
   const job=selectJob(id,difficulty),config=dungeonConfig(GENERATOR_PRESETS[id]);
   const world=generateDungeon(seed,config);world.job=job;const actual=createSearchables(world);
   const baselineWorld=generateDungeon(seed,config);baselineWorld.job={...job,jobId:'unprofiled'};const baseline=createSearchables(baselineWorld);
   actual.forEach((o,i)=>{assert.equal(o.contents.length,baseline[i].contents.length);assert.deepEqual(o.contents.filter(t=>LOOT_TYPES[t].sellValue),baseline[i].contents.filter(t=>LOOT_TYPES[t].sellValue));for(const t of o.contents)if(t in counts)counts[t]++;});
  }
  assert.ok(Object.values(counts).every(n=>n>0),`${id} loses no basic resource`);
 }
 assert.ok(totals.manor.cloth>totals.manor.scrap);assert.ok(totals.manor.meat>totals.manor.berries);
 assert.ok(totals.hold.scrap>totals.hold.cloth);assert.ok(totals.hold.meat>totals.hold.berries);
 assert.ok(totals.sanctuary.berries>totals.sanctuary.meat);assert.ok(totals.sanctuary.berries>totals.sanctuary.scrap);
});

test('authoritative dungeon uses the selected map profile and matching solo generation',()=>{
 for(const id of Object.keys(RESOURCE_PROFILES)){
  const job=selectJob(id,'normal'),player={id:'a',connected:true,bag:[],profile:createProfile('a')};
  const d=createDungeonSession({id:`profile-${id}`,seed:42,job},[player],createCamp());
  const solo=generateDungeon(42,dungeonConfig(GENERATOR_PRESETS[id]));solo.job=job;solo.roomThemes=true;const objects=createSearchables(solo);
  // Lock/key placement can replace contents later; ordinary containers still agree.
  for(const object of d.objects)if(!object.treasure&&!object.contents.includes('treasureKey')){
   assert.deepEqual(object.contents,objects.find(o=>o.id===object.id).contents);
  }
 }
});
