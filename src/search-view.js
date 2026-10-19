import { CONFIG } from './config.js';
import { SEARCHABLE_TYPES } from './search.js';
import { drawPixelProgress } from './world-ui.js';

export function drawSearchables(ctx, objects, activeTarget, session, ox, oy, pass = 'all') {
  const t = CONFIG.tile;
  for (const object of objects) {
    const x = Math.round(object.x * t + ox), y = Math.round(object.y * t + oy);
    const definition = SEARCHABLE_TYPES[object.type];
    // Compact props use a 32px source canvas inside one displayed floor tile.
    const scale = object.type === 'cupboard' ? 1 : t / 32;
    const lift = object.type === 'cupboard' ? 0 : 4;
    const rect = (dx, dy, w, h, color) => {
      ctx.fillStyle = color;
      const left = Math.round(dx * scale), top = Math.round((dy + lift) * scale);
      ctx.fillRect(x + left, y + top, Math.round((dx + w) * scale) - left, Math.round((dy + lift + h) * scale) - top);
    };
    if (pass !== 'ui') {
      ctx.save(); if (object.searched) ctx.globalAlpha = 0.5;
      rect(-11, -4, 22, 11, '#182124');
      if (object.type === 'chest') {
        rect(-11, -14, 22, 18, '#67503a'); rect(-10, -13, 20, 5, definition.color);
        rect(-10, -6, 20, 9, '#936a40'); rect(-2, -8, 4, 6, '#e1c981');
        if (object.searched) { rect(-10, -18, 20, 5, definition.color); rect(-9, -12, 18, 6, '#172022'); }
      } else if (object.type === 'cupboard') {
        rect(-10, -27, 20, 30, '#40534a'); rect(-9, -26, 18, 27, definition.color);
        rect(-1, -24, 2, 24, '#4c6254'); rect(-4, -13, 2, 4, '#dac484'); rect(3, -13, 2, 4, '#dac484');
        if (object.searched) rect(-7, -23, 7, 21, '#1b2c27');
      } else {
        rect(-10, -14, 20, 18, '#694b36'); rect(-9, -13, 18, 16, definition.color);
        rect(-9, -6, 18, 2, '#6c5037'); rect(-2, -13, 3, 16, '#d0ae7e');
        if (object.searched) { rect(-7, -11, 14, 7, '#1b2423'); rect(-11, -19, 21, 3, definition.color); }
      }
      ctx.restore();
    }
    if (pass !== 'body' && (activeTarget?.id === object.id || object.searcherId)) {
      const top = object.type === 'cupboard' ? 28 : 16;
      ctx.strokeStyle = '#d1f69b'; ctx.lineWidth = 1; ctx.strokeRect(x - 14.5, y - top - 2.5, 29, top + 10);
      if (object.searcherId || session.active?.id === object.id) {
        const progress = Math.max(0, Math.min(1, object.searcherId ? object.elapsed / object.duration : session.elapsed / (session.duration || definition.duration)));
        drawPixelProgress(ctx, x, y - top - 11, progress);
      } else {
        ctx.fillStyle = '#d1f69b'; ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('HOLD E', x, y - top - 7);
      }
    }
  }
}
