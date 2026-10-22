import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon } from '../src/world.js';
import { createSearchables, SEARCHABLE_TYPES, createSearchSession, beginSearch, updateSearch } from '../src/search.js';
import { createCamp, craftForSack, bankEscape, saveCamp, loadCamp, recipeStation } from '../src/lair.js';
import { createLoot, autoPickup, LOOT_TYPES } from '../src/loot.js';
import { createRun, finishRun } from '../src/run.js';
import { createProfile, knowsRecipe } from '../src/profile.js';
import { restoreSave } from '../server/save-store.js';
import { createDungeonSession } from '../server/dungeon-session.js';
import { selectJob } from '../src/jobs.js';
import { createLairSession } from '../server/lair-session.js';

test('generated food is cupboard/crate material loot, preserving empty counts and valuable results',()=>{
 const seen=new Set(),cup=SEARCHABLE_TYPES.cupboard.materialPool,crate=SEARCHABLE_TYPES.crate.materialPool;
 for(let seed=0;seed<30;seed++){
  const actual=createSearchables(generateDungeon(seed));let baseline;
  try{SEARCHABLE_TYPES.cupboard.materialPool=['scrap','cloth'];SEARCHABLE_TYPES.crate.materialPool=['scrap','cloth'];baseline=createSearchables(generateDungeon(seed));}
  finally{SEARCHABLE_TYPES.cupboard.materialPool=cup;SEARCHABLE_TYPES.crate.materialPool=crate;}
  assert.equal(actual.length,baseline.length);
  actual.forEach((o,i)=>{assert.equal(o.contents.length,baseline[i].contents.length);assert.deepEqual(o.contents.filter(t=>LOOT_TYPES[t].sellValue),baseline[i].contents.filter(t=>LOOT_TYPES[t].sellValue));
   for(const t of o.contents)if(['meat','berries'].includes(t)){seen.add(t);assert.ok(['cupboard','crate'].includes(o.type));}
  });
 }
 assert.deepEqual([...seen].sort(),['berries','meat']);
});

test('search, carry, escape and cook turn real generated food into a known lunch without XP or gold cost',()=>{
 let world,objects;for(let seed=0;seed<100;seed++){world=generateDungeon(seed);objects=createSearchables(world);if(['meat','berries'].every(type=>objects.some(o=>o.contents.includes(type))))break;}
 const camp=createCamp(),loot=createLoot(),player={...world.spawn,state:'active'},session=createSearchSession();
 for(const type of ['meat','berries']){
  const object=objects.find(o=>o.contents.includes(type));assert.ok(object);Object.assign(player,object.approach);assert.ok(beginSearch(session,world,player,loot,object));
  assert.equal(updateSearch(session,world,player,loot,true,10).type,'completed');
  const food=loot.ground.find(i=>i.type===type);assert.ok(food);assert.ok(autoPickup(loot,food.id));
 }
 const run=createRun(world);Object.assign(player,world.spawn);const result=finishRun(run,world,player,loot,1000);assert.ok(bankEscape(camp,result,loot));
 assert.equal(camp.counts.meat,1);assert.equal(camp.counts.berries,1);assert.equal(camp.counts.gold,0);
 const p=createProfile();assert.ok(knowsRecipe(p,'lunch'));assert.equal(recipeStation('lunch'),'craft');assert.ok(craftForSack(camp,loot,'lunch',p));
 assert.equal(camp.counts.meat,0);assert.equal(camp.counts.berries,0);assert.equal(loot.bag[0].type,'lunch');assert.equal(p.xp,0);assert.equal(camp.counts.gold,0);
 assert.equal(craftForSack(camp,loot,'lunch',p),null);
 const a={id:'a',connected:true,bag:loot.bag,profile:p},b={id:'b',connected:true,bag:[],profile:createProfile('b')};
 const dungeon=createDungeonSession({id:'food-rescue',seed:42,job:selectJob('manor','normal')},[a,b],camp);
 Object.assign(b,{x:a.x,y:a.y,state:'down',health:0});assert.ok(dungeon.action(a,{type:'rescue',id:'b'}));
 for(let i=0;i<25;i++){a.searchHeld=true;a.inputAge=0;dungeon.tick(.1);}
 assert.equal(b.state,'active');assert.equal(b.health,1);assert.equal(a.bag.length,0,'cooked lunch is spent on the revive');

});

test('lunch crafting rejects missing food and held items without spending; full sack banks cooked lunch',()=>{
 const camp=createCamp(),loot=createLoot(),p=createProfile();camp.counts.meat=1;
 assert.equal(craftForSack(camp,loot,'lunch',p),null);assert.equal(camp.counts.meat,1);camp.counts.berries=1;loot.held={id:'held'};
 assert.equal(craftForSack(camp,loot,'lunch',p),null);assert.equal(camp.counts.berries,1);loot.held=null;
 loot.bag=Array.from({length:9},(_,i)=>({id:String(i),type:'snare',x:i%3,y:Math.floor(i/3),rotation:0}));
 assert.equal(craftForSack(camp,loot,'lunch',p).destination,'stash');assert.equal(camp.counts.lunch,1);assert.equal(loot.bag.length,9);
});

test('legacy food stock defaults zero; both save formats preserve food and old progress',()=>{
 const old={version:1,camp:createCamp(),players:[]};old.camp.counts.gold=42;delete old.camp.counts.meat;delete old.camp.counts.berries;
 const restored=restoreSave(old);assert.equal(restored.camp.counts.meat,0);assert.equal(restored.camp.counts.berries,0);assert.equal(restored.camp.counts.gold,42);assert.equal(Object.hasOwn(old.camp.counts,'meat'),false);
 const camp=createCamp(),store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};camp.counts.meat=2;camp.counts.berries=3;
 assert.ok(saveCamp(camp,storage));const loaded=loadCamp(storage);assert.equal(loaded.counts.meat,2);assert.equal(loaded.counts.berries,3);
 assert.equal(restoreSave({version:1,camp,players:[]}).camp.counts.berries,3);
});

test('workbench authority crafts one contested pair once, rejects campfire and preserves other recipes',()=>{
 const s=createLairSession(),a=s.connect(),b=s.connect();s.snapshot(a).camp.counts.meat=1;s.snapshot(a).camp.counts.berries=1;
 Object.assign(a,{x:9,y:11.5});assert.equal(s.action(a,{type:'craft',item:'lunch'}),false);
 Object.assign(a,{x:13,y:6});Object.assign(b,{x:13,y:6});assert.ok(s.action(a,{type:'craft',item:'lunch'}));assert.equal(s.action(b,{type:'craft',item:'lunch'}),false);
 assert.equal(a.bag.length,1);assert.equal(a.bag[0].type,'lunch');assert.equal(b.bag.length,0);assert.equal(s.snapshot(a).camp.counts.meat,0);
 Object.assign(a,{x:9,y:11.5});assert.equal(s.action(a,{type:'craft',item:'snare'}),false,'gear still requires workbench');
});

test('two sockets contest the last food pair and receive one cooked lunch with shared stock', async t => {
  const { once } = await import('node:events'), { default: WebSocket } = await import('ws');
  const { createGameServer } = await import('../server/index.js'), { createLairSession } = await import('../server/lair-session.js');
  const { generateDungeon, setSolidObjects } = await import('../src/world.js');
  const { applyTreasureState } = await import('../src/treasure.js');
  const session = createLairSession(), actors = [session.connect(), session.connect()];
  for (const p of actors) { session.disconnect(p); p.x = 13; p.y = 6; }
  session.snapshot(actors[0]).camp.counts.meat=1;session.snapshot(actors[0]).camp.counts.berries=1;
  const { server, wss } = createGameServer({ session }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`, clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); wss.close(); await new Promise(resolve => server.close(resolve)); });
  async function until(fn) { for (let i = 0; i < 200; i++) { if (fn()) return; await new Promise(r => setTimeout(r, 10)); } assert.fail('Potion state did not arrive'); }
  for (const p of actors) {
    const ws = new WebSocket(origin.replace('http:', 'ws:') + '/session', { origin }), c = { ws, state: null, messages: [] }; clients.push(c);
    ws.on('message', bytes => { const m = JSON.parse(bytes); c.messages.push(m); if (m.type === 'state') c.state = m; });
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', token: p.token })); await until(() => c.state);
  }
  for(const [i,c] of clients.entries())c.ws.send(JSON.stringify({type:'craft',item:'lunch',feedbackId:`cook-${i}`}));
  await until(()=>clients.every((c,i)=>c.messages.some(m=>m.feedbackId===`cook-${i}`)));
  assert.equal(clients.filter((c,i)=>c.messages.find(m=>m.feedbackId===`cook-${i}`).ok).length,1);
  await until(()=>clients.reduce((n,c)=>n+c.state.bag.filter(i=>i.type==='lunch').length,0)===1);
  for(const c of clients){assert.equal(c.state.camp.counts.meat,0);assert.equal(c.state.camp.counts.berries,0);}
});
