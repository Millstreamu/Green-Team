import { CONFIG } from './config.js';
// Original placeholder art stays within its declared whole-tile footprint.
export function drawRoomFurniture(ctx,object,ox,oy) {
 const t=CONFIG.tile,x=(object.tileX??Math.floor(object.x))*t+ox,y=(object.tileY??Math.floor(object.y))*t+oy;
 ctx.save();ctx.translate(x,y);ctx.scale(t/32,t/32);if(object.searched)ctx.globalAlpha*=.5;
 if((object.width??1)>1||(object.height??1)>1){
  const w=(object.width??1)*32,h=(object.height??1)*32;
  const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
  r(2,h-6,w-4,4,'#172022');
  if(object.roomFurniture==='table'){
   r(4,7,w-8,22,'#543a29');r(2,4,w-4,21,'#a77b4c');r(4,6,w-8,17,'#855d38');
   for(let x=9;x<w-5;x+=16){r(x,9,6,6,'#ded2ae');r(x+1,10,4,4,'#8d997d');r(x,19,4,3,'#bd944f');}
   for(let x=30;x<w-2;x+=32)r(x,7,1,15,'#715032');
  }else if(['bench','pew'].includes(object.roomFurniture)){
   r(5,14,4,15,'#4f382b');r(w-9,14,4,15,'#4f382b');r(2,14,w-4,10,'#a57c4d');r(3,15,w-6,2,'#c89d67');
  }else if(object.roomFurniture==='bed'){
   r(4,2,w-8,h-4,'#5f412f');r(6,4,w-12,h-8,'#bdc3b2');r(8,5,w-16,12,'#e1d6bb');r(6,22,w-12,h-26,'#6f8792');r(8,24,w-16,2,'#96aeb5');
  }else if(object.roomFurniture==='altar'){
   r(5,22,w-10,7,'#646b71');r(3,9,w-6,16,'#93908a');r(5,11,w-10,9,'#adb0a5');r(w/2-4,10,8,15,'#82678c');
   for(const x of [7,w-10]){r(x,5,3,9,'#e2d5a6');r(x,2,3,3,'#efb34b');}
  }else if(object.roomFurniture==='counter'){
   r(2,6,w-4,23,'#675440');r(2,4,w-4,17,'#b2ac91');r(7,7,18,11,'#896d47');r(w-17,7,10,10,'#879976');
  }else if(object.roomFurniture==='rack'){
   r(3,3,4,h-6,'#69472f');r(w-7,3,4,h-6,'#69472f');
   for(let y=7;y<h-4;y+=27){r(4,y,w-8,4,'#9b734d');for(const x of [10,20]){r(x,y-4,3,19,'#bcc4be');r(x-3,y+13,9,3,'#b89756');}}
  }else{
   r(2,2,w-4,h-5,'#4e382b');
   for(let y=4;y<h-4;y+=10){r(4,y,w-8,7,'#b48d58');r(6,y-1,6,5,'#8c9a6f');r(w-14,y-1,7,5,'#aa7047');}
  }
  ctx.restore();return;
 }
 const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
 r(2,26,28,4,'#172022');
 switch(object.roomFurniture){
 case 'table':
  r(3,5,26,24,'#543a29');r(2,4,28,21,'#a77b4c');r(4,6,24,17,'#855d38');
  for(const x of [7,21]){r(x,9,5,5,'#d9cfaf');r(x+1,10,3,3,'#839477');r(x,18,3,3,'#bb924f');}break;
 case 'pantry':
 case 'stores':
  r(2,2,28,27,'#4e382b');for(const y of [4,13,22]){r(4,y,24,6,'#b48d58');r(6,y-1,6,5,'#8c9a6f');r(18,y-1,7,5,'#aa7047');}break;
 case 'bench':
 case 'pew':
  r(3,8,26,6,'#674b35');r(5,14,3,15,'#4f382b');r(24,14,3,15,'#4f382b');r(2,17,28,7,object.roomFurniture==='pew'?'#7c624c':'#a57c4d');break;
 case 'sideboard':
 case 'dresser':
 case 'armourChest':
  r(3,5,26,24,'#684b35');r(2,4,28,5,'#ae8554');for(const y of [11,19]){r(5,y,22,6,'#947044');r(14,y+2,4,2,'#dcc58a');}break;
 case 'wardrobe':
  r(3,2,26,28,'#5a4433');r(5,4,22,24,'#8b7053');r(15,5,2,22,'#4f3c2c');r(11,14,2,4,'#d5c38c');r(20,14,2,4,'#d5c38c');break;
 case 'crate':
  r(3,4,26,25,'#654832');r(5,6,22,20,'#ab8757');r(14,6,4,20,'#745439');r(5,14,22,4,'#745439');break;
 case 'counter':
  r(2,6,28,23,'#675440');r(2,4,28,17,'#b2ac91');r(5,6,12,11,'#896d47');r(7,10,9,2,'#c5d0c9');r(17,10,4,2,'#504035');r(23,6,4,5,'#8b9a69');break;
 case 'altar':
  r(5,22,22,7,'#646b71');r(3,9,26,16,'#93908a');r(5,11,22,9,'#adb0a5');r(12,10,8,15,'#82678c');
  r(6,6,3,7,'#e2d5a6');r(23,6,3,7,'#e2d5a6');r(6,3,3,3,'#efb34b');r(23,3,3,3,'#efb34b');r(13,12,6,5,'#dbc992');break;
 case 'bed':
  r(5,2,22,28,'#5f412f');r(7,4,18,24,'#bdc3b2');r(8,5,16,7,'#e1d6bb');r(7,14,18,14,'#6f8792');r(9,16,14,2,'#96aeb5');break;
 case 'stove':
  r(3,3,26,26,'#696e6a');r(5,5,22,12,'#252b2b');
  for(const x of [8,20]){r(x,7,5,5,'#101a1b');r(x+1,8,3,3,'#a2774d');}
  r(7,20,18,7,'#2f3532');r(10,21,12,4,'#ad633e');break;
 case 'rack':
  r(3,3,4,26,'#69472f');r(25,3,4,26,'#69472f');r(4,7,24,4,'#9b734d');r(4,23,24,4,'#9b734d');
  for(const x of [10,20]){r(x,3,3,19,'#bcc4be');r(x-3,20,9,3,'#b89756');r(x,23,3,5,'#70503a');}break;
 }
 ctx.restore();
}
