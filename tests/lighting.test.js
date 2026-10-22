import test from 'node:test';
import assert from 'node:assert/strict';
import { LIGHTING, createTorches, lightPolygon, torchStrength, createLightingRenderer } from '../src/lighting.js';
import { createDungeonPreview } from '../src/dungeon-preview.js';
import { GENERATOR_PRESETS } from '../src/generator-settings.js';
import { isFloor } from '../src/world.js';
import { createLairWorld } from '../src/lair.js';
import { reservedRoomTiles } from '../src/prop-placement.js';
import { seesPlayer } from '../src/guard.js';

test('wall torches are deterministic, avoid doorway lanes/tall props and preserve all gameplay data across dungeon types', () => {
  for(const [id, values] of Object.entries(GENERATOR_PRESETS)) for(let seed=0;seed<15;seed++) {
    const p=createDungeonPreview(seed,values,id), {world,objects,hidingSpots,cages,doors}=p;
    const obstacles=[...objects,...hidingSpots,...cages,...doors.map(d=>d.spawn)], before=structuredClone(p);
    const torches=createTorches(world,obstacles); assert.ok(torches.length>0);assert.ok(torches.length<=world.rooms.length+(world.cartRoom?1:0));
    assert.deepEqual(torches,createTorches(world,obstacles));
    for(const torch of torches) {
      assert.equal(torch.x%1,.5);assert.equal(torch.y%1,.5);
      assert.ok(isFloor(world,torch.tileX,torch.tileY));assert.ok(!isFloor(world,Math.floor(torch.mountX),Math.floor(torch.mountY)));
      assert.ok(!reservedRoomTiles(world,(world.rooms[torch.roomIndex]??world.cartRoom)).has(torch.tileY*world.width+torch.tileX));
      assert.ok(obstacles.filter(o=>!['chest','crate'].includes(o.type)).every(o=>Math.hypot(o.x-torch.x,o.y-torch.y)>1));
    }
    assert.deepEqual(p,before);
    for(const guard of p.guards) {
      const goblin={...world.spawn,state:'active'}, sight=seesPlayer(world,guard,goblin);
      for(const torch of torches) lightPolygon(world,torch);
      assert.equal(seesPlayer(world,guard,goblin),sight);
    }
  }
  assert.deepEqual(createTorches(createLairWorld()),[]);
});

test('cached light rays stop at solid walls and can pass through an open doorway', () => {
  const width=20,height=12,tiles=new Uint8Array(width*height);
  for(let y=1;y<height-1;y++) for(let x=1;x<width-1;x++) if(x!==9) tiles[y*width+x]=1;
  const world={width,height,tiles}, light={x:5.5,y:5.5};
  const blocked=lightPolygon(world,light,8);
  assert.equal(blocked.length,LIGHTING.rays);assert.ok(blocked.every(p=>p.x<10));
  world.tiles[5*width+9]=1;
  const opened=lightPolygon(world,light,8);assert.ok(opened.some(p=>p.x>12 && Math.abs(p.y-5.5)<.1));
});

test('flicker is bounded and changes gently between frames', () => {
  const torch={phase:2.2};
  for(let i=0;i<1000;i++) {
    const t=i*.016, a=torchStrength(torch,t), b=torchStrength(torch,t+.016);
    assert.ok(a>=1-LIGHTING.flicker && a<=1+LIGHTING.flicker);
    assert.ok(Math.abs(a-b)<.004);
  }
});

test('lighting caches static torch placement and wall rays; overlay restores Canvas state and reuses its mask', () => {
  let masks=0, drawCalls=0;const gradients=[];
  function context() {
    const stack=[];
    return { globalCompositeOperation:'source-over',clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},
      save(){stack.push(this.globalCompositeOperation);},restore(){this.globalCompositeOperation=stack.pop();},drawImage(){drawCalls++;},
      createRadialGradient(){const stops=[];gradients.push(stops);return{addColorStop:(...args)=>stops.push(args)};} };
  }
  const shade=context(),ctx=context(), lighting=createLightingRenderer(()=>{masks++;return{width:0,height:0,getContext:()=>shade};});
  assert.equal(lighting.scene(createLairWorld(),[]),null); lighting.draw(ctx,800,600,null,0,0,0); assert.equal(masks,0);
  const p=createDungeonPreview(42,GENERATOR_PRESETS.manor,'manor');
  const scene=lighting.scene(p.world,p.objects);
  assert.equal(lighting.scene(p.world,[]),scene);
  const ox=400-p.world.spawn.x*24,oy=300-p.world.spawn.y*24;
  lighting.draw(ctx,800,600,scene,ox,oy,0);lighting.draw(ctx,800,600,scene,ox,oy,.016);
  assert.equal(masks,1);assert.equal(drawCalls,2);assert.ok(gradients.length>0);
  assert.equal(ctx.globalCompositeOperation,'source-over');assert.equal(shade.globalCompositeOperation,'source-over');
});
