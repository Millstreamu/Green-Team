// One source of truth for the 32px hinged leaf used by art and sight.
export function doorLeafSegment(door) {
  const cell=door.cells[0], angle=Math.max(0,Math.min(1,door.progress ?? 0))*Math.PI/2;
  const local=[{x:3/32,y:.5},{x:3/32+26/32*Math.cos(angle),y:.5-13/32*Math.sin(angle)}];
  return local.map(p=>['east','west'].includes(door.side)?{x:cell.x+1-p.y,y:cell.y+p.x}:{x:cell.x+p.x,y:cell.y+p.y});
}
// Earliest intersection with the leaf's rounded 7px stroke. Clip its rectangular
// middle and two circular ends analytically, so narrow/diagonal rays cannot skip it.
export function roomDoorSightFraction(world,a,b) {
  const vx=b.x-a.x,vy=b.y-a.y,A=vx*vx+vy*vy,r=7/64;
  let first=Infinity;
  for(const door of world.roomDoors ?? []){
    if(door.open)continue;
    const [c,d]=doorLeafSegment(door),length=Math.hypot(d.x-c.x,d.y-c.y),ux=(d.x-c.x)/length,uy=(d.y-c.y)/length;
    const x=(a.x-c.x)*ux+(a.y-c.y)*uy,y=-(a.x-c.x)*uy+(a.y-c.y)*ux;
    const dx=vx*ux+vy*uy,dy=-vx*uy+vy*ux;
    let enter=0,exit=1;
    for(const [p,v,low,high]of [[x,dx,0,length],[y,dy,-r,r]]){
      if(Math.abs(v)<1e-12){if(p<low || p>high){enter=Infinity;break;}}
      else{const t1=(low-p)/v,t2=(high-p)/v;enter=Math.max(enter,Math.min(t1,t2));exit=Math.min(exit,Math.max(t1,t2));}
    }
    if(enter<=exit)first=Math.min(first,enter);
    for(const end of [c,d]){
      const ex=a.x-end.x,ey=a.y-end.y,C=ex*ex+ey*ey-r*r;
      if(C<=0){first=0;continue;}if(A===0)continue;
      const B=ex*vx+ey*vy,disc=B*B-A*C;
      if(disc>=0){const t=(-B-Math.sqrt(disc))/A;if(t>=0 && t<=1)first=Math.min(first,t);}
    }
  }
  return first;
}
export function roomDoorsBlockSight(world,a,b) { return roomDoorSightFraction(world,a,b)!==Infinity; }
