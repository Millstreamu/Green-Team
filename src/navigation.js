import { isWalkable, canStand } from './world.js';

export function findPath(world, from, to) {
  const sx = Math.floor(from.x), sy = Math.floor(from.y), tx = Math.floor(to.x), ty = Math.floor(to.y);
  if (!isWalkable(world, sx, sy) || !isWalkable(world, tx, ty)) return [];
  const start = sy * world.width + sx, goal = ty * world.width + tx;
  const previous = new Int32Array(world.tiles.length).fill(-1), queue = [start];
  previous[start] = start;
  for (let i = 0; i < queue.length && previous[goal] === -1; i++) {
    const key = queue[i], x = key % world.width, y = Math.floor(key / world.width);
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nx = x + dx, ny = y + dy, next = ny * world.width + nx;
      if (isWalkable(world, nx, ny) && previous[next] === -1) { previous[next] = key; queue.push(next); }
    }
  }
  if (previous[goal] === -1) return [];
  const path = [];
  for (let key = goal; ; key = previous[key]) {
    path.push({ x: key % world.width + 0.5, y: Math.floor(key / world.width) + 0.5 });
    if (key === start) break;
  }
  path.reverse();
  if (Math.hypot(path[0].x - from.x, path[0].y - from.y) < 0.01 || path[1] && (Math.abs(path[1].x - from.x) < 0.001 || Math.abs(path[1].y - from.y) < 0.001)) path.shift();
  return path;
}

export function followPath(world, actor, path, distance, radius = 0.26) {
  let moved = 0;
  while (distance > 0.00001 && path.length) {
    const target = path[0], dx = target.x - actor.x, dy = target.y - actor.y, length = Math.hypot(dx, dy);
    if (length < 0.001) { path.shift(); continue; }
    const step = Math.min(distance, length, 0.1), nx = actor.x + dx / length * step, ny = actor.y + dy / length * step;
    if (!canStand(world, nx, ny, radius)) { path.length = 0; break; }
    actor.x = nx; actor.y = ny; actor.angle = Math.atan2(dy, dx); moved += step; distance -= step;
    if (step >= length - 0.001) path.shift();
  }
  return moved;
}
