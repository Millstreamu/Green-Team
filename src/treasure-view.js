import { CONFIG } from './config.js';

export function drawTreasureGateCell(ctx, door, cell, ox, oy) {
  const t = CONFIG.tile, x = Math.round(cell.x * t + ox), y = Math.round(cell.y * t + oy);
  ctx.fillStyle = '#a98b51'; ctx.fillRect(x + 1, y + 1, t - 2, 2); ctx.fillRect(x + 1, y + t - 3, t - 2, 2);
  if (door.unlocked) return;
  ctx.fillStyle = '#3c332e'; ctx.fillRect(x + 2, y + 3, t - 4, t - 6);
  ctx.fillStyle = '#806244';
  for (let dx = 3; dx < t - 3; dx += 5) ctx.fillRect(x + dx, y + 4, 3, t - 8);
  ctx.fillStyle = '#b8ab7f'; ctx.fillRect(x + 2, y + 6, t - 4, 2); ctx.fillRect(x + 2, y + t - 8, t - 4, 2);
  ctx.fillStyle = '#e8c773'; ctx.fillRect(x + t / 2 - 3, y + t / 2 - 3, 6, 6);
  ctx.fillStyle = '#252b26'; ctx.fillRect(x + t / 2 - 1, y + t / 2 - 2, 2, 4);
}
export function drawTreasureHint(ctx, world, active, ox, oy, player) {
  const door = world.treasure;
  if (!door || !active) return;
  ctx.fillStyle = '#f0d68c'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const cell = [...door.cells].sort((a, b) => Math.hypot(a.x + .5 - player.x, a.y + .5 - player.y) - Math.hypot(b.x + .5 - player.x, b.y + .5 - player.y))[0];
  ctx.fillText('LOCKED TREASURE ROOM · E', (cell.x + .5) * CONFIG.tile + ox, cell.y * CONFIG.tile + oy - 5);
}
