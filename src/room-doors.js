import { canStand } from './world.js';
import { clearPath } from './loot.js';
import { treasureDoorCells } from './treasure.js';

export const ROOM_DOOR = Object.freeze({ openSeconds: 2, closeSeconds: .3, reach: 1.6 });
export function applyRoomDoors(world, doors = []) {
  const signature=JSON.stringify(doors.map(d=>[d.id,d.open,d.progress]));
  const changed=world.roomDoorSightSignature!==signature;
  world.roomDoorSightSignature=signature;
  world.roomDoors = doors;
  world.roomDoorTiles = new Uint8Array(world.tiles.length);
  for (const door of doors) if (!door.open) for (const c of door.cells) world.roomDoorTiles[c.y * world.width + c.x] = 1;
  if (changed) world.sightVersion = (world.sightVersion ?? 0) + 1;
}
// One bounded, single-entrance ordinary room for the first experiment. Keep
// treasure, spawn, cages and initial guard positions outside the closed room.
export function createRoomDoors(world, excluded = []) {
  if (world.roomDoors) return world.roomDoors;
  const inside = (r, p) => p.x >= r.x && p.x < r.x+r.w && p.y >= r.y && p.y < r.y+r.h;
  const candidates = world.rooms.map((room, roomIndex) => ({room, roomIndex}))
    .filter(({room,roomIndex}) => roomIndex > 0 && roomIndex !== world.treasure?.roomIndex && room.entrances?.length === 1 && !excluded.some(p => inside(room,p)));
  const doors = [];
  for (const {room,roomIndex} of candidates) {
    const cells = treasureDoorCells(world,room);
    if (!cells || cells.length !== 1 || cells.some(c => world.solidTiles?.[c.y*world.width+c.x] || world.lockedTiles?.[c.y*world.width+c.x])) continue;
    const c = cells[0];
    doors.push({id:`${world.seed}-room-door`,roomIndex,cells,side:c.side,x:c.x+.5,y:c.y+.5,progress:0,open:false,openerId:null});
    break;
  }
  applyRoomDoors(world,doors); return doors;
}
export function canOpenRoomDoor(world, player, door) {
  if (!door || door.open || player.state !== 'active' || player.hiding || player.enteringHide || player.loot?.held || player.placement?.itemId) return false;
  return door.cells.some(c => {
    const centre = {x:c.x+.5,y:c.y+.5};
    if (Math.hypot(player.x-centre.x,player.y-centre.y)>ROOM_DOOR.reach) return false;
    return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => {
      const p = {x:centre.x+dx,y:centre.y+dy};
      return canStand(world,p.x,p.y) && Math.hypot(player.x-p.x,player.y-p.y)<=1.1 && clearPath(world,player,p);
    });
  });
}
export function beginRoomDoor(world, player, id) {
  const door = world.roomDoors?.find(d => d.id === id);
  if (!canOpenRoomDoor(world,player,door) || door.openerId && door.openerId !== player.id) return false;
  door.openerId=player.id; door.origin={x:player.x,y:player.y}; return true;
}
export function cancelRoomDoor(world, player) {
  for (const door of world.roomDoors ?? []) if (door.openerId === player.id) { door.openerId=null; delete door.origin; }
}
export function tickRoomDoors(world, players, dt, holding = p => p.searchHeld) {
  let opened=false, changed=false;
  for (const door of world.roomDoors ?? []) {
    if (door.open) continue;
    const before=door.progress;
    const p=players.find(p => p.id===door.openerId);
    const active=p && p.connected !== false && p.inRun !== false && holding(p) && canOpenRoomDoor(world,p,door) && Math.hypot(p.x-door.origin.x,p.y-door.origin.y)<=.15;
    if (active) door.progress=Math.min(1,door.progress+Math.max(0,dt)/ROOM_DOOR.openSeconds);
    else { door.openerId=null; delete door.origin; door.progress=Math.max(0,door.progress-Math.max(0,dt)/ROOM_DOOR.closeSeconds); }
    changed ||= before!==door.progress;
    if (door.progress >= 1-1e-9) { door.progress=1; door.open=true; door.openerId=null; delete door.origin; opened=true; }
  }
  if (changed) applyRoomDoors(world,world.roomDoors);
  return opened;
}
