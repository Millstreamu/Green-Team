import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {workshopTerrainArt,drawTerrainOverview} from '../src/terrain-art.js';
import {workshopJoinWorld} from '../workshop/tile-checks.js';
import {createWorkshopDraft} from '../workshop/model.js';
import {createLairWorld,createCamp} from '../src/lair.js';
import {drawLairOverview} from '../workshop/lair-preview.js';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const read=f=>readFileSync(new URL('../'+f,import.meta.url));
const data=f=>'data:image/png;base64,'+read(f).toString('base64');
const src=data('workshop/templates/deep-walls/deep-walls-example-128x128.png');
const art=workshopTerrainArt(await loadImage(src));
const contact=createCanvas(960,768),c=contact.getContext('2d');c.fillStyle='#101517';c.fillRect(0,0,960,768);
for(const [i,id]of ['room','halls','thin'].entries()){
 const w=workshopJoinWorld(id),tile=createCanvas(480,384);drawTerrainOverview(tile.getContext('2d'),art,w,32,0,32);
 // Compare every floor pixel to an untouched floor tile, not just geometry.
 // This catches raised caps occluding short hallways without a nearby player.
 const expected=createCanvas(32,32),ec=expected.getContext('2d');ec.drawImage(art.image,0,0,32,32,0,0,32,32);
 const floorPixels=ec.getImageData(0,0,32,32).data;
 for(let y=0;y<w.height;y++)for(let x=0;x<w.width;x++)if(w.tiles[y*w.width+x]){
  assert.deepEqual(tile.getContext('2d').getImageData(x*32,(y+1)*32,32,32).data,floorPixels,`${id}: floor remains fully visible at ${x},${y}`);
 }
 c.drawImage(tile,i%2*480,Math.floor(i/2)*384);
}
const lair=createCanvas(1,1);drawLairOverview(lair,createLairWorld(createCamp()),art,new Map());c.drawImage(lair,480,384,480,384);
writeFileSync(new URL('../build/deep-walls-joins-qa.png',import.meta.url),contact.toBuffer('image/png'));
const check=createCanvas(96,128),cc=check.getContext('2d');const w={width:3,height:3,tiles:new Uint8Array([0,0,0,0,0,0,0,1,0])};drawTerrainOverview(cc,art,w,32,0,32);
for(let y=64;y<96;y++)assert.ok(cc.getImageData(48,y,1,1).data[3]>0);
const draft=createWorkshopDraft();for(const id of ['manor','hold','sanctuary'])draft.maps[id].tiles=src;draft.lair.tiles=src;
const sandbox={window:{WORKSHOP_DRAFT:draft},Image:class{async decode(){this.bitmap=await loadImage(this.src);this.width=this.naturalWidth=this.bitmap.width;this.height=this.naturalHeight=this.bitmap.height;}},fetch(){throw Error('No network');},document:{createElement:()=>createCanvas(1,1)},ResizeObserver:class{constructor(f){this.f=f;}observe(){this.f();}},performance:{now:()=>0},console};
const source=read('workshop/game-bundle.js').toString().split("const canvas = document.querySelector('#game');")[0];
const api=await vm.runInNewContext('(async()=>{'+source+';return {createRenderer,generateDungeon,dungeonConfig,createSearchables,createHidingSpots,createRun,createVitality,selectJob,workshopRunTuning,workshopTerrain,createLairWorld,createCamp};})()',sandbox);
assert.ok(['manor','hold','sanctuary','lair'].every(id=>api.workshopTerrain[id].deep));
const screens=createCanvas(1008,768),screen=screens.getContext('2d');
for(const [i,id]of ['lair','manor','hold','sanctuary'].entries()){
 const canvas=createCanvas(1008,768),ctx=canvas.getContext('2d');
 const proxy=new Proxy(ctx,{get(o,k){if(k==='drawImage')return(im,...a)=>o.drawImage(im.bitmap??im,...a);const v=o[k];return typeof v==='function'?v.bind(o):v;},set(o,k,v){o[k]=v;return true;}});
 const surface={getBoundingClientRect:()=>({width:1008,height:768}),getContext:()=>proxy,set width(v){canvas.width=v;},get width(){return canvas.width;},set height(v){canvas.height=v;},get height(){return canvas.height;}};
 const render=await api.createRenderer(surface,createCanvas(1,1));let world;
 if(id==='lair')world=api.createLairWorld(api.createCamp());
 else{world=api.generateDungeon(2371,api.dungeonConfig(draft.generator[id]));world.job=api.selectJob(id,'normal');world.tuning=api.workshopRunTuning(draft,id);}
 const objects=id==='lair'?[]:api.createSearchables(world),hiding=id==='lair'?[]:api.createHidingSpots(world,objects);
 const player={...(id==='lair'?{x:9,y:7}:world.spawn),...api.createVitality(),facing:1,moving:false,phase:0};
 const run=api.createRun(world);if(id==='lair'){run.phase='lair';run.entrance={...world.stations.find(s=>s.kind==='tunnel')};}
 render(world,player,{held:null,ground:[]},null,run,false,[],objects,null,null,[],null,[],hiding);
 screen.drawImage(canvas,i%2*504,Math.floor(i/2)*384,504,384);screen.fillStyle='#f1e8ce';screen.font='16px sans-serif';screen.fillText(id+' · deep wall sandbox',i%2*504+8,Math.floor(i/2)*384+20);
}
writeFileSync(new URL('../build/deep-walls-game-qa.png',import.meta.url),screens.toBuffer('image/png'));
console.log('Native QA: 3 join scenes + actual lair, full-height face alpha, and real sandbox frames for lair/all 3 maps pass.');
