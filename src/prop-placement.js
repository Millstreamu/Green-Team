import { isFloor, canStand } from './world.js';

// Shared by furniture, hiding spots and future decor. Dimensions are floor tiles.
export const PROP_RULES = Object.freeze({
  minecart: Object.freeze({solid:true,width:1,height:1,placement:'wall',backWall:true}),
  potion: Object.freeze({ solid: true, width: 1, height: 1, placement: 'wall' }),
  chest: Object.freeze({ solid: true, width: 1, height: 1, placement: 'wall' }),
  cupboard: Object.freeze({ solid: true, width: 1, height: 1, placement: 'wall', backWall: true }),
  crate: Object.freeze({ solid: true, width: 1, height: 1, placement: 'corner' }),
  cage: Object.freeze({ solid: false, width: 1, height: 1, placement: 'wall' }),
  torch: Object.freeze({ solid: false, width: 1, height: 1, placement: 'wall' }),
  hiding: Object.freeze({ solid: true, width: 1, height: 1, placement: 'wall' })
});
export function propCells(prop) {
  const x = prop.tileX ?? Math.floor(prop.x), y = prop.tileY ?? Math.floor(prop.y);
  return Array.from({ length: (prop.width ?? 1) * (prop.height ?? 1) }, (_, i) => ({ x: x + i % (prop.width ?? 1), y: y + Math.floor(i / (prop.width ?? 1)) }));
}
export function reservedRoomTiles(world, room) {
  const reserved = new Set(), add = (x, y) => reserved.add(y * world.width + x);
  // Reserve an inside-to-centre lane for every doorway, including wide ones.
  for (const entrance of room.entrances ?? []) for (const cell of entrance.cells) {
    let x = Math.max(room.x, Math.min(room.x + room.w - 1, cell.x));
    let y = Math.max(room.y, Math.min(room.y + room.h - 1, cell.y));
    add(x, y);
    while (x !== room.cx) { x += Math.sign(room.cx - x); add(x, y); }
    while (y !== room.cy) { y += Math.sign(room.cy - y); add(x, y); }
  }
  for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) if (world.corridorTiles?.[y * world.width + x]) add(x, y);
  add(room.cx, room.cy);
  return reserved;
}
export function placeProp(world, room, kind, occupied = [], rule = PROP_RULES[kind]) {
  if (!rule) return null;
  const { width, height, placement } = rule, reserved = reservedRoomTiles(world, room);
  const used = new Set(occupied.flatMap(propCells).map(p => p.y * world.width + p.x));
  const points = [];
  const protectedApproaches = (rule.protectApproaches || occupied.some(p=>p.placement==='free')) ? new Set(occupied.filter(p=>p.approach).map(p=>Math.floor(p.approach.y)*world.width+Math.floor(p.approach.x))) : new Set();
  for (let y = room.y; y <= room.y + room.h - height; y++) for (let x = room.x; x <= room.x + room.w - width; x++) {
    const preferred = rule.positions?.find(p=>p.x===x&&p.y===y);
    if(rule.positions&&!preferred)continue;
    const cells = propCells({ tileX: x, tileY: y, width, height });
    if (cells.some(p => !isFloor(world, p.x, p.y) || used.has(p.y * world.width + p.x) || reserved.has(p.y * world.width + p.x) || protectedApproaches.has(p.y * world.width + p.x))
      || Math.hypot(x + width / 2 - world.spawn.x, y + height / 2 - world.spawn.y) < 2) continue;
    const north = cells.filter(p => p.y === y).every(p => !isFloor(world, p.x, p.y - 1));
    const south = cells.filter(p => p.y === y + height - 1).every(p => !isFloor(world, p.x, p.y + 1));
    const west = cells.filter(p => p.x === x).every(p => !isFloor(world, p.x - 1, p.y));
    const east = cells.filter(p => p.x === x + width - 1).every(p => !isFloor(world, p.x + 1, p.y));
    if (rule.backWall && (!north || y !== room.y)) continue;
    if (placement !== 'free' && !north && !south && !west && !east) continue;
    let facing = north ? 'south' : south ? 'north' : west ? 'east' : 'west';
    const options = [{x:x+Math.floor(width/2)+.5,y:y+height+.5,facing:'south'},{x:x+Math.floor(width/2)+.5,y:y-.5,facing:'north'},{x:x+width+.5,y:y+Math.floor(height/2)+.5,facing:'east'},{x:x-.5,y:y+Math.floor(height/2)+.5,facing:'west'}];
    const approach = placement==='free' ? options.find(p=>canStand(world,p.x,p.y)&&!used.has(Math.floor(p.y)*world.width+Math.floor(p.x))) : options.find(p=>p.facing===facing);
    if(!approach)continue;
    facing=approach.facing;delete approach.facing;
    if (!canStand(world, approach.x, approach.y) || used.has(Math.floor(approach.y) * world.width + Math.floor(approach.x))) continue;
    if (occupied.some(p => Math.hypot(p.x - x - width / 2, p.y - y - height / 2) <= (rule.minCentreDistance??1))) continue;
    const corner = (north || south) && (west || east);
    points.push({ x: x + width / 2, y: y + height / 2, tileX: x, tileY: y, width, height, facing, placement, approach,
      score: (preferred?.score??0) + (rule.positions?0:1)*((placement === 'corner' && corner ? -100 : 0) + Math.abs(x - room.cx) + Math.abs(y - room.cy)) });
  }
  points.sort((a, b) => a.score - b.score || a.y - b.y || a.x - b.x);
  // Reject even corner arrangements that would seal off a walkable floor cell.
  const solid = rule.solid ?? true;
  const point = points.find(p => !solid || keepsFloorConnected(world, [...occupied, p]));
  if (!point) return null;
  delete point.score; return point;
}

function keepsFloorConnected(world, objects) {
  const blocked = new Set(objects.flatMap(propCells).map(p => p.y * world.width + p.x));
  const start = Math.floor(world.spawn.y) * world.width + Math.floor(world.spawn.x);
  if (blocked.has(start)) return false;
  const queue = [start], seen = new Set(queue);
  for (let i = 0; i < queue.length; i++) {
    const key = queue[i], x = key % world.width, y = Math.floor(key / world.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, next = ny * world.width + nx;
      if (isFloor(world, nx, ny) && !blocked.has(next) && !seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return seen.size === world.tiles.reduce((n, floor, i) => n + Number(!!floor && !blocked.has(i)), 0);
}
