import { createSearchables } from '../src/search.js';
import { createHidingSpots } from '../src/hiding.js';
import { createGuards } from '../src/guard.js';
import { createCages } from '../src/rescue.js';
import { createReinforcementDoors } from '../src/pressure.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDungeonPreview } from '../src/dungeon-preview.js';
import { dungeonConfig, GENERATOR_PRESETS } from '../src/generator-settings.js';
import { findPath } from '../src/navigation.js';
import { canStand, generateDungeon, setSolidObjects } from '../src/world.js';
import { clearPath } from '../src/loot.js';
import { createTreasureRoom, publicTreasure, applyTreasureState, canApproachTreasure, unlockTreasure, reachableTreasureTiles, treasureDoorCells } from '../src/treasure.js';
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
// Keep the exact recorded gate-regression layouts; cart-room generation is
// exercised separately against all current architectures and shared previews.
function legacyExample(id,seed){
 const world=generateDungeon(seed,{...dungeonConfig(GENERATOR_PRESETS[id]),cartRoom:false});world.job=selectJob(id,'normal');
 const objects=createSearchables(world),hidingSpots=createHidingSpots(world,objects);createTreasureRoom(world,objects);
 const guards=createGuards(world),obstacles=[...objects,...hidingSpots],doors=createReinforcementDoors(world,obstacles),cages=createCages(world,[...obstacles,...guards.map(g=>g.home),...doors.map(d=>d.spawn)]);
 const p={world,objects,hidingSpots,guards,doors,cages};p.checks=checkDungeon(p);return p;
}


test('each culture locks one optional room with a reachable placed key and valuables, preserving the rest of the dungeon', () => {
  for(const id of Object.keys(GENERATOR_PRESETS)) for(let seed=0;seed<20;seed++) {
    const p=example(id,seed), w=p.world, d=w.treasure, r=w.rooms[d.roomIndex];
    assert.ok(d); assert.notEqual(d.roomIndex,0); assert.equal(p.checks.errors,0);
    const keys=p.ground.filter(o=>o.type==='treasureKey');assert.equal(keys.length,1);const sources=p.objects.filter(o=>o.id===keys[0].surfaceId);assert.equal(sources[0].id,d.keyContainerId);assert.ok(p.objects.every(o=>!o.contents.includes('treasureKey')));
    const seen=reachableTreasureTiles(w);assert.ok(seen.has(Math.floor(sources[0].approach.y)*w.width+Math.floor(sources[0].approach.x)));
    assert.equal(findPath(w,w.spawn,{x:r.cx+.5,y:r.cy+.5}).length,0);
    assert.ok(d.cells.every(c=>!canStand(w,c.x+.5,c.y+.5)));
    assert.ok(d.cells.every(c=>!inside(r,{x:c.x+.5,y:c.y+.5})));
    assert.deepEqual(d.cells, treasureDoorCells({ ...w, lockedTiles: undefined }, r));
    assert.ok(r.entrances.every(e => e.cells.length <= GENERATOR_PRESETS[id].corridorWidth));
    assert.ok(p.objects.filter(o=>inside(r,o)).every(o=>o.contents.length>0&&!o.contents.includes('treasureKey')));
    assert.ok(p.cages.every(c=>!inside(r,c)));assert.ok(p.doors.every(c=>!inside(r,c.spawn)));assert.ok(p.guards.every(g=>!inside(r,g)));
    assert.ok(canApproachTreasure(w,approach(w)));
    const before=structuredClone(p.objects);assert.equal(createTreasureRoom(w,p.objects),d);assert.deepEqual(p.objects,before);
  }
});
test('multi-entrance fallback opens all entries of the same optional room with one key', () => {
  const p=legacyExample('sanctuary',3724842645),w=p.world,d=w.treasure;
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
test('real server finds the placed key, sharing preserves it, unlock consumes once and snapshots conceal the source', () => {
  const a={id:'a',name:'A',connected:true,bag:[],profile:createProfile('a')},b={id:'b',name:'B',connected:true,bag:[],profile:createProfile('b')};
  const d=createDungeonSession({id:'treasure',seed:42,job:selectJob('manor','normal')},[a,b],createCamp());
  a.invulnerable=b.invulnerable=10000;
  const w=d.world,door=w.treasure,source=d.objects.find(o=>o.id===door.keyContainerId);
  assert.equal(d.snapshot().treasure.keyContainerId,undefined);assert.equal(JSON.stringify(d.snapshot()).includes('contents'),false);
  Object.assign(a,source.approach);assert.equal(source.searched,false);
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


test('treasure rejects hallway-length room openings and places bounded gates on the true threshold', () => {
  const regressions = [['manor', 774553834, 3, 18], ['manor', 683129967, 27, 32], ['hold', 2175734977, 64, 9], ['hold', 1549107668, 68, 14], ['sanctuary', 387276917, 4, 16], ['sanctuary', 2802362286, 5, 53]];
  for (const [id, seed, x, y] of regressions) {
    const p = legacyExample(id, seed), w = p.world;
    const bad = w.rooms.find(r => r.x === x && r.y === y);
    assert.ok(bad); assert.ok(bad.entrances.some(e => e.cells.length > w.layout.corridorWidth));
    const open = { ...w, lockedTiles: undefined };
    assert.equal(treasureDoorCells(open, bad), null);
    assert.ok(w.treasure, 'choose another eligible optional room');
    assert.notEqual(w.rooms[w.treasure.roomIndex], bad);
    assert.equal(p.checks.errors, 0);
    const gates = treasureDoorCells(open, w.rooms[w.treasure.roomIndex]);
    assert.deepEqual(w.treasure.cells, gates);
    const before = w.tiles.slice();
    const bag = [{ id: 'key', type: 'treasureKey', keyId: w.treasure.keyId, rotation: 0, x: 0, y: 0 }];
    assert.ok(unlockTreasure(w, approach(w), { held: null, bag }));
    assert.deepEqual(w.tiles, before, 'door selection/unlock must not carve or seal hallway floors');
  }
});

test('gate art follows each doorway side and stays inside the same cell as collision', async () => {
  const { drawTreasureGateCell } = await import('../src/treasure-view.js');
  const { CONFIG } = await import('../src/config.js');
  const t = CONFIG.tile, offsetX = 7, offsetY = -3;
  const draw = (side, unlocked = false) => {
    const rects = [], cell = { x: 4, y: 6, side };
    const ctx = { fillRect: (...r) => rects.push(r) };
    drawTreasureGateCell(ctx, { side: 'north', unlocked }, cell, offsetX, offsetY);
    const x = cell.x * t + offsetX, y = cell.y * t + offsetY;
    for (const [rx, ry, w, h] of rects) assert.ok(rx >= x && ry >= y && rx + w <= x + t && ry + h <= y + t);
    return rects.map(([rx, ry, w, h]) => [rx - x, ry - y, w, h]);
  };
  const north = draw('north'), east = draw('east');
  assert.deepEqual(east, north.map(([x, y, w, h]) => [y, x, h, w]));
  assert.deepEqual(draw('south'), north); assert.deepEqual(draw('west'), east);
  assert.equal(draw('east', true).length, 2);
});

test('diagnostics flag a treasure gate shifted into the room instead of its doorway', () => {
  const p = example(), d = p.world.treasure;
  const normal = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] };
  d.cells = d.cells.map(c => ({ ...c, x: c.x + normal[c.side][0], y: c.y + normal[c.side][1] }));
  assert.ok(checkDungeon(p).issues.some(i => i.code === 'treasure-doorway'));
});
