import { CONFIG } from './config.js';
export function drawDarts(ctx, player, placement, darts, ox, oy, berries = []) {
  const t = CONFIG.tile;
  ctx.strokeStyle = '#bfd8b0'; ctx.lineWidth = 2;
  for (const d of darts) {
    ctx.beginPath(); ctx.moveTo(d.x * t + ox, d.y * t + oy); ctx.lineTo((d.x - d.dx * .3) * t + ox, (d.y - d.dy * .3) * t + oy); ctx.stroke();
  }
  ctx.fillStyle = '#d086b9';
  for (const berry of berries) { ctx.beginPath(); ctx.arc(berry.x * t + ox, berry.y * t + oy, 2.5, 0, Math.PI * 2); ctx.fill(); }
  if (!['dart', 'berries'].includes(placement?.kind) || !placement.aimPoint) return;
  if (placement.kind === 'berries') ctx.strokeStyle = '#d086b9';
  const p = placement.aimPoint, x = p.x * t + ox, y = p.y * t + oy;
  ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(player.x * t + ox, player.y * t + oy); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeRect(x - 5, y - 5, 10, 10);
}
