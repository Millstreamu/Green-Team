export function drawPixelProgress(ctx, x, y, progress) {
  const width = Math.round(24 * Math.max(0, Math.min(1, progress)));
  ctx.fillStyle = '#152021'; ctx.fillRect(Math.round(x) - 13, Math.round(y), 26, 6);
  ctx.fillStyle = '#5d6c50'; ctx.fillRect(Math.round(x) - 12, Math.round(y) + 1, 24, 4);
  ctx.fillStyle = '#c8ec90'; ctx.fillRect(Math.round(x) - 12, Math.round(y) + 1, width, 4);
  if (width) { ctx.fillStyle = '#e1f8bb'; ctx.fillRect(Math.round(x) - 12, Math.round(y) + 1, width, 1); }
}
