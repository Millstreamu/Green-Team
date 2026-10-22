import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {FURNITURE_ART_SLOTS} from '../src/furniture-art.js';
import {LOOT_SURFACES} from '../src/room-types.js';
import {drawRoomFurniture} from '../src/room-furniture-view.js';
const require=createRequire(import.meta.url),{createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const base=new URL('../workshop/templates/furniture/',import.meta.url);await mkdir(base,{recursive:true});
for(const[id,slot]of Object.entries(FURNITURE_ART_SLOTS)){
 const canvas=createCanvas(slot.width,slot.height),ctx=canvas.getContext('2d');
 await writeFile(new URL(id+'-blank.png',base),canvas.toBuffer('image/png'));
 ctx.save();ctx.scale(32/24,32/24);drawRoomFurniture(ctx,{roomFurniture:slot.kind,tileX:0,tileY:0,width:slot.tilesWide,height:slot.tilesHigh},0,0);ctx.restore();
 await writeFile(new URL(id+'-example.png',base),canvas.toBuffer('image/png'));
 const guide=createCanvas(640,420),g=guide.getContext('2d');g.fillStyle='#17231e';g.fillRect(0,0,640,420);g.fillStyle='#f3e6be';g.font='bold 20px sans-serif';g.fillText(slot.name,20,30);g.font='15px sans-serif';g.fillText(`${slot.width} × ${slot.height} px transparent PNG · 32 px per floor tile`,20,56);
 const scale=3,x=24,y=86;g.imageSmoothingEnabled=false;
 for(let py=0;py<slot.height;py+=8)for(let px=0;px<slot.width;px+=8){g.fillStyle=(px/8+py/8)%2?'#47534a':'#303e35';g.fillRect(x+px*scale,y+py*scale,8*scale,8*scale);}
 g.drawImage(canvas,x,y,slot.width*scale,slot.height*scale);
 g.strokeStyle='#80b9d5';g.lineWidth=1;for(let px=0;px<=slot.width;px+=32){g.beginPath();g.moveTo(x+px*scale,y);g.lineTo(x+px*scale,y+slot.height*scale);g.stroke();}for(let py=0;py<=slot.height;py+=32){g.beginPath();g.moveTo(x,y+py*scale);g.lineTo(x+slot.width*scale,y+py*scale);g.stroke();}
 g.strokeStyle='#f0d67d';g.strokeRect(x,y,slot.width*scale,slot.height*scale);g.fillStyle='#f0d67d';g.fillRect(x,y+slot.height*scale-3,slot.width*scale,3);
 if(LOOT_SURFACES[slot.kind]){const [sx,sy]=LOOT_SURFACES[slot.kind],cx=x+(slot.width/2+sx-16)*scale,cy=y+(slot.height/2+sy-16)*scale;g.fillStyle='#f6d45e';g.fillRect(cx-3,cy-3,6,6);}
 g.fillStyle='#f3e6be';g.font='14px sans-serif';let ty=310;for(const line of ['Blue lines: floor grid. Yellow outline: solid footprint.','Bottom yellow edge: depth sorting; artwork stays inside the canvas.','Yellow dot (where shown): loose coin/key anchor — leave it readable.','Draw on the blank PNG. Guide lines are reference only.','This artwork is used in all maps; searched furniture fades automatically.']){g.fillText(line,20,ty);ty+=21;}
 await writeFile(new URL(id+'-guide.png',base),guide.toBuffer('image/png'));
}
await writeFile(new URL('manifest.json',base),JSON.stringify(FURNITURE_ART_SLOTS,null,2));console.log(`Built ${Object.keys(FURNITURE_ART_SLOTS).length} furniture template sets.`);
