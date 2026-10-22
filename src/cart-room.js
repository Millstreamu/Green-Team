import { placeProp } from './prop-placement.js';
import { roomEntrances } from './dungeon-layout.js';
// The generator reserves the northern strip before carving the main dungeon.
// Attach to its northernmost floor, so the cart corridor cannot cross a room.
export function addCartRoom(world) {
 let join;
 for(let y=0;y<world.height&&!join;y++)for(let x=1;x<world.width-1;x++)if(world.tiles[y*world.width+x]){join={x,y};break;}
 if(!join)throw Error('Dungeon has no cart-room connection.');
 const x=Math.max(2,Math.min(world.width-9,join.x-3));
 const room={x,y:2,w:7,h:5,cx:x+3,cy:4};
 const carve=(x,y,corridor=false)=>{world.tiles[y*world.width+x]=1;if(corridor)world.corridorTiles[y*world.width+x]=1;};
 for(let y=room.y;y<room.y+room.h;y++)for(let x=room.x;x<room.x+room.w;x++)carve(x,y);
 let cx=room.cx,cy=7;while(cy<9){carve(cx,cy,true);cy++;}
 while(cx!==join.x){carve(cx,cy,true);cx+=Math.sign(join.x-cx);}while(cy<=join.y){carve(cx,cy,true);cy++;}
 room.entrances=roomEntrances(world,room);world.cartRoom=room;
 const prop=placeProp(world,room,'minecart');if(!prop)throw Error('Cart room has no valid cart placement.');
 world.cartProp={...prop,kind:'minecart'};world.spawn={...prop.approach};
 for(const main of world.rooms)main.entrances=roomEntrances(world,main);
 return world;
}
