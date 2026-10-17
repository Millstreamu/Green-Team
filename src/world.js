import { CONFIG } from './config.js';
import { addRoomLoops } from './dungeon-layout.js';

export function generateDungeon(seed, config = CONFIG) {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
  const { width, height } = config;
  const tiles = new Uint8Array(width * height);
  const rooms = [];
  const carve = (x, y) => { if (x > 0 && y > 0 && x < width - 1 && y < height - 1) tiles[y * width + x] = 1; };
  const corridor = (x, y) => {
    const size = config.corridorWidth ?? 1, offset = Math.floor(size / 2);
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) carve(x + dx - offset, y + dy - offset);
  };
  // Every accepted room connects to a previous one, so all floor is reachable.
  for (let attempt = 0; attempt < 600 && rooms.length < config.rooms; attempt++) {
    const w = integer(config.minRoomWidth ?? 6, config.maxRoomWidth ?? 12), h = integer(config.minRoomHeight ?? 5, config.maxRoomHeight ?? 9);
    const x = integer(2, width - w - 3), y = integer(2, height - h - 3);
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
  return addRoomLoops({ layout: { ...config }, seed: seed >>> 0, width, height, tiles, rooms, spawn: { x: rooms[0].cx + 0.5, y: rooms[0].cy + 0.5 } }, config, random);
}

export function isFloor(world, x, y) {
  return x >= 0 && y >= 0 && x < world.width && y < world.height && world.tiles[y * world.width + x] === 1;
}

export function canStand(world, x, y, radius = CONFIG.radius) {
  for (let ty = Math.floor(y - radius); ty <= Math.floor(y + radius); ty++) {
    for (let tx = Math.floor(x - radius); tx <= Math.floor(x + radius); tx++) {
      if (isFloor(world, tx, ty)) continue;
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
  const distance = config.speed * Math.max(0, dt);
  player.moving = moveActor(world, player, input.x / length * distance, input.y / length * distance, config.radius);
  if (input.x) player.facing = Math.sign(input.x);
  player.phase = player.moving ? player.phase + dt * config.hopRate : 0;
}

// Shared collision-safe displacement for walking and hit knockback.
export function moveActor(world, actor, dx, dy, radius = CONFIG.radius) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / .15));
  const startX = actor.x, startY = actor.y;
  for (let i = 0; i < steps; i++) {
    if (canStand(world, actor.x + dx / steps, actor.y, radius)) actor.x += dx / steps;
    if (canStand(world, actor.x, actor.y + dy / steps, radius)) actor.y += dy / steps;
  }
  return Math.hypot(actor.x - startX, actor.y - startY) > .00001;
}
