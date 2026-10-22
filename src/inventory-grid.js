import { itemCells } from './loot.js';
import { drawStationItem } from './station-item-view.js';
import { drawItem } from './item-view.js';

// Shared grid/item rendering for the personal sack and stackable lair stash.
export function drawInventoryGrid(ctx, width, height, cell, items, selected = null, heldType = null, { stackIcons = false, book = false } = {}) {
  const paintItem = book ? drawStationItem : drawItem;
  ctx.clearRect(0, 0, width * cell, height * cell);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    ctx.fillStyle = book ? '#d5c49d' : '#10191b'; ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    ctx.strokeStyle = book ? '#a2926f' : '#4b5343'; ctx.strokeRect(x * cell + .5, y * cell + .5, cell - 1, cell - 1);
  }
  for (const item of items) {
    ctx.save();
    if (item.type === heldType) ctx.globalAlpha = .3;
    if (stackIcons) {
      const cells = itemCells(item), w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1;
      const size = (cell - 12) / Math.max(w, h);
      paintItem(ctx, item, item.x * cell + (cell - w * size) / 2, item.y * cell + (cell - h * size) / 2, size);
    } else paintItem(ctx, item, item.x * cell, item.y * cell, cell);
    ctx.restore();
  }
  if (selected) { ctx.strokeStyle = book ? '#52673b' : '#f2d383'; ctx.lineWidth = 3; ctx.strokeRect(selected.x * cell + 3, selected.y * cell + 3, cell - 6, cell - 6); ctx.lineWidth = 1; }
}
