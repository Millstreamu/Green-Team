import { CONFIG } from './config.js';
import { drawPixelProgress } from './world-ui.js';

export function drawCages(ctx, cages, ox, oy, foreground = false) {
  for (const cage of cages) {
    const x = Math.round(cage.x * CONFIG.tile + ox), y = Math.round(cage.y * CONFIG.tile + oy);
    ctx.fillStyle = '#4b5554';
    if (!foreground) { ctx.fillRect(x - 17, y - 20, 34, 29); ctx.fillStyle = '#192524'; ctx.fillRect(x - 14, y - 17, 28, 24); }
    else {
      ctx.fillStyle = '#a4aaa0';
      for (let dx = -14; dx <= 14; dx += 7) ctx.fillRect(x + dx, y - 25, 2, 29);
      ctx.fillRect(x - 15, y - 25, 32, 3); ctx.fillRect(x - 15, y + 3, 32, 3);
      ctx.fillStyle = '#dac484'; ctx.fillRect(x - 3, y - 9, 6, 6);
      ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(cage.prisoners.length ? `CAGED · ${cage.prisoners.length}` : 'CAGE', x, y - 29);
    }
  }
}
export function drawRescues(ctx, players, cages, rescues, target, ox, oy) {
  for (const attempt of rescues) {
    const x = attempt.x * CONFIG.tile + ox, y = attempt.y * CONFIG.tile + oy;
    drawPixelProgress(ctx, x, y - 49, attempt.elapsed / attempt.duration);
  }
  if (!target || !['revive', 'rescue'].includes(target.kind)) return;
  const captive = players.find(p => p.id === target.item.id), cage = cages.find(c => c.id === target.item.cageId);
  const point = cage ?? captive; if (!point) return;
  const x = Math.round(point.x * CONFIG.tile + ox), y = Math.round(point.y * CONFIG.tile + oy);
  ctx.strokeStyle = '#d1f69b'; ctx.strokeRect(x - 18.5, y - 27.5, 37, 36);
  if (!rescues.some(a => a.targetId === target.item.id)) {
    ctx.fillStyle = '#d1f69b'; ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(target.kind === 'revive' ? 'HOLD E · PACKED LUNCH' : 'HOLD E · RESCUE', x, y - 39);
  }
}
