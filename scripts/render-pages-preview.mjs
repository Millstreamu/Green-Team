import {createRequire} from 'node:module';import {readFileSync,writeFileSync} from 'node:fs';import vm from 'node:vm';
import {createWorkshopDraft} from '../workshop/model.js';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const sandbox={window:{WORKSHOP_DRAFT:createWorkshopDraft()},Image:class{async decode(){this.bitmap=await loadImage(this.src);this.width=this.naturalWidth=this.bitmap.width;this.height=this.naturalHeight=this.bitmap.height;}},fetch(){throw Error('No network');},document:{createElement:()=>createCanvas(1,1)},ResizeObserver:class{constructor(f){this.f=f;}observe(){this.f();}},performance:{now:()=>0},console};
const code=readFileSync(new URL('../workshop/game-bundle.js',import.meta.url),'utf8').split("const canvas = document.querySelector('#game');")[0];
const api=await vm.runInNewContext('(async()=>{'+code+';return {createRenderer,createRoomPassFixture,createVitality,createRun,selectJob,workshopRunTuning,ROOM_TYPES};})()',sandbox);
const sheet=createCanvas(900,600),sc=sheet.getContext('2d');
for(const [i,type]of ['dining'].entries()){
 const canvas=createCanvas(900,600),ctx=canvas.getContext('2d');
 const proxy=new Proxy(ctx,{get(o,k){if(k==='drawImage')return(im,...a)=>o.drawImage(im.bitmap??im,...a);const v=o[k];return typeof v==='function'?v.bind(o):v;},set(o,k,v){o[k]=v;return true;}});
 const surface={getBoundingClientRect:()=>({width:900,height:600}),getContext:()=>proxy,set width(v){canvas.width=v;},get width(){return canvas.width;},set height(v){canvas.height=v;},get height(){return canvas.height;}};
 const render=await api.createRenderer(surface,createCanvas(1,1)),f=api.createRoomPassFixture(type,api.selectJob('manor','normal'),api.workshopRunTuning(sandbox.window.WORKSHOP_DRAFT,'manor'));
 const player={x:6.5,y:6.5,...api.createVitality(),id:'goblin',facing:1,phase:0,moving:false};
 render(f.world,player,{held:null,ground:f.ground,bag:[]},null,api.createRun(f.world),false,f.guards,f.objects,null,{active:null},[],null,[],f.hidingSpots);
 const x=0,y=0;sc.drawImage(canvas,x,y);
}
writeFileSync(new URL('../pages-src/assets/room-preview.png',import.meta.url),sheet.toBuffer('image/png'));console.log('Rendered the title-page room preview through the production renderer.');
