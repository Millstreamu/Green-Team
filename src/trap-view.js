import { CONFIG, TRAPS } from './config.js';
import { validTrapPosition } from './traps.js';
import { drawPixelProgress } from './world-ui.js';

function drawSnare(ctx, x, y, color, spent = false) {
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.strokeRect(x - 7.5, y - 5.5, 15, 11);
  ctx.beginPath(); ctx.moveTo(x - 5, y - 3); ctx.lineTo(x + (spent ? 7 : 5), y + (spent ? -6 : 3)); ctx.moveTo(x + 5, y - 3); ctx.lineTo(x - 5, y + 3); ctx.stroke();
  ctx.fillStyle = color; ctx.fillRect(x - 2, y - 2, 4, 4);
}
export function drawTraps(ctx, world, player, traps, objects, placement, ox, oy) {
  const tile = CONFIG.tile;
  for (const trap of traps) {
    const x = Math.round(trap.x * tile + ox), y = Math.round(trap.y * tile + oy);
    drawSnare(ctx, x, y, trap.phase === 'armed' ? '#bfd998' : trap.phase === 'arming' ? '#d4b56e' : '#62746b', trap.phase === 'spent');
    if (trap.phase === 'arming') {
      ctx.fillStyle = '#e0c58a'; ctx.font = '6px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(trap.ownerClear ? 'ARMING' : 'STEP CLEAR', x, y - 10);
    }
  }
  if (['dart', 'bell', 'berries'].includes(placement?.kind) || !placement?.itemId || !placement.point) return;
  const point = placement.point, x = Math.round(point.x * tile + ox), y = Math.round(point.y * tile + oy);
  const valid = validTrapPosition(world, player, point, traps, objects);
  const color = valid ? '#c8ec90' : '#f18a8a';
  drawSnare(ctx, x, y, color);
  ctx.strokeStyle = color; ctx.strokeRect(x - 11.5, y - 9.5, 23, 19);
  if (placement.elapsed > 0) drawPixelProgress(ctx, x, y - 20, placement.elapsed / TRAPS.placeTime);
  else { ctx.fillStyle = color; ctx.font = '6px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(valid ? placement.ready ? 'HOLD E' : 'RELEASE E' : 'BLOCKED', x, y - 14); }
}
