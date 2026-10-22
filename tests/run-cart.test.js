import test from 'node:test';import assert from 'node:assert/strict';
import {createRunCart,transferCart,boardRunCart,tickRunCart,CART_HOLD} from '../src/run-cart.js';
import {createLoot,findSpace,itemCells} from '../src/loot.js';
import {createCamp,bankEscape} from '../src/lair.js';
import {generateDungeon,canStand} from '../src/world.js';
import {dungeonConfig,GENERATOR_PRESETS} from '../src/generator-settings.js';
import {createSearchables} from '../src/search.js';
import {createHidingSpots} from '../src/hiding.js';
import {createRun,finishRun,loseRun} from '../src/run.js';
import {createLairSession} from '../server/lair-session.js';
const item=(id,type='ruby',x=0,y=0)=>({id,type,x,y,rotation:0});

test('raid cart rooms have one hallway, reachable cart approach, bounded connected floors and no intersecting furniture across architectures',()=>{
 for(const values of Object.values(GENERATOR_PRESETS))for(let seed=0;seed<50;seed++){
  const w=generateDungeon(seed,dungeonConfig(values));assert.equal(w.cartRoom.entrances.length,1);assert.equal(w.cartRoom.entrances[0].cells.length,1);
  const objects=createSearchables(w);createHidingSpots(w,objects);assert.ok(canStand(w,w.spawn.x,w.spawn.y));assert.ok(w.solidTiles[w.cartProp.tileY*w.width+w.cartProp.tileX]);
  const visited=new Set(),queue=[{x:Math.floor(w.spawn.x),y:Math.floor(w.spawn.y)}];
  for(let i=0;i<queue.length;i++){const p=queue[i],key=p.y*w.width+p.x;if(visited.has(key))continue;visited.add(key);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy;if(x>=0&&y>=0&&x<w.width&&y<w.height&&w.tiles[y*w.width+x]&&!visited.has(y*w.width+x))queue.push({x,y});}}
  assert.equal(visited.size,w.tiles.reduce((n,v)=>n+v,0));
  for(const object of objects)assert.ok(object.y>=11,'cart room is not a searchable treasure room');
 }
});

test('cargo is a finite shaped hold: exact instances move once, reject held/keys/full grids and all retrieval',()=>{
 const cart=createRunCart(),loot=createLoot();loot.bag=[{...item('sword','sword'),saleMultiplier:1.5},item('coins','coin',1,0)];loot.bag[1].count=9;
 assert.ok(transferCart(cart,loot,'sword',true));assert.equal(loot.bag.length,1);assert.equal(cart.items[0].saleMultiplier,1.5);assert.equal(itemCells(cart.items[0]).length,3);
 assert.equal(transferCart(cart,loot,'sword',true),false);assert.ok(transferCart(cart,loot,'coins',true));assert.equal(cart.items[1].count,9);
 assert.equal(transferCart(cart,loot,'sword',false),false);assert.equal(cart.items.length,2);assert.equal(loot.bag.length,0);
 loot.held=item('cursor');assert.equal(transferCart(cart,loot,'coins',false),false);loot.held=null;
 loot.bag=[item('key','treasureKey')];assert.equal(transferCart(cart,loot,'key',true),false);
 cart.items=[];for(let n=0;n<36;n++)cart.items.push(item('c'+n,'ruby',n%6,Math.floor(n/6)));
 loot.bag=[item('extra')];assert.equal(transferCart(cart,loot,'extra',true),false);assert.equal(loot.bag.length,1);assert.equal(cart.items.length,36);
 assert.equal(findSpace(cart.items,item('more'),CART_HOLD),null);
});

test('solo cargo banks only on escape, counts rewards once, and is lost entirely on a wipe',()=>{
 const world=generateDungeon(2),run=createRun(world),loot=createLoot(),camp=createCamp();loot.bag=[item('treasure'),item('food','meat',1)];
 assert.ok(transferCart(run.cart,loot,'treasure',true));assert.ok(transferCart(run.cart,loot,'food',true));assert.equal(camp.counts.gold,0);
 const result=finishRun(run,world,world.spawn,loot,5000);assert.equal(result.items.length,2);assert.ok(bankEscape(camp,result,loot,run.cart));assert.equal(camp.counts.gold,25);assert.equal(camp.counts.meat,1);assert.equal(run.cart.items.length,0);
 assert.equal(bankEscape(camp,result,loot,run.cart),false);assert.equal(camp.counts.gold,25);
 const doomed=createRun(world);doomed.cart.items=[item('lost')];const loss=loseRun(doomed,createLoot(),9000);assert.equal(loss.lostItems[0].id,'lost');assert.equal(doomed.cart.items.length,0);assert.equal(camp.counts.gold,25);
});

function launch(){const session=createLairSession(),a=session.connect(),b=session.connect();for(const p of [a,b]){p.x=9;p.y=2.5;session.action(p,{type:'board'});}for(let n=0;n<61;n++)session.tick(.05);for(const p of [a,b])p.invulnerable=1000;return {session,a,b};}
test('shared cargo transfers require actual cart proximity; shared claims, ready countdown, cancel and rewards are authoritative',()=>{
 const {session:s,a,b}=launch();a.bag=[item('cargo')];a.loot.bag=a.bag;
 Object.assign(a,{x:a.x+5,y:a.y+5});assert.equal(s.action(a,{type:'cart-transfer',id:'cargo',toCart:true}),false);
 Object.assign(a,s.snapshot(a).dungeon.entrance);assert.ok(s.action(a,{type:'cart-transfer',id:'cargo',toCart:true}));assert.equal(s.snapshot(a).camp.counts.gold,0);assert.equal(a.profile.xp,0);
 assert.equal(s.action(a,{type:'cart-transfer',id:'cargo',toCart:true}),false);
 Object.assign(b,s.snapshot(b).dungeon.entrance);assert.equal(s.action(b,{type:'cart-transfer',id:'cargo',toCart:false}),false);assert.equal(s.action(a,{type:'cart-transfer',id:'cargo',toCart:false}),false);
 assert.equal(s.action(b,{type:'cart-transfer',id:'cargo',toCart:true}),false);assert.deepEqual(s.snapshot(a).dungeon.cart.items,s.snapshot(b).dungeon.cart.items);
 assert.ok(s.action(a,{type:'cart-board',active:true}));assert.equal(s.action(a,{type:'cart-transfer',id:'cargo',toCart:false}),false);
 s.tick(.1);assert.equal(s.snapshot(a).dungeon.cart.countdown,null);assert.ok(s.action(b,{type:'cart-board',active:true}));s.tick(.1);assert.ok(s.snapshot(a).dungeon.cart.countdown>0);
 assert.ok(s.action(b,{type:'cart-board',active:false}));s.tick(.1);assert.equal(s.snapshot(a).dungeon.cart.countdown,null);
 assert.ok(s.action(b,{type:'cart-board',active:true}));for(let n=0;n<61;n++)s.tick(.05);
 assert.equal(s.snapshot(a).dungeon,null);assert.equal(s.snapshot(a).camp.counts.gold,25);assert.equal(a.profile.xp,25);assert.equal(b.profile.xp,25);assert.equal(a.result.count,1);
 s.tick(10);assert.equal(s.snapshot(a).camp.counts.gold,25);
});

test('team wipe and abort lose cart cargo, while successful teammates recover it even if its depositor is down',()=>{
 for(const mode of ['wipe','abort','escape']){
  const {session:s,a,b}=launch();a.bag.push(item('at-risk'));assert.ok(s.action(a,{type:'cart-transfer',id:'at-risk',toCart:true}));
  if(mode==='abort')s.adminEndRun();else {a.state='down';a.health=0;if(mode==='wipe'){b.state='down';b.health=0;s.tick(.05);}else{Object.assign(b,s.snapshot(b).dungeon.entrance);s.action(b,{type:'cart-board',active:true});for(let n=0;n<61;n++)s.tick(.05);}}
  assert.equal(s.snapshot(b).dungeon,null);assert.equal(s.snapshot(b).camp.counts.gold,mode==='escape'?25:0);
  if(mode==='escape'){assert.equal(a.result.leftBehind,true);assert.equal(a.profile.xp,25);}else assert.equal(b.result.lostCartItems[0].id,'at-risk');
 }
});

test('cargo is run-only: restarting an interrupted session cannot bank or duplicate deposited loot',async()=>{
 const {restoreSave}=await import('../server/save-store.js');const {session:s,a}=launch();a.bag.push(item('unbanked'));assert.ok(s.action(a,{type:'cart-transfer',id:'unbanked',toCart:true}));
 const saved=s.adminState();assert.ok(saved.players.every(p=>!('cart' in p)));assert.equal(saved.camp.counts.gold,0);
 const restored=restoreSave(saved);const after=createLairSession({store:{load:()=>saved,save(){}}}),again=after.connect(a.token);
 assert.equal(after.snapshot(again).dungeon,null);assert.equal(after.snapshot(again).camp.counts.gold,0);assert.equal(again.bag.length,0);assert.equal(restored.players[0].profile.xp,0);
});

test('two actual sockets share cargo claims, preserve one exact item and bank only after all board',async t=>{
 const {once}=await import('node:events');const {WebSocket}=await import('ws');const {createGameServer}=await import('../server/index.js');
 const {session,a,b}=launch();a.bag.push(item('socket-cargo'));for(const p of [a,b])session.disconnect(p);
 const {server,wss}=createGameServer({session});server.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${server.address().port}`,clients=[];
 t.after(async()=>{for(const c of clients)c.ws.terminate();wss.close();await new Promise(r=>server.close(r));});
 async function until(fn){for(let i=0;i<500;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}assert.fail('Cart snapshot did not arrive');}
 for(const p of [a,b]){const c={ws:new WebSocket(origin.replace('http:','ws:')+'/session',{origin}),state:null,messages:[]};clients.push(c);c.ws.on('message',bytes=>{const m=JSON.parse(bytes);c.messages.push(m);if(m.type==='state')c.state=m;});await once(c.ws,'open');c.ws.send(JSON.stringify({type:'hello',token:p.token}));await until(()=>c.state);}
 clients[0].ws.send(JSON.stringify({type:'cart-transfer',id:'socket-cargo',toCart:true,feedbackId:'deposit'}));await until(()=>clients.every(c=>c.state.dungeon?.cart.items.length===1));assert.equal(clients[0].state.camp.counts.gold,0);
 for(const [index,c]of clients.entries())c.ws.send(JSON.stringify({type:'cart-transfer',id:'socket-cargo',toCart:false,feedbackId:'claim-'+index}));
 await until(()=>clients.every((c,i)=>c.messages.some(m=>m.feedbackId==='claim-'+i)));
 assert.equal(clients.filter((c,i)=>c.messages.find(m=>m.feedbackId==='claim-'+i).ok).length,0);
 assert.ok(clients.every(c=>c.state.bag.every(i=>i.id!=='socket-cargo')));assert.ok(clients.every(c=>c.state.dungeon.cart.items[0].id==='socket-cargo'));
 for(const c of clients)c.ws.send(JSON.stringify({type:'cart-board',active:true}));await until(()=>clients.every(c=>c.state.result?.outcome==='escaped'));
 assert.equal(clients[0].state.camp.counts.gold,25);assert.equal(clients[1].state.profile.xp,25);assert.equal(clients[0].state.result.count,1);
});

test('two players deposit into one remaining shared square without overfill or lost items',()=>{
 const {session:s,a,b}=launch();
 // Fill through the same authoritative transfer used by either player.
 for(let n=0;n<35;n++){a.bag.push(item('fill-'+n));assert.ok(s.action(a,{type:'cart-transfer',id:'fill-'+n,toCart:true}));}
 a.bag.push(item('last-a'));b.bag.push(item('last-b'));
 assert.ok(s.action(a,{type:'cart-transfer',id:'last-a',toCart:true}));assert.equal(s.action(b,{type:'cart-transfer',id:'last-b',toCart:true}),false);
 assert.equal(s.snapshot(a).dungeon.cart.items.length,36);assert.deepEqual(s.snapshot(a).dungeon.cart.items,s.snapshot(b).dungeon.cart.items);assert.ok(b.bag.some(i=>i.id==='last-b'));
 assert.equal(s.action(b,{type:'cart-transfer',id:'last-a',toCart:false}),false);assert.equal(s.snapshot(a).camp.counts.gold,0);
});
