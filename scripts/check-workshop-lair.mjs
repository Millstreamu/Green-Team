// Optional native rendering QA; requires @napi-rs/canvas, not a browser.
import { createRequire } from 'node:module';
import { readFileSync,writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createWorkshopDraft,validateWorkshopDraft } from '../workshop/model.js';
import { LAIR_ART_SLOTS } from '../workshop/lair-art.js';
import { drawLairOverview } from '../workshop/lair-preview.js';
import { createCamp,createLairWorld } from '../src/lair.js';

const require=createRequire(import.meta.url);
const {createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const read=name=>readFileSync(new URL('../'+name,import.meta.url));
const png=name=>'data:image/png;base64,'+read(name).toString('base64');
const draft=createWorkshopDraft();draft.lair.tiles=png('workshop/templates/tileset-test-128x64.png');
for(const id of Object.keys(LAIR_ART_SLOTS))draft.lair.props[id]=png(`workshop/templates/lair/${id}-test.png`);
const restored=validateWorkshopDraft(JSON.parse(JSON.stringify(draft)));
const images=new Map(await Promise.all(Object.entries(restored.lair.props).map(async([id,src])=>[id,await loadImage(src)])));
const terrain={image:await loadImage(restored.lair.tiles),frames:Object.fromEntries(['floor','wall_top_horz','wall_vert','wall_corner_top_left','wall_bottom_horz'].map((name,i)=>[name,{x:i%4*32,y:Math.floor(i/4)*32,width:32,height:32}]))};
const contact=createCanvas(1152,960),cc=contact.getContext('2d');cc.fillStyle='#17231e';cc.fillRect(0,0,1152,960);
for(const built of [false,true])for(const custom of [false,true]){
 const camp=createCamp();camp.buildings.potion=built;const world=createLairWorld(camp),canvas=createCanvas(1,1);
 drawLairOverview(canvas,world,custom?terrain:null,custom?images:new Map(),built?'potion':'potionSite');
 const x=custom?576:0,y=built?480:0;cc.drawImage(canvas,x,y+30);cc.fillStyle='#f1e8ce';cc.font='16px sans-serif';cc.fillText(`${custom?'Custom art':'Original drawing'} · potion ${built?'built':'unbuilt'}`,x+12,y+21);
}
writeFileSync(new URL('../build/workshop-lair-overview-qa.png',import.meta.url),contact.toBuffer('image/png'));

const sandbox={window:{WORKSHOP_DRAFT:restored},Image:class{async decode(){this.bitmap=await loadImage(this.src);this.width=this.naturalWidth=this.bitmap.width;this.height=this.naturalHeight=this.bitmap.height;}},fetch(){throw Error('No network');},document:{createElement:()=>createCanvas(1,1)},ResizeObserver:class{constructor(f){this.f=f;}observe(){this.f();}},performance:{now:()=>0},console};
const source=read('workshop/game-bundle.js').toString().split("const canvas = document.querySelector('#game');")[0];
const api=await vm.runInNewContext('(async()=>{'+source+';return {createRenderer,createLairWorld,createCamp,createRun,createVitality};})()',sandbox);
const shots=createCanvas(864*2,672),output=shots.getContext('2d');
for(const built of [false,true]){
 const canvas=createCanvas(864,672),ctx=canvas.getContext('2d'),seen=new Set();
 const proxy=new Proxy(ctx,{get(o,k){if(k==='drawImage')return(im,...args)=>{for(const[id,src]of Object.entries(restored.lair.props))if(im.src===src)seen.add(id);return o.drawImage(im.bitmap??im,...args);};const v=o[k];return typeof v==='function'?v.bind(o):v;},set(o,k,v){o[k]=v;return true;}});
 const surface={getBoundingClientRect:()=>({width:864,height:672}),getContext:()=>proxy,set width(v){canvas.width=v;},get width(){return canvas.width;},set height(v){canvas.height=v;},get height(){return canvas.height;}};
 const render=await api.createRenderer(surface,createCanvas(1,1)),camp=api.createCamp();camp.buildings.potion=built;
 const world=api.createLairWorld(camp),player={x:9,y:7,...api.createVitality(),facing:1,moving:false,phase:0};
 const run=api.createRun(world);run.phase='lair';run.entrance={...world.stations.find(s=>s.kind==='tunnel')};
 render(world,player,{held:null,ground:[]},null,run,false,[],[],null,null);
 assert.deepEqual([...seen].sort(),['stash','craft','campfire','planning','tunnel',built?'potion':'potionSite'].sort());
 output.drawImage(canvas,built?864:0,0);
}
writeFileSync(new URL('../build/workshop-lair-game-qa.png',import.meta.url),shots.toBuffer('image/png'));
console.log('Rendered original/custom full lair overviews and real sandbox; all six stations use the correct images in both potion states.');
