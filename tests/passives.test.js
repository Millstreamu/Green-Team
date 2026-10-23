import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,buyPersonalUpgrade,setPassiveActive,activePassives,passiveEffects,saveProfile,loadProfile,PROFILE_SAVE_KEY,validActivePassives} from '../src/profile.js';
import {createLairSession} from '../server/lair-session.js';
import {restoreSave} from '../server/save-store.js';
import {createCamp} from '../src/lair.js';
import {generateDungeon,canStand} from '../src/world.js';
import {createSearchables,createSearchSession,beginSearch,cancelSearch,luckySearchChance,applyLuckyFind} from '../src/search.js';
import {breakDisguise} from '../src/potions.js';

test('passives unlock separately from activation, persist personally, migrate old Quick Fingers and reject invalid saves',()=>{
 const p=createProfile('one'),other=createProfile('two');p.xp=500;
 assert.equal(setPassiveActive(p,'quietHands',true),false);
 for(const id of ['quickSearch','quietHands','luckyGoblin']){assert.ok(buyPersonalUpgrade(p,id));assert.equal(activePassives(p).length,0);}
 for(const id of ['quickSearch','quietHands','luckyGoblin'])assert.ok(setPassiveActive(p,id,true));
 assert.deepEqual(passiveEffects(p),{searchRate:1.1,quietHands:true,passiveLuck:true,panicSprint:false,hideSense:false,searchVeil:false,hidingAnchor:false,shadowStillness:false,extraHeart:false,haggler:false,treasureBearing:false,crateTrap:false,sackSacrifice:false});assert.equal(activePassives(p).length,3);
 assert.equal(setPassiveActive(p,'quietHands',true),false);assert.equal(setPassiveActive(p,'smoke',true),false);assert.equal(setPassiveActive(p,'quietHands',1),false);
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};assert.ok(saveProfile(p,storage));assert.deepEqual(loadProfile(storage),p);
 assert.ok(setPassiveActive(p,'quietHands',false));assert.equal(passiveEffects(p).quietHands,false);assert.equal(activePassives(other).length,0);
 const old={version:2,id:'legacy',xp:0,earnedXp:30,purchases:['quickSearch']};map.set(PROFILE_SAVE_KEY,JSON.stringify(old));assert.deepEqual(loadProfile(storage).activePassives,['quickSearch']);
 const saved={version:1,camp:createCamp(),players:[{token:'token',id:'legacy',name:'Goblin',bag:[],interrupted:false,profile:{...old,id:'legacy'}}]};
 assert.deepEqual(restoreSave(saved).players[0].profile.activePassives,['quickSearch']);
 saved.players[0].profile.activePassives=['quietHands'];assert.throws(()=>restoreSave(saved));
 for(const ids of [['quickSearch','quickSearch'],['unknown'],['quickSearch','quietHands','luckyGoblin','extra']])assert.equal(validActivePassives({...p,activePassives:ids}),false);
});

test('Quiet Hands preserves only active Vanish on valid searches; normal searching, expiry and gear interruption retain their rules',()=>{
 const world=generateDungeon(42),objects=createSearchables(world),object=objects[0],session=createSearchSession();
 const player={state:'active',x:object.x,y:object.y,quietHands:true,vanishLeft:5,disguiseLeft:0};
 outer:for(let y=-1;y<=1;y+=.25)for(let x=-1;x<=1;x+=.25)if(canStand(world,object.x+x,object.y+y,.26)){player.x=object.x+x;player.y=object.y+y;break outer;}
 assert.ok(beginSearch(session,world,player,{held:null},object));assert.equal(player.vanishLeft,5);cancelSearch(session);
 player.quietHands=false;player.vanishLeft=5;assert.ok(beginSearch(session,world,player,{held:null},object));assert.equal(player.vanishLeft,0);cancelSearch(session);
 player.quietHands=true;player.disguiseLeft=5;assert.ok(beginSearch(session,world,player,{held:null},object));assert.equal(player.disguiseLeft,0);
 player.vanishLeft=4;breakDisguise(player);assert.equal(player.vanishLeft,0,'gear/hits still use the unchanged break path');
});

test('Lucky Goblin and potion add probability points without extra original rolls or duplicate coin rewards',()=>{
 const world=generateDungeon(55),object=createSearchables(world)[0];
 assert.equal(luckySearchChance(world,object,.10),Math.min(1,luckySearchChance(world,object,.05)*2));
 let passive=0,both=0;
 for(let i=0;i<2000;i++){
  const a={...object,id:'passive-'+i,contents:[]},b={...a,contents:[]};
  if(applyLuckyFind(world,{passiveLuck:true},a))passive++;
  if(applyLuckyFind(world,{passiveLuck:true,lucky:true},b))both++;
  assert.ok(b.contents.length<=1);const count=b.contents.length;applyLuckyFind(world,{passiveLuck:true,lucky:true},b);assert.equal(b.contents.length,count);
 }
 assert.ok(passive>0&&both>passive);assert.equal(applyLuckyFind(world,{passiveLuck:false},{...object,contents:[]}),false);
});

test('campfire authority validates personal unlocks and desired activation state, rejects remote/run changes, and derives effects at launch',()=>{
 const s=createLairSession(),a=s.connect(),b=s.connect();a.profile.xp=500;
 assert.equal(s.action(a,{type:'buy',upgrade:'quietHands'}),false);
 Object.assign(a,{x:9,y:11.5});
 for(const id of ['quickSearch','quietHands','luckyGoblin']){
  assert.ok(s.action(a,{type:'buy',upgrade:id}));assert.equal(s.action(a,{type:'buy',upgrade:id}),false);
  assert.ok(s.action(a,{type:'set-passive',upgrade:id,active:true}));assert.equal(s.action(a,{type:'set-passive',upgrade:id,active:true}),false);
 }
 assert.equal(s.action(a,{type:'set-passive',upgrade:'quietHands',active:'yes'}),false);
 assert.equal(s.action(b,{type:'set-passive',upgrade:'quietHands',active:true}),false);assert.deepEqual(b.profile.activePassives,[]);
 assert.equal(s.action(a,{type:'craft',item:'lunch'}),false,'lunch is no longer a campfire recipe');
 for(const p of [a,b]){Object.assign(p,{x:9,y:2.5});assert.ok(s.action(p,{type:'board'}));}
 for(let i=0;i<61;i++)s.tick(.05);
 assert.equal(a.quietHands,true);assert.equal(a.passiveLuck,true);assert.equal(a.searchRate,1.1);assert.equal(b.quietHands,false);assert.equal(b.passiveLuck,false);
 assert.equal(s.action(a,{type:'set-passive',upgrade:'quietHands',active:false}),false);
 assert.deepEqual(s.snapshot(a).profile.activePassives,['quickSearch','quietHands','luckyGoblin']);
});

test('two actual sockets receive separate passive ownership and confirmed activation, rejecting replay and forged unlock',async t=>{
 const {once}=await import('node:events');const {WebSocket}=await import('ws');const {createGameServer}=await import('../server/index.js');
 const session=createLairSession(),actors=[session.connect(),session.connect()];
 for(const p of actors){session.disconnect(p);p.x=9;p.y=11.5;p.profile.xp=200;}
 const {server,wss}=createGameServer({session});server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin=`http://127.0.0.1:${server.address().port}`,clients=[];
 t.after(async()=>{for(const c of clients)c.ws.terminate();wss.close();await new Promise(r=>server.close(r));});
 const until=async fn=>{for(let n=0;n<200;n++){if(fn())return;await new Promise(r=>setTimeout(r,10));}assert.fail('Passive state did not arrive');};
 for(const actor of actors){
  const c={ws:new WebSocket(origin.replace('http:','ws:')+'/session',{origin}),messages:[],state:null};clients.push(c);
  c.ws.on('message',bytes=>{const m=JSON.parse(bytes);c.messages.push(m);if(m.type==='state')c.state=m;});
  await once(c.ws,'open');c.ws.send(JSON.stringify({type:'hello',token:actor.token}));await until(()=>c.state);
 }
 const send=async(c,message,id)=>{c.ws.send(JSON.stringify({...message,feedbackId:id}));await until(()=>c.messages.some(m=>m.feedbackId===id));return c.messages.find(m=>m.feedbackId===id).ok;};
 assert.equal(await send(clients[0],{type:'buy',upgrade:'quietHands'},'unlock'),true);
 assert.equal(await send(clients[0],{type:'set-passive',upgrade:'quietHands',active:true},'activate'),true);
 await until(()=>clients[0].state.profile.activePassives.includes('quietHands'));
 assert.equal(await send(clients[0],{type:'set-passive',upgrade:'quietHands',active:true},'replay'),false);
 assert.equal(await send(clients[1],{type:'set-passive',upgrade:'quietHands',active:true,purchases:['quietHands']},'forged'),false);
 assert.deepEqual(clients[1].state.profile.activePassives,[]);assert.equal(actors[0].profile.xp,125);assert.equal(actors[1].profile.xp,200);
 assert.equal(await send(clients[0],{type:'set-passive',upgrade:'quietHands',active:false},'deactivate'),true);
 await until(()=>clients[0].state.profile.activePassives.length===0);assert.equal(actors[0].profile.xp,125);
});
