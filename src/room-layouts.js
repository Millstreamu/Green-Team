import { PROP_RULES, placeProp } from './prop-placement.js';

// Preferred whole-grid footprints. placeProp still owns collision, reservations,
// approach validation and connected-floor checks. A whole room falls back when
// the grouped arrangement cannot fit its configured searchable count.
export function roomLayoutRule(world, room, furniture, placed = []) {
 const positions=[];
 if(room.roomType==='dining' && ['table','bench'].includes(furniture)){
  const width=Math.min(3,room.w>=8?3:2),height=1;
  // Tables stay near the middle with room for a walkway on both ends.
  // Benches favour the same rows above/below, leaving a one-tile aisle.
  const table=placed.find(o=>o.roomFurniture==='table');
  for(let y=room.y;y<room.y+room.h;y++)for(let x=room.x+1;x<=room.x+room.w-width-1;x++){
   if(furniture==='table'&&(y===room.y||y===room.y+room.h-1))continue;
   if(furniture==='bench'&&table&&(Math.abs(y-table.tileY)!==2||x!==table.tileX))continue;
   positions.push({x,y,score:Math.abs(x+width/2-(room.cx+.5))*2+Math.abs(y-(room.cy-1))*3});
  }
  return {...PROP_RULES.chest,width,height,placement:'free',positions,minCentreDistance:0,protectApproaches:true};
 }
 if(room.roomType==='storage' && furniture==='stores'){
  // Long north/south shelves, with an open tile at each end. Two rows are
  // separated by at least one floor tile; doorway lanes take precedence.
  const height=room.h>=6?2:1;
  for(let y=room.y+1;y<=room.y+room.h-height-1;y++)for(let x=room.x+1;x<room.x+room.w-1;x++){
   if((x-room.x)%2!==0)continue;
   positions.push({x,y,score:Math.abs(y+height/2-(room.cy+.5))+Math.abs(x-(room.x+2))*.2});
  }
  return {...PROP_RULES.cupboard,width:1,height,backWall:false,placement:'free',positions,minCentreDistance:0,protectApproaches:true};
 }
 if(['prayer','bedroom','kitchen','armoury'].includes(room.roomType)){
  let width=1,height=1;
  if(['altar','pew','counter'].includes(furniture))width=2;
  if(furniture==='bed'||furniture==='rack')height=2;
  for(let y=room.y;y<=room.y+room.h-height;y++)for(let x=room.x;x<=room.x+room.w-width;x++){
   let score=0,ok=true;
   if(room.roomType==='prayer'){
    if(furniture==='altar'){ok=y===room.y;score=Math.abs(x+width/2-room.cx-.5);}
    else {ok=(x===room.x+1||x===room.x+room.w-width-1)&&y>=room.y+2&&y<room.y+room.h-1;score=Math.abs(y-(room.cy-1));}
   }else if(room.roomType==='bedroom'){
    ok=furniture==='bed'?(x===room.x||x===room.x+room.w-width)&&y>=room.y+1&&y<room.y+room.h-height:y===room.y;
    score=furniture==='bed'?Math.abs(y-room.y-1):Math.abs(x-room.cx);
   }else if(room.roomType==='kitchen'){
    ok=furniture==='counter'?x>room.x&&x+width<room.x+room.w&&y>room.y&&y<room.y+room.h-1:y===room.y;
    score=furniture==='counter'?Math.abs(y-(room.cy-1))*3+Math.abs(x+width/2-room.cx-.5):Math.abs(x-room.cx);
   }else{
    ok=furniture==='rack'?(x===room.x||x===room.x+room.w-1)&&y>=room.y+1&&y<room.y+room.h-height:y===room.y;
    score=Math.abs(y-room.y-1)+Math.abs(x-room.cx)*.1;
   }
   if(ok)positions.push({x,y,score});
  }
  return {solid:true,width,height,placement:'free',positions,minCentreDistance:0,protectApproaches:true};
 }
 return null;
}
export function placeRoomFurniture(world, room, count, types, occupied) {
 const arranged=world.roomThemes&&['dining','storage','prayer','bedroom','kitchen','armoury'].includes(room.roomType);
 const baseline=[];
 for(let i=0;i<count;i++){
  const {type,roomFurniture}=types[i],point=placeProp(world,room,type,[...occupied,...baseline]);
  if(point)baseline.push({type,roomFurniture,...point});
 }
 if(arranged){
  const planned=[];
  for(let i=0;i<baseline.length;i++){
   const {type,roomFurniture}=types[i],rule=roomLayoutRule(world,room,roomFurniture,planned);
   const point=placeProp(world,room,type,[...occupied,...planned],rule??PROP_RULES[type]);
   if(!point)break;
   planned.push({type,roomFurniture,...point});
  }
  if(planned.length===baseline.length){room.furnitureLayout=room.roomType;return planned;}
 }
 delete room.furnitureLayout;
 return baseline;
}
