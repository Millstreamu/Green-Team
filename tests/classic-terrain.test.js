import test from 'node:test';
import assert from 'node:assert/strict';
import {classicTerrainLayers,classicTerrainNames,workshopTerrainArt,drawTerrainTile} from '../src/terrain-art.js';
import {classicProofWorld} from '../workshop/classic-terrain-preview.js';
test('classic sheet has nine fixed frames and preserves both earlier image formats',()=>{
 const art=workshopTerrainArt({width:128,height:96});assert.equal(art.classic,true);assert.equal(art.deep,false);
 assert.equal(Object.keys(art.frames).length,9);assert.equal(workshopTerrainArt({width:128,height:128}).deep,true);
 assert.equal(workshopTerrainArt({width:128,height:64}).deep,false);
 for(const f of Object.values(art.frames)){assert.ok(f.x+32<=128&&f.y+32<=96);}
});
test('classic wall rules cover every floor neighbourhood without altering layout',()=>{
 const offsets=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
 for(let mask=0;mask<256;mask++){
  const w={width:5,height:5,tiles:new Uint8Array(25)};offsets.forEach(([x,y],i)=>{if(mask&1<<i)w.tiles[(y+2)*5+x+2]=1;});
  const before=[...w.tiles],layers=classicTerrainLayers(w,2,2);
  assert.ok(layers.every(n=>classicTerrainNames().includes(n)&&n!=='floor'));assert.equal(layers.includes('back'),Boolean(mask&64));
  assert.equal(layers.includes('rim'),Boolean(mask&2));assert.deepEqual([...w.tiles],before);
  w.tiles[12]=1;assert.deepEqual(classicTerrainLayers(w,2,2),['floor']);
 }
});
test('classic draw destinations stay inside each grid cell across the approved proof',()=>{
 const world=classicProofWorld(),art=workshopTerrainArt({width:128,height:96});let count=0;
 for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++){
  const calls=[],ctx={drawImage(...args){calls.push(args);}};drawTerrainTile(ctx,art,world,x,y,x*32,y*32,32);
  for(const a of calls){assert.deepEqual(a.slice(5),[x*32,y*32,32,32]);}
  if(world.tiles[y*world.width+x]){count++;assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(1,5),[0,0,32,32]);}
 }
 assert.equal(count,158);
});
