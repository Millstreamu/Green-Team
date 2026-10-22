import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import {createWorkshopDraft} from '../workshop/model.js';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const sandbox={window:{WORKSHOP_DRAFT:createWorkshopDraft()},Image:class{async decode(){this.bitmap=await loadImage(this.src);this.width=this.naturalWidth=this.bitmap.width;this.height=this.naturalHeight=this.bitmap.height;}},fetch(){throw Error('No network');},document:{createElement:()=>createCanvas(1,1)},ResizeObserver:class{constructor(f){this.f=f;}observe(){this.f();}},performance:{now:()=>0},console};
const code=readFileSync(new URL('../workshop/game-bundle.js',import.meta.url),'utf8').split("const canvas = document.querySelector('#game');")[0];
const api=await vm.runInNewContext('(async()=>{'+code+';return {createRenderer,createDoorTestRoom,createVitality,createRun,selectJob,applyRoomDoors,seesPlayer};})()',sandbox);
const sheet=createCanvas(844,1170),sc=sheet.getContext('2d');
for(const [i,progress]of [0,.6,1].entries()){
 const canvas=createCanvas(844,390),ctx=canvas.getContext('2d');
 const proxy=new Proxy(ctx,{get(o,k){if(k==='drawImage')return(im,...a)=>o.drawImage(im.bitmap??im,...a);const v=o[k];return typeof v==='function'?v.bind(o):v;},set(o,k,v){o[k]=v;return true;}});
 const surface={getBoundingClientRect:()=>({width:844,height:390}),getContext:()=>proxy,set width(v){canvas.width=v;},get width(){return canvas.width;},set height(v){canvas.height=v;},get height(){return canvas.height;}};
 const render=await api.createRenderer(surface,createCanvas(1,1)),f=api.createDoorTestRoom();f.world.job=api.selectJob('manor','normal');
 const d=f.world.roomDoors[0];d.progress=progress;d.open=progress===1;api.applyRoomDoors(f.world,[d]);
 const player={...f.start,...api.createVitality(),id:'goblin',facing:1,phase:0,moving:false};
 if(api.seesPlayer(f.world,f.guards[0],player)!==(progress>0))throw Error('Guard sight mismatch');
 render(f.world,player,{held:null,ground:[],bag:[]},null,api.createRun(f.world),false,f.guards,f.objects,null,{active:null},[],null,[],f.hidingSpots);
 sc.drawImage(canvas,0,i*390);sc.fillStyle='#f1e8ce';sc.font='16px sans-serif';sc.fillText(['Closed · guard cannot see you','Partly open · gap reveals you','Fully open · guard can enter'][i],12,i*390+25);
}
writeFileSync(new URL('../build/door-guard-room-qa.png',import.meta.url),sheet.toBuffer('image/png'));
console.log('Rendered actual door/guard room in closed, partial and open states.');
