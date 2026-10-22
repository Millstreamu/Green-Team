// Optional native Canvas QA (requires @napi-rs/canvas). No browser/server needed.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { drawTerrainTile } from '../src/terrain-art.js';
import { createWorkshopDraft, validateWorkshopDraft } from '../workshop/model.js';
import { workshopJoinWorld, WORKSHOP_JOIN_SCENES } from '../workshop/tile-checks.js';

const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/@napi-rs/canvas' : '@napi-rs/canvas');
const read = name => readFileSync(new URL('../' + name, import.meta.url));
const testBytes = read('workshop/templates/tileset-test-128x64.png');
const testImage = await loadImage(testBytes), original = await loadImage(read('workshop/templates/tileset-example-128x64.png'));
const names = ['floor','wall_top_horz','wall_vert','wall_corner_top_left','wall_bottom_horz'];
const frames = Object.fromEntries(names.map((name,i)=>[name,{x:i%4*32,y:Math.floor(i/4)*32,width:32,height:32}]));
const art = { image: testImage, frames }, reference = { image: original, frames };
const neighbors = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
for(let mask=0;mask<256;mask++) {
  const world={width:5,height:5,tiles:new Uint8Array(25)};
  neighbors.forEach(([x,y],i)=>{if(mask&1<<i)world.tiles[(y+2)*5+x+2]=1;});
  const pixels=[];
  for(const sheet of [reference,art]) {
    const c=createCanvas(32,32),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
    drawTerrainTile(ctx,sheet,world,2,2,0,0,32);
    pixels.push(ctx.getImageData(0,0,32,32).data.filter((_,i)=>i%4===3));
  }
  assert.deepEqual(pixels[0],pixels[1],`silhouette changed at neighbor mask ${mask}`);
}
const scenes=createCanvas(480*3,390),sc=scenes.getContext('2d');
sc.fillStyle='#15221d';sc.fillRect(0,0,scenes.width,scenes.height);
let column=0;
for(const [id,label] of Object.entries(WORKSHOP_JOIN_SCENES)) {
  const world=workshopJoinWorld(id),c=createCanvas(480,352),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++)drawTerrainTile(ctx,art,world,x,y,x*32,y*32,32);
  sc.drawImage(c,column*480,38);sc.fillStyle='#efe8ca';sc.font='16px sans-serif';sc.fillText(label,column*480+10,25);column++;
}
writeFileSync(new URL('../build/workshop-tiles-joins-qa.png',import.meta.url),scenes.toBuffer('image/png'));

// Reopen the JSON before loading its PNG through the actual sandbox renderer.
const draft=createWorkshopDraft();draft.maps.manor.tiles='data:image/png;base64,'+testBytes.toString('base64');
const reopened=validateWorkshopDraft(JSON.parse(JSON.stringify(draft)));
const sandbox={window:{WORKSHOP_DRAFT:reopened},Image:class{async decode(){this.bitmap=await loadImage(this.src);this.width=this.naturalWidth=this.bitmap.width;this.height=this.naturalHeight=this.bitmap.height;}},
  fetch(){throw Error('No network permitted');},document:{createElement:()=>createCanvas(1,1)},ResizeObserver:class{constructor(f){this.f=f;}observe(){this.f();}},performance:{now:()=>0},console};
const code=read('workshop/game-bundle.js').toString().split("const canvas = document.querySelector('#game');")[0];
const api=await vm.runInNewContext('(async()=>{'+code+';return {createRenderer,generateDungeon,dungeonConfig,createSearchables,createHidingSpots,createRun,createVitality,selectJob,workshopRunTuning};})()',sandbox);
const canvas=createCanvas(844,390),ctx=canvas.getContext('2d');
const proxy=new Proxy(ctx,{get(o,k){if(k==='drawImage')return(im,...a)=>o.drawImage(im.bitmap??im,...a);const v=o[k];return typeof v==='function'?v.bind(o):v;},set(o,k,v){o[k]=v;return true;}});
const surface={getBoundingClientRect:()=>({width:844,height:390}),getContext:()=>proxy,set width(v){canvas.width=v;},get width(){return canvas.width;},set height(v){canvas.height=v;},get height(){return canvas.height;}};
const render=await api.createRenderer(surface,createCanvas(1,1));
const world=api.generateDungeon(2371,api.dungeonConfig(reopened.generator.manor));world.job=api.selectJob('manor','normal');world.tuning=api.workshopRunTuning(reopened,'manor');
const objects=api.createSearchables(world),hiding=api.createHidingSpots(world,objects),player={...world.spawn,...api.createVitality(),facing:1,moving:false,phase:0};
render(world,player,{held:null,ground:[]},null,api.createRun(world),false,[],objects,null,null,[],null,[],hiding);
writeFileSync(new URL('../build/workshop-tiles-game-qa.png',import.meta.url),canvas.toBuffer('image/png'));
console.log('256 rendered neighbor masks preserve original alpha coverage; three join scenes and the reopened real-game scene rendered.');
