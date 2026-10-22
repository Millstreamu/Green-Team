import { CONFIG } from '../src/config.js';
import { isFloor } from '../src/world.js';
import { drawTerrainTile, drawTerrainOverview } from '../src/terrain-art.js';
import { drawLair, drawPotionStation } from '../src/lair-drawing.js';
import { drawLairArt, lairArtBounds, drawLairCartOverview, LAIR_ART_SLOTS } from './lair-art.js';

export function drawLairOverview(canvas, world, terrain, images, selected = 'terrain') {
  const tile=CONFIG.tile,scale=32/tile;
  canvas.width=world.width*32;canvas.height=(world.height+(terrain?.deep?1:0))*32;
  const c=canvas.getContext('2d');c.setTransform(scale,0,0,scale,0,terrain?.deep?32:0);c.imageSmoothingEnabled=false;
  const labelAt=(text,x,y)=>{
    c.fillStyle='#f1e8ce';c.font='7px monospace';c.textAlign='center';c.textBaseline='bottom';
    const half=(c.measureText?.(text)?.width??text.length*4.2)/2;
    c.fillText(text,Math.max(half+2,Math.min(world.width*tile-half-2,x)),y);
  };
  c.fillStyle='#101517';c.fillRect(0,0,world.width*tile,world.height*tile);
  if(terrain?.deep)drawTerrainOverview(c,terrain,world,tile);
  for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++){
    if(terrain?.deep)continue;
    if(terrain){drawTerrainTile(c,terrain,world,x,y,x*tile,y*tile,tile);continue;}
    if(isFloor(world,x,y)){
      c.fillStyle=(x*13+y*7)%5===0?'#333c3a':'#2d3635';c.fillRect(x*tile,y*tile,tile,tile);
      c.fillStyle='#404743';c.fillRect(x*tile,y*tile,tile,1);
      c.fillStyle='#252f2e';c.fillRect(x*tile,y*tile,1,tile);
      if((x*7+y*19)%17===0){c.fillStyle='#596050';c.fillRect(x*tile+7,y*tile+15,3,1);}
    }else if([-1,0,1].some(dy=>[-1,0,1].some(dx=>isFloor(world,x+dx,y+dy)))){
      c.fillStyle='#465053';c.fillRect(x*tile,y*tile,tile,tile);c.fillStyle='#657074';c.fillRect(x*tile+1,y*tile+1,tile-2,5);
      c.fillStyle='#3b4548';c.fillRect(x*tile+1,y*tile+8,tile-2,tile-9);c.fillStyle='#303a3d';c.fillRect(x*tile+11,y*tile+9,1,12);
      if(isFloor(world,x,y+1)){c.fillStyle='#20282b';c.fillRect(x*tile,y*tile+tile-3,tile,3);}
    }
  }
  drawLairCartOverview(c,world,images,tile);
  // Preserve original decor/station drawing wherever no replacement is loaded.
  drawLair(c,{...world,stations:world.stations.filter(s=>!images.has(s.kind))},null,0,0);
  for(const station of world.stations){
    if(station.kind==='potion'){
      const id=world.camp.buildings.potion?'potion':'potionSite';
      if(!drawLairArt(c,images,world,id))drawPotionStation(c,world,station,0,0);
      labelAt(world.camp.buildings.potion?'POTION STATION':'BUILD POTION STATION',station.x*tile,station.tileY*tile-5);
    }else if(station.kind!=='tunnel'&&images.has(station.kind))drawLairArt(c,images,world,station.kind);
    if(station.kind!=='potion'&&(images.has(station.kind)||station.kind==='tunnel')){
      labelAt(station.name.toUpperCase(),station.x*tile,station.y*tile-30);
    }
  }
  if(selected!=='terrain'&&LAIR_ART_SLOTS[selected]){
    const b=lairArtBounds(world,selected);c.strokeStyle='#e4e99a';c.lineWidth=1;
    c.strokeRect(b.x*tile,b.y*tile,b.width*tile,b.height*tile);
    c.fillStyle='#e4e99a';c.fillRect(b.anchorX*tile-2,b.anchorY*tile-2,4,4);
  }
}
