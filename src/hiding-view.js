import { CONFIG, HIDING } from './config.js';
import { drawPixelProgress } from './world-ui.js';

export function drawHidingSpots(ctx, spots, target, player, ox, oy) {
  for (const spot of spots) {
    const x = Math.round(spot.x * CONFIG.tile + ox), y = Math.round(spot.y * CONFIG.tile + oy);
    const rect = (dx, dy, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x + dx, y + dy, w, h); };
    // One 32px source tile, scaled exactly like the ground grid.
    const bodyRect = (dx, dy, w, h, color) => {
      const scale = CONFIG.tile / 32, left = Math.round(dx * scale), top = Math.round((dy + 9) * scale);
      ctx.fillStyle = color;
      ctx.fillRect(x + left, y + top, Math.round((dx + w) * scale) - left, Math.round((dy + 9 + h) * scale) - top);
    };
    bodyRect(-12, -2, 24, 7, '#182124'); bodyRect(-11, -22, 22, 25, '#69533e');
    bodyRect(-9, -24, 18, 3, '#b99a64'); bodyRect(-9, -20, 18, 20, '#96784e');
    bodyRect(-5, -20, 1, 20, '#69533e'); bodyRect(4, -20, 1, 20, '#69533e');
    bodyRect(-11, -17, 22, 3, '#576b68'); bodyRect(-11, -5, 22, 3, '#576b68');
    const hiddenHere = player.hiding?.spot.id === spot.id;
    const occupied = spot.occupantId != null;
    const entering = player.enteringHide?.spot.id === spot.id;
    if (occupied) {
      // A little green goblin head marks occupied barrels for the whole team.
      rect(-5, -35, 10, 7, '#91c66c'); rect(-8, -35, 3, 3, '#91c66c'); rect(5, -35, 3, 3, '#91c66c');
      rect(-3, -33, 2, 2, '#1b3026'); rect(2, -33, 2, 2, '#1b3026');
    }
    if (target?.id === spot.id || hiddenHere || entering) {
      ctx.strokeStyle = '#d1f69b'; ctx.lineWidth = 1; ctx.strokeRect(x - 14.5, y - 27.5, 29, 35);
    }
    ctx.fillStyle = hiddenHere ? '#d1f69b' : '#b9c2a9'; ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    if (entering) drawPixelProgress(ctx, x, y - 39, player.enteringHide.elapsed / HIDING.enterTime);
    else ctx.fillText(hiddenHere ? 'HIDDEN · E EXIT' : occupied ? 'OCCUPIED' : target?.id === spot.id ? 'HOLD E HIDE' : 'HIDE', x, y - (occupied ? 40 : 30));
  }
}
