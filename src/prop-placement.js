import { isFloor, canStand } from './world.js';

// Shared by furniture, hiding spots and future decor. Dimensions are floor tiles.
export const PROP_RULES = Object.freeze({
  chest: Object.freeze({ width: 1, height: 1, placement: 'wall' }),
  cupboard: Object.freeze({ width: 1, height: 1, placement: 'wall' }),
  crate: Object.freeze({ width: 1, height: 1, placement: 'corner' }),
  cage: Object.freeze({ width: 1, height: 1, placement: 'wall' }),
  torch: Object.freeze({ width: 1, height: 1, placement: 'wall' }),
  hiding: Object.freeze({ width: 1, height: 1, placement: 'wall' })
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
  add(room.cx, room.cy);
  return reserved;
}
export function placeProp(world, room, kind, occupied = [], rule = PROP_RULES[kind]) {
  if (!rule) return null;
  const { width, height, placement } = rule, reserved = reservedRoomTiles(world, room);
  const used = new Set(occupied.flatMap(propCells).map(p => p.y * world.width + p.x));
  const points = [];
  for (let y = room.y; y <= room.y + room.h - height; y++) for (let x = room.x; x <= room.x + room.w - width; x++) {
    const cells = propCells({ tileX: x, tileY: y, width, height });
    if (cells.some(p => !isFloor(world, p.x, p.y) || used.has(p.y * world.width + p.x) || reserved.has(p.y * world.width + p.x))
      || Math.hypot(x + width / 2 - world.spawn.x, y + height / 2 - world.spawn.y) < 2) continue;
    const north = cells.filter(p => p.y === y).every(p => !isFloor(world, p.x, p.y - 1));
    const south = cells.filter(p => p.y === y + height - 1).every(p => !isFloor(world, p.x, p.y + 1));
    const west = cells.filter(p => p.x === x).every(p => !isFloor(world, p.x - 1, p.y));
    const east = cells.filter(p => p.x === x + width - 1).every(p => !isFloor(world, p.x + 1, p.y));
    if (placement !== 'free' && !north && !south && !west && !east) continue;
    const facing = north ? 'south' : south ? 'north' : west ? 'east' : 'west';
    const approach = north ? { x: x + width / 2, y: y + height + .5 } : south ? { x: x + width / 2, y: y - .5 } : west ? { x: x + width + .5, y: y + height / 2 } : { x: x - .5, y: y + height / 2 };
    if (!canStand(world, approach.x, approach.y) || used.has(Math.floor(approach.y) * world.width + Math.floor(approach.x))) continue;
    if (occupied.some(p => Math.hypot(p.x - x - width / 2, p.y - y - height / 2) <= 1)) continue;
    const corner = (north || south) && (west || east);
    points.push({ x: x + width / 2, y: y + height / 2, tileX: x, tileY: y, width, height, facing, placement, approach,
      score: (placement === 'corner' && corner ? -100 : 0) + Math.abs(x - room.cx) + Math.abs(y - room.cy) });
  }
  points.sort((a, b) => a.score - b.score || a.y - b.y || a.x - b.x);
  const point = points[0]; if (!point) return null;
  delete point.score; return point;
}
