import { stationSprite } from './station-art.js';
import { drawItem } from './item-view.js';
export function drawStationItem(ctx, item, x, y, size) {
  const sprite = stationSprite(item.type);
  if (!sprite) { drawItem(ctx, item, x, y, size); return; }
  ctx.imageSmoothingEnabled = false;
  const inset = Math.max(2, size * .08), h = size - inset * 2, w = h * .8;
  ctx.drawImage(sprite, x + (size - w) / 2, y + inset, w, h);
  if (item.count !== undefined) {
    ctx.font = `bold ${Math.max(9, Math.floor(size * .23))}px monospace`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#e2d3ad'; ctx.fillRect(x + size * .5, y + size * .7, size * .48, size * .29);
    ctx.fillStyle = '#34412a'; ctx.fillText(item.count >= 10000 ? `${Math.floor(item.count / 1000)}k` : String(item.count), x + size - 3, y + size - 2);
  }
}
