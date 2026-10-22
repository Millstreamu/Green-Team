import { clearPath, SACK } from './loot.js';
import { reachableTreasureTiles } from './treasure.js';

import { lootSurface } from './room-types.js';

export function surfaceItem(world, object, type, suffix) {
 const surface=lootSurface(object);
 if(!surface)return null;
 return {id:`${object.id}-surface-${suffix}`,type,rotation:0,x:object.x,y:object.y,
  surfaceId:object.id,surfaceX:surface[0]/32-.5,surfaceY:surface[1]/32-.5,
  surfaceDepth:(object.tileY??Math.floor(object.y))+(object.height??1)+.001,
  ...(type==='treasureKey'?{keyId:world.treasure.keyId}:{saleMultiplier:world.job?.goldMultiplier??1})};
}
export function createSurfaceLoot(world, objects) {
 const ground=[],reached=reachableTreasureTiles(world);
 const usable=o=>lootSurface(o)&&o.approach&&reached.has(Math.floor(o.approach.y)*world.width+Math.floor(o.approach.x))&&Math.hypot(o.approach.x-o.x,o.approach.y-o.y)<=SACK.reach&&clearPath(world,o.approach,o);
 // Move the one generated run key; never create a second searchable copy.
 const source=objects.find(o=>o.id===world.treasure?.keyContainerId);
 if(source&&usable(source)&&source.contents.includes('treasureKey')){
  ground.push(surfaceItem(world,source,'treasureKey','key'));
  source.contents=source.contents.filter(t=>t!=='treasureKey');
 }
 if(!world.roomThemes)return ground;
 let state=(world.seed^0x73757266)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 for(const room of world.rooms.slice(1)){
  const surfaces=objects.filter(o=>o.x>=room.x&&o.x<room.x+room.w&&o.y>=room.y&&o.y<room.y+room.h&&o.id!==source?.id&&usable(o));
  // At most one small coin per room, independent of container rolls.
  if(!surfaces.length||random()>=.6)continue;
  const object=surfaces[Math.floor(random()*surfaces.length)];
  ground.push(surfaceItem(world,object,random()<.75?'copperCoin':'silverCoin','coin'));
 }
 return ground;
}
