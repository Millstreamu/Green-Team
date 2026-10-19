import { CONFIG } from './config.js';

export function drawLair(ctx, world, near, ox, oy) {
  const tile = CONFIG.tile;
  const box = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  // A rug, bedding and warm lamp make this room readable as home using temporary pixel art.
  box(7 * tile + ox, 8 * tile + oy, 4 * tile, 3 * tile, '#4c4741');
  box(7 * tile + ox + 3, 8 * tile + oy + 3, 4 * tile - 6, 3 * tile - 6, '#665b47');
  box(2 * tile + ox, 10 * tile + oy, 2 * tile, tile, '#505d41');
  box(2 * tile + ox + 3, 10 * tile + oy + 3, 12, 14, '#aaa38a');
  for (const station of world.stations.filter(s => s.kind !== 'tunnel')) {
    const x = station.x * tile + ox, y = station.y * tile + oy;
    if (station.kind === 'stash') {
      box(x - 16, y - 14, 32, 22, '#725a38'); box(x - 17, y - 17, 34, 9, '#b18d4e');
      box(x - 2, y - 12, 4, 14, '#d2bd74');
    } else if (station.kind === 'planning') {
      box(x - 19, y - 13, 38, 20, '#725a38'); box(x - 15, y - 15, 30, 17, '#c3b486');
      box(x - 10, y - 11, 7, 5, '#64735a'); box(x + 4, y - 7, 8, 5, '#64735a');
      box(x - 4, y - 8, 10, 2, '#86764d'); box(x + 4, y - 8, 2, 5, '#86764d');
      box(x - 17, y - 17, 3, 20, '#ddd1a0'); box(x + 14, y - 17, 3, 20, '#ddd1a0');
    } else if (station.kind === 'campfire') {
      box(x - 20, y - 11, 40, 21, '#c7823320');
      box(x - 15, y, 8, 5, '#727b70'); box(x + 7, y, 8, 5, '#727b70');
      box(x - 10, y + 6, 8, 4, '#8c9381'); box(x + 2, y + 6, 8, 4, '#8c9381');
      box(x - 9, y - 6, 18, 4, '#5d4736'); box(x - 8, y - 2, 17, 5, '#896039');
      box(x - 6, y - 16, 12, 14, '#c65b32'); box(x - 3, y - 22, 7, 18, '#e7903c');
      box(x - 5, y - 11, 11, 9, '#eaa348'); box(x - 2, y - 13, 5, 11, '#f1d27a');
    } else {
      box(x - 22, y - 13, 44, 13, '#9e865b'); box(x - 18, y, 5, 12, '#5e4d35'); box(x + 13, y, 5, 12, '#5e4d35');
      box(x - 9, y - 21, 4, 12, '#9fada3'); box(x - 13, y - 23, 12, 5, '#c1c5ac'); box(x + 6, y - 18, 8, 5, '#b0c58f');
    }
    if (near?.kind === station.kind) { ctx.strokeStyle = '#d1f69b'; ctx.strokeRect(x - 25.5, y - 27.5, 51, 43); }
    ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#d4dfbc';
    ctx.fillText(station.name.toUpperCase(), x, y - 30);
    if (near?.kind === station.kind) ctx.fillText('E', x, y - 41);
  }
}
