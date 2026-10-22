import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {classicTerrainNames} from '../src/terrain-art.js';
import {drawClassicSampleTile} from '../workshop/classic-art.js';
const require=createRequire(import.meta.url),{createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const dir=new URL('../workshop/templates/classic-walls/',import.meta.url);mkdirSync(dir,{recursive:true});
const names=classicTerrainNames(),labels=['Floor','Back wall','Left side','Right side','Front rim','Outer NW','Outer NE','Outer SW','Outer SE','Spare','Spare','Spare'];
const atlas=createCanvas(128,96),ac=atlas.getContext('2d'),test=createCanvas(128,96),tc=test.getContext('2d');
const guide=createCanvas(960,750),g=guide.getContext('2d');g.fillStyle='#f1ecdd';g.fillRect(0,0,960,750);g.fillStyle='#273c30';g.font='24px sans-serif';g.fillText('CLASSIC WALLS · DRAWING SHEET',24,35);g.font='18px sans-serif';g.fillText('128 × 96 PNG · 4 columns × 3 rows · 32px cells · 9 pieces + 3 spare',24,69);
for(let i=0;i<12;i++){
 const tile=createCanvas(32,32),c=tile.getContext('2d');if(i<names.length)drawClassicSampleTile(c,names[i]);
 ac.drawImage(tile,i%4*32,Math.floor(i/4)*32);
 const x=24+i%4*234,y=105+Math.floor(i/4)*185;
 for(let yy=0;yy<128;yy+=16)for(let xx=0;xx<128;xx+=16){g.fillStyle=(xx+yy)/16%2?'#ddd7c5':'#c5c9b9';g.fillRect(x+xx,y+yy,16,16);}
 g.imageSmoothingEnabled=false;g.drawImage(tile,x,y,128,128);g.strokeStyle='#7b8b78';g.strokeRect(x,y,128,128);g.fillStyle='#273c30';g.font='18px sans-serif';g.fillText(String(i).padStart(2,'0')+'  '+labels[i],x,y+151);
 c.globalCompositeOperation='source-in';c.fillStyle=['#94a85c','#ae905a','#c5b579','#987652'][i%4];c.fillRect(0,0,32,32);tc.drawImage(tile,i%4*32,Math.floor(i/4)*32);
}
g.font='18px sans-serif';g.fillText('Back wall: full tile. Side strips and front rim: 6px. Checkerboard = transparent.',24,695);g.fillText('Pieces combine for inside joins, thin walls and ends. Keep 09–11 empty.',24,728);
const save=(file,c)=>writeFileSync(new URL(file,dir),c.toBuffer('image/png'));
save('classic-walls-example-128x96.png',atlas);save('classic-walls-test-128x96.png',test);save('classic-walls-blank-128x96.png',createCanvas(128,96));save('classic-walls-drawing-guide.png',guide);
writeFileSync(new URL('classic-walls-layout.json',dir),JSON.stringify({tileSize:32,columns:4,rows:3,width:128,height:96,projection:'fixed within wall cell',pieces:names.map((name,index)=>({name,index,x:index%4*32,y:Math.floor(index/4)*32})),unused:[9,10,11]},null,2));
console.log('Built classic nine-piece example, test, blank, drawing guide and metadata.');
