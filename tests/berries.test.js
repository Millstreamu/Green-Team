import test from 'node:test';
import assert from 'node:assert/strict';
import { equipBerries, beginBerryAim, throwBerry, updateBerries, blindGuard } from '../src/berries.js';
import { createPlacement, cancelPlacement } from '../src/traps.js';
import { createGuard, createVitality, updateGuard, seesPlayer, guardStrikeHits } from '../src/guard.js';
import { sleepGuard } from '../src/darts.js';
import { createCamp, takeStashItem, bankEscape, craftForSack } from '../src/lair.js';
import { createProfile } from '../src/profile.js';
import { createDungeonSession } from '../server/dungeon-session.js';
import { selectJob } from '../src/jobs.js';
import { canStand } from '../src/world.js';
const berry=(id='berry')=>({id,type:'berries',rotation:0,x:0,y:0});
const actor=()=>({...createVitality(),id:'a',x:2.5,y:5.5,facing:1});
const arena=()=>({width:16,height:12,tiles:new Uint8Array(192).fill(1),seed:42,spawn:{x:2.5,y:5.5},rooms:[{x:1,y:1,w:12,h:9,cx:6,cy:5}]});
const aimBerry=(aim,loot,p,id='berry')=>equipBerries(aim,loot,p,id)&&beginBerryAim(aim,loot,p,id);

test('berry equip, aim, cancel and exact-copy throw preserve resources on invalid requests and spend once on launch',()=>{
 const w=arena(),p=actor(),loot={bag:[berry(),{...berry('spare'),x:1}],held:null},aim=createPlacement(),shots=[];p.disguiseLeft=10;
 assert.ok(equipBerries(aim,loot,p,'berry'));assert.equal(aim.itemId,null);assert.equal(throwBerry(w,p,loot,aim,shots,'berry'),false);
 assert.ok(beginBerryAim(aim,loot,p));cancelPlacement(aim);assert.equal(p.berryId,'berry');assert.equal(loot.bag.length,2);assert.equal(p.disguiseLeft,10);
 assert.ok(beginBerryAim(aim,loot,p));for(const point of [{x:NaN,y:1},{x:100,y:5},{x:p.x,y:p.y}]){aim.aimPoint=point;assert.equal(throwBerry(w,p,loot,aim,shots,'berry'),false);}
 aim.aimPoint={x:6.5,y:5.5};assert.equal(throwBerry(w,p,loot,aim,shots,'spare'),false);assert.ok(throwBerry(w,p,loot,aim,shots,'berry'));
 assert.equal(p.disguiseLeft,0);assert.equal(p.berryId,null);assert.equal(loot.bag.length,1);assert.equal(throwBerry(w,p,loot,aim,shots,'berry'),false);
 updateBerries(w,shots,[],1);assert.equal(shots.length,0);assert.equal(loot.bag[0].id,'spare','miss is spent without consuming spare');
 p.state='down';assert.equal(equipBerries(aim,loot,p,'spare'),false);
});

test('shared sweep stops berries at wall, solid prop, lock or first guard without piercing',()=>{
 for(const obstacle of ['wall','prop','lock','guard']){
  const w=arena(),p=actor(),loot={bag:[berry()],held:null},aim=createPlacement(),shots=[];
  const g={id:'first',x:5.5,y:5.5,state:'chase',windup:.1},behind={id:'behind',x:6,y:5.5};
  if(obstacle==='wall')w.tiles[5*16+4]=0;
  if(obstacle==='prop'){w.solidTiles=new Uint8Array(192);w.solidTiles[5*16+4]=1;}
  if(obstacle==='lock'){w.lockedTiles=new Uint8Array(192);w.lockedTiles[5*16+4]=1;}
  aimBerry(aim,loot,p);aim.aimPoint={x:6.5,y:5.5};assert.ok(throwBerry(w,p,loot,aim,shots,'berry'));updateBerries(w,shots,[g,behind],1);
  assert.equal(!!g.blindLeft,obstacle==='guard');assert.equal(behind.blindLeft,undefined);assert.equal(shots.length,0);
 }
});

test('one-second blind cancels committed attacks/chase/hiding knowledge and permits normal reacquisition after expiry',()=>{
 const w=arena(),p=actor(),g=createGuard(w,{roomIndex:0});Object.assign(g,{x:3.2,y:5.5,angle:Math.PI,state:'chase',windup:.01,attackAngle:Math.PI,targetId:'a',knownHiding:{playerId:'a'},lastSeen:{...p},trail:[{...p}],trailLeft:3});
 assert.ok(blindGuard(g));assert.equal(g.windup,0);assert.equal(g.targetId,null);assert.equal(g.knownHiding,null);assert.equal(g.lastSeen,null);assert.equal(g.trail.length,0);
 assert.equal(seesPlayer(w,g,p,true),false);assert.equal(guardStrikeHits(w,g,p),false);
 const pos={x:g.x,y:g.y};for(let i=0;i<9;i++){assert.equal(updateGuard(w,g,p,.1).hit,false);assert.deepEqual({x:g.x,y:g.y},pos);}
 assert.equal(blindGuard(g),false,'another hit cannot refresh blind');updateGuard(w,g,p,.11);assert.equal(g.blindLeft,0);assert.equal(g.state,'return');assert.equal(p.health,3);
 assert.equal(seesPlayer(w,g,p),true);for(let i=0;i<9;i++)updateGuard(w,g,p,.1);assert.equal(g.state,'chase');
});

test('sleep remains eight seconds and snare timer stays independent of berry blind',()=>{
 const w=arena(),p=actor(),g=createGuard(w,{roomIndex:0});g.snareLeft=3;assert.ok(blindGuard(g));updateGuard(w,g,p,.5);assert.equal(g.snareLeft,2.5);assert.equal(g.blindLeft,.5);
 assert.ok(sleepGuard(g));assert.equal(g.blindLeft,0);assert.equal(g.sleepLeft,8);assert.equal(blindGuard(g),false);updateGuard(w,g,p,.5);assert.equal(g.sleepLeft,7.5);assert.equal(g.snareLeft,2);
});

test('authoritative berry hit pauses a carrier without dropping/reviving captive or changing alert count',()=>{
 const a={id:'a',connected:true,bag:[berry()],profile:createProfile('a')},b={id:'b',connected:true,bag:[],profile:createProfile('b')};
 const d=createDungeonSession({id:'berry-carry',seed:42,job:selectJob('manor','normal')},[a,b],createCamp());const g=d.danger.guards.find(g=>!g.jailer),cage=d.snapshot().cages[0];assert.ok(cage);
 const point=[[-.5,0],[.5,0],[0,-.5],[0,.5]].map(([x,y])=>({x:g.x+x,y:g.y+y})).find(p=>canStand(d.world,p.x,p.y));assert.ok(point);Object.assign(a,point);a.invulnerable=100;
 Object.assign(g,{captiveId:'b',captureTargetId:'b',destinationCageId:cage.id,state:'carry'});Object.assign(b,{x:g.x,y:g.y,state:'carried',health:0,carrierId:g.id,downSpilled:true});d.ground.push({id:'spill',type:'ruby',x:g.x,y:g.y,rotation:0});
 assert.ok(d.action(a,{type:'equip',id:'berry'}));assert.equal(d.danger.beforeMove(a,0,{x:1,y:0}),false);assert.ok(d.action(a,{type:'aim-berries',id:'berry'}));assert.ok(d.action(a,{type:'aim',x:g.x,y:g.y}));assert.ok(d.action(a,{type:'throw-berry',id:'berry',blindSeconds:999}));assert.equal(d.action(a,{type:'throw-berry',id:'berry'}),false);
 const alerts=d.danger.pressure.alerts;d.tick(.05);assert.ok(g.blindLeft>0&&g.blindLeft<=1);assert.equal(b.state,'carried');assert.equal(b.health,0);assert.equal(g.captiveId,'b');assert.equal(d.ground.filter(i=>i.id==='spill').length,1);assert.equal(d.danger.pressure.alerts,alerts);
});

test('berries still bank and cook into lunch; debug throw supplies never create cooking stock',()=>{
 const camp=createCamp(),loot={bag:[],held:null},p=actor(),aim=createPlacement();camp.counts.berries=2;camp.counts.meat=1;
 const first=takeStashItem(camp,loot,'berries');takeStashItem(camp,loot,'berries');aimBerry(aim,loot,p,first.id);aim.aimPoint={x:4.5,y:5.5};assert.ok(throwBerry(arena(),p,loot,aim,[],first.id));
 bankEscape(camp,{outcome:'escaped'},loot);assert.equal(camp.counts.berries,1);assert.ok(craftForSack(camp,loot,'lunch',createProfile()));assert.equal(camp.counts.berries,0);assert.equal(loot.bag[0].type,'lunch');loot.bag=[];
 assert.ok(takeStashItem(camp,loot,'berries',true));bankEscape(camp,{outcome:'escaped'},loot);assert.equal(camp.counts.berries,0);
});

test('two sockets share one-second berry blind and reject repeated throws without spending spare berries', async t => {
  const { once } = await import('node:events'), { default: WebSocket } = await import('ws');
  const { createGameServer } = await import('../server/index.js'), { createLairSession } = await import('../server/lair-session.js');
  const { generateDungeon, setSolidObjects } = await import('../src/world.js');
  const { applyTreasureState } = await import('../src/treasure.js');
  const session = createLairSession(), actors = [session.connect(), session.connect()];
  for (const p of actors) { session.disconnect(p); p.x = 9; p.y = 2.5; }
  const { server, wss } = createGameServer({ session }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`, clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); wss.close(); await new Promise(resolve => server.close(resolve)); });
  async function until(fn) { for (let i = 0; i < 200; i++) { if (fn()) return; await new Promise(r => setTimeout(r, 10)); } assert.fail('Berry state did not arrive'); }
  for (const p of actors) {
    const ws = new WebSocket(origin.replace('http:', 'ws:') + '/session', { origin }), c = { ws, state: null, messages: [] }; clients.push(c);
    ws.on('message', bytes => { const m = JSON.parse(bytes); c.messages.push(m); if (m.type === 'state') c.state = m; });
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', token: p.token })); await until(() => c.state);
  }
  const [a, b] = clients, p = actors[0], send = m => a.ws.send(JSON.stringify(m));
  send({ type: 'debug-pack', item: 'berries' }); send({ type: 'debug-pack', item: 'berries' }); await until(() => a.state.bag.length === 2);
  const id = a.state.bag[0].id;
  for (const actor of actors) session.action(actor, { type: 'board' }); for (let i = 0; i < 31; i++) session.tick(.1);
  await until(() => a.state.dungeon && b.state.dungeon);
  const snap = a.state.dungeon, w = generateDungeon(snap.seed, snap.layout); setSolidObjects(w, [...snap.objects, ...snap.hidingSpots]); applyTreasureState(w, snap.treasure);
  const g = snap.guards.find(g => g.jailer); assert.ok(g);
  const point = [[-.5, 0], [.5, 0], [0, -.5], [0, .5]].map(([x, y]) => ({ x: g.x + x, y: g.y + y })).find(at => canStand(w, at.x, at.y)); assert.ok(point);
  Object.assign(p, point); p.invulnerable = 1000;
  send({ type: 'equip', id }); await until(() => a.state.berryId === id);
  assert.equal(a.state.placement.itemId, null);
  send({ type: 'aim-berries', id }); await until(() => a.state.placement?.kind === 'berries');
  send({ type: 'aim', x: g.x, y: g.y }); send({ type: 'throw-berry', id, feedbackId: 'shot' }); send({ type: 'throw-berry', id, feedbackId: 'repeat' });
  await until(() => clients.every(c => c.state.dungeon.guards.find(x => x.id === g.id).blindLeft > 0));
  await until(() => a.messages.some(m => m.type === 'action-feedback' && m.feedbackId === 'repeat'));
  assert.equal(a.state.bag.length, 1); assert.equal(b.state.bag.length, 0);
  assert.equal(a.messages.find(m => m.feedbackId === 'shot').ok, true); assert.equal(a.messages.find(m => m.feedbackId === 'repeat').ok, false);
  for (const c of clients) { const state = c.state.dungeon.guards.find(x => x.id === g.id); assert.ok(state.blindLeft > 0 && state.blindLeft <= 1); assert.equal(state.state, 'blind'); }
});
