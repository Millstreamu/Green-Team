import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createWorkshopDraft, validateWorkshopDraft, workshopLootOdds, workshopRunTuning, WORKSHOP_MAPS } from '../workshop/model.js';
import { adaptWorkshopGame } from '../workshop/game-adapter.js';
import { runTuning } from '../src/tuning.js';
import { searchGoldChance, createSearchables } from '../src/search.js';
import { generateDungeon } from '../src/world.js';
import { dungeonConfig } from '../src/generator-settings.js';
import { selectJob } from '../src/jobs.js';
import { LAIR_ART_SLOTS, lairArtBounds } from '../workshop/lair-art.js';
import { createCamp,createLairWorld,lairTarget } from '../src/lair.js';

test('old workshop exports migrate without losing choices and invalid lair assets are rejected',()=>{
 const current=createWorkshopDraft(),old=structuredClone(current);delete old.lair;delete old.furniture;old.version=1;old.costs.smoke=9;
 const upgraded=validateWorkshopDraft(old);assert.equal(upgraded.version,2);assert.equal(upgraded.costs.smoke,9);assert.deepEqual(upgraded.lair,{tiles:null,props:{}});assert.equal(old.version,1);assert.equal(old.lair,undefined);
 for(const change of [d=>d.lair.props.unknown='data:image/png;base64,AAAA',d=>d.lair.tiles='http://invalid',d=>d.lair.props=[],d=>d.version=99]){const bad=structuredClone(current);change(bad);assert.throws(()=>validateWorkshopDraft(bad));}
 const old2=structuredClone(current);delete old2.furniture;old2.costs.smoke=13;const migrated=validateWorkshopDraft(old2);assert.deepEqual(migrated.furniture,{});assert.equal(migrated.costs.smoke,13);
 const badFurniture=structuredClone(current);badFurniture.furniture.fake='data:image/png;base64,AAAA';assert.throws(()=>validateWorkshopDraft(badFurniture),/Unknown furniture/);
 const manifest=JSON.parse(readFileSync(new URL('../workshop/templates/lair-manifest.json',import.meta.url)));assert.deepEqual(manifest,LAIR_ART_SLOTS);
});

test('lair art bounds align to actual station targets and do not change geometry or collision',()=>{
 const world=createLairWorld(createCamp()),before={tiles:[...world.tiles],solid:[...world.solidTiles],stations:structuredClone(world.stations)};
 for(const [id,slot]of Object.entries(LAIR_ART_SLOTS)){
  const b=lairArtBounds(world,id),station=world.stations.find(s=>s.kind===(id==='potionSite'?'potion':id));
  assert.equal(b.width*32,slot.width);assert.equal(b.height*32,slot.height);assert.equal(b.x+slot.anchorX/32,station.x);assert.equal(b.y+slot.anchorY/32,station.y);
  assert.equal(lairTarget(world,{x:station.x,y:station.y+.7}).kind,station.kind);
 }
 assert.deepEqual({tiles:[...world.tiles],solid:[...world.solidTiles],stations:world.stations},before);
});

test('workshop drafts round-trip all assets and validate atomically',()=>{
 const draft=createWorkshopDraft();assert.deepEqual(validateWorkshopDraft(JSON.parse(JSON.stringify(draft))),draft);
 for(const change of [d=>d.maps.hold.loot.farRareChance=1.01,d=>d.costs.smoke=-1,d=>d.maps.manor.weights.chest={},d=>d.generator.manor.minRoomWidth=16,d=>d.sprites.scrap='https://example.com/a.png',d=>d.materials.snare.scrap=0,d=>d.audio.pickup='data:text/html;base64,aaaa',d=>d.sprites.fake='data:image/png;base64,AAAA']){const bad=structuredClone(draft);change(bad);assert.throws(()=>validateWorkshopDraft(bad));assert.deepEqual(draft,createWorkshopDraft());}
 draft.maps.hold.tiles='data:image/png;base64,AAAA';draft.audio.pickup='data:audio/wav;base64,AAAA';assert.deepEqual(validateWorkshopDraft(draft),draft);
});
test('workshop gold chart exactly matches live gold probabilities for every map, container, depth and difficulty',()=>{
 const draft=createWorkshopDraft();for(const id of WORKSHOP_MAPS)for(const difficulty of ['normal','hard'])for(const type of ['chest','cupboard','crate'])for(const depth of [0,.13,.5,.91,1]){
 const world={job:selectJob(id,difficulty),tuning:workshopRunTuning(draft,id)};
 assert.ok(Math.abs(workshopLootOdds(draft,id,type,depth,difficulty).items.coin.chance-searchGoldChance(world,{type,depth}))<1e-12);
 const odds=workshopLootOdds(draft,id,type,depth,difficulty);assert.ok(Math.abs(odds.empty+odds.one+odds.two-1)<1e-12);
 assert.ok(Math.abs(Object.values(odds.items).reduce((s,x)=>s+x.expected,0)-(odds.one+2*odds.two))<1e-12);
 }
});
test('loot extremes and material weights produce exact expected counts and remain map-specific',()=>{
 const d=createWorkshopDraft();d.maps.hold.loot={nearEmptyChance:0,farEmptyChance:0,twoItemChance:1,nearMaterialChance:1,farMaterialChance:1,nearRareChance:0,farRareChance:0};d.maps.hold.weights.crate={scrap:3,cloth:1};
 const a=workshopLootOdds(d,'hold','crate',.5);assert.equal(a.items.scrap.expected,1.5);assert.equal(a.items.scrap.chance,.9375);assert.equal(a.items.cloth.expected,.5);assert.equal(a.two,1);
 d.maps.hold.loot.nearEmptyChance=1;assert.ok(Object.values(workshopLootOdds(d,'hold','crate',0).items).every(x=>x.expected===0));
 assert.deepEqual(workshopRunTuning(d,'manor'),runTuning(d.tuning));
});
function gameSource(){return readFileSync(new URL('../workshop/game-bundle.js',import.meta.url),'utf8');}
function surfaceHarness(draft,map='manor',where='dungeon',storage=null){
 class Surface{
 constructor(id=''){this.id=id;this.listeners={};this.style={setProperty(){}};this.dataset={};this.children=[];this.width=32;this.height=40;this.textContent='';this.value='';this.classList={add(){},remove(){},toggle(){},contains(){return false;}};}
 addEventListener(k,f){(this.listeners[k]??=[]).push(f);}send(k,e={}){for(const f of this.listeners[k]??[])f({target:this,preventDefault(){},stopPropagation(){},...e});}
 dispatchEvent(e){this.send(e.type,e);return true;}
 getBoundingClientRect(){return {left:0,top:0,right:844,bottom:390,width:844,height:390};}
 getContext(){return new Proxy({},{get:(_,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});}focus(){}closest(){return null;}setPointerCapture(){}append(...a){this.children.push(...a);}replaceChildren(...a){this.children=a;}setAttribute(k,v){this[k]=v;}getAttribute(k){return this[k];}show(){this.open=true;}showModal(){this.open=true;}close(){this.open=false;}
 }
 const nodes=new Map([...readFileSync(new URL('../index.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Surface(m[1])]));
 const doc=new Surface(),win=new Surface(),frames=[],messages=[];
 doc.querySelector=s=>nodes.get(s.slice(1));doc.createElement=tag=>new Surface(tag);doc.querySelectorAll=()=>[];
 win.WORKSHOP_DRAFT=draft;win.WORKSHOP_SEED=2371;win.WORKSHOP_MAP=map;win.WORKSHOP_DIFFICULTY='hard';win.WORKSHOP_START=where;
 if(storage)Object.defineProperty(win,'localStorage',{value:storage});else Object.defineProperty(win,'localStorage',{get(){throw Error('The workshop must not touch real saves.');}});
 win.matchMedia=()=>({matches:false});win.confirm=()=>true;
 const sandbox={Event,window:win,document:doc,HTMLElement:Surface,parent:{postMessage:m=>messages.push(m)},Image:class{async decode(){const b=Buffer.from(this.src.split(',')[1],'base64');this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);}},ResizeObserver:class{constructor(f){this.f=f;}observe(){this.f();}},requestAnimationFrame:f=>frames.push(f),performance:{now:()=>1},console,crypto,Uint8Array,Uint32Array,Map,Set,structuredClone,setTimeout,clearTimeout,fetch(){throw Error('No network in workshop game.');}};
 return {sandbox,frames,messages,nodes};
}
test('built workshop starts actual solo on all three maps, uses seed/tuning/costs, runs frames and never reads saves or network',async()=>{
 const d=createWorkshopDraft();d.costs.smoke=17;d.costs.quietHands=6;d.materials.snare.scrap=9;d.tuning.chaseSpeed=5.2;
 for(const id of WORKSHOP_MAPS){d.maps[id].loot.nearEmptyChance=0;d.maps[id].loot.farEmptyChance=0;d.maps[id].loot.nearMaterialChance=1;d.maps[id].loot.farMaterialChance=1;d.maps[id].weights={chest:{meat:1},cupboard:{meat:1},crate:{meat:1}};
 const h=surfaceHarness(d,id),result=await vm.runInNewContext('(async()=>{'+gameSource()+';return {world,player,objects,camp,profile,RECIPES,PERSONAL_UPGRADES};})()',h.sandbox);
 assert.equal(result.world.seed,2371);assert.equal(result.world.job.jobId,id);assert.equal(result.world.tuning.combat.chaseSpeed,5.2);assert.equal(result.PERSONAL_UPGRADES.smoke.cost,17);assert.equal(result.PERSONAL_UPGRADES.quietHands.cost,6);assert.equal(result.RECIPES.snare.materials.scrap,9);assert.equal(result.profile.xp,500);assert.equal(result.camp.counts.scrap,20);
 const ordinary=result.objects.filter(o=>!o.treasure&&!o.contents.includes('treasureKey'));assert.ok(ordinary.length>0);assert.ok(ordinary.every(o=>o.contents.every(i=>i==='meat')));assert.equal(h.messages.at(-1).type,'workshop-ready');
 for(let i=0;i<5;i++)h.frames.shift()(i*16+16);
 }
});
test('sandbox lair exposes edited unlock cost and fails closed if adapter anchors change',async()=>{
 const d=createWorkshopDraft();d.costs.panicSprint=3;
 const h=surfaceHarness(d,'manor','lair');const result=await vm.runInNewContext('(async()=>{'+gameSource()+';return {world,run,PERSONAL_UPGRADES};})()',h.sandbox);
 assert.ok(result.world.lair);assert.equal(result.run.phase,'lair');assert.equal(result.PERSONAL_UPGRADES.panicSprint.cost,3);
 assert.throws(()=>adaptWorkshopGame('unknown source'),/anchor changed/);
});

test('reopened diagnostic tiles run in the real sandbox and walking matches the original map',async()=>{
 const image='data:image/png;base64,'+readFileSync(new URL('../workshop/templates/tileset-test-128x64.png',import.meta.url)).toString('base64');
 const original=createWorkshopDraft(),custom=createWorkshopDraft();custom.maps.manor.tiles=image;
 const reopened=validateWorkshopDraft(JSON.parse(JSON.stringify(custom))),runs=[];
 for(const draft of [original,reopened]){
  const h=surfaceHarness(draft),result=await vm.runInNewContext('(async()=>{'+gameSource()+';return {world,player,workshopTerrain};})()',h.sandbox);
  const start={x:result.player.x,y:result.player.y};
  h.sandbox.window.send('keydown',{code:'KeyS',target:h.nodes.get('game')});
  for(let i=0;i<110;i++)h.frames.shift()(i*16+16);
  h.sandbox.window.send('keyup',{code:'KeyS',target:h.nodes.get('game')});
  assert.ok(result.player.y-start.y>2,'actual held movement leaves the cart spawn');
  runs.push({x:result.player.x,y:result.player.y,tiles:Array.from(result.world.tiles),solid:Array.from(result.world.solidTiles)});
  if(draft===reopened)assert.equal(result.workshopTerrain.manor.image.src,image);
 }
 assert.deepEqual(runs[0],runs[1],'a tileset change leaves movement and geometry unchanged');
});

test('lair sandbox loads all art, renders both potion states and keeps movement/targets intact',async()=>{
 const draft=createWorkshopDraft();draft.lair.tiles='data:image/png;base64,'+readFileSync(new URL('../workshop/templates/tileset-test-128x64.png',import.meta.url)).toString('base64');
 for(const id of Object.keys(LAIR_ART_SLOTS))draft.lair.props[id]='data:image/png;base64,'+readFileSync(new URL(`../workshop/templates/lair/${id}-test.png`,import.meta.url)).toString('base64');
 const restored=validateWorkshopDraft(JSON.parse(JSON.stringify(draft))),positions=[];
 for(const project of [createWorkshopDraft(),restored])for(const built of [false,true]){
  const h=surfaceHarness(project,'manor','lair');h.sandbox.window.WORKSHOP_LAIR_POTION=built;
  const state=await vm.runInNewContext('(async()=>{'+gameSource()+';return {world,player,camp,workshopLairImages,workshopTerrain,lairTarget};})()',h.sandbox);
  assert.equal(state.world.lair,true);assert.equal(state.camp.buildings.potion,built);
  if(project===restored){assert.equal(state.workshopLairImages.size,7);assert.equal(state.workshopTerrain.lair.image.src,draft.lair.tiles);}
  h.sandbox.window.send('keydown',{code:'KeyW',target:h.nodes.get('game')});
  for(let i=0;i<100;i++)h.frames.shift()(i*16+16);
  h.sandbox.window.send('keyup',{code:'KeyW',target:h.nodes.get('game')});
  assert.equal(state.lairTarget(state.world,state.player).kind,'tunnel');
  positions.push([state.player.x,state.player.y,...state.world.solidTiles]);
 }
 assert.deepEqual(positions[0],positions[2]);assert.deepEqual(positions[1],positions[3]);
});

test('door shortcut starts beside a real door; E animates, release closes and full hold latches',async()=>{
 const h=surfaceHarness(createWorkshopDraft(),'manor','door');h.sandbox.window.WORKSHOP_SEED=1;h.sandbox.window.WORKSHOP_DIFFICULTY='normal';
 const state=await vm.runInNewContext('(async()=>{'+gameSource()+';return {world,player,getDoor:()=>world.roomDoors[0]};})()',h.sandbox);
 const door=state.getDoor();assert.ok(door);assert.ok(Math.hypot(state.player.x-door.x,state.player.y-door.y)<1.6);
 h.sandbox.window.send('keydown',{code:'KeyE',target:h.nodes.get('game'),repeat:false});
 let time=1;for(let i=0;i<30;i++){h.frames.shift()(time);time+=16;}assert.ok(door.progress>0 && door.progress<1);
 h.sandbox.window.send('keyup',{code:'KeyE',target:h.nodes.get('game')});
 for(let i=0;i<25;i++){h.frames.shift()(time);time+=16;}assert.equal(door.progress,0);
 h.sandbox.window.send('keydown',{code:'KeyE',target:h.nodes.get('game'),repeat:false});
 for(let i=0;i<140;i++){h.frames.shift()(time);time+=16;}assert.equal(door.open,true);
 h.sandbox.window.send('keyup',{code:'KeyE',target:h.nodes.get('game')});
 for(let i=0;i<25;i++){h.frames.shift()(time);time+=16;}assert.equal(door.open,true);
});

test('door-and-guard room uses real controls to reveal the goblin, break sight and retain pursuit memory',async()=>{
 const h=surfaceHarness(createWorkshopDraft(),'manor','guard-door');
 const state=await vm.runInNewContext('(async()=>{'+gameSource()+';return {world,player,guards,objects,hidingSpots,run};})()',h.sandbox);
 const d=state.world.roomDoors[0],g=state.guards[0];assert.equal(state.guards.length,1);assert.equal(state.hidingSpots.length,1);assert.equal(state.objects.length,3);
 assert.equal(state.run.phase,'exploring');assert.equal(g.state,'patrol');
 h.sandbox.window.send('keydown',{code:'KeyE',target:h.nodes.get('game'),repeat:false});
 let time=1;for(let i=0;i<116;i++){h.frames.shift()(time);time+=16;}
 assert.ok(d.progress>.85 && d.progress<1);assert.equal(g.state,'chase');const remembered=JSON.stringify(g.lastSeen);
 h.sandbox.window.send('keyup',{code:'KeyE',target:h.nodes.get('game')});
 for(let i=0;i<25;i++){h.frames.shift()(time);time+=16;}
 assert.equal(d.progress,0);assert.equal(g.state,'search');assert.equal(JSON.stringify(g.lastSeen),remembered);
});

test('each room purpose launches in the real sandbox with its themed furniture, loot rules, guard and door',async()=>{
 for(const type of ['dining','storage','prayer','bedroom','kitchen','armoury']){
  const h=surfaceHarness(createWorkshopDraft(),'manor','room-pass');h.sandbox.window.WORKSHOP_ROOM=type;
  const state=await vm.runInNewContext('(async()=>{'+gameSource()+';return {world,player,objects,hidingSpots,guards};})()',h.sandbox);
  assert.equal(state.world.rooms[1].roomType,type);assert.equal(state.objects.filter(o=>o.roomType===type).length,3);
  assert.equal(state.objects.filter(o=>o.roomFurniture).length,3);assert.equal(state.hidingSpots.length,1);assert.equal(state.guards.length,1);
  assert.equal(h.nodes.get('job-label').textContent.length>0,true);
  for(let i=0;i<4;i++)h.frames.shift()(i*16+1);
  h.sandbox.window.send('keydown',{code:'KeyE',target:h.nodes.get('game'),repeat:false});for(let i=0;i<20;i++)h.frames.shift()(i*16+80);
  assert.ok(state.world.roomDoors[0].progress>0,'E reaches the door instead of hiding in the barrel');
 }
});

test('visible-key shortcut packs with a real E tap and cannot duplicate on a second tap',async()=>{
 const h=surfaceHarness(createWorkshopDraft(),'manor','surface');h.sandbox.window.WORKSHOP_SEED=1;h.sandbox.window.WORKSHOP_DIFFICULTY='normal';
 const state=await vm.runInNewContext('(async()=>{'+gameSource()+';return {world,player,loot,objects};})()',h.sandbox);
 const key=state.loot.ground.find(i=>i.type==='treasureKey');assert.ok(key);
 const source=state.objects.find(o=>o.id===key.surfaceId);assert.equal(source.searched,false);
 h.sandbox.window.send('keydown',{code:'KeyE',target:h.nodes.get('game'),repeat:false});
 h.sandbox.window.send('keyup',{code:'KeyE',target:h.nodes.get('game')});
 assert.ok(state.loot.bag.some(i=>i.id===key.id));assert.equal(source.searched,false);
 assert.equal(state.loot.ground.some(i=>i.id===key.id),false);
 h.sandbox.window.send('keydown',{code:'KeyE',target:h.nodes.get('game'),repeat:false});
 h.sandbox.window.send('keyup',{code:'KeyE',target:h.nodes.get('game')});
 for(let i=0;i<4;i++)h.frames.shift()(i*16+1);
 assert.equal(state.loot.bag.filter(i=>i.id===key.id).length,1);
});

test('imported furniture renders at its exact footprint in a real room and survives reopening',async()=>{
 const d=createWorkshopDraft(),source='data:image/png;base64,'+readFileSync(new URL('../workshop/templates/furniture/bed_1x2-example.png',import.meta.url)).toString('base64');
 d.furniture.bed_1x2=source;
 const reopened=validateWorkshopDraft(JSON.parse(JSON.stringify(d))),h=surfaceHarness(reopened,'manor','room-pass');h.sandbox.window.WORKSHOP_ROOM='bedroom';
 const state=await vm.runInNewContext('(async()=>{'+gameSource()+';return {world,objects,workshopFurnitureImages,drawRoomFurniture,CONFIG};})()',h.sandbox);
 assert.equal(state.workshopFurnitureImages.get('bed_1x2').src,source);
 const bed=state.objects.find(o=>o.roomFurniture==='bed');assert.equal(bed.height,2);
 const calls=[],ctx={globalAlpha:1,save(){},restore(){},drawImage(...a){calls.push(a);}};
 state.drawRoomFurniture(ctx,bed,7,9);assert.equal(calls.length,1);
 assert.deepEqual(calls[0].slice(1),[bed.tileX*state.CONFIG.tile+7,bed.tileY*state.CONFIG.tile+9,state.CONFIG.tile,2*state.CONFIG.tile]);
 for(let i=0;i<4;i++)h.frames.shift()(i*16+1);
 const bad=createWorkshopDraft();bad.furniture.bed_1x2='data:image/png;base64,'+readFileSync(new URL('../workshop/templates/furniture/bed_1x1-example.png',import.meta.url)).toString('base64');
 const b=surfaceHarness(bad);await assert.rejects(vm.runInNewContext('(async()=>{'+gameSource()+'})()',b.sandbox),/wrong size/);
});


test('Pages solo uses real browser saves and normal progression, launches every map without network and restores progress',async()=>{
 const html=readFileSync(new URL('../docs/game.html',import.meta.url),'utf8'),code=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
 const entries=new Map(),storage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v)};
 const h=surfaceHarness(createWorkshopDraft(),'manor','lair',storage);
 const state=await vm.runInNewContext('(async()=>{'+code+';return {camp,profile,enterLair,launchRun,selectJob,persistCamp,persistProfile,getState:()=>({world,loot,run,player})};})()',h.sandbox);
 assert.equal(state.profile.xp,0);assert.equal(state.camp.counts.gold,0);assert.equal(state.camp.counts.scrap,2);assert.ok(state.getState().world.lair);
 state.camp.counts.gold=17;state.profile.xp=23;state.persistCamp();state.persistProfile();
 const reopened=surfaceHarness(createWorkshopDraft(),'manor','lair',storage),back=await vm.runInNewContext('(async()=>{'+code+';return {camp,profile};})()',reopened.sandbox);
 assert.equal(back.camp.counts.gold,17);assert.equal(back.profile.xp,23);
 for(const id of ['manor','hold','sanctuary']){
  state.enterLair();assert.ok(state.launchRun(state.selectJob(id,'normal')));assert.equal(state.getState().world.job.jobId,id);assert.ok(state.getState().loot.ground.some(i=>i.type==='treasureKey'));
  for(let i=0;i<3;i++)h.frames.shift()(i*16+1);
 }
 assert.ok(html.includes('const terrainArt = humanTerrain;'));assert.ok(html.includes('href="index.html"'));
});

test('base chest, cupboard and crate have their own artwork slots; the cupboard rises one tile up its back wall',async()=>{
 const {FURNITURE_ART_SLOTS,furnitureArtId,drawFurnitureArt}=await import('../src/furniture-art.js');
 const manifest=JSON.parse(readFileSync(new URL('../workshop/templates/furniture/manifest.json',import.meta.url)));assert.deepEqual(manifest,JSON.parse(JSON.stringify(FURNITURE_ART_SLOTS)));
 assert.equal(furnitureArtId({type:'crate',tileX:2,tileY:3}),'baseCrate_1x1');assert.equal(furnitureArtId({type:'crate',roomFurniture:'crate'}),'crate_1x1');
 for(const type of ['chest','cupboard','crate'])assert.equal(FURNITURE_ART_SLOTS[furnitureArtId({type})].container,type);
 const calls=[],ctx={save(){},restore(){},globalAlpha:1,drawImage:(...a)=>calls.push(a.slice(1))},images=new Map([['baseCupboard_1x1',{}],['baseChest_1x1',{}]]);
 assert.equal(drawFurnitureArt(ctx,images,{type:'cupboard',tileX:2,tileY:3},0,0,24),true);assert.deepEqual(calls.pop(),[48,48,24,48]);
 assert.equal(drawFurnitureArt(ctx,images,{type:'chest',tileX:2,tileY:3},0,0,24),true);assert.deepEqual(calls.pop(),[48,72,24,24]);
 assert.equal(drawFurnitureArt(ctx,images,{type:'crate',tileX:2,tileY:3},0,0,24),false);
 const draft=createWorkshopDraft();draft.furniture.baseCupboard_1x1='data:image/png;base64,AAAA';assert.deepEqual(validateWorkshopDraft(draft),draft);
});
