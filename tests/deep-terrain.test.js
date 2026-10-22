import test from 'node:test';
import assert from 'node:assert/strict';
import {workshopTerrainArt,deepWallParts,deepWallOpacity,drawDeepWall,drawTerrainOverview,DEEP_TERRAIN_NAMES} from '../src/terrain-art.js';
import {workshopJoinWorld} from '../workshop/tile-checks.js';

test('deep and legacy sheets auto-detect without repacking; malformed dimensions fail',()=>{
 const deep=workshopTerrainArt({width:128,height:128}),old=workshopTerrainArt({naturalWidth:128,naturalHeight:64});
 assert.equal(deep.deep,true);assert.equal(Object.keys(deep.frames).length,13);
 assert.equal(old.deep,false);assert.equal(Object.keys(old.frames).length,5);
 assert.throws(()=>workshopTerrainArt({width:256,height:192}));
 for(const f of Object.values(deep.frames)){assert.ok(f.x+f.width<=128&&f.y+f.height<=128);assert.equal(f.height,32);}
});

test('all 256 wall neighbourhoods compose available layers without changing geometry',()=>{
 const offsets=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
 for(let mask=0;mask<256;mask++){
  const w={width:5,height:5,tiles:new Uint8Array(25)};
  offsets.forEach(([x,y],i)=>{if(mask&(1<<i))w.tiles[(y+2)*5+x+2]=1;});
  const before=[...w.tiles],parts=deepWallParts(w,2,2);
  if(mask===0){assert.deepEqual(parts,[]);continue;}
  const cap=parts.find(p=>p.name==='cap');assert.ok(cap);assert.equal(cap.dy,mask&2?0:-1);
  for(const p of parts){assert.ok(DEEP_TERRAIN_NAMES.includes(p.name));assert.ok([-1,0].includes(p.dy));}
  assert.ok(parts.some(p=>p.name==='face'));
  assert.deepEqual([...w.tiles],before);
 }
});

test('wall layers never cover a walkable cell, including one-cell corridors and turns',()=>{
 for(const id of ['room','halls','thin']){
  const world=workshopJoinWorld(id);
  for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++)for(const part of deepWallParts(world,x,y)){
   assert.equal(world.tiles[(y+part.dy)*world.width+x]??0,0,`${id}: ${part.name} must not hide floor`);
  }
 }
 const world={width:5,height:5,tiles:new Uint8Array(25)};world.tiles[12]=1;
 const parts=deepWallParts(world,2,3),cap=parts.find(p=>p.name==='cap');
 assert.equal(cap.dy,0);assert.equal(cap.height,.1875);assert.equal(parts[0].name,'face');
});

test('full-height face is 32px below cap and cap/face preserve transform and alpha',()=>{
 const w={width:3,height:3,tiles:new Uint8Array([0,0,0,0,0,0,0,1,0])};
 const calls=[],ctx={globalAlpha:.8,save(){this.saved=this.globalAlpha;},restore(){this.globalAlpha=this.saved;},drawImage(...a){calls.push(a);}};
 const art=workshopTerrainArt({width:128,height:128});drawDeepWall(ctx,art,w,1,1,32,32,32,[]);
 const cap=calls[0],face=calls.find(a=>a[1]===64&&a[2]===0);
 assert.equal(cap[6],0);assert.equal(face[6],32);assert.equal(face[8],32);assert.equal(ctx.globalAlpha,.8);
 assert.equal(deepWallOpacity(1,1,[{x:1.5,y:.5}]),.32);
 assert.equal(deepWallOpacity(1,1,[{x:1.5,y:2.2}]),1);
 assert.equal(deepWallOpacity(1,1,[{x:1.5,y:.5,hiding:true}]),1);
});

test('overview draws walkable floors before raised walls, preserving all join fixture grids',()=>{
 for(const id of ['room','halls','thin']){
  const w=workshopJoinWorld(id),before=[...w.tiles],draws=[];
  const ctx={globalAlpha:1,save(){},restore(){},drawImage(...args){draws.push(args);}};
  drawTerrainOverview(ctx,workshopTerrainArt({width:128,height:128}),w);
  const floorCount=w.tiles.reduce((a,b)=>a+b,0);
  assert.ok(draws.slice(0,floorCount).every(a=>a[1]===0&&a[2]===0));
  assert.ok(draws[floorCount][1]===32);assert.deepEqual([...w.tiles],before);
 }
});
