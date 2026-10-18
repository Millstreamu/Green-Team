import { CONFIG, COMBAT } from './config.js';
import { canStand, isFloor, isWalkable } from './world.js';
import { propCells, reservedRoomTiles } from './prop-placement.js';
import { findPath, followPath } from './navigation.js';
import { createReinforcement } from './pressure.js';

// Read-only checks of the actual generated world, not a second map generator.
export function checkDungeon(preview) {
  const { world, objects, hidingSpots, cages, doors, guards } = preview;
  const issues = [], radius = Math.max(CONFIG.radius, COMBAT.guardRadius);
  const issue = (code, message, point, severity = 'error') => issues.push({ code, severity, message, ...(point ? { x: point.x, y: point.y } : {}) });
  const keyAt = p => Math.floor(p.y) * world.width + Math.floor(p.x);
  const reached = new Set(), queue = [];
  if (canStand(world, world.spawn.x, world.spawn.y, radius)) { queue.push(keyAt(world.spawn)); reached.add(queue[0]); }
  else issue('entrance', 'The entrance is blocked.', world.spawn);
  for (let i = 0; i < queue.length; i++) {
    const key = queue[i], x = key % world.width, y = Math.floor(key / world.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, next = ny * world.width + nx;
      if (!reached.has(next) && isWalkable(world, nx, ny) && canStand(world, nx + .5, ny + .5, radius)) { reached.add(next); queue.push(next); }
    }
  }
  let walkable = 0, isolated = 0;
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
    if (isFloor(world, x, y) && (x === 0 || y === 0 || x === world.width - 1 || y === world.height - 1)) issue('boundary', 'Floor opens onto the map edge.', { x: x + .5, y: y + .5 });
    if (!isWalkable(world, x, y)) continue;
    walkable++;
    if (!reached.has(y * world.width + x)) { isolated++; issue('isolated-floor', 'Floor cannot be reached from the entrance.', { x: x + .5, y: y + .5 }); }
  }
  const reachable = (point, label) => {
    if (!point || !canStand(world, point.x, point.y, radius) || !reached.has(keyAt(point))) { issue('unreachable', `${label} is blocked or unreachable.`, point); return false; }
    return true;
  };
  const route = (from, to, label) => {
    if (!from || !to || !canStand(world, from.x, from.y, radius) || !canStand(world, to.x, to.y, radius)) { issue('route', `${label} has a blocked endpoint.`, to ?? from); return; }
    const path = findPath(world, from, to), actor = { ...from };
    if (!path.length && Math.hypot(from.x - to.x, from.y - to.y) > .01) { issue('route', `${label} has no walking route.`, to); return; }
    followPath(world, actor, path, world.tiles.length * 2, radius);
    if (Math.hypot(actor.x - to.x, actor.y - to.y) > .02) issue('tight-route', `${label} catches on a wall or corner.`, actor);
  };
  for (const [i, room] of world.rooms.entries()) {
    reachable({ x: room.cx + .5, y: room.cy + .5 }, `Room ${i + 1} centre`);
    for (const entrance of room.entrances ?? []) for (const cell of entrance.cells) reachable({ x: cell.x + .5, y: cell.y + .5 }, `Room ${i + 1} doorway`);
  }
  const occupied = new Map();
  for (const prop of [...objects, ...hidingSpots, ...cages]) {
    const label = prop.type ?? (hidingSpots.includes(prop) ? 'Hiding spot' : 'Cage');
    const width = prop.width ?? 1, height = prop.height ?? 1;
    if (!Number.isInteger(prop.tileX) || !Number.isInteger(prop.tileY) || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || prop.x !== prop.tileX + width / 2 || prop.y !== prop.tileY + height / 2) issue('grid', `${label} does not line up with its tile footprint.`, prop);
    const room = world.rooms.find(r => prop.tileX >= r.x && prop.tileY >= r.y && prop.tileX + width <= r.x + r.w && prop.tileY + height <= r.y + r.h);
    if (!room) issue('room', `${label} is outside a room.`, prop);
    const reserved = room ? reservedRoomTiles(world, room) : new Set();
    for (const cell of propCells(prop)) {
      const key = cell.y * world.width + cell.x, point = { x: cell.x + .5, y: cell.y + .5 };
      if (!isFloor(world, cell.x, cell.y)) issue('footprint', `${label} overlaps a wall.`, point);
      if (occupied.has(key)) issue('overlap', `${label} overlaps another object.`, point);
      occupied.set(key, prop.id);
      if (reserved.has(key) || world.corridorTiles?.[key]) issue('corridor', `${label} occupies a protected path.`, point);
      if ((objects.includes(prop) || hidingSpots.includes(prop)) && !world.solidTiles?.[key]) issue('solid', `${label} is missing its solid movement tile.`, point);
    }
    if (prop.type === 'cupboard' && (!room || prop.tileY !== room.y || isFloor(world, prop.tileX, prop.tileY - 1))) issue('back-wall', 'Cupboard is not on a back wall.', prop);
    if (reachable(prop.approach, `${label} approach`)) route(world.spawn, prop.approach, `${label} approach`);
  }
  for (const guard of guards) {
    reachable(guard, 'Guard starting point');
    const patrol = guard.patrol ?? [];
    for (let i = 0; i < patrol.length; i++) route(patrol[i], patrol[(i + 1) % patrol.length], 'Guard patrol');
    const routine = guard.roamRoute ?? [];
    for (let i = 0; i < routine.length; i++) route(routine[i], routine[(i + 1) % routine.length], 'Guard walking circuit');
    for (const cage of cages) route(guard.home ?? guard, cage.entry, 'Guard route to cage');
  }
  for (const cage of cages) { reachable(cage.entry, 'Cage rescue point'); reachable(cage.post, 'Jail guard post'); }
  for (const [i, door] of doors.entries()) {
    if (!reachable(door.spawn, 'Reinforcement entrance')) continue;
    const reinforcement = createReinforcement(world, door, i + 1);
    if (reinforcement.patrol.length < 2) issue('reinforcement', 'Reinforcements cannot leave their starting area.', door.spawn);
    for (let j = 0; j + 1 < reinforcement.patrol.length; j++) route(reinforcement.patrol[j], reinforcement.patrol[j + 1], 'Reinforcement patrol');
  }
  if (!cages.length) issue('missing-cages', 'No cages could fit in this layout.', null, 'warning');
  if (!doors.length) issue('missing-doors', 'No reinforcement entrances could fit in this layout.', null, 'warning');
  if (!hidingSpots.length) issue('missing-hides', 'No hiding spots could fit in this layout.', null, 'warning');
  const errors = issues.filter(i => i.severity === 'error').length, warnings = issues.length - errors;
  return { seed: world.seed, errors, warnings, issues, walkable, reachable: reached.size, isolated };
}

export function dungeonCheckSummary(report) {
  return report.errors || report.warnings ? `${report.errors} problems · ${report.warnings} warnings` : 'Route checks passed';
}
