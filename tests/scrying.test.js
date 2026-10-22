import test from 'node:test';
import assert from 'node:assert/strict';
import { equipOrb, useOrb, updateScrying, drawScrying } from '../src/scrying.js';
import { createPlacement } from '../src/traps.js';
import { createVitality } from '../src/guard.js';
import { createCamp, craftForSack, bankEscape } from '../src/lair.js';
import { createProfile, buyPersonalUpgrade } from '../src/profile.js';
import { restoreSave } from '../server/save-store.js';
const orb=(id='orb')=>({id,type:'orb',x:0,y:0,rotation:0});
const actor=()=>({...createVitality(),id:'a',x:2.5,y:3.5});
const guards=()=>[{id:'far',x:9,y:8},{id:'close',x:3,y:3.5,sleepLeft:8},{id:'two',x:4,y:3.5},{id:'three',x:2.5,y:5.5},{id:'bad',x:NaN,y:0}];
test('orb equip permits walking; activation spends exact copy, marks nearest three once and breaks disguise',()=>{
 const p=actor(),loot={bag:[orb(),{...orb('spare'),x:1}],held:null},aim=createPlacement(),pings=[],g=guards();p.disguiseLeft=10;
 assert.equal(useOrb(loot,p,g,pings,'orb'),false);assert.ok(equipOrb(aim,loot,p,'orb'));assert.equal(aim.itemId,null);
 assert.equal(useOrb(loot,p,g,pings,'spare'),false);assert.equal(p.disguiseLeft,10);assert.ok(useOrb(loot,p,g,pings));
 assert.equal(loot.bag.length,1);assert.equal(p.orbId,null);assert.equal(p.disguiseLeft,0);assert.equal(pings[0].left,5);
 assert.deepEqual(pings[0].marks.map(m=>m.guardId),['close','two','three']);
 assert.equal(useOrb(loot,p,g,pings,'orb'),false);assert.equal(pings.length,1);
 const copy=structuredClone(pings[0].marks);g[1].x=15;g.pop();assert.deepEqual(pings[0].marks,copy,'positions remain the activation snapshot');
});
test('fewer guards produce fewer marks, zero guards still spends; simultaneous effects expire independently',()=>{
 const p=actor(),aim=createPlacement(),loot={bag:[orb(),{...orb('second'),x:1}],held:null},pings=[];
 equipOrb(aim,loot,p,'orb');assert.ok(useOrb(loot,p,[guards()[0]],pings));assert.equal(pings[0].marks.length,1);
 updateScrying(pings,2);equipOrb(aim,loot,p,'second');assert.ok(useOrb(loot,p,[],pings));assert.equal(pings[1].marks.length,0);
 updateScrying(pings,3);assert.equal(pings.length,1);assert.equal(pings[0].id,'second');assert.equal(pings[0].left,2);
 updateScrying(pings,2);assert.equal(pings.length,0);
});
test('invalid ownership/state/held/hiding or removed item preserves copies and disguise',()=>{
 for(const patch of [{state:'down'},{hiding:{spot:{id:'barrel'}}}]){const p={...actor(),...patch},loot={bag:[orb()],held:null};assert.equal(equipOrb(createPlacement(),loot,p,'orb'),false);p.orbId='orb';assert.equal(useOrb(loot,p,guards(),[]),false);assert.equal(loot.bag.length,1);}
 const p=actor(),loot={bag:[orb()],held:null};equipOrb(createPlacement(),loot,p,'orb');p.disguiseLeft=7;loot.held={id:'x'};assert.equal(useOrb(loot,p,guards(),[]),false);assert.equal(p.disguiseLeft,7);
 loot.held=null;loot.bag=[];assert.equal(useOrb(loot,p,guards(),[]),false);
});
test('map draws static purple diamonds only while active and deduplicates overlapping marks',()=>{
 const calls=[],map=new Proxy({fill(){calls.push({fill:this.fillStyle,points:[...this.points]});},beginPath(){this.points=[];},moveTo(x,y){this.points.push([x,y]);},lineTo(x,y){this.points.push([x,y]);}}, {get:(o,k)=>o[k]??(()=>{})});
 const pings=[{left:5,marks:[{x:4.5,y:3.5},{x:4.8,y:3.7}]}];drawScrying(map,pings);assert.equal(calls.length,1);assert.equal(calls[0].fill,'#b86ae1');assert.deepEqual(calls[0].points[0],[9,4]);
 pings[0].left=0;drawScrying(map,pings);assert.equal(calls.length,1);
});
test('orb personal recipe, crafting, debug return and legacy zero stock retain existing progression',()=>{
 const camp=createCamp(),p=createProfile(),loot={bag:[],held:null};camp.counts.scrap=2;camp.counts.cloth=1;p.xp=p.earnedXp=75;
 assert.equal(craftForSack(camp,loot,'orb',p),null);assert.ok(buyPersonalUpgrade(p,'orb'));assert.ok(craftForSack(camp,loot,'orb',p));assert.equal(loot.bag[0].type,'orb');assert.equal(camp.counts.scrap,0);
 const old={version:1,camp:createCamp(),players:[]};delete old.camp.counts.orb;assert.equal(restoreSave(old).camp.counts.orb,0);assert.equal(Object.hasOwn(old.camp.counts,'orb'),false);
 bankEscape(camp,{outcome:'escaped'},{bag:[{...orb(),debugSupply:true}]});assert.equal(camp.counts.orb,0);
});

test('two sockets share fixed orb snapshots, reject forged targets/replay and expire marks', async t => {
  const { once } = await import('node:events'), { default: WebSocket } = await import('ws');
  const { createGameServer } = await import('../server/index.js'), { createLairSession } = await import('../server/lair-session.js');
  const { generateDungeon, setSolidObjects } = await import('../src/world.js');
  const { applyTreasureState } = await import('../src/treasure.js');
  const session = createLairSession(), actors = [session.connect(), session.connect()];
  for (const p of actors) { session.disconnect(p); p.x = 9; p.y = 2.5; }
  const { server, wss } = createGameServer({ session }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`, clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); wss.close(); await new Promise(resolve => server.close(resolve)); });
  async function until(fn) { for (let i = 0; i < 200; i++) { if (fn()) return; await new Promise(r => setTimeout(r, 10)); } assert.fail('Orb state did not arrive'); }
  for (const p of actors) {
    const ws = new WebSocket(origin.replace('http:', 'ws:') + '/session', { origin }), c = { ws, state: null, messages: [] }; clients.push(c);
    ws.on('message', bytes => { const m = JSON.parse(bytes); c.messages.push(m); if (m.type === 'state') c.state = m; });
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', token: p.token })); await until(() => c.state);
  }
  const [a, b] = clients, p = actors[0], send = m => a.ws.send(JSON.stringify(m));
  send({ type: 'debug-pack', item: 'orb' }); send({ type: 'debug-pack', item: 'orb' }); await until(() => a.state.bag.length === 2);
  const id = a.state.bag[0].id;
  for (const actor of actors) session.action(actor, { type: 'board' }); for (let i = 0; i < 31; i++) session.tick(.1);
  await until(() => a.state.dungeon && b.state.dungeon);
  send({type:'equip',id});await until(()=>a.state.orbId===id);
  send({type:'use-orb',id,seconds:999,marks:[{guardId:'forged',x:0,y:0}],feedbackId:'ping'});send({type:'use-orb',id,feedbackId:'repeat'});
  await until(()=>clients.every(c=>c.state.dungeon.scryPings.length===1));await until(()=>a.messages.some(m=>m.feedbackId==='repeat'));
  const marks=structuredClone(a.state.dungeon.scryPings[0].marks);assert.equal(marks.length,3);assert.ok(marks.every(m=>m.guardId!=='forged'));
  assert.deepEqual(b.state.dungeon.scryPings[0].marks,marks);assert.equal(a.state.bag.length,1);assert.equal(b.state.bag.length,0);
  assert.equal(a.messages.find(m=>m.feedbackId==='ping').ok,true);assert.equal(a.messages.find(m=>m.feedbackId==='repeat').ok,false);
  for(let i=0;i<10;i++)session.tick(.1);await until(()=>a.state.dungeon.scryPings[0]?.left<4.1);
  assert.deepEqual(a.state.dungeon.scryPings[0].marks,marks);
  session.disconnect(p);for(let i=0;i<41;i++)session.tick(.1);
  await until(()=>b.state.dungeon.scryPings.length===0);
});
