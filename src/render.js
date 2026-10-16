import { CONFIG } from './config.js';
import { isFloor } from './world.js';

export function createRenderer(canvas, mapCanvas) {
  const ctx = canvas.getContext('2d');
  const map = mapCanvas.getContext('2d');
  let width = 0, height = 0;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width / 2)); height = Math.max(1, Math.floor(rect.height / 2));
    canvas.width = width; canvas.height = height; ctx.imageSmoothingEnabled = false;
  };
  new ResizeObserver(resize).observe(canvas); resize();
  return (world, player) => {
    ctx.fillStyle = '#101517'; ctx.fillRect(0, 0, width, height);
    const t = CONFIG.tile;
    const ox = Math.round(width / 2 - player.x * t), oy = Math.round(height / 2 - player.y * t);
    const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    for (let y = Math.max(0, Math.floor(-oy / t) - 1); y < Math.min(world.height, Math.ceil((height - oy) / t) + 1); y++) {
      for (let x = Math.max(0, Math.floor(-ox / t) - 1); x < Math.min(world.width, Math.ceil((width - ox) / t) + 1); x++) {
        const px = x * t + ox, py = y * t + oy;
        if (isFloor(world, x, y)) {
          rect(px, py, t, t, (x * 13 + y * 7) % 5 === 0 ? '#333c3a' : '#2d3635');
          rect(px, py, t, 1, '#404743'); rect(px, py, 1, t, '#252f2e');
          if ((x * 7 + y * 19) % 17 === 0) rect(px + 7, py + 15, 3, 1, '#596050');
        } else if ([-1, 0, 1].some(dy => [-1, 0, 1].some(dx => isFloor(world, x + dx, y + dy)))) {
          rect(px, py, t, t, '#465053'); rect(px + 1, py + 1, t - 2, 5, '#657074');
          rect(px + 1, py + 8, t - 2, t - 9, '#3b4548'); rect(px + 11, py + 9, 1, 12, '#303a3d');
          if (isFloor(world, x, y + 1)) rect(px, py + t - 3, t, 3, '#20282b');
        }
      }
    }
    // Temporary pixel goblin. Feet/shadow are tied to world position; only art hops.
    const sx = Math.round(player.x * t + ox), sy = Math.round(player.y * t + oy);
    const hop = player.moving ? Math.round(Math.abs(Math.sin(player.phase)) * CONFIG.hopHeight) : 0;
    rect(sx - 7, sy - 2, 14, 4, '#182222');
    ctx.save(); ctx.translate(sx, sy - hop); ctx.scale(player.facing, 1);
    rect(-5, -6, 4, 6, '#887746'); rect(2, -6, 4, 6, '#887746');
    rect(-6, -13, 12, 9, '#9b743f'); rect(-5, -12, 10, 3, '#c4a45c');
    rect(-7, -22, 14, 10, '#8ab64f'); rect(-10, -20, 4, 5, '#729d43'); rect(7, -20, 4, 5, '#729d43');
    rect(-6, -23, 11, 3, '#b0d36b'); rect(-4, -19, 3, 3, '#172c27'); rect(3, -19, 3, 3, '#172c27');
    rect(0, -15, 5, 1, '#466137'); rect(-8, -11, 3, 5, '#729d43'); rect(6, -11, 3, 5, '#729d43');
    ctx.restore();
    mapCanvas.width = world.width * 2; mapCanvas.height = world.height * 2;
    map.fillStyle = '#151e20'; map.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    map.fillStyle = '#667670';
    world.tiles.forEach((floor, i) => { if (floor) map.fillRect(i % world.width * 2, Math.floor(i / world.width) * 2, 2, 2); });
    map.fillStyle = '#c7ee7b'; map.fillRect(Math.floor(player.x) * 2 - 1, Math.floor(player.y) * 2 - 1, 4, 4);
  };
}
