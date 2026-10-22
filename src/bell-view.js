import { BELL, CONFIG } from './config.js';
import { validBellPosition } from './bells.js';
export function drawBells(ctx, world, player, placement, bells, ox, oy) {
  const t = CONFIG.tile;
  for (const b of bells) {
    const fraction = b.rung ? 1 : 1 - b.flightLeft / BELL.flightSeconds;
    const x = (b.fromX + (b.x - b.fromX) * fraction) * t + ox;
    const y = (b.fromY + (b.y - b.fromY) * fraction) * t + oy - Math.sin(fraction * Math.PI) * 20;
    ctx.fillStyle = '#dfbd72'; ctx.fillRect(x - 4, y - 6, 8, 6); ctx.fillRect(x - 6, y - 1, 12, 2); ctx.fillRect(x - 1, y + 2, 2, 2);
    const age = BELL.investigateSeconds - b.left;
    if (b.rung && age < 1.2) {
      ctx.strokeStyle = `rgba(239,209,138,${Math.max(0, 1 - age / 1.2)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 8 + age * 35, 0, Math.PI * 2); ctx.stroke();
    }
  }
  if (placement?.kind !== 'bell' || !placement.aimPoint) return;
  const p = placement.aimPoint, x = p.x * t + ox, y = p.y * t + oy;
  ctx.strokeStyle = validBellPosition(world, player, p) ? '#efd18a' : '#ef8c80'; ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(player.x * t + ox, player.y * t + oy); ctx.quadraticCurveTo((player.x * t + ox + x) / 2, Math.min(player.y * t + oy, y) - 20, x, y); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
}
