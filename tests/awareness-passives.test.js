import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,buyPersonalUpgrade,setPassiveActive,passiveEffects,saveProfile,loadProfile} from '../src/profile.js';
import {triggerPanicSprint,tickPassiveEffects,hiddenGuardMark,drawHiddenGuardMark} from '../src/passive-effects.js';
import {createGuard,createVitality,updateGuard,tickVitality,hurtPlayer} from '../src/guard.js';
import {generateDungeon,movePlayer} from '../src/world.js';
import {createLoot} from '../src/loot.js';
import {createSearchables,createSearchSession,beginSearch,updateSearch} from '../src/search.js';
import {updateTeamGuard} from '../server/team-guards.js';
const arena=()=>({width:20,height:20,tiles:new Uint8Array(400).fill(1),rooms:[{x:2,y:2,w:5,h:5,cx:4,cy:4},{x:10,y:10,w:5,h:5,cx:12,cy:12}],spawn:{x:4.5,y:4.5}});
const player=()=>({id:'a',x:8.5,y:5.5,...createVitality(),panicSprint:true,searchVeil:true});
const guard=w=>({...createGuard(w),x:5.5,y:5.5,angle:0,stationary:true});
test('new abilities are personal, persist, and compete for three slots',()=>{
 const p=createProfile();p.xp=1000;
 for(const id of ['panicSprint','hideSense','searchVeil','quickSearch'])assert.ok(buyPersonalUpgrade(p,id));
 for(const id of ['panicSprint','hideSense','searchVeil'])assert.ok(setPassiveActive(p,id,true));
 assert.equal(setPassiveActive(p,'quickSearch',true),false);
 let saved;saveProfile(p,{setItem(k,v){saved=v;}});const loaded=loadProfile({getItem(){return saved;}});
 assert.deepEqual(loaded.activePassives,p.activePassives);assert.equal(passiveEffects(loaded).hideSense,true);assert.equal(passiveEffects(createProfile()).hideSense,false);
});
test('spotting triggers bounded sprint; chase and other guards cannot refresh it',()=>{
 const w=arena(),p=player(),g=guard(w);
 assert.equal(updateGuard(w,g,p,.4).spotted,false);assert.equal(p.panicLeft,0);
 assert.equal(updateGuard(w,g,p,.4).spotted,true);assert.equal(p.panicLeft,3);
 tickVitality(p,1);updateGuard(w,g,p,.1);assert.equal(p.panicLeft,2);
 updateGuard(w,guard(w),p,1);assert.equal(p.panicLeft,2);
 const normal={...p,panicLeft:0},fast={...p};movePlayer(w,normal,{x:0,y:1},.1);movePlayer(w,fast,{x:0,y:1},.1);
 assert.ok(Math.abs((fast.y-p.y)/(normal.y-p.y)-1.2)<1e-8);
 tickPassiveEffects(p,19);assert.equal(p.panicLeft,0);assert.ok(triggerPanicSprint(p));
 hurtPlayer(p,3);assert.equal(p.panicLeft,0);assert.equal(p.searchVeilLeft,0);assert.equal(triggerPanicSprint(p),false);
});
test('veil slows initial noticing but does not stop an established chase',()=>{
 const w=arena(),p=player(),g=guard(w);p.searchVeilLeft=3;
 updateGuard(w,g,p,.8);assert.equal(g.state,'suspicious');assert.equal(g.suspicion,.5);
 updateGuard(w,g,p,.8);assert.equal(g.state,'chase');
 updateGuard(w,g,p,.1);assert.equal(g.state,'chase');
});
test('only completed searches grant veil, including empty searches, without duplicate refresh',()=>{
 const w=generateDungeon(42),loot=createLoot(),o=createSearchables(w)[0],s=createSearchSession();
 const p={...player(),x:o.approach.x,y:o.approach.y};o.contents=[];
 assert.ok(beginSearch(s,w,p,loot,o));updateSearch(s,w,p,loot,false,10);assert.equal(p.searchVeilLeft,0);
 assert.ok(beginSearch(s,w,p,loot,o));assert.equal(updateSearch(s,w,p,loot,true,20).type,'completed');assert.equal(p.searchVeilLeft,3);
 tickVitality(p,1);assert.equal(updateSearch(s,w,p,loot,true,20),null);assert.equal(p.searchVeilLeft,2);
});
test('hide marker is private to an active hidden owner and follows the nearest guard',()=>{
 const p={...player(),hideSense:true,hiding:{spot:{id:'hide'}}};const a={id:'a',x:9,y:5.5},b={id:'b',x:8,y:5.5};
 assert.equal(hiddenGuardMark(p,[b,a]),a);a.x=12;assert.equal(hiddenGuardMark(p,[a,b]),b);
 const rects=[];drawHiddenGuardMark({fillRect(...r){rects.push(r);}},p,[a,b]);assert.equal(rects.length,2);
 assert.equal(hiddenGuardMark({...p,hideSense:false},[a,b]),null);
 assert.equal(hiddenGuardMark({...p,hiding:null},[a,b]),null);assert.equal(hiddenGuardMark({...p,state:'down'},[a,b]),null);
 assert.equal(hiddenGuardMark(p,[]),null);
});
test('authoritative team guard boosts only the goblin it spots',()=>{
 const w=arena(),g=guard(w),a={...player(),connected:true,inRun:true},b={...player(),id:'b',x:9.5,connected:true,inRun:true};
 updateTeamGuard(w,g,[a,b],.8,[]);assert.equal(a.panicLeft,3);assert.equal(b.panicLeft,0);
});
test('server derives the three new effects from personal campfire choices at each launch',async()=>{
 const {createLairSession}=await import('../server/lair-session.js');const s=createLairSession(),a=s.connect(),b=s.connect();a.profile.xp=500;Object.assign(a,{x:9,y:11.5});
 for(const id of ['panicSprint','hideSense','searchVeil']){assert.ok(s.action(a,{type:'buy',upgrade:id}));assert.ok(s.action(a,{type:'set-passive',upgrade:id,active:true}));}
 assert.equal(s.action(b,{type:'set-passive',upgrade:'hideSense',active:true,purchases:['hideSense']}),false);
 a.panicLeft=99;a.searchVeilLeft=99;
 for(const p of [a,b]){Object.assign(p,{x:9,y:2.5});assert.ok(s.action(p,{type:'board'}));}for(let i=0;i<61;i++)s.tick(.05);
 assert.equal(a.panicSprint,true);assert.equal(a.hideSense,true);assert.equal(a.searchVeil,true);assert.equal(a.panicLeft,0);assert.equal(a.searchVeilLeft,0);assert.equal(b.hideSense,false);
 assert.equal(s.action(a,{type:'set-passive',upgrade:'hideSense',active:false}),false);
 const own=s.snapshot(a).players.find(p=>p.id===a.id);assert.equal(own.hideSense,true);assert.equal(own.panicLeft,0);
});
