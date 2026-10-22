import { FURNITURE_ART_SLOTS } from '../src/furniture-art.js';
import { ABILITY_ART_SLOTS } from './ability-art.js';
// Build-time adapter for an isolated V97 solo sandbox. Production source/save rules
// remain untouched. Every source patch fails closed when its expected anchor changes.
export function adaptWorkshopGame(source) {
  function swap(from,to) { if(!source.includes(from)) throw Error(`Workshop game anchor changed: ${from.slice(0,80)}`); source=source.replace(from,to); }
  const prelude=`
const workshopDraft = window.WORKSHOP_DRAFT;
const workshopImages = new Map();
for (const [id, src] of Object.entries(workshopDraft.sprites)) { const img=new Image(); img.src=src; await img.decode(); workshopImages.set(id,img); }
const workshopFurnitureImages = new Map();
for(const[id,src]of Object.entries(workshopDraft.furniture??{})){const img=new Image();img.src=src;await img.decode();const slot=${JSON.stringify(FURNITURE_ART_SLOTS)}[id];if(!slot||img.naturalWidth!==slot.width||img.naturalHeight!==slot.height)throw Error('Furniture PNG has the wrong size.');workshopFurnitureImages.set(id,img);}
const workshopAbilityImages = new Map();
for(const[id,src]of Object.entries(workshopDraft.abilities??{})){const img=new Image();img.src=src;await img.decode();const slot=${JSON.stringify(ABILITY_ART_SLOTS)}[id];if(!slot||img.naturalWidth!==slot.width||img.naturalHeight!==slot.height)throw Error('Ability icon PNG has the wrong size.');workshopAbilityImages.set(id,img);}
function workshopDrawAbility(canvas,id){const im=workshopAbilityImages.get(id);if(!im)return false;const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;c.drawImage(im,0,0,canvas.width,canvas.height);return true;}
const workshopWords = workshopDraft.words ?? {};
function workshopWordList(defaults){return Object.freeze(Object.fromEntries(Object.entries(defaults).map(([id,words])=>{const {name,...custom}=workshopWords[id]??{};return [id,{...words,...custom}];})));}
const workshopTerrain = {};
for(const id of ['manor','hold','sanctuary']) {
 const img=new Image();img.src=workshopDraft.maps[id].tiles??WORKSHOP_TERRAIN_SOURCE;await img.decode();
 workshopTerrain[id]=workshopTerrainArt(img);
}
const workshopLairImages = new Map();
for(const [id,src] of Object.entries(workshopDraft.lair.props)){const img=new Image();img.src=src;await img.decode();workshopLairImages.set(id,img);}
{const img=new Image();img.src=workshopDraft.lair.tiles??WORKSHOP_TERRAIN_SOURCE;await img.decode();workshopTerrain.lair=workshopTerrainArt(img);}

function workshopDrawItem(ctx,item,x,y,size) {
 const image=workshopImages.get(item.type); if(!image)return false;
 const base=LOOT_TYPES[item.type].cells, cells=itemCells(item);
 const bw=Math.max(...base.map(c=>c[0]))+1,bh=Math.max(...base.map(c=>c[1]))+1;
 const rw=Math.max(...cells.map(c=>c[0]))+1,rh=Math.max(...cells.map(c=>c[1]))+1;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(x+rw*size/2,y+rh*size/2);ctx.rotate(((item.rotation??0)%4)*Math.PI/2);
 ctx.drawImage(image,-bw*size/2,-bh*size/2,bw*size,bh*size);ctx.restore();
 if(item.count>1&&size>=18){ctx.fillStyle='#f4e7bf';ctx.font='bold '+Math.max(9,Math.floor(size*.23))+'px monospace';ctx.textAlign='right';ctx.textBaseline='bottom';ctx.fillText(item.count,x+size-2,y+size-2);}return true;
}
`;
  swap("export function drawRoomFurniture(ctx,object,ox,oy) {", "export function drawRoomFurniture(ctx,object,ox,oy) {\n if(drawFurnitureArt(ctx,workshopFurnitureImages,object,ox,oy))return;");
  swap("if (pass !== 'ui' && !object.roomFurniture) {", "if (pass !== 'ui' && !object.roomFurniture && !drawFurnitureArt(ctx,workshopFurnitureImages,object,ox,oy)) {");
  // Ability icons are keyed by ability, so Quiet hands and Lucky goblin need not share the Vanish/coin item art.
  swap("drawStationSprite(get(`passive-icon-${id}`),PASSIVE_DETAILS[id].sprite);", "if(!workshopDrawAbility(get(`passive-icon-${id}`),id))drawStationSprite(get(`passive-icon-${id}`),PASSIVE_DETAILS[id].sprite);");
  swap("drawStationSprite(get('passive-sprite'),info.sprite);", "if(!workshopDrawAbility(get('passive-sprite'),id))drawStationSprite(get('passive-sprite'),info.sprite);");
  // Edited words: text templates replace defaults; names replace every list the menus, sack and stash read.
  swap("export const GEAR_WORDS = Object.freeze({", "export const GEAR_WORDS = workshopWordList({");
  swap("export const ABILITY_WORDS = Object.freeze({", "export const ABILITY_WORDS = workshopWordList({");
  swap("const slot = sounds[cue];","const slot = sounds[cue] && { ...sounds[cue], src: workshopDraft.audio[cue] ?? sounds[cue].src };");
  swap("export function drawItem(ctx, item, x, y, size, outline = null) {", "export function drawItem(ctx, item, x, y, size, outline = null) {\n  if(workshopDrawItem(ctx,item,x,y,size)) return;");
  swap("export function drawStationItem(ctx, item, x, y, size) {", "export function drawStationItem(ctx, item, x, y, size) {\n  if(workshopDrawItem(ctx,item,x,y,size)) return;");
  swap("export function drawStationSprite(canvas, type) {", "export function drawStationSprite(canvas, type) {\n if(type==='quickSearch'&&workshopDrawAbility(canvas,type))return;\n if(workshopImages.has(type)){const c=canvas.getContext('2d'),im=workshopImages.get(type);c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;const s=Math.min(canvas.width/im.width,canvas.height/im.height);c.drawImage(im,(canvas.width-im.width*s)/2,(canvas.height-im.height*s)/2,im.width*s,im.height*s);return;}");
  swap("const terrainArt = !world.lair && world.job?.jobId === 'manor' ? humanTerrain : null;", "const terrainArt = world.lair ? workshopTerrain.lair ?? null : workshopTerrain[world.job?.jobId] ?? (world.job?.jobId === 'manor' ? humanTerrain : null);");
  swap("if (station.kind === 'stash') {", "if (workshopLairImages.has(station.kind)) {} else if (station.kind === 'stash') {");
  swap("  ctx.fillStyle = built ? '#62533d'", "  if(drawLairArt(ctx,workshopLairImages,world,built?'potion':'potionSite',ox,oy))return;\n  ctx.fillStyle = built ? '#62533d'");
  const cartBody="      rect(tx - 14, ty - 16, 28, 18, '#6e7a74'); rect(tx - 11, ty - 13, 22, 10, '#26322f');\n      rect(tx - 12, ty + 1, 6, 5, '#1a2422'); rect(tx + 6, ty + 1, 6, 5, '#1a2422');";
  swap(cartBody,"      if(!workshopLairImages.has('tunnel')){\n"+cartBody+"\n      }");
  swap("      drawLair(ctx, world, lairTarget(world, player), ox, oy);", "      drawLair(ctx, world, lairTarget(world, player), ox, oy);\n      for(const station of world.stations)if(station.kind!=='potion'&&workshopLairImages.has(station.kind)){const b=lairArtBounds(world,station.kind);add(b.y+b.height,()=>drawLairArt(ctx,workshopLairImages,world,station.kind,ox,oy));}");
  swap("const weights = profile && Object.hasOwn(profile.containers, containerType) ? profile.containers[containerType] : null;", "const weights = workshopDraft.maps[jobId]?.weights[containerType] ?? (profile && Object.hasOwn(profile.containers, containerType) ? profile.containers[containerType] : null);");
  swap("const seed = crypto.getRandomValues(new Uint32Array(1))[0];", "const seed = window.WORKSHOP_SEED;");
  swap("dungeonConfig(GENERATOR_PRESETS[job.jobId])", "dungeonConfig(workshopDraft.generator[job.jobId])");
  swap("world = dungeon; world.roomThemes=true; world.job = job;", "world = dungeon; world.roomThemes=true; world.job = job; world.tuning = workshopRunTuning(workshopDraft,job.jobId);");
  // Prevent even read access to real solo saves. A test starts with disposable supplies.
  swap("try { campStorage = window.localStorage; } catch {}", "campStorage = undefined;");
  swap("const profile = loadProfile(campStorage);", `const profile = loadProfile(campStorage);
profile.xp=500;profile.earnedXp=500;
for(const material of ['scrap','cloth','meat','berries','mushroom'])camp.counts[material]=20;
camp.counts.gold=100;
camp.buildings.potion=window.WORKSHOP_LAIR_POTION===true;`);
  // Frozen upgrade definitions are replaced before they are consumed by menus.
  source=source.replace(/cost: PROGRESSION\.recipeCosts\.(\w+)/g,(_,id)=>`cost: workshopDraft.costs.${id}`)
    .replace(/cost: PROGRESSION\.quickSearchCost/g,'cost: workshopDraft.costs.quickSearch')
    .replace(/(\w+): Object\.freeze\(\{ name: ('[^']*'), cost: (\d+), kind: 'passive'/g,(_,id,name)=>`${id}: Object.freeze({ name: ${name}, cost: workshopDraft.costs.${id}, kind: 'passive'`);
  const upgradesStart=source.indexOf("export const PERSONAL_UPGRADES = Object.freeze({"),upgradesEnd=source.indexOf("\n});",upgradesStart);
  if(upgradesStart<0||upgradesEnd<0)throw Error('Workshop game anchor changed: PERSONAL_UPGRADES');
  source=source.slice(0,upgradesStart)+source.slice(upgradesStart,upgradesEnd).replace(/(\w+): Object\.freeze\(\{ name: '([^']*?)( recipe)?', /g,(_,id,name,recipe)=>`${id}: Object.freeze({ name: workshopWords.${id}?.name ? workshopWords.${id}.name${recipe?" + ' recipe'":''} : '${name}${recipe??''}', `)+source.slice(upgradesEnd);
  swap("export const SNARE_RECIPE = RECIPES.snare.materials;", "for(const [id,r] of Object.entries(RECIPES)){r.materials=workshopDraft.materials[id];r.xpCost=workshopDraft.costs[id]??r.xpCost;}\nfor(const [id,w] of Object.entries(workshopWords))if(w.name){if(LOOT_TYPES[id])LOOT_TYPES[id].name=w.name;if(RECIPES[id])RECIPES[id].name=w.name;}\nexport const SNARE_RECIPE = RECIPES.snare.materials;");
  swap("enterLair(); requestAnimationFrame(frame);", `enterLair();
for(const option of document.querySelectorAll('#guide-item-choice option')){const name=workshopWords[option.value]?.name;if(name)option.textContent=option.value==='berries'?name+' · throw or cook':name;}
if(window.WORKSHOP_START==='dungeon'||window.WORKSHOP_START==='door'||window.WORKSHOP_START==='surface')launchRun(selectJob(window.WORKSHOP_MAP,window.WORKSHOP_DIFFICULTY));
if(window.WORKSHOP_START==='surface'){
 const key=loot.ground.find(i=>i.type==='treasureKey'),source=objects.find(o=>o.id===key?.surfaceId);
 if(source){Object.assign(player,source.approach);guards=[];updateTarget();tell('Tap E to take the visible key. Coins also sit on furniture. Open the map to find the locked room.');}
 else tell('No safe treasure room on this seed. Try Manor seed 1.');
}
if(window.WORKSHOP_START==='door'){
 const d=world.roomDoors?.[0];
 if(d){
  const c=d.cells[0],positions=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:c.x+.5+dx,y:c.y+.5+dy}));
  const spot=positions.find(p=>canStand(world,p.x,p.y)&&canOpenRoomDoor(world,{...player,...p},d));
  if(spot)Object.assign(player,spot);
  guards=[];updateTarget();tell('Door test: hold E to open. Release early to let it snap shut. Fully open stays open.');
 }else tell('No suitable single-width door on this layout. Try Manor with seed 1 and its default layout.');
}
if(window.WORKSHOP_START==='guard-door'||window.WORKSHOP_START==='room-pass'){
 const roomPass=window.WORKSHOP_START==='room-pass',testMap=roomPass?window.WORKSHOP_MAP:'manor';
 const job=selectJob(testMap,window.WORKSHOP_DIFFICULTY??'normal'),tuning=workshopRunTuning(workshopDraft,testMap);
 const f=roomPass?createRoomPassFixture(window.WORKSHOP_ROOM,job,tuning):createDoorTestRoom();world=f.world;world.job=job;world.tuning=tuning;
 player={...f.start,...createVitality(),id:'goblin',facing:1,phase:0,moving:false};loot=createLoot();loot.ground=f.ground??[];objects=f.objects;hidingSpots=f.hidingSpots;guards=f.guards;
 pressure=createPressure(world,[...objects,...hidingSpots]);pressure.doors=[];run=createRun(world,performance.now());
 document.querySelector('#seed').textContent='Door & guard room';document.querySelector('#rooms').textContent='Two rooms · one guard';
 document.querySelector('#job-label').textContent=roomPass?ROOM_TYPES[world.rooms[1].roomType].name:'Door & guard test';document.querySelector('#regenerate').hidden=false;document.querySelector('#sack-tab').hidden=false;
 updateTarget();tell('Hold E to peek. Release early to block sight. Fully open stays open. Search the room or try the hiding barrel.');
}
window.addEventListener('message',event=>{if(event.source===parent&&event.data==='workshop-stop')input.clear();});
requestAnimationFrame(frame);
parent.postMessage({type:'workshop-ready',seed:window.WORKSHOP_SEED},'*');`);
  // Remove all runtime network loading: the existing five-piece sheet is embedded.
  swap("const response = await fetchData(HUMAN_TERRAIN_SOURCE.manifest);", "const response = {ok:true,json:async()=>WORKSHOP_HUMAN_METADATA};");
  return prelude+source;
}
