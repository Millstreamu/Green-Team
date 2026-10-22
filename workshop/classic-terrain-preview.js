// Approved shared preview fixture and reference silhouettes for renderer QA.
import { isFloor } from '../src/world.js';
export function classicProofWorld() {
 const width=23,height=19,tiles=new Uint8Array(width*height);
 const rect=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)tiles[yy*width+xx]=1;};
 rect(2,2,7,5);rect(15,2,6,5);rect(2,12,7,5);rect(15,12,6,5);
 rect(8,4,8,1);rect(5,6,1,7);rect(18,6,1,7);rect(8,14,8,1);rect(11,4,1,11);
 // Partition, inside corners and an isolated pillar.
 tiles[3*width+5]=0;tiles[4*width+5]=0;tiles[3*width+18]=0;
 return {width,height,tiles};
}
export function classicWallParts(world,x,y) {
 if(isFloor(world,x,y))return [];
 const n=isFloor(world,x,y-1),s=isFloor(world,x,y+1),e=isFloor(world,x+1,y),w=isFloor(world,x-1,y);
 const parts=[];
 // Everything fits inside its own non-walkable source square. Orientation,
 // rather than a dynamic height reduction, determines the painted silhouette.
 if(s)parts.push({kind:'back',x:0,y:0,w:32,h:32});
 if(e)parts.push({kind:'side',x:26,y:0,w:6,h:32});
 if(w)parts.push({kind:'side',x:0,y:0,w:6,h:32});
 if(n)parts.push({kind:'rim',x:0,y:0,w:32,h:6});
 if(!s&&!e&&!w&&!n){
  if(isFloor(world,x+1,y+1))parts.push({kind:'side',x:26,y:0,w:6,h:32});
  if(isFloor(world,x-1,y+1))parts.push({kind:'side',x:0,y:0,w:6,h:32});
  if(isFloor(world,x-1,y-1))parts.push({kind:'rim',x:0,y:0,w:6,h:6});
  if(isFloor(world,x+1,y-1))parts.push({kind:'rim',x:26,y:0,w:6,h:6});
 }
 return parts;
}
