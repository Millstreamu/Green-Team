import { ROOM_FURNITURE_NAMES } from './room-types.js';
import { CONFIG } from './config.js';

// Base containers fill rooms without a purpose, such as the entrance. The cupboard
// backs onto the north wall, so its art rises one tile up that wall above its solid tile.
const CONTAINER_ART = Object.freeze({chest:{name:'Chest',wallTilesAbove:0},cupboard:{name:'Cupboard',wallTilesAbove:1},crate:{name:'Crate',wallTilesAbove:0}});
export const FURNITURE_ART_SLOTS = Object.freeze(Object.fromEntries([
 ...Object.entries(ROOM_FURNITURE_NAMES).flatMap(([kind,name])=>{
  const sizes=[[1,1],...({table:[[2,1],[3,1]],bench:[[2,1],[3,1]],stores:[[1,2]],altar:[[2,1]],pew:[[2,1]],bed:[[1,2]],counter:[[2,1]],rack:[[1,2]]}[kind]??[])];
  return sizes.map(([w,h])=>[`${kind}_${w}x${h}`,{kind,name:`${name} · ${w} × ${h} tiles`,width:w*32,height:h*32,tilesWide:w,tilesHigh:h}]);
 }),
 ...Object.entries(CONTAINER_ART).map(([container,{name,wallTilesAbove}])=>[`base${container[0].toUpperCase()}${container.slice(1)}_1x1`,{container,name:`${name} · base container · 1 × 1 tiles`,width:32,height:32*(1+wallTilesAbove),tilesWide:1,tilesHigh:1,wallTilesAbove}])
]));
export function furnitureArtId(object) {return object.roomFurniture?`${object.roomFurniture}_${object.width??1}x${object.height??1}`:`base${object.type[0].toUpperCase()}${object.type.slice(1)}_1x1`;}
export function drawFurnitureArt(ctx, images, object, ox=0, oy=0, tile=CONFIG.tile) {
 const id=furnitureArtId(object),image=images.get(id);if(!image)return false;
 const above=FURNITURE_ART_SLOTS[id]?.wallTilesAbove??0;
 ctx.save();if(object.searched)ctx.globalAlpha*=.5;ctx.imageSmoothingEnabled=false;
 ctx.drawImage(image,(object.tileX??Math.floor(object.x))*tile+ox,((object.tileY??Math.floor(object.y))-above)*tile+oy,(object.width??1)*tile,((object.height??1)+above)*tile);
 ctx.restore();return true;
}
