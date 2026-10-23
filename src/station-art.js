const stationSpriteColors = {outline:'#3b4634',glass:'#e0e9cf',shine:'#f6f0cd',cork:'#9b7750',purple:'#a49ac6',teal:'#78bbbd',gold:'#d1b75e',dark:'#54643f'};
export function drawStationSprite(canvas, type) {
  type = type === 'mushroom' ? 'mushrooms' : type === 'quickSearch' ? 'quick' : type;
  const colors = stationSpriteColors;
  const rect = (...args) => r(...args);
  const c=canvas.getContext('2d');c.clearRect(0,0,32,40);c.imageSmoothingEnabled=false;
  const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const outline='#3b4634',metal='#b1b8a5',shine='#e7e6c7',wood='#957049',green='#7e9355';
  if(type==='sprint'){r(12,8,8,17,outline);r(14,10,4,13,green);r(12,23,15,9,outline);r(14,24,11,5,wood);r(4,14,6,2,metal);r(2,19,8,2,metal);r(5,24,5,2,metal);}
  if(type==='sense'){r(5,16,23,10,outline);r(9,12,15,18,outline);r(8,18,17,6,shine);r(12,15,9,12,shine);r(14,17,5,8,green);r(16,19,2,4,outline);}
  if(type==='anchor'){const ink='#b48ce0';r(12,3,8,7,outline);c.clearRect(14,5,4,3);r(13,4,6,1,ink);r(13,8,6,1,ink);r(13,4,1,5,ink);r(18,4,1,5,ink);r(9,11,14,3,outline);r(10,12,12,1,ink);r(14,10,4,22,outline);r(15,11,2,20,ink);r(6,26,20,4,outline);r(7,27,18,2,ink);r(4,20,4,9,outline);r(5,21,2,7,ink);r(24,20,4,9,outline);r(25,21,2,7,ink);r(3,19,6,3,outline);r(23,19,6,3,outline);}
  if(type==='heart'){const red='#b8574c',pink='#e39c88';r(6,10,8,4,outline);r(18,10,8,4,outline);r(4,13,24,8,outline);r(6,21,20,4,outline);r(9,25,14,3,outline);r(12,28,8,3,outline);r(15,31,2,2,outline);r(7,12,6,3,red);r(19,12,6,3,red);r(6,15,20,6,red);r(8,21,16,4,red);r(11,25,10,3,red);r(14,28,4,2,red);r(8,13,3,3,pink);r(13,33,6,3,outline);r(14,34,4,1,'#d1b75e');}
  if(type==='haggle'){r(9,10,14,6,outline);r(10,11,12,4,'#a07d4e');r(13,8,6,3,outline);r(6,15,20,17,outline);r(8,16,16,15,'#b58d58');r(10,18,4,4,'#d9c48a');r(13,22,7,2,'#d4b85f');r(11,25,10,2,'#d4b85f');r(15,20,2,9,'#d4b85f');r(21,4,6,6,outline);r(22,5,4,4,'#e4c95f');r(23,6,2,2,shine);}
  if(type==='bearing'){r(6,6,20,20,outline);r(8,8,16,16,'#e0d4ad');r(10,10,12,12,'#cdbf93');r(15,8,2,4,outline);r(15,20,2,4,outline);r(8,15,4,2,outline);r(20,15,4,2,outline);r(16,11,2,2,'#c45a3a');r(18,9,2,2,'#c45a3a');r(14,13,2,2,'#c45a3a');r(12,15,2,2,'#5d6c50');r(10,17,2,2,'#5d6c50');r(10,28,12,6,outline);r(12,29,8,4,'#d4b85f');r(14,30,4,2,'#e8cd81');}
  if(type==='crateTrap'){r(5,12,22,20,'#654832');r(7,14,18,16,'#ab8757');r(14,14,4,16,'#745439');r(7,20,18,4,'#745439');r(3,8,26,2,'#d0533f');r(3,7,2,4,outline);r(27,7,2,4,outline);r(15,4,2,5,outline);r(14,3,4,2,'#d0533f');r(4,33,24,2,outline);}
  if(type==='sacrifice'){r(7,14,18,18,outline);r(9,15,14,15,'#a79366');r(11,11,10,5,outline);r(12,12,8,3,'#c5b07a');r(9,22,14,2,'#7d6a45');r(14,18,4,4,'#d7a3b5');r(15,19,2,2,'#f2d0dc');r(4,6,2,6,'#e8cd81');r(2,8,6,2,'#e8cd81');r(25,4,2,6,'#e8cd81');r(23,6,6,2,'#e8cd81');r(26,24,2,4,'#e8cd81');r(25,25,4,2,'#e8cd81');}
  if(type==='shadow'){r(4,30,24,5,'#2a2f3a');r(6,29,20,2,'#3c4352');r(11,12,10,17,'#20252e');r(9,16,14,9,'#20252e');r(12,8,8,6,'#20252e');r(13,10,2,2,'#c7ee7b');r(17,10,2,2,'#c7ee7b');const moon='#6f6a8c';r(22,5,2,5,moon);r(23,4,2,1,moon);r(23,10,2,1,moon);r(24,3,3,1,moon);r(24,11,3,1,moon);}
  if(type==='veil'){r(7,9,19,20,outline);r(9,11,15,16,'#78bbbd');r(12,15,3,3,shine);r(19,15,3,3,shine);r(10,29,4,3,metal);r(17,32,4,3,metal);r(24,27,3,3,metal);}
  if(['gold','coin','silverCoin','copperCoin'].includes(type)){
    const coinColor = type === 'silverCoin' ? '#bdc6b6' : type === 'copperCoin' ? '#b7825d' : '#d4b85f';
    r(7,12,18,19,outline);r(5,16,22,11,outline);r(8,13,16,17,coinColor);r(7,16,18,11,coinColor);r(10,15,2,12,shine);r(16,18,4,7,wood);
  }
  if(['disguise','vanish','lucky'].includes(type)){
   const liquid=colors[type==='disguise'?'purple':type==='vanish'?'teal':'gold'];
   const body=type==='vanish'?{x:6,y:19,w:20,h:16}:type==='lucky'?{x:4,y:22,w:24,h:13}:{x:8,y:17,w:16,h:20};
   rect(12,5,8,6,colors.outline);rect(13,5,6,4,colors.cork);rect(12,11,8,body.y-9,colors.outline);rect(14,11,4,body.y-8,colors.glass);
   rect(body.x+2,body.y-2,body.w-4,body.h+4,colors.outline);rect(body.x,body.y+2,body.w,body.h-1,colors.outline);rect(body.x+2,body.y,body.w-4,body.h,colors.glass);rect(body.x+2,body.y+5,body.w-4,body.h-5,liquid);
   rect(body.x+4,body.y+2,2,body.h-6,colors.shine);rect(body.x+body.w-6,body.y+8,2,body.h-9,'#53614b');
   if(type==='disguise'){rect(13,25,7,7,'#ede4bf');rect(15,27,3,3,colors.dark);}else if(type==='vanish'){rect(13,27,6,2,'#e9edd3');rect(15,25,2,6,'#e9edd3');}else{rect(14,27,4,5,'#ede4bf');rect(12,29,8,2,'#ede4bf');}
  }
  if(type==='scrap'){r(6,15,21,12,outline);r(10,10,7,23,outline);r(8,17,17,8,metal);r(12,12,3,19,metal);r(21,17,4,6,wood);r(10,26,5,5,wood);r(12,17,3,3,shine);}
  if(type==='cloth'){r(7,10,18,22,outline);r(9,11,16,17,'#c2c7a9');r(7,15,16,17,'#d5d5b5');r(9,16,2,14,'#949d81');r(12,29,10,2,'#949d81');r(15,14,8,2,shine);}
  if(type==='meat'){r(8,13,17,16,outline);r(5,17,22,8,outline);r(7,17,18,8,'#9d6352');r(10,14,13,14,'#bc8068');r(12,17,6,7,'#dfb091');r(18,12,6,4,shine);}
  if(type==='berries'){r(15,8,3,10,outline);r(7,9,10,4,green);r(18,10,8,4,green);[[9,17],[18,17],[13,25]].forEach(([x,y])=>{r(x-1,y,9,8,'#55434d');r(x,y-1,7,10,'#55434d');r(x+1,y+1,5,6,'#a36588');r(x+1,y+1,2,2,'#d7a3b5');});}
  if(type==='mushrooms'){r(14,18,7,13,'#564936');r(15,18,5,11,'#dfd2ad');r(7,12,20,10,'#594b38');r(10,9,14,14,'#594b38');r(9,13,16,7,'#a5734b');r(12,11,10,10,'#bf8e60');r(12,13,3,3,'#e6d1a5');r(20,15,3,3,'#e6d1a5');}
  if(type==='dart'){r(7,28,20,3,outline);r(15,19,3,11,metal);r(17,15,3,11,metal);r(19,11,3,9,metal);r(21,8,6,6,outline);r(22,7,5,7,shine);r(8,28,8,6,'#8e6b55');r(7,25,4,7,green);r(11,28,5,3,wood);}
  if(type==='bell'){r(13,8,7,5,outline);r(14,9,5,3,'#c3a45f');r(10,14,13,13,outline);r(8,21,17,8,outline);r(6,27,21,4,outline);r(10,21,13,6,'#c7ac65');r(12,15,9,12,'#c7ac65');r(8,28,17,2,'#e8cd81');r(14,31,6,4,outline);r(14,17,2,8,shine);}
  if(type==='smoke'){r(14,7,6,4,wood);r(18,10,5,6,outline);r(10,16,15,16,outline);r(6,20,22,8,outline);r(9,18,16,12,'#75827a');r(12,16,9,16,'#75827a');r(10,18,3,7,'#acb9a3');r(11,27,10,3,'#525f54');}
  if(type==='snare'){r(5,26,23,5,outline);r(7,24,19,3,metal);r(7,14,3,12,outline);r(23,14,3,12,outline);r(8,12,3,10,metal);r(22,12,3,10,metal);r(11,16,3,5,metal);r(19,16,3,5,metal);r(13,22,8,4,wood);r(14,25,5,5,metal);r(4,31,24,2,wood);}
  if(type==='orb'){r(10,10,13,22,outline);r(6,14,21,14,outline);r(8,14,17,14,'#7ca5ac');r(11,12,11,18,'#7ca5ac');r(11,13,5,5,'#d0e0ce');r(18,22,5,7,'#597680');r(10,32,14,3,wood);r(7,35,20,2,outline);}
  if(type==='lunch'){r(6,15,22,18,outline);r(8,16,18,15,'#a79366');r(10,11,14,6,outline);r(12,12,10,5,'#d8c796');r(7,21,20,3,wood);r(15,15,3,17,'#dcc992');r(13,23,7,6,green);r(15,21,3,10,green);}
  if(type==='quick'){r(12,16,13,18,outline);r(7,20,6,10,outline);r(12,11,3,14,outline);r(17,9,3,15,outline);r(22,12,3,13,outline);r(13,17,10,15,'#9fbc70');r(9,21,5,6,'#9fbc70');r(13,12,1,11,'#9fbc70');r(18,10,1,12,'#9fbc70');r(23,13,1,11,'#9fbc70');r(12,32,12,4,wood);r(26,8,2,5,'#c1ae5d');r(24,10,6,1,'#c1ae5d');}
 }

export const STATION_SPRITE_TYPES = Object.freeze(['gold','coin','silverCoin','copperCoin','scrap','cloth','meat','berries','mushroom','snare','smoke','dart','bell','orb','lunch','quickSearch','disguise','vanish','lucky']);
const stationSpriteCache = new Map();
export function stationSprite(type) {
  if (!STATION_SPRITE_TYPES.includes(type)) return null;
  if (!stationSpriteCache.has(type)) {
    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 40;
    drawStationSprite(canvas, type); stationSpriteCache.set(type, canvas);
  }
  return stationSpriteCache.get(type);
}
