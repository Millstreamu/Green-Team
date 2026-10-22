import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {classicProofWorld,classicWallParts} from '../workshop/classic-terrain-preview.js';
const require=createRequire(import.meta.url),{createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const world=classicProofWorld(),canvas=createCanvas(800,704),c=canvas.getContext('2d'),ox=32,oy=54;
c.imageSmoothingEnabled=false;c.fillStyle='#292619';c.fillRect(0,0,800,704);
c.font='20px sans-serif';c.fillStyle='#c8bb86';c.fillText('CLASSIC WALLS · ROOM & CORRIDOR PROOF',32,30);
let seed=1;function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function poly(points,fill){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();}
function floor(x,y){
 seed=(x*1327+y*743+17)>>>0;const px=x*32+ox,py=y*32+oy;c.fillStyle='#24281a';c.fillRect(px,py,32,32);
 const fill=['#464b2f','#4e5034','#3f462c','#525438'][Math.floor(rng()*4)];
 poly([[px+5,py+2],[px+23,py+1],[px+29,py+6],[px+30,py+23],[px+25,py+29],[px+6,py+30],[px+2,py+24],[px+1,py+8]],fill);
 c.fillStyle='#5c5d3b';c.fillRect(px+7,py+3,15,1);c.fillStyle='#343b25';
 if(rng()>.45){poly([[px+20,py+3],[px+17,py+12],[px+21,py+16],[px+14,py+25],[px+16,py+17],[px+14,py+12]],'#2d351f');}
 for(let i=0;i<4;i++){const a=px+5+Math.floor(rng()*21),b=py+5+Math.floor(rng()*21);c.fillStyle=i%2?'#3a4228':'#5c5d3b';c.fillRect(a,b,2,2);}

}
function cap(x,y,w,h,vertical){
 c.fillStyle='#4b4a30';c.fillRect(x,y,w,h);
 if(vertical){for(let at=0;at<h;at+=8){poly([[x,y+at+1],[x+4,y+at],[x+6,y+at+2],[x+5,y+at+7],[x+1,y+at+6]],'#88805a');c.fillStyle='#aca079';c.fillRect(x+1,y+at+1,3,1);c.fillStyle='#625c3d';c.fillRect(x+1,y+at+5,4,1);}}
 else{for(let at=0;at<w;at+=8){poly([[x+at,y+1],[x+at+4,y],[x+at+7,y+2],[x+at+6,y+5],[x+at+2,y+6]],'#88805a');c.fillStyle='#aca079';c.fillRect(x+at+1,y+1,4,1);c.fillStyle='#625c3d';c.fillRect(x+at+2,y+4,4,1);}}
}
function part(p,x,y){
 const px=x*32+ox+p.x,py=y*32+oy+p.y;c.save();c.beginPath();c.rect(px,py,p.w,p.h);c.clip();
 if(p.kind==='back'){
  c.fillStyle='#3d3c27';c.fillRect(px,py,32,32);
  for(let row=0;row<3;row++)for(let col=-1;col<3;col++){
   const a=px+col*16+(row%2)*8,b=py+7+row*8;
   poly([[a+1,b],[a+13,b+1],[a+15,b+3],[a+13,b+7],[a+2,b+6],[a,b+3]],'#615f3e');
   c.fillStyle='#77714b';c.fillRect(a+3,b+1,9,1);c.fillStyle='#47472d';c.fillRect(a+3,b+6,8,1);
  }
  cap(px,py,32,6,false);c.fillStyle='#22281b';c.fillRect(px,py+31,32,1);
 }else cap(px,py,p.w,p.h,p.kind==='side');
 c.restore();
}
for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++)if(world.tiles[y*world.width+x])floor(x,y);
const baseline=c.getImageData(0,0,800,704).data.slice();
for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++)for(const p of classicWallParts(world,x,y)){
 assert.ok(p.x>=0&&p.y>=0&&p.x+p.w<=32&&p.y+p.h<=32);part(p,x,y);
}
// Assert every walkable pixel, including every one-cell connector, is intact.
const after=c.getImageData(0,0,800,704).data;
let count=0;
for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++)if(world.tiles[y*world.width+x]){
 count++;for(let yy=0;yy<32;yy++)for(let xx=0;xx<32;xx++){const i=((y*32+oy+yy)*800+x*32+ox+xx)*4;for(let channel=0;channel<4;channel++)assert.equal(after[i+channel],baseline[i+channel]);}
}
c.font='14px sans-serif';c.fillStyle='#c0b481';c.fillText('One-tile passages · fixed wall shapes · no raised slabs or fading',32,682);
writeFileSync(new URL('../build/classic-walls-preview.png',import.meta.url),canvas.toBuffer('image/png'));
console.log(`Rendered reference-style proof; ${count} walkable tiles remain completely visible. Workshop unchanged.`);
