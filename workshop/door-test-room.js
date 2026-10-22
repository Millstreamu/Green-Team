import { createSurfaceLoot, surfaceItem } from '../src/surface-loot.js';
import { ROOM_TYPES } from '../src/room-types.js';
import { createSearchables } from '../src/search.js';
import { createHidingSpots } from '../src/hiding.js';
import { setSolidObjects } from '../src/world.js';
import { placeProp } from '../src/prop-placement.js';
import { createGuard } from '../src/guard.js';
import { applyRoomDoors } from '../src/room-doors.js';

// Disposable workshop fixture using production props, guard AI and interactions.
export function createDoorTestRoom() {
  const width=13,height=15,tiles=new Uint8Array(width*height),corridorTiles=new Uint8Array(width*height);
  const cell={x:6,y:7,side:'north'};
  const rooms=[
    {x:2,y:8,w:9,h:5,cx:6,cy:10,entrances:[{side:'north',cells:[{x:6,y:7}]}]},
    {x:2,y:1,w:9,h:6,cx:6,cy:4,entrances:[{side:'south',cells:[{x:6,y:7}]}]}
  ];
  for(const r of rooms)for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)tiles[y*width+x]=1;
  tiles[7*width+6]=1;corridorTiles[7*width+6]=1;
  const world={seed:9901,width,height,tiles,corridorTiles,rooms,shortcuts:[],layout:{corridorWidth:1},spawn:{x:3.5,y:11.5}};
  const objects=[];
  for(const [index,type,contents]of [[0,'crate',['copperCoin']],[1,'chest',['coin']],[1,'cupboard',['cloth']]]){
    const point=placeProp(world,rooms[index],type,objects);
    if(point)objects.push({id:`door-room-search-${objects.length}`,type,...point,contents,searched:false});
  }
  const point=placeProp(world,rooms[0],'hiding',objects);
  const hidingSpots=point?[{id:'door-room-hide',...point,occupantId:null}]:[];
  setSolidObjects(world,[...objects,...hidingSpots]);
  const guard=createGuard(world,{roomIndex:1,behaviour:'lookout',patrol:[{x:6.78,y:4.5}]});
  guard.angle=Math.PI/2;guard.watchAngles=[Math.PI/2,Math.PI/2];
  applyRoomDoors(world,[{id:'door-room-door',roomIndex:1,cells:[cell],side:'north',x:6.5,y:7.5,progress:0,open:false,openerId:null}]);
  return {world,objects,hidingSpots,guards:[guard],start:{x:6.78,y:8.5}};
}

export function createRoomPassFixture(roomType,job,tuning) {
 const f=createDoorTestRoom(),world=f.world,door=world.roomDoors[0];
 applyRoomDoors(world,[]);world.roomThemes=true;world.rooms[1].roomType=Object.hasOwn(ROOM_TYPES,roomType)?roomType:'dining';
 world.layout.searchablesPerRoom=3;world.job=job;world.tuning=tuning;
 f.objects=createSearchables(world);
 const hideRoom=world.rooms[1].roomType==='bedroom'?world.rooms[1]:world.rooms[0];
 const hide=placeProp(world,hideRoom,'hiding',f.objects,{solid:true,width:1,height:1,placement:'corner'});
 f.hidingSpots=hide?[{id:'room-pass-hide',...hide,occupantId:null}]:[];
 setSolidObjects(world,[...f.objects,...f.hidingSpots]);
 f.ground=createSurfaceLoot(world,f.objects);
 const surface=f.objects.find(o=>o.roomType===world.rooms[1].roomType&&surfaceItem(world,o,'copperCoin','coin'));
 if(surface&&!f.ground.some(i=>i.surfaceId===surface.id))f.ground.push(surfaceItem(world,surface,'copperCoin','coin'));
 applyRoomDoors(world,[door]);return f;
}
