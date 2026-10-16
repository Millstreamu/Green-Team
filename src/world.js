import { CONFIG } from './config.js';

export function generateDungeon(seed, config = CONFIG) {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
  const { width, height } = config;
  const tiles = new Uint8Array(width * height);
  const rooms = [];
  const carve = (x, y) => { tiles[y * width + x] = 1; };
  // Every accepted room connects to a previous one, so all floor is reachable.
  for (let attempt = 0; attempt < 600 && rooms.length < config.rooms; attempt++) {
    const w = integer(6, 12), h = integer(5, 9);
    const x = integer(2, width - w - 3), y = integer(2, height - h - 3);
    if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
    const room = { x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) };
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) carve(i, j);
    if (rooms.length) {
      const previous = rooms.reduce((best, r) => Math.hypot(r.cx - room.cx, r.cy - room.cy) < Math.hypot(best.cx - room.cx, best.cy - room.cy) ? r : best);
      let px = previous.cx, py = previous.cy;
      const horizontalFirst = random() < 0.5;
      const horizontal = () => { while (px !== room.cx) { carve(px, py); px += Math.sign(room.cx - px); } carve(px, py); };
      const vertical = () => { while (py !== room.cy) { carve(px, py); py += Math.sign(room.cy - py); } carve(px, py); };
      if (horizontalFirst) { horizontal(); vertical(); } else { vertical(); horizontal(); }
    }
    rooms.push(room);
  }
  return { seed: seed >>> 0, width, height, tiles, rooms, spawn: { x: rooms[0].cx + 0.5, y: rooms[0].cy + 0.5 } };
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
  const length = Math.hypot(input.x, input.y);
  if (!length) { player.moving = false; player.phase = 0; return; }
  const distance = config.speed * Math.max(0, dt);
  // Small steps avoid tunnelling through walls, even for a delayed update.
  const steps = Math.max(1, Math.ceil(distance / 0.15));
  const dx = input.x / length * distance / steps, dy = input.y / length * distance / steps;
  const oldX = player.x, oldY = player.y;
  for (let i = 0; i < steps; i++) {
    if (canStand(world, player.x + dx, player.y, config.radius)) player.x += dx;
    if (canStand(world, player.x, player.y + dy, config.radius)) player.y += dy;
  }
  player.moving = Math.hypot(player.x - oldX, player.y - oldY) > 0.00001;
  if (input.x) player.facing = Math.sign(input.x);
  player.phase = player.moving ? player.phase + dt * config.hopRate : 0;
}
