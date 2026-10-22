import test from 'node:test';
import assert from 'node:assert/strict';
import {createCamp,createLairWorld,lairTarget,buildPotionStation,craftForSack,saveCamp,loadCamp} from '../src/lair.js';
import {createProfile,buyPersonalUpgrade} from '../src/profile.js';
import {canStand} from '../src/world.js';
import {restoreSave} from '../server/save-store.js';
import {createLairSession} from '../server/lair-session.js';

test('shared station pays once, gates brewing, preserves ingredients on failure and survives saves',()=>{
 const camp=createCamp(),profile=createProfile(),loot={bag:[],held:null};
 profile.xp=profile.earnedXp=50;buyPersonalUpgrade(profile,'disguise');
 camp.counts.mushroom=camp.counts.berries=1;camp.counts.gold=29;
 assert.equal(buildPotionStation(camp),false);assert.equal(craftForSack(camp,loot,'disguise',profile),null);
 assert.equal(camp.counts.mushroom,1);camp.counts.gold=60;
 assert.ok(buildPotionStation(camp));assert.equal(buildPotionStation(camp),false);assert.equal(camp.counts.gold,30);
 assert.ok(craftForSack(camp,loot,'disguise',profile));assert.equal(camp.counts.mushroom,0);assert.equal(camp.counts.berries,0);
 let saved;const storage={setItem:(_,v)=>saved=v,getItem:()=>saved};saveCamp(camp,storage);
 assert.equal(loadCamp(storage).buildings.potion,true);
 const durable={version:1,camp,players:[]};assert.equal(restoreSave(durable).camp.buildings.potion,true);
 delete durable.camp.buildings;delete durable.camp.counts.mushroom;
 const old=restoreSave(durable).camp;assert.equal(old.buildings.potion,false);assert.equal(old.counts.mushroom,0);assert.equal(old.counts.gold,30);
});

test('station occupies a whole solid tile with a reachable interaction approach before and after building',()=>{
 const camp=createCamp(),world=createLairWorld(camp),s=world.stations.find(s=>s.kind==='potion');
 assert.equal(s.width,1);assert.equal(s.height,1);assert.equal(s.x,s.tileX+.5);
 assert.equal(canStand(world,s.x,s.y),false);assert.ok(canStand(world,s.approach.x,s.approach.y));assert.equal(lairTarget(world,s.approach),s);
 camp.counts.gold=30;buildPotionStation(camp);assert.equal(canStand(world,s.x,s.y),false);
});

test('authority rejects workbench brewing/building and duplicate shared builds, persists shared upgrade',()=>{
 const session=createLairSession(),p=session.connect(),q=session.connect();
 const state=session.adminState();state.camp.counts.gold=60;state.camp.counts.mushroom=state.camp.counts.berries=2;
 // Use a restored session to exercise durable server state rather than client supplied stock.
 const server=createLairSession({store:{load:()=>state,save:()=>{}}});
 const a=server.connect(p.token),b=server.connect(q.token),site=createLairWorld().stations.find(s=>s.kind==='potion');
 Object.assign(a,{x:13,y:6});assert.equal(server.action(a,{type:'build-potion-station'}),false);
 a.profile.xp=a.profile.earnedXp=50;buyPersonalUpgrade(a.profile,'disguise');assert.equal(server.action(a,{type:'craft',item:'disguise'}),false);
 Object.assign(a,site.approach);Object.assign(b,site.approach);
 assert.ok(server.action(a,{type:'build-potion-station'}));assert.equal(server.action(b,{type:'build-potion-station'}),false);
 assert.equal(server.exportState().camp.counts.gold,30);assert.ok(server.action(a,{type:'craft',item:'disguise'}));
 assert.equal(server.exportState().camp.buildings.potion,true);assert.equal(server.exportState().camp.counts.mushroom,1);
});
