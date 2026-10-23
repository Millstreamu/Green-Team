import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {MENU_ART_SLOTS,MENU_COLOR_DEFAULTS as C} from '../workshop/menu-theme.js';
const require=createRequire(import.meta.url),{createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const base=new URL('../workshop/templates/menu/',import.meta.url);await mkdir(base,{recursive:true});
// Examples redraw today's CSS look so an unchanged upload matches the original menus.
const examples={
 frame:r=>{r(0,0,48,48,C.frame);r(6,6,36,36,C.paper);},
 slot:r=>{r(0,0,32,32,'#ac9d74');r(2,2,28,28,null);},
 slotSelected:r=>{r(0,0,32,32,'#8a6e39');r(2,2,28,28,'#e5d9b2');},
 slotEmpty:r=>{r(0,0,32,32,'#d3c69e');for(let i=0;i<32;i+=6){r(i,0,3,2,'#b6a981');r(i,30,3,2,'#b6a981');r(0,i,2,3,'#b6a981');r(30,i,2,3,'#b6a981');}r(15,11,2,10,'#9b8c64');r(11,15,10,2,'#9b8c64');},
 lock:r=>{r(0,0,32,32,'#dcd0a8bb');r(13,8,6,2,'#66593b');r(11,9,2,7,'#66593b');r(19,9,2,7,'#66593b');r(10,15,12,10,'#66593b');}
};
const notes={
 frame:['Nine 16 px pieces (blue lines).','Corners stay fixed; edges repeat','along each side; the middle repeats','as the paper behind text.','Keep the middle calm and readable.'],
 slot:['Drawn behind every recipe and ability icon.','Stretched to the slot (64, 48 or 44 px), so keep shapes simple.','Leave the centre light: icons sit on top.'],
 slotSelected:['Shown on the chosen recipe or ability.','Make it clearly different from the normal slot.','Stretched to the slot size like the normal slot.'],
 slotEmpty:['Fills spare grid spaces reserved for future recipes.','Should look quieter than a real slot.','The + mark is hidden when you upload your own.'],
 lock:['Covers recipes you have not unlocked yet.','Partly transparent lets the icon show through.','Stretched over the whole slot.']
};
for(const[id,slot]of Object.entries(MENU_ART_SLOTS)){
 const canvas=createCanvas(slot.width,slot.height),ctx=canvas.getContext('2d');
 await writeFile(new URL(id+'-blank.png',base),canvas.toBuffer('image/png'));
 examples[id]((x,y,w,h,c)=>{if(c===null)ctx.clearRect(x,y,w,h);else{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}});
 await writeFile(new URL(id+'-example.png',base),canvas.toBuffer('image/png'));
 const guide=createCanvas(640,360),g=guide.getContext('2d');g.fillStyle='#17231e';g.fillRect(0,0,640,360);g.fillStyle='#f3e6be';g.font='bold 20px sans-serif';g.fillText(slot.name,20,30);g.font='15px sans-serif';g.fillText(`${slot.width} × ${slot.height} px transparent PNG`,20,56);
 const scale=id==='frame'?5:7,x=24,y=80;g.imageSmoothingEnabled=false;
 for(let py=0;py<slot.height;py+=4)for(let px=0;px<slot.width;px+=4){g.fillStyle=(px/4+py/4)%2?'#47534a':'#303e35';g.fillRect(x+px*scale,y+py*scale,4*scale,4*scale);}
 g.drawImage(canvas,x,y,slot.width*scale,slot.height*scale);
 g.strokeStyle='#80b9d5';g.lineWidth=1;if(id==='frame')for(const v of [16,32]){g.beginPath();g.moveTo(x+v*scale,y);g.lineTo(x+v*scale,y+48*scale);g.stroke();g.beginPath();g.moveTo(x,y+v*scale);g.lineTo(x+48*scale,y+v*scale);g.stroke();}
 g.strokeStyle='#f0d67d';g.strokeRect(x,y,slot.width*scale,slot.height*scale);
 g.fillStyle='#f3e6be';g.font='14px sans-serif';let ty=110;for(const line of [...notes[id],'Checkerboard: transparency.','The example shows today\'s look.','Draw on the blank PNG.']){g.fillText(line,id==='frame'?280:260,ty);ty+=24;}
 await writeFile(new URL(id+'-guide.png',base),guide.toBuffer('image/png'));
}
await writeFile(new URL('../menu-manifest.json',base),JSON.stringify(MENU_ART_SLOTS,null,2));console.log(`Built ${Object.keys(MENU_ART_SLOTS).length} menu art template sets.`);
