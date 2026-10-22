import { CONFIG } from './config.js';

export function drawTreasureGateCell(ctx, door, cell, ox, oy) {
  const t = CONFIG.tile, x = Math.round(cell.x * t + ox), y = Math.round(cell.y * t + oy);
  const vertical = ['east', 'west'].includes(cell.side ?? door.side);
  const rect = (dx, dy, width, height) => ctx.fillRect(x + (vertical ? dy : dx), y + (vertical ? dx : dy), vertical ? height : width, vertical ? width : height);
  ctx.fillStyle = '#a98b51'; rect(1, 1, t - 2, 2); rect(1, t - 3, t - 2, 2);
  if (door.unlocked) return;
  ctx.fillStyle = '#3c332e'; rect(2, 3, t - 4, t - 6);
  ctx.fillStyle = '#806244';
  for (let dx = 3; dx < t - 3; dx += 5) rect(dx, 4, 3, t - 8);
  ctx.fillStyle = '#b8ab7f'; rect(2, 6, t - 4, 2); rect(2, t - 8, t - 4, 2);
  ctx.fillStyle = '#e8c773'; rect(t / 2 - 3, t / 2 - 3, 6, 6);
  ctx.fillStyle = '#252b26'; rect(t / 2 - 1, t / 2 - 2, 2, 4);
}
export function drawTreasureHint(ctx, world, active, ox, oy, player) {
  const door = world.treasure;
  if (!door || !active) return;
  ctx.fillStyle = '#f0d68c'; ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const cell = [...door.cells].sort((a, b) => Math.hypot(a.x + .5 - player.x, a.y + .5 - player.y) - Math.hypot(b.x + .5 - player.x, b.y + .5 - player.y))[0];
  ctx.fillText('LOCKED TREASURE ROOM · E', (cell.x + .5) * CONFIG.tile + ox, cell.y * CONFIG.tile + oy - 5);
}
