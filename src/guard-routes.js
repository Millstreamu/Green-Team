import { findPath } from './navigation.js';
import { GUARD_PATTERNS } from './config.js';

const roomContains = (room, point) => point.x >= room.x && point.x < room.x + room.w && point.y >= room.y && point.y < room.y + room.h;
export function createRoamingRoute(world, occupiedRooms = []) {
  if (world.rooms.length < 3) return null;
  // This view is used only to choose the routine; pursuit still uses the real map.
  const tiles = world.tiles.slice(), entrance = world.rooms[0];
  for (let y = entrance.y; y < entrance.y + entrance.h; y++) for (let x = entrance.x; x < entrance.x + entrance.w; x++) tiles[y * world.width + x] = 0;
  const routineWorld = { ...world, tiles };
  const pathBetween = (from, to) => {
    const path = findPath(routineWorld, from, to);
    return path.length ? [{ ...from }, ...path] : [];
  };
  const candidates = world.rooms.map((room, index) => ({ index, point: { x: room.cx + .5, y: room.cy + .5 } })).filter(entry => entry.index !== 0 && entry.index !== world.treasure?.roomIndex && !occupiedRooms.includes(entry.index));
  const touched = path => world.rooms.map((room, index) => path.some(point => roomContains(room, point)) ? index : -1).filter(index => index >= 0);
  const pairs = candidates.flatMap((a, i) => candidates.slice(i + 1).map(b => ({ a, b, distance: Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y) }))).sort((a, b) => a.distance - b.distance || a.a.index - b.a.index || a.b.index - b.b.index);
  for (const { a, b } of pairs) {
    let path = pathBetween(a.point, b.point);
    if (!path.length || path.length > GUARD_PATTERNS.roamMaxLength) continue;
    let roomIndices = touched(path);
    if (roomIndices.length > GUARD_PATTERNS.roamRooms) continue;
    const stops = [{ ...a.point }, { ...b.point }];
    // Add one nearby stop if the entire out-and-back route still stays local.
    const extra = candidates.filter(entry => !roomIndices.includes(entry.index)).sort((c, d) => Math.hypot(c.point.x - b.point.x, c.point.y - b.point.y) - Math.hypot(d.point.x - b.point.x, d.point.y - b.point.y) || c.index - d.index);
    for (const c of extra) {
      const leg = pathBetween(b.point, c.point);
      const combined = [...path, ...leg.slice(1)], nextRooms = touched(combined);
      if (!leg.length || combined.length > GUARD_PATTERNS.roamMaxLength || nextRooms.length > GUARD_PATTERNS.roamRooms) continue;
      path = combined; roomIndices = nextRooms; stops.push({ ...c.point }); break;
    }
    // Mirror the same corridor path to produce an observable repeating routine.
    return { points: [...path, ...path.slice(1, -1).reverse().map(point => ({ ...point }))], stops, roomIndices, homeRoomIndex: a.index };
  }
  return null; // Small/unusual layouts keep the existing guards rather than force a bad route.
}
