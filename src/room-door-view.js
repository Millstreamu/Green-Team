import { doorLeafSegment } from './door-geometry.js';
import { CONFIG } from './config.js';
import { canOpenRoomDoor } from './room-doors.js';

export function drawRoomDoor(ctx, door, ox, oy) {
  const t=CONFIG.tile, x=door.cells[0].x*t+ox,y=door.cells[0].y*t+oy;
  const vertical=['east','west'].includes(door.side);
  ctx.save(); ctx.translate(x,y); if(vertical){ctx.translate(t,0);ctx.rotate(Math.PI/2);}
  ctx.scale(t/32,t/32);
  ctx.fillStyle='#b59b6c'; ctx.fillRect(0,8,3,16);ctx.fillRect(29,8,3,16);
  const localDoor={...door,cells:[{x:0,y:0}],side:'north'};
  const [,end]=doorLeafSegment(localDoor),endX=end.x*32,endY=end.y*32;
  ctx.strokeStyle='#38291e';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(3,16);ctx.lineTo(endX,endY);ctx.stroke();
  ctx.strokeStyle='#aa7949';ctx.lineWidth=4;ctx.stroke();
  ctx.fillStyle='#efd589';ctx.fillRect(endX-2,endY-2,3,3);ctx.restore();
}
export function drawRoomDoorHints(ctx,world,player,ox,oy) {
  for(const door of world.roomDoors ?? []) {
    if(!canOpenRoomDoor(world,player,door))continue;
    const x=door.x*CONFIG.tile+ox,y=door.cells[0].y*CONFIG.tile+oy-10;
    ctx.fillStyle='#f0d68c';ctx.font='8px monospace';ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.fillText(door.openerId && door.openerId!==player.id?'OPENING…':'HOLD E · OPEN',x,y);
    ctx.fillStyle='#242820';ctx.fillRect(x-15,y+3,30,4);ctx.fillStyle='#e5cc86';ctx.fillRect(x-15,y+3,30*door.progress,4);
  }
}
