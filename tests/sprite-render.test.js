import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRenderer, screenToWorld } from '../src/render.js';
import { boundDartAim } from '../src/darts.js';

test('higher-resolution scene preserves world targeting and whole-pixel goblin scale through walking, turns and resize', async t => {
  const previous = Object.fromEntries(['Image','fetch','ResizeObserver','document'].map(k=>[k,globalThis[k]]));
  t.after(()=>Object.assign(globalThis,previous));
  globalThis.Image=class { naturalWidth=128;naturalHeight=64;async decode(){} };
  globalThis.fetch=async()=>({ok:true,json:async()=>JSON.parse(readFileSync(new URL('../assets/human/GreenTeam-tileset.json',import.meta.url),'utf8'))});
  let resize;
  globalThis.ResizeObserver=class {constructor(fn){resize=fn;}observe(){resize();}};
  const transforms=[],sprites=[];
  const ctx=new Proxy({setTransform(...args){transforms.push(args);},drawImage(image,...args){if(image.src==='assets/goblin.png')sprites.push(args);},createRadialGradient(){return {addColorStop(){}};}},{get:(obj,key)=>obj[key]??(()=>{})});
  globalThis.document={createElement:()=>({getContext:()=>ctx})};
  let bounds={left:12,top:20,width:800,height:600};
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>bounds};
  const render=await createRenderer(canvas,{getContext:()=>ctx});
  assert.equal(canvas.width,800);assert.equal(canvas.sceneWidth,400);assert.equal(canvas.height,600);assert.deepEqual(transforms.at(-1),[2,0,0,2,0,0]);
  const world={width:12,height:12,rooms:[],tiles:new Uint8Array(144).fill(1),seed:1};
  for(const facing of [-1,1])for(const phase of [0,.3,1.4,3]){
    const actor={x:5.53,y:5.27,facing,phase,moving:phase>0};
    render(world,actor,{ground:[],held:null},null,{entrance:{x:2,y:2}},false,[],[],null,null);
  }
  assert.equal(sprites.length,8);for(const sprite of sprites)assert.deepEqual(sprite,[-12,-24,24,24]);
  // Exact same world location must be selected at either backing resolution.
  const actor={x:5.53,y:5.27};
  const logical={width:400,height:300,getBoundingClientRect:()=>bounds};
  const pointer={x:620,y:198};assert.deepEqual(screenToWorld(canvas,actor,pointer),screenToWorld(logical,actor,pointer));
  const a={kind:'dart',aimPoint:{x:100,y:100}},b=structuredClone(a);
  boundDartAim(a,actor,canvas);boundDartAim(b,actor,logical);assert.deepEqual(a,b);
  bounds={...bounds,width:667,height:375};resize();assert.equal(canvas.width,667);assert.equal(canvas.height,375);assert.equal(canvas.sceneWidth,333.5);assert.deepEqual(transforms.at(-1),[2,0,0,2,0,0]);
});
