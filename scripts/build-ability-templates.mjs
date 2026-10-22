import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {ABILITY_ART_SLOTS} from '../workshop/ability-art.js';
import {PASSIVE_DETAILS} from '../src/passive-view.js';
import {drawStationSprite} from '../src/station-art.js';
const require=createRequire(import.meta.url),{createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const base=new URL('../workshop/templates/abilities/',import.meta.url);await mkdir(base,{recursive:true});
for(const[id,slot]of Object.entries(ABILITY_ART_SLOTS)){
 const canvas=createCanvas(slot.width,slot.height);
 await writeFile(new URL(id+'-blank.png',base),canvas.toBuffer('image/png'));
 drawStationSprite(canvas,PASSIVE_DETAILS[id].sprite);
 await writeFile(new URL(id+'-example.png',base),canvas.toBuffer('image/png'));
 const guide=createCanvas(640,360),g=guide.getContext('2d');g.fillStyle='#17231e';g.fillRect(0,0,640,360);g.fillStyle='#f3e6be';g.font='bold 20px sans-serif';g.fillText(slot.name+' · ability icon',20,30);g.font='15px sans-serif';g.fillText(`${slot.width} × ${slot.height} px transparent PNG`,20,56);
 const scale=5,x=24,y=80;g.imageSmoothingEnabled=false;
 for(let py=0;py<slot.height;py+=8)for(let px=0;px<slot.width;px+=8){g.fillStyle=(px/8+py/8)%2?'#47534a':'#303e35';g.fillRect(x+px*scale,y+py*scale,8*scale,8*scale);}
 g.drawImage(canvas,x,y,slot.width*scale,slot.height*scale);
 g.strokeStyle='#f0d67d';g.lineWidth=1;g.strokeRect(x,y,slot.width*scale,slot.height*scale);
 g.fillStyle='#f3e6be';g.font='14px sans-serif';let ty=110;for(const line of ['Shown in the campfire ability grid and its detail panel.','Checkerboard: transparency. Yellow outline: whole canvas.','Keep the shape centred and readable at small sizes.','Draw on the blank PNG; this guide is reference only.','Only the picture changes; the ability works as before.']){g.fillText(line,210,ty);ty+=24;}
 await writeFile(new URL(id+'-guide.png',base),guide.toBuffer('image/png'));
}
await writeFile(new URL('../ability-manifest.json',base),JSON.stringify(ABILITY_ART_SLOTS,null,2));console.log(`Built ${Object.keys(ABILITY_ART_SLOTS).length} ability icon template sets.`);
