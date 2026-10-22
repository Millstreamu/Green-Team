import test from 'node:test';
import assert from 'node:assert/strict';
import {equipPotion,drinkPotion,breakDisguise} from '../src/potions.js';
import {createPlacement} from '../src/traps.js';
import {createVitality,tickVitality,hurtPlayer} from '../src/guard.js';
import {createSearchSession,beginSearch,cancelSearch,updateSearch,applyLuckyFind,searchGoldChance,luckySearchChance,createSearchables} from '../src/search.js';
import {createCamp,craftForSack,bankEscape,loadCamp,saveCamp} from '../src/lair.js';
import {createProfile,buyPersonalUpgrade,saveProfile,loadProfile} from '../src/profile.js';
import {restoreSave} from '../server/save-store.js';
import {generateDungeon} from '../src/world.js';
import {dungeonConfig,GENERATOR_PRESETS} from '../src/generator-settings.js';
import {selectJob} from '../src/jobs.js';
import {createDungeonSession} from '../server/dungeon-session.js';
import {autoPickup} from '../src/loot.js';
const arena=()=>({width:16,height:12,tiles:new Uint8Array(192).fill(1),rooms:[{x:1,y:1,w:12,h:9,cx:6,cy:5}],spawn:{x:2.5,y:5.5},seed:42});
const actor=()=>({...createVitality(),id:'a',x:2.5,y:5.5,facing:1,connected:true,inRun:true});
const bottle=(id='luck')=>({id,type:'lucky',x:0,y:0,rotation:0});
const object=()=>({id:'search',type:'crate',x:3.5,y:5.5,approach:{x:2.5,y:5.5},depth:0,contents:[],searched:false});
function winningSeed(o=object()) {for(let seed=0;seed<1000;seed++){if(applyLuckyFind({...arena(),seed},{lucky:true},structuredClone(o)))return seed;}assert.fail('No luck fixture');}

test('Lucky exact-copy drink does not stack; run effect survives time, damage, concealment and downing',()=>{
 const p=actor(),aim=createPlacement(),loot={bag:[bottle(),{...bottle('spare'),x:1},{id:'v',type:'vanish',x:2,y:0,rotation:0}],held:null};
 assert.equal(drinkPotion(loot,p),false);assert.ok(equipPotion(aim,loot,p,'luck'));assert.equal(drinkPotion(loot,p,'spare'),false);
 p.vanishLeft=8;assert.ok(drinkPotion(loot,p));assert.equal(p.lucky,true);assert.equal(p.vanishLeft,0);assert.equal(loot.bag.length,2);
 assert.equal(drinkPotion(loot,p,'luck'),false);assert.ok(equipPotion(aim,loot,p,'spare'));assert.equal(drinkPotion(loot,p),false);assert.equal(loot.bag.length,2);
 tickVitality(p,1000);assert.ok(hurtPlayer(p));breakDisguise(p);assert.equal(p.lucky,true);
 assert.ok(equipPotion(aim,loot,p,'v'));assert.ok(drinkPotion(loot,p));assert.equal(p.vanishLeft,8);assert.equal(p.lucky,true);
 p.invulnerable=0;hurtPlayer(p,99);tickVitality(p,10);assert.equal(p.lucky,true);assert.equal(createVitality().lucky,false);
 const q=actor();q.hiding={};assert.equal(equipPotion(aim,{bag:[bottle()],held:null},q,'luck'),false);
});

test('Lucky means five percentage points on each container gold probability, including Hard and treasure',()=>{
 const w=arena();w.tuning={loot:{nearEmptyChance:0,farEmptyChance:0,nearMaterialChance:0,farMaterialChance:0,nearRareChance:0,farRareChance:0,twoItemChance:0}};
 const o=object();assert.equal(searchGoldChance(w,o),.25);assert.ok(Math.abs(luckySearchChance(w,o)-.05/.75)<1e-12);
 for(const id of ['manor','hold','sanctuary'])for(const difficulty of ['normal','hard'])for(const type of ['crate','cupboard','chest'])for(const depth of [0,.5,1]){
  const world={...arena(),job:selectJob(id,difficulty)},o={...object(),type,depth},base=searchGoldChance(world,o);
  assert.ok(Math.abs((1-base)*luckySearchChance(world,o)-.05)<1e-12);
 }
 const treasure={...object(),treasure:true};assert.equal(searchGoldChance(w,treasure),0);assert.equal(luckySearchChance(w,treasure),.05);
});

test('generated searches gain about five percentage points without replacing loot or changing ordinary results',()=>{
 let count=0,extra=0;
 for(const id of ['manor','hold','sanctuary'])for(let seed=0;seed<40;seed++){
  const w=generateDungeon(seed,dungeonConfig(GENERATOR_PRESETS[id]));w.job=selectJob(id,seed%2?'hard':'normal');
  for(const o of createSearchables(w)){
   count++;const normal=structuredClone(o),lucky=structuredClone(o),before=[...o.contents];
   assert.equal(applyLuckyFind(w,{lucky:false},normal),false);assert.deepEqual(normal,o);
   if(applyLuckyFind(w,{lucky:true},lucky)){extra++;assert.deepEqual(lucky.contents,[...before,'coin']);assert.ok(!before.includes('coin'));}
   else assert.deepEqual(lucky.contents,before);
   assert.equal(applyLuckyFind(w,{lucky:true},lucky),false);
  }
 }
 assert.ok(count>1500);assert.ok(Math.abs(extra/count-.05)<.02,`${extra}/${count} extra coin-bearing searches`);
});

test('completed lucky searches preserve keys/prizes, spill normal Hard-priced gold and cannot reroll after cancellation',()=>{
 const w=arena(),o={...object(),contents:['treasureKey','ruby'],treasure:true};w.seed=winningSeed(o);w.treasure={keyId:'key'};w.job={goldMultiplier:1.5};
 const p=actor(),loot={bag:[],held:null,ground:[]},s=createSearchSession();p.lucky=true;
 assert.ok(beginSearch(s,w,p,loot,o));updateSearch(s,w,p,loot,true,.1);cancelSearch(s);assert.deepEqual(o.contents,['treasureKey','ruby']);assert.equal(o.luckyResolved,undefined);
 assert.ok(beginSearch(s,w,p,loot,o));const e=updateSearch(s,w,p,loot,true,10);assert.equal(e.type,'completed');assert.equal(e.count,3);assert.deepEqual(o.contents,['treasureKey','ruby','coin']);
 assert.equal(loot.ground.find(i=>i.type==='treasureKey').keyId,'key');const coin=loot.ground.find(i=>i.type==='coin');assert.equal(coin.saleMultiplier,1.5);
 assert.equal(beginSearch(s,w,p,loot,o),false);assert.equal(loot.ground.length,3);
 assert.ok(autoPickup(loot,coin.id));const camp=createCamp();const result={outcome:'escaped'};assert.ok(bankEscape(camp,result,loot));assert.equal(camp.counts.gold,5);assert.equal(bankEscape(camp,result,loot),false);
});

test('authority uses actual searcher luck, rejects forged bonus and contested/repeated searches',()=>{
 const a={...actor(),profile:createProfile('a'),bag:[]},b={...actor(),id:'b',profile:createProfile('b'),bag:[]};
 const d=createDungeonSession({id:'luck',seed:42,job:selectJob('manor','normal')},[a,b],createCamp());
  d.ground.length = 0; // Isolate this transaction/combat fixture from generated surface finds.
 const target=d.objects.find(o=>!o.treasure);target.contents=['scrap'];d.world.seed=winningSeed(target);
 for(const g of d.danger.guards){g.sleepLeft=100;g.state='sleep';}
 Object.assign(a,target.approach);Object.assign(b,target.approach);b.lucky=true;
 assert.ok(d.action(a,{type:'search',id:target.id,lucky:true,bonus:1}));assert.equal(d.action(b,{type:'search',id:target.id}),false);
 for(let i=0;i<50;i++){a.inputAge=0;a.searchHeld=true;d.tick(.1);}
 assert.equal(target.searched,true);assert.deepEqual(target.contents,['scrap']);assert.equal(d.action(b,{type:'search',id:target.id}),false);
 // A fresh container searched by the lucky goblin pays the fixed bonus once.
 const next=d.objects.find(o=>o!==target&&!o.treasure);next.contents=['cloth'];d.world.seed=winningSeed(next);Object.assign(b,next.approach);
 assert.ok(d.action(b,{type:'search',id:next.id}));
 for(let i=0;i<50;i++){b.inputAge=0;b.searchHeld=true;d.tick(.1);}
 assert.deepEqual(next.contents,['cloth','coin']);assert.equal(d.snapshot().ground.filter(i=>i.id.startsWith(next.id)).length,2);
 assert.equal(d.action(a,{type:'search',id:next.id}),false);
});

test('Lucky brew/XP/stash save conservation, debug stock and old-save zero defaults',()=>{
 const c=createCamp(),p=createProfile(),loot={bag:[],held:null};c.counts.berries=1;c.counts.scrap=1;p.xp=p.earnedXp=50;
 assert.ok(buyPersonalUpgrade(p,'lucky'));assert.equal(craftForSack(c,loot,'lucky',p),null);assert.equal(c.counts.berries,1);
 c.buildings.potion=true;assert.ok(craftForSack(c,loot,'lucky',p));assert.equal(c.counts.berries,0);assert.equal(c.counts.scrap,0);assert.equal(p.xp,0);
 bankEscape(c,{outcome:'escaped'},loot);assert.equal(c.counts.lucky,1);bankEscape(c,{outcome:'escaped'},{bag:[{...bottle(),debugSupply:true}]});assert.equal(c.counts.lucky,1);
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};saveCamp(c,storage);saveProfile(p,storage);
 assert.equal(loadCamp(storage).counts.lucky,1);assert.ok(loadProfile(storage).purchases.includes('lucky'));
 const old={version:1,camp:structuredClone(c),players:[]};delete old.camp.counts.lucky;assert.equal(restoreSave(old).camp.counts.lucky,0);assert.equal(restoreSave(old).camp.counts.gold,c.counts.gold);
});

test('two sockets agree on Lucky effect and reject replay or forged duration without spending a spare', async t => {
  const { once } = await import('node:events'), { default: WebSocket } = await import('ws');
  const { createGameServer } = await import('../server/index.js'), { createLairSession } = await import('../server/lair-session.js');
  const { generateDungeon, setSolidObjects } = await import('../src/world.js');
  const { applyTreasureState } = await import('../src/treasure.js');
  const session = createLairSession(), actors = [session.connect(), session.connect()];
  for (const p of actors) { session.disconnect(p); p.x = 9; p.y = 2.5; }
  const { server, wss } = createGameServer({ session }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`, clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); wss.close(); await new Promise(resolve => server.close(resolve)); });
  async function until(fn) { for (let i = 0; i < 200; i++) { if (fn()) return; await new Promise(r => setTimeout(r, 10)); } assert.fail('Potion state did not arrive'); }
  for (const p of actors) {
    const ws = new WebSocket(origin.replace('http:', 'ws:') + '/session', { origin }), c = { ws, state: null, messages: [] }; clients.push(c);
    ws.on('message', bytes => { const m = JSON.parse(bytes); c.messages.push(m); if (m.type === 'state') c.state = m; });
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', token: p.token })); await until(() => c.state);
  }
  const [a, b] = clients, p = actors[0], send = m => a.ws.send(JSON.stringify(m));
  send({ type: 'debug-pack', item: 'lucky' }); send({ type: 'debug-pack', item: 'lucky' }); await until(() => a.state.bag.length === 2);
  const id = a.state.bag[0].id;
  for (const actor of actors) session.action(actor, { type: 'board' }); for (let i = 0; i < 31; i++) session.tick(.1);
  await until(() => a.state.dungeon && b.state.dungeon);
  send({type:'equip',id});await until(()=>a.state.potionId===id);
  send({type:'drink-potion',id,seconds:999,feedbackId:'drink'});send({type:'drink-potion',id,feedbackId:'repeat'});
  await until(()=>clients.every(c=>c.state.players.find(x=>x.id===p.id).lucky===true));
  await until(()=>a.messages.some(m=>m.feedbackId==='repeat'));
  assert.equal(a.state.bag.length,1);assert.equal(b.state.bag.length,0);
  assert.equal(a.messages.find(m=>m.feedbackId==='drink').ok,true);assert.equal(a.messages.find(m=>m.feedbackId==='repeat').ok,false);
  for(const c of clients){const own=c.state.players.find(x=>x.id===p.id);assert.ok(own.lucky===true && own.vanishLeft<=8);}
  session.tick(1);assert.equal(p.lucky,true);assert.equal(actors[1].lucky,false);
});
