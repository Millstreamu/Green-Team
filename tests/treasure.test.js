import test from 'node:test';
import assert from 'node:assert/strict';
import { createDungeonPreview } from '../src/dungeon-preview.js';
import { GENERATOR_PRESETS } from '../src/generator-settings.js';
import { findPath } from '../src/navigation.js';
import { canStand, generateDungeon, setSolidObjects } from '../src/world.js';
import { clearPath } from '../src/loot.js';
import { createTreasureRoom, publicTreasure, applyTreasureState, canApproachTreasure, unlockTreasure, reachableTreasureTiles } from '../src/treasure.js';
import { createDungeonSession } from '../server/dungeon-session.js';
import { createCamp, bankEscape } from '../src/lair.js';
import { createProfile, teamHaulXp } from '../src/profile.js';
import { createRun, finishRun } from '../src/run.js';
import { selectJob } from '../src/jobs.js';
import { createLightingRenderer } from '../src/lighting.js';
import { checkDungeon } from '../src/dungeon-checks.js';
import { restoreSave } from '../server/save-store.js';

const inside = (r,p) => p.x >= r.x && p.x < r.x+r.w && p.y >= r.y && p.y < r.y+r.h;
function approach(world) {
  const door=world.treasure, room=world.rooms[door.roomIndex], seen=reachableTreasureTiles(world);
  for(const c of door.cells) for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const p={x:c.x+.5+dx,y:c.y+.5+dy,state:'active'};
    if(!inside(room,p) && canStand(world,p.x,p.y) && seen.has(Math.floor(p.y)*world.width+Math.floor(p.x)) && canApproachTreasure(world,p)) return p;
  }
  assert.fail('No reachable door approach');
}
const example = (id='manor',seed=42) => createDungeonPreview(seed,GENERATOR_PRESETS[id],id);

test('each culture locks one optional room with a reachable searched key and valuables, preserving the rest of the dungeon', () => {
  for(const id of Object.keys(GENERATOR_PRESETS)) for(let seed=0;seed<20;seed++) {
    const p=example(id,seed), w=p.world, d=w.treasure, r=w.rooms[d.roomIndex];
    assert.ok(d); assert.notEqual(d.roomIndex,0); assert.equal(p.checks.errors,0);
    const sources=p.objects.filter(o=>o.contents.includes('treasureKey'));assert.equal(sources.length,1);assert.equal(sources[0].id,d.keyContainerId);
    const seen=reachableTreasureTiles(w);assert.ok(seen.has(Math.floor(sources[0].approach.y)*w.width+Math.floor(sources[0].approach.x)));
    assert.equal(findPath(w,w.spawn,{x:r.cx+.5,y:r.cy+.5}).length,0);
    assert.ok(d.cells.every(c=>!canStand(w,c.x+.5,c.y+.5)));
    assert.ok(d.cells.every(c=>inside(r,{x:c.x+.5,y:c.y+.5})));
    assert.ok(r.entrances.flatMap(e=>e.cells).every(c=>canStand(w,c.x+.5,c.y+.5)));
    assert.ok(p.objects.filter(o=>inside(r,o)).every(o=>o.contents.length>0&&!o.contents.includes('treasureKey')));
    assert.ok(p.cages.every(c=>!inside(r,c)));assert.ok(p.doors.every(c=>!inside(r,c.spawn)));assert.ok(p.guards.every(g=>!inside(r,g)));
    assert.ok(canApproachTreasure(w,approach(w)));
    const before=structuredClone(p.objects);assert.equal(createTreasureRoom(w,p.objects),d);assert.deepEqual(p.objects,before);
  }
});
test('multi-entrance fallback opens all entries of the same optional room with one key', () => {
  const p=example('sanctuary',3724842645),w=p.world,d=w.treasure;
  assert.ok(d);assert.ok(w.rooms[d.roomIndex].entrances.length>1);assert.equal(p.checks.errors,0);
  const bag=[{id:'key',type:'treasureKey',keyId:d.keyId,rotation:0,x:0,y:0}],actor=approach(w);
  assert.ok(unlockTreasure(w,actor,{held:null,bag}));assert.equal(bag.length,0);assert.ok(d.cells.every(c=>canStand(w,c.x+.5,c.y+.5)));
});
test('closed door blocks sight, search reach and movement; wrong keys, distant/down/hidden actors cannot unlock', () => {
  const p=example(),w=p.world,d=w.treasure,a=approach(w),r=w.rooms[d.roomIndex];
  const loot={held:null,bag:[{id:'wrong',type:'treasureKey',keyId:'another-run',rotation:0,x:0,y:0}]};
  assert.equal(unlockTreasure(w,a,loot),false);assert.equal(loot.bag.length,1);
  loot.bag[0].keyId=d.keyId;
  for(const actor of [{...w.spawn,state:'active'},{...a,state:'down'},{...a,hiding:{}}])assert.equal(unlockTreasure(w,actor,loot),false);
  loot.held=loot.bag[0];assert.equal(unlockTreasure(w,a,loot),false);loot.held=null;
  const light=createLightingRenderer(),before=light.scene(w,p.objects), closed=structuredClone(before.map(t=>({x:t.x,y:t.y,polygon:t.polygon})));
  const target=p.objects.find(o=>inside(r,o));assert.equal(clearPath(w,a,target.approach),false);
  assert.ok(unlockTreasure(w,a,loot));assert.equal(loot.bag.length,0);assert.ok(findPath(w,w.spawn,target.approach).length);
  assert.equal(unlockTreasure(w,a,loot),false);
  const after=light.scene(w,p.objects);assert.notEqual(after,before);assert.deepEqual(after.map(t=>[t.x,t.y]),closed.map(t=>[t.x,t.y]));assert.equal(light.scene(w,p.objects),after);
});
test('real server searching finds the key, sharing preserves it, unlock consumes once and snapshots conceal the source', () => {
  const a={id:'a',name:'A',connected:true,bag:[],profile:createProfile('a')},b={id:'b',name:'B',connected:true,bag:[],profile:createProfile('b')};
  const d=createDungeonSession({id:'treasure',seed:42,job:selectJob('manor','normal')},[a,b],createCamp());
  a.invulnerable=b.invulnerable=10000;
  const w=d.world,door=w.treasure,source=d.objects.find(o=>o.id===door.keyContainerId);
  assert.equal(d.snapshot().treasure.keyContainerId,undefined);assert.equal(JSON.stringify(d.snapshot()).includes('contents'),false);
  Object.assign(a,source.approach);assert.ok(d.action(a,{type:'search',id:source.id}));
  for(let i=0;i<90;i++){a.inputAge=0;a.searchHeld=true;d.tick(.05);}
  const key=d.ground.find(i=>i.type==='treasureKey');assert.ok(key);assert.equal(key.keyId,door.keyId);
  assert.ok(d.action(a,{type:'pickup',id:key.id}));Object.assign(a,approach(w));Object.assign(b,{x:a.x,y:a.y});
  assert.equal(d.action(b,{type:'unlock',keyId:door.keyId}),false);
  assert.ok(d.action(a,{type:'lift',source:'bag',id:key.id}));assert.ok(d.action(a,{type:'drop'}));assert.ok(d.action(b,{type:'pickup',id:key.id}));
  assert.ok(d.action(b,{type:'unlock'}));assert.equal(d.snapshot().treasure.unlocked,true);assert.equal(b.bag.length,0);
  assert.equal(d.action(a,{type:'unlock'}),false);
  const client=generateDungeon(42,w.layout);setSolidObjects(client,[...d.objects,...d.danger.hidingSpots]);
  applyTreasureState(client,{...publicTreasure(w),unlocked:false});assert.equal(client.treasure.unlocked,false);
  applyTreasureState(client,d.snapshot().treasure);assert.deepEqual(client.lockedTiles,w.lockedTiles);
});
test('unused keys cannot be banked for money, XP or future runs; old saves remain valid', () => {
  const w=example().world,loot={held:null,bag:[{id:'key',type:'treasureKey',keyId:w.treasure.keyId,rotation:0,x:0,y:0}]};
  const result=finishRun(createRun(w),w,{...w.spawn,state:'active'},loot,1000);assert.equal(result.count,0);assert.equal(teamHaulXp(result),0);
  const camp=createCamp();assert.ok(bankEscape(camp,result,loot));assert.equal(camp.counts.treasureKey,0);assert.equal(camp.counts.gold,0);assert.equal(loot.bag.length,0);
  const old={version:1,camp:createCamp(),players:[]};delete old.camp.counts.treasureKey;assert.equal(restoreSave(old).camp.counts.treasureKey,0);
});
test('diagnostics reject a key hidden in its own locked room', () => {
  const p=example(),d=p.world.treasure,r=p.world.rooms[d.roomIndex],source=p.objects.find(o=>o.id===d.keyContainerId),bad=p.objects.find(o=>inside(r,o));
  source.contents=source.contents.filter(t=>t!=='treasureKey');bad.contents.push('treasureKey');d.keyContainerId=bad.id;
  assert.ok(checkDungeon(p).issues.some(i=>i.code==='treasure-key'));
});

test('real sockets reject a keyless unlock and broadcast one shared unlock to both goblins', async t => {
  const { once } = await import('node:events'), { default: WebSocket } = await import('ws');
  const { createGameServer } = await import('../server/index.js'), { createLairSession } = await import('../server/lair-session.js');
  const session=createLairSession(), actors=[session.connect(),session.connect()];
  for(const p of actors){session.disconnect(p);p.x=9;p.y=2.5;}
  const {server,wss}=createGameServer({session});server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`, clients=[];
  t.after(async()=>{for(const c of clients)c.ws.terminate();wss.close();await new Promise(resolve=>server.close(resolve));});
  const until=async fn=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}assert.fail('Treasure state did not arrive');};
  for(const p of actors){
    const ws=new WebSocket(origin.replace('http:','ws:')+'/session',{origin}),c={ws,state:null};clients.push(c);
    ws.on('message',data=>{const m=JSON.parse(data);if(m.type==='state')c.state=m;});
    await once(ws,'open');ws.send(JSON.stringify({type:'hello',token:p.token}));await until(()=>c.state);
  }
  for(const p of actors)session.action(p,{type:'board'});for(let i=0;i<31;i++)session.tick(.1);
  await until(()=>clients.every(c=>c.state.dungeon));
  const snapshot=clients[0].state.dungeon,w=generateDungeon(snapshot.seed,snapshot.layout);setSolidObjects(w,[...snapshot.objects,...snapshot.hidingSpots]);applyTreasureState(w,snapshot.treasure);
  const outside=approach(w);for(const p of actors){Object.assign(p,{x:outside.x,y:outside.y});p.invulnerable=10000;}
  assert.equal(session.action(actors[1],{type:'unlock',keyId:w.treasure.keyId}),false);
  assert.equal(session.snapshot(actors[0]).dungeon.treasure.unlocked,false);
  // Server-only inventory fixture; clients cannot send items or quantities.
  actors[0].bag.push({id:'wire-key',type:'treasureKey',keyId:w.treasure.keyId,rotation:0,x:0,y:0});
  clients[0].ws.send(JSON.stringify({type:'unlock'}));clients[1].ws.send(JSON.stringify({type:'unlock'}));
  await until(()=>clients.every(c=>c.state.dungeon.treasure.unlocked));
  assert.equal(actors[0].bag.length,0);assert.equal(session.action(actors[0],{type:'unlock'}),false);
  assert.equal(clients[0].state.dungeon.treasure.keyContainerId,undefined);
});

test('downing or an expired disconnect spills a recoverable matching key for a teammate', () => {
  for(const reason of ['down','disconnect']) {
    const a={id:'a',name:'A',connected:true,bag:[],profile:createProfile('a')},b={id:'b',name:'B',connected:true,bag:[],profile:createProfile('b')};
    const d=createDungeonSession({id:reason,seed:42,job:selectJob('manor','normal')},[a,b],createCamp()),w=d.world;
    const outside=approach(w);Object.assign(a,{x:outside.x,y:outside.y});Object.assign(b,{x:outside.x,y:outside.y});a.invulnerable=b.invulnerable=10000;
    a.bag.push({id:'recover-key',type:'treasureKey',keyId:w.treasure.keyId,rotation:0,x:0,y:0});
    if(reason==='down'){a.state='down';a.health=0;d.tick(.1);}else{a.connected=false;d.disconnect(a);d.tick(60);}
    assert.equal(a.bag.length,0);const key=d.ground.find(i=>i.id==='recover-key');assert.equal(key.keyId,w.treasure.keyId);
    assert.ok(d.action(b,{type:'pickup',id:key.id}));assert.ok(d.action(b,{type:'unlock'}));assert.equal(w.treasure.unlocked,true);
  }
});
