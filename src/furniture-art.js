import { ROOM_FURNITURE_NAMES } from './room-types.js';
import { CONFIG } from './config.js';

export const FURNITURE_ART_SLOTS = Object.freeze(Object.fromEntries(
 Object.entries(ROOM_FURNITURE_NAMES).flatMap(([kind,name])=>{
  const sizes=[[1,1],...({table:[[2,1],[3,1]],bench:[[2,1],[3,1]],stores:[[1,2]],altar:[[2,1]],pew:[[2,1]],bed:[[1,2]],counter:[[2,1]],rack:[[1,2]]}[kind]??[])];
  return sizes.map(([w,h])=>[`${kind}_${w}x${h}`,{kind,name:`${name} · ${w} × ${h} tiles`,width:w*32,height:h*32,tilesWide:w,tilesHigh:h}]);
 })
));
export function furnitureArtId(object) {return `${object.roomFurniture}_${object.width??1}x${object.height??1}`;}
export function drawFurnitureArt(ctx, images, object, ox=0, oy=0, tile=CONFIG.tile) {
 const image=images.get(furnitureArtId(object));if(!image)return false;
 ctx.save();if(object.searched)ctx.globalAlpha*=.5;ctx.imageSmoothingEnabled=false;
 ctx.drawImage(image,(object.tileX??Math.floor(object.x))*tile+ox,(object.tileY??Math.floor(object.y))*tile+oy,(object.width??1)*tile,(object.height??1)*tile);
 ctx.restore();return true;
}
