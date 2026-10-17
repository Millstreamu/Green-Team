import { CONFIG } from './config.js';

export function drawHidingSpots(ctx, spots, target, player, ox, oy) {
  for (const spot of spots) {
    const x = Math.round(spot.x * CONFIG.tile + ox), y = Math.round(spot.y * CONFIG.tile + oy);
    const rect = (dx, dy, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x + dx, y + dy, w, h); };
    rect(-12, -2, 24, 7, '#182124'); rect(-11, -22, 22, 25, '#69533e');
    rect(-9, -24, 18, 3, '#b99a64'); rect(-9, -20, 18, 20, '#96784e');
    rect(-5, -20, 1, 20, '#69533e'); rect(4, -20, 1, 20, '#69533e');
    rect(-11, -17, 22, 3, '#576b68'); rect(-11, -5, 22, 3, '#576b68');
    const hiddenHere = player.hiding?.spot.id === spot.id;
    if (hiddenHere) rect(-5, -24, 10, 2, '#c8ec90');
    if (target?.id === spot.id || hiddenHere) {
      ctx.strokeStyle = '#d1f69b'; ctx.lineWidth = 1; ctx.strokeRect(x - 14.5, y - 27.5, 29, 35);
    }
    ctx.fillStyle = hiddenHere ? '#d1f69b' : '#b9c2a9'; ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(hiddenHere ? 'HIDDEN · E EXIT' : target?.id === spot.id ? 'E HIDE' : 'HIDE', x, y - 30);
  }
}
