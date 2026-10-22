import { passiveMoveRate } from './passive-effects.js';
import { addCartRoom } from './cart-room.js';
import { CONFIG } from './config.js';
import { addRoomLoops } from './dungeon-layout.js';

export function generateDungeon(seed, config = CONFIG) {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
  const { width, height } = config;
  const tiles = new Uint8Array(width * height), corridorTiles = new Uint8Array(width * height);
  const rooms = [];
  const carve = (x, y) => { if (x > 0 && y > 0 && x < width - 1 && y < height - 1) tiles[y * width + x] = 1; };
  const corridor = (x, y) => {
    const size = config.corridorWidth ?? 1, offset = Math.floor(size / 2);
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) { const cx = x + dx - offset, cy = y + dy - offset; carve(cx, cy); if (cx > 0 && cy > 0 && cx < width - 1 && cy < height - 1) corridorTiles[cy * width + cx] = 1; }
  };
  // Every accepted room connects to a previous one, so all floor is reachable.
  for (let attempt = 0; attempt < 600 && rooms.length < config.rooms; attempt++) {
    const w = integer(config.minRoomWidth ?? 6, config.maxRoomWidth ?? 12), h = integer(config.minRoomHeight ?? 5, config.maxRoomHeight ?? 9);
    const x = integer(2, width - w - 3), y = integer(config.cartRoom ? 12 : 2, height - h - 3);
    if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
    const nearest = rooms.length ? rooms.reduce((best, r) => Math.hypot(r.cx - (x + Math.floor(w / 2)), r.cy - (y + Math.floor(h / 2))) < Math.hypot(best.cx - (x + Math.floor(w / 2)), best.cy - (y + Math.floor(h / 2))) ? r : best) : null;
    if (nearest && Math.abs(nearest.cx - x - Math.floor(w / 2)) + Math.abs(nearest.cy - y - Math.floor(h / 2)) > (config.maxCorridorLength ?? 1000)) continue;
    const room = { x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) };
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) carve(i, j);
    if (rooms.length) {
      const previous = nearest;
      let px = previous.cx, py = previous.cy;
      const horizontalFirst = random() < 0.5;
      const horizontal = () => { while (px !== room.cx) { corridor(px, py); px += Math.sign(room.cx - px); } corridor(px, py); };
      const vertical = () => { while (py !== room.cy) { corridor(px, py); py += Math.sign(room.cy - py); } corridor(px, py); };
      if (config.corridorBends) {
        if (horizontalFirst) {
          const mid = Math.floor((px + room.cx) / 2);
          while (px !== mid) { corridor(px, py); px += Math.sign(mid - px); }
          vertical(); horizontal();
        } else {
          const mid = Math.floor((py + room.cy) / 2);
          while (py !== mid) { corridor(px, py); py += Math.sign(mid - py); }
          horizontal(); vertical();
        }
      } else if (horizontalFirst) { horizontal(); vertical(); } else { vertical(); horizontal(); }
    }
    rooms.push(room);
  }
  const world = addRoomLoops({ layout: { ...config }, seed: seed >>> 0, width, height, tiles, corridorTiles, rooms, spawn: { x: rooms[0].cx + 0.5, y: rooms[0].cy + 0.5 } }, config, random);
  return config.cartRoom ? addCartRoom(world) : world;
}

export function isFloor(world, x, y) {
  return x >= 0 && y >= 0 && x < world.width && y < world.height && world.tiles[y * world.width + x] === 1;
}

// Movement obstacles stay separate from floor art and guard sight.
export function setSolidObjects(world, objects = []) {
  world.solidTiles = new Uint8Array(world.tiles.length);
  for (const object of [...(world.cartProp ? [world.cartProp] : []), ...objects]) for (let dy = 0; dy < (object.height ?? 1); dy++) for (let dx = 0; dx < (object.width ?? 1); dx++) {
    const x = (object.tileX ?? Math.floor(object.x)) + dx, y = (object.tileY ?? Math.floor(object.y)) + dy;
    if (isFloor(world, x, y)) world.solidTiles[y * world.width + x] = 1;
  }
}
// Coarse terrain visibility. Dynamic door leaves are intersected by clearPath,
// vision-cone rays and lighting; movement keeps its full doorway mask.
export function isSightOpen(world, x, y) {
  return isFloor(world, x, y) && !world.lockedTiles?.[y * world.width + x];
}
export function isWalkable(world, x, y) {
  return isSightOpen(world, x, y) && !world.roomDoorTiles?.[y * world.width + x] && !world.solidTiles?.[y * world.width + x];
}

export function canStand(world, x, y, radius = CONFIG.radius) {
  for (let ty = Math.floor(y - radius); ty <= Math.floor(y + radius); ty++) {
    for (let tx = Math.floor(x - radius); tx <= Math.floor(x + radius); tx++) {
      if (isWalkable(world, tx, ty)) continue;
      const dx = x - Math.max(tx, Math.min(x, tx + 1));
      const dy = y - Math.max(ty, Math.min(y, ty + 1));
      if (dx * dx + dy * dy < radius * radius) return false;
    }
  }
  return true;
}

export function movePlayer(world, player, input, dt, config = CONFIG) {
  if (player.hiding) { player.moving = false; player.phase = 0; return; }
  const length = Math.hypot(input.x, input.y);
  if (!length) { player.moving = false; player.phase = 0; return; }
  const distance = config.speed * passiveMoveRate(player) * Math.max(0, dt);
  player.moving = moveActor(world, player, input.x / length * distance, input.y / length * distance, config.radius);
  if (input.x) player.facing = Math.sign(input.x);
  player.phase = player.moving ? player.phase + dt * config.hopRate : 0;
}

// Resolve a circular foot collider against tiles, preserving tangent movement.
// Small steps prevent tunnelling; the final check prevents corner pushes through walls.
function slideStep(world, x, y, dx, dy, radius) {
  let nx = x + dx, ny = y + dy;
  if (canStand(world, nx, ny, radius)) return { x: nx, y: ny };
  const budget = Math.hypot(dx, dy);
  for (let pass = 0; pass < 8; pass++) {
    const travel = Math.hypot(nx - x, ny - y);
    if (travel > budget) { nx = x + (nx - x) * budget / travel; ny = y + (ny - y) * budget / travel; }
    let corrected = false;
    for (let ty = Math.floor(ny - radius); ty <= Math.floor(ny + radius); ty++) {
      for (let tx = Math.floor(nx - radius); tx <= Math.floor(nx + radius); tx++) {
        if (isWalkable(world, tx, ty)) continue;
        const cx = Math.max(tx, Math.min(nx, tx + 1)), cy = Math.max(ty, Math.min(ny, ty + 1));
        const vx = nx - cx, vy = ny - cy, distance = Math.hypot(vx, vy);
        if (distance >= radius || distance < 1e-10) continue;
        const push = (radius - distance + 1e-7) / distance;
        nx += vx * push; ny += vy * push; corrected = true;
      }
    }
    if (!corrected) break;
  }
  const progress = (nx - x) * dx + (ny - y) * dy;
  if (progress >= -1e-9 && Math.hypot(nx - x, ny - y) <= Math.hypot(dx, dy) + 1e-6 && canStand(world, nx, ny, radius)) return { x: nx, y: ny };
  // A tight inside corner can have conflicting contacts. Keep legal axis motion.
  if (canStand(world, x + dx, y, radius)) x += dx;
  if (canStand(world, x, y + dy, radius)) y += dy;
  return { x, y };
}

// Shared collision-safe displacement for walking and hit knockback.
export function moveActor(world, actor, dx, dy, radius = CONFIG.radius) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / .08));
  const startX = actor.x, startY = actor.y;
  for (let i = 0; i < steps; i++) {
    const point = slideStep(world, actor.x, actor.y, dx / steps, dy / steps, radius);
    actor.x = point.x; actor.y = point.y;
  }
  return Math.hypot(actor.x - startX, actor.y - startY) > .00001;
}
