// Original sample artwork for the approved fixed-silhouette wall format.
export function drawClassicSampleTile(c,name){
 const ox=0,oy=0;
let seed=1;function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function poly(points,fill){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();}
function floor(x,y){
 seed=(x*1327+y*743+17)>>>0;const px=x*32+ox,py=y*32+oy;c.fillStyle='#24281a';c.fillRect(px,py,32,32);
 const fill=['#464b2f','#4e5034','#3f462c','#525438'][Math.floor(rng()*4)];
 poly([[px+5,py+2],[px+23,py+1],[px+29,py+6],[px+30,py+23],[px+25,py+29],[px+6,py+30],[px+2,py+24],[px+1,py+8]],fill);
 c.fillStyle='#5c5d3b';c.fillRect(px+7,py+3,15,1);c.fillStyle='#343b25';
 if(rng()>.45){poly([[px+20,py+3],[px+17,py+12],[px+21,py+16],[px+14,py+25],[px+16,py+17],[px+14,py+12]],'#2d351f');}
 for(let i=0;i<4;i++){const a=px+5+Math.floor(rng()*21),b=py+5+Math.floor(rng()*21);c.fillStyle=i%2?'#3a4228':'#5c5d3b';c.fillRect(a,b,2,2);}

}
function cap(x,y,w,h,vertical){
 c.fillStyle='#4b4a30';c.fillRect(x,y,w,h);
 if(vertical){for(let at=0;at<h;at+=8){poly([[x,y+at+1],[x+4,y+at],[x+6,y+at+2],[x+5,y+at+7],[x+1,y+at+6]],'#88805a');c.fillStyle='#aca079';c.fillRect(x+1,y+at+1,3,1);c.fillStyle='#625c3d';c.fillRect(x+1,y+at+5,4,1);}}
 else{for(let at=0;at<w;at+=8){poly([[x+at,y+1],[x+at+4,y],[x+at+7,y+2],[x+at+6,y+5],[x+at+2,y+6]],'#88805a');c.fillStyle='#aca079';c.fillRect(x+at+1,y+1,4,1);c.fillStyle='#625c3d';c.fillRect(x+at+2,y+4,4,1);}}
}
function part(p,x,y){
 const px=x*32+ox+p.x,py=y*32+oy+p.y;c.save();c.beginPath();c.rect(px,py,p.w,p.h);c.clip();
 if(p.kind==='back'){
  c.fillStyle='#3d3c27';c.fillRect(px,py,32,32);
  for(let row=0;row<3;row++)for(let col=-1;col<3;col++){
   const a=px+col*16+(row%2)*8,b=py+7+row*8;
   poly([[a+1,b],[a+13,b+1],[a+15,b+3],[a+13,b+7],[a+2,b+6],[a,b+3]],'#615f3e');
   c.fillStyle='#77714b';c.fillRect(a+3,b+1,9,1);c.fillStyle='#47472d';c.fillRect(a+3,b+6,8,1);
  }
  cap(px,py,32,6,false);c.fillStyle='#22281b';c.fillRect(px,py+31,32,1);
 }else cap(px,py,p.w,p.h,p.kind==='side');
 c.restore();
}
 if(name==='floor')floor(0,0);
 else {
 const p={back:{kind:'back',x:0,y:0,w:32,h:32},side_w:{kind:'side',x:26,y:0,w:6,h:32},side_e:{kind:'side',x:0,y:0,w:6,h:32},rim:{kind:'rim',x:0,y:0,w:32,h:6},corner_nw:{kind:'side',x:26,y:0,w:6,h:32},corner_ne:{kind:'side',x:0,y:0,w:6,h:32},corner_sw:{kind:'rim',x:26,y:0,w:6,h:6},corner_se:{kind:'rim',x:0,y:0,w:6,h:6}}[name];
 if(!p)throw Error('Unknown classic sample tile');part(p,0,0);
 }
}
