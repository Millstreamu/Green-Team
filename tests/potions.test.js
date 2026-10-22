import test from 'node:test';
import assert from 'node:assert/strict';
import { equipDisguise, drinkDisguise } from '../src/potions.js';
import { equipSnare, updatePlacement, placementPoint } from '../src/traps.js';
import { createPlacement } from '../src/traps.js';
import { createVitality, tickVitality, createGuard, seesPlayer, updateGuard, hurtPlayer } from '../src/guard.js';
import { updateTeamGuard } from '../server/team-guards.js';
import { beginSearch, createSearchSession } from '../src/search.js';
import { useSmoke } from '../src/smoke.js';
import { equipDart, beginDartAim, fireDart } from '../src/darts.js';
import { equipBell, beginBellAim, throwBell } from '../src/bells.js';
import { createCamp, craftForSack, bankEscape } from '../src/lair.js';
import { createProfile, buyPersonalUpgrade } from '../src/profile.js';
import { restoreSave } from '../server/save-store.js';
const arena=()=>({width:16,height:12,tiles:new Uint8Array(192).fill(1),rooms:[{x:1,y:1,w:12,h:9,cx:6,cy:5}],spawn:{x:2.5,y:5.5},seed:42});
const actor=()=>({...createVitality(),id:'a',x:2.5,y:5.5,facing:1,connected:true,inRun:true});
const bottle=(id='potion')=>({id,type:'disguise',x:0,y:0,rotation:0});

test('equip then drink reserves and consumes only selected bottle, rejects replay/foreign/down/hidden/held states',()=>{
 const p=actor(),loot={bag:[bottle(),{...bottle('spare'),x:1}],held:null},aim=createPlacement();
 assert.equal(drinkDisguise(loot,p,'potion'),false);assert.ok(equipDisguise(aim,loot,p,'potion'));assert.equal(aim.itemId,null);
 assert.equal(drinkDisguise(loot,p,'spare'),false);assert.ok(drinkDisguise(loot,p));assert.equal(p.disguiseLeft,10);assert.equal(p.potionId,null);assert.equal(loot.bag.length,1);
 assert.equal(drinkDisguise(loot,p,'potion'),false);assert.ok(equipDisguise(aim,loot,p,'spare'));assert.equal(drinkDisguise(loot,p),false,'active disguise cannot refresh or spend another');
 assert.equal(loot.bag.length,1);
 for(const patch of [{state:'down'},{hiding:{spot:{id:'x'}}}]){const q={...actor(),...patch};assert.equal(equipDisguise(createPlacement(),loot,q,'spare'),false);}
 loot.held={id:'held'};assert.equal(drinkDisguise(loot,p),false);
});

test('ten seconds expire through shared vitality ticks, death clears effect and immunity is unchanged',()=>{
 const p=actor();p.disguiseLeft=10;tickVitality(p,3);assert.equal(p.disguiseLeft,7);tickVitality(p,7);assert.equal(p.disguiseLeft,0);
 p.disguiseLeft=10;p.health=1;assert.ok(hurtPlayer(p));assert.equal(p.state,'down');assert.equal(p.disguiseLeft,0);
});

test('guard disguise suppresses far sight and trail learning while close, smoke, walls and expiry use normal sight rules',()=>{
 const w=arena(),p=actor(),g=createGuard(w,{roomIndex:0});Object.assign(g,{x:5.5,y:5.5,angle:Math.PI,state:'chase',lastSeen:{...p},trailSource:{...p},trailLeft:3});
 p.disguiseLeft=10;assert.equal(seesPlayer(w,g,p,true),false);const last={...g.lastSeen};p.y+=.4;updateGuard(w,g,p,.1);assert.deepEqual(g.lastSeen,last);assert.ok(g.trail.every(point=>point.y!==p.y));
 p.x=g.x-.9;p.y=g.y;assert.equal(seesPlayer(w,g,p,true),true);
 assert.equal(seesPlayer(w,g,p,true,[{x:p.x,y:p.y,radius:1,left:1}]),false);
 p.x=g.x-1.01;assert.equal(seesPlayer(w,g,p,true),false);p.disguiseLeft=0;assert.equal(seesPlayer(w,g,p,true),true);
 p.disguiseLeft=10;p.x=g.x-.9;w.lockedTiles=new Uint8Array(192);w.lockedTiles[5*16+4]=1;assert.equal(seesPlayer(w,g,p,true),false);
});

test('team guards still spot undisguised teammate and switch to recognised close disguised player',()=>{
 const w=arena(),p=actor(),q={...actor(),id:'b',x:4,y:5.5},g=createGuard(w,{roomIndex:0});Object.assign(g,{x:6.5,y:5.5,angle:Math.PI,state:'chase',targetId:'a'});p.disguiseLeft=10;
 updateTeamGuard(w,g,[p,q],.05,[],0);assert.equal(g.targetId,'b');
 q.hiding={spot:{id:'x'}};p.x=g.x-.8;updateTeamGuard(w,g,[p,q],.05,[],0);assert.equal(g.targetId,'a');
});

test('real searches and successful gear use break disguise; invalid attempts and aiming preserve it',()=>{
 const w=arena(),p=actor(),loot={bag:[],held:null};p.disguiseLeft=10;
 const session=createSearchSession(),object={id:'crate',type:'crate',x:3.5,y:5.5,searched:false};
 assert.equal(beginSearch(session,w,p,loot,{...object,x:15}),false);assert.equal(p.disguiseLeft,10);assert.ok(beginSearch(session,w,p,loot,object));assert.equal(p.disguiseLeft,0);
 for(const type of ['smoke','dart','bell']){
   p.disguiseLeft=10;loot.bag=[{id:type,type,x:0,y:0,rotation:0}];const aim=createPlacement();
   if(type==='smoke'){assert.ok(useSmoke(loot,p,[]));}
   if(type==='dart'){assert.ok(equipDart(aim,loot,p,type));assert.ok(beginDartAim(aim,loot,p));assert.equal(p.disguiseLeft,10);assert.ok(fireDart(w,p,loot,aim,[],type));}
   if(type==='bell'){assert.ok(equipBell(aim,loot,p,type));assert.ok(beginBellAim(aim,loot,p));aim.aimPoint={x:3.5,y:5.5};assert.equal(p.disguiseLeft,10);assert.ok(throwBell(w,p,loot,aim,[],type));}
   assert.equal(p.disguiseLeft,0,type);
 }
});

test('placing a snare and spending a Packed Lunch also break disguise',async()=>{
 const w=arena(),p=actor(),loot={bag:[{id:'snare',type:'snare',x:0,y:0,rotation:0}],held:null},aim=createPlacement();p.disguiseLeft=10;
 assert.ok(equipSnare(aim,loot,'snare'));const point=placementPoint(p);updatePlacement(aim,w,p,loot,[],[],point,false,.1);
 assert.ok(updatePlacement(aim,w,p,loot,[],[],point,true,1.1));assert.equal(p.disguiseLeft,0);
 const {createDungeonSession}=await import('../server/dungeon-session.js');const {selectJob}=await import('../src/jobs.js');
 const a={id:'a',connected:true,bag:[{id:'lunch',type:'lunch',x:0,y:0,rotation:0}],profile:createProfile('a')},b={id:'b',connected:true,bag:[],profile:createProfile('b')};
 const d=createDungeonSession({id:'potion-lunch',seed:42,job:selectJob('manor','normal')},[a,b],createCamp());
 Object.assign(b,{x:a.x,y:a.y,state:'down',health:0});a.disguiseLeft=10;
 assert.ok(d.action(a,{type:'rescue',id:'b'}));
 for(let i=0;i<30;i++){a.searchHeld=true;a.inputAge=0;d.tick(.1);}
 assert.equal(b.state,'active');assert.equal(a.disguiseLeft,0);assert.equal(a.bag.length,0);
});

test('potion recipe, debug banking and legacy saves preserve progression without free stock',()=>{
 const camp=createCamp(),p=createProfile(),loot={bag:[],held:null};p.xp=p.earnedXp=50;camp.buildings.potion=true;camp.counts.mushroom=1;camp.counts.berries=1;
 assert.equal(craftForSack(camp,loot,'disguise',p),null);assert.ok(buyPersonalUpgrade(p,'disguise'));assert.ok(craftForSack(camp,loot,'disguise',p));assert.equal(loot.bag[0].type,'disguise');assert.equal(camp.counts.mushroom,0);assert.equal(camp.counts.berries,0);
 const old={version:1,camp:createCamp(),players:[]};delete old.camp.counts.disguise;assert.equal(restoreSave(old).camp.counts.disguise,0);assert.equal(Object.hasOwn(old.camp.counts,'disguise'),false);
 bankEscape(camp,{outcome:'escaped'},{bag:[{...bottle(),debugSupply:true}]});assert.equal(camp.counts.disguise,0);
});

test('two sockets agree on disguise duration and reject replay or forged duration without spending a spare', async t => {
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
  send({ type: 'debug-pack', item: 'disguise' }); send({ type: 'debug-pack', item: 'disguise' }); await until(() => a.state.bag.length === 2);
  const id = a.state.bag[0].id;
  for (const actor of actors) session.action(actor, { type: 'board' }); for (let i = 0; i < 31; i++) session.tick(.1);
  await until(() => a.state.dungeon && b.state.dungeon);
  send({type:'equip',id});await until(()=>a.state.potionId===id);
  send({type:'drink-disguise',id,seconds:999,feedbackId:'drink'});send({type:'drink-disguise',id,feedbackId:'repeat'});
  await until(()=>clients.every(c=>c.state.players.find(x=>x.id===p.id).disguiseLeft>0));
  await until(()=>a.messages.some(m=>m.feedbackId==='repeat'));
  assert.equal(a.state.bag.length,1);assert.equal(b.state.bag.length,0);
  assert.equal(a.messages.find(m=>m.feedbackId==='drink').ok,true);assert.equal(a.messages.find(m=>m.feedbackId==='repeat').ok,false);
  for(const c of clients){const own=c.state.players.find(x=>x.id===p.id);assert.ok(own.disguiseLeft>0 && own.disguiseLeft<=10);}
  session.tick(1);await until(()=>a.state.players.find(x=>x.id===p.id).disguiseLeft<9.5);
});
