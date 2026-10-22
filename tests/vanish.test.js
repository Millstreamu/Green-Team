import test from 'node:test';
import assert from 'node:assert/strict';
import {equipPotion,drinkPotion,drinkDisguise} from '../src/potions.js';
import {createPlacement} from '../src/traps.js';
import {createVitality,tickVitality,createGuard,seesPlayer,updateGuard,hurtPlayer,strikePlayer} from '../src/guard.js';
import {updateTeamGuard} from '../server/team-guards.js';
import {beginSearch,createSearchSession} from '../src/search.js';
import {useSmoke} from '../src/smoke.js';
import {equipDart,beginDartAim} from '../src/darts.js';
import {createCamp,craftForSack,bankEscape,loadCamp,saveCamp} from '../src/lair.js';
import {createProfile,buyPersonalUpgrade,saveProfile,loadProfile} from '../src/profile.js';
import {restoreSave} from '../server/save-store.js';
const arena=()=>({width:16,height:12,tiles:new Uint8Array(192).fill(1),rooms:[{x:1,y:1,w:12,h:9,cx:6,cy:5}],spawn:{x:2.5,y:5.5},seed:42});
const actor=()=>({...createVitality(),id:'a',x:2.5,y:5.5,facing:1,connected:true,inRun:true});
const bottle=(id='v')=>({id,type:'vanish',x:0,y:0,rotation:0});

test('Vanish consumes the exact readied bottle once; cannot refresh, stack, forge or drink while unavailable',()=>{
 const p=actor(),loot={bag:[bottle(),{...bottle('spare'),x:1},{id:'d',type:'disguise',x:2,y:0,rotation:0}],held:null},aim=createPlacement();
 assert.equal(drinkPotion(loot,p,'v'),false);assert.ok(equipPotion(aim,loot,p,'v'));assert.equal(drinkDisguise(loot,p,'v'),false);
 assert.equal(drinkPotion(loot,p,'spare'),false);assert.ok(drinkPotion(loot,p));assert.equal(p.vanishLeft,8);assert.equal(loot.bag.length,2);
 assert.equal(drinkPotion(loot,p,'v'),false);assert.ok(equipPotion(aim,loot,p,'spare'));assert.equal(drinkPotion(loot,p),false);
 assert.ok(equipPotion(aim,loot,p,'d'));assert.equal(drinkPotion(loot,p),false);assert.equal(loot.bag.length,2);
 p.vanishLeft=0;p.disguiseLeft=10;assert.ok(equipPotion(aim,loot,p,'spare'));assert.equal(drinkPotion(loot,p),false);
 p.disguiseLeft=0;p.hiding={};assert.equal(drinkPotion(loot,p),false);p.hiding=null;loot.held=bottle('held');assert.equal(drinkPotion(loot,p),false);
 loot.held=null;p.state='down';assert.equal(drinkPotion(loot,p),false);assert.equal(equipPotion(aim,loot,p,'spare'),false);
});

test('Vanish blocks close and distant sight and new tracking, expires normally, and does not erase previous searches',()=>{
 const w=arena(),p=actor(),g=createGuard(w,{roomIndex:0});Object.assign(g,{x:3,y:5.5,angle:Math.PI,state:'chase',targetId:'a',lastSeen:{x:2.5,y:5.5},trail:[{x:2.5,y:5.5}],trailLeft:3,trailSource:{x:2.5,y:5.5}});
 assert.ok(seesPlayer(w,g,p,true));p.vanishLeft=8;assert.equal(seesPlayer(w,g,p,true),false);
 const last={...g.lastSeen};p.y+=.2;updateGuard(w,g,p,.1);assert.deepEqual(g.lastSeen,last);assert.ok(g.trail.every(t=>t.y!==p.y));
 const q={...actor(),id:'b',x:2,y:5.5};updateTeamGuard(w,g,[p,q],.01);assert.equal(g.targetId,'b');
 tickVitality(p,3);assert.equal(p.vanishLeft,5);tickVitality(p,5);assert.equal(p.vanishLeft,0);assert.ok(seesPlayer(w,g,p,true));
 p.vanishLeft=8;p.state='down';tickVitality(p,.01);assert.equal(p.vanishLeft,0);
});

test('committed strikes still damage and end Vanish; rejected damage does not remove it',()=>{
 const p=actor(),w=arena(),g=createGuard(w,{roomIndex:0});Object.assign(g,{x:3,y:5.5,angle:Math.PI,attackAngle:Math.PI});p.vanishLeft=8;
 assert.ok(strikePlayer(w,g,p));assert.equal(p.health,2);assert.equal(p.vanishLeft,0);
 p.vanishLeft=8;assert.equal(hurtPlayer(p),false);assert.equal(p.vanishLeft,8);p.invulnerable=0;assert.ok(hurtPlayer(p,2));assert.equal(p.state,'down');assert.equal(p.vanishLeft,0);
});

test('valid searching and gear use end Vanish; failed searches and equipping/aiming preserve it',()=>{
 const p=actor(),w=arena(),loot={bag:[],held:null},aim=createPlacement(),search=createSearchSession();p.vanishLeft=8;
 const o={id:'crate',type:'crate',x:3.5,y:5.5,contents:[]};
 assert.equal(beginSearch(search,w,p,loot,{...o,x:15}),false);assert.equal(p.vanishLeft,8);assert.ok(beginSearch(search,w,p,loot,o));assert.equal(p.vanishLeft,0);
 p.vanishLeft=8;assert.equal(useSmoke(loot,p,[]),false);assert.equal(p.vanishLeft,8);
 loot.bag=[{id:'dart',type:'dart',x:0,y:0,rotation:0}];assert.ok(equipDart(aim,loot,p,'dart'));assert.ok(beginDartAim(aim,loot,p));assert.equal(p.vanishLeft,8);
 loot.bag=[{id:'smoke',type:'smoke',x:0,y:0,rotation:0}];assert.ok(useSmoke(loot,p,[]));assert.equal(p.vanishLeft,0);
});

test('Vanish brewing spends ingredients only at built station; saves preserve recipe and stock with old defaults',()=>{
 const camp=createCamp(),p=createProfile(),loot={bag:[],held:null};camp.counts.mushroom=2;camp.counts.cloth=1;p.xp=p.earnedXp=75;
 assert.ok(buyPersonalUpgrade(p,'vanish'));assert.equal(craftForSack(camp,loot,'vanish',p),null);assert.equal(camp.counts.mushroom,2);
 camp.buildings.potion=true;assert.ok(craftForSack(camp,loot,'vanish',p));assert.equal(camp.counts.mushroom,0);assert.equal(camp.counts.cloth,0);assert.equal(p.xp,0);
 assert.ok(bankEscape(camp,{outcome:'escaped'},loot));assert.equal(camp.counts.vanish,1);
 const values=new Map(),storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};saveCamp(camp,storage);saveProfile(p,storage);
 assert.equal(loadCamp(storage).counts.vanish,1);assert.ok(loadProfile(storage).purchases.includes('vanish'));
 const saved={version:1,camp,players:[]};delete saved.camp.counts.vanish;assert.equal(restoreSave(saved).camp.counts.vanish,0);
 bankEscape(camp,{outcome:'escaped'},{bag:[{...bottle(),debugSupply:true}]});assert.equal(camp.counts.vanish,undefined);
});

test('two sockets agree on Vanish duration and reject replay or forged duration without spending a spare', async t => {
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
  send({ type: 'debug-pack', item: 'vanish' }); send({ type: 'debug-pack', item: 'vanish' }); await until(() => a.state.bag.length === 2);
  const id = a.state.bag[0].id;
  for (const actor of actors) session.action(actor, { type: 'board' }); for (let i = 0; i < 31; i++) session.tick(.1);
  await until(() => a.state.dungeon && b.state.dungeon);
  send({type:'equip',id});await until(()=>a.state.potionId===id);
  send({type:'drink-potion',id,seconds:999,feedbackId:'drink'});send({type:'drink-potion',id,feedbackId:'repeat'});
  await until(()=>clients.every(c=>c.state.players.find(x=>x.id===p.id).vanishLeft>0));
  await until(()=>a.messages.some(m=>m.feedbackId==='repeat'));
  assert.equal(a.state.bag.length,1);assert.equal(b.state.bag.length,0);
  assert.equal(a.messages.find(m=>m.feedbackId==='drink').ok,true);assert.equal(a.messages.find(m=>m.feedbackId==='repeat').ok,false);
  for(const c of clients){const own=c.state.players.find(x=>x.id===p.id);assert.ok(own.vanishLeft>0 && own.vanishLeft<=8);}
  session.tick(1);await until(()=>a.state.players.find(x=>x.id===p.id).vanishLeft<7.5);
});
