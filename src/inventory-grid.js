import { drawItem } from './item-view.js';

// Shared grid/item rendering for the personal sack and stackable lair stash.
export function drawInventoryGrid(ctx, width, height, cell, items, selected = null, heldType = null) {
  ctx.clearRect(0, 0, width * cell, height * cell);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    ctx.fillStyle = '#10191b'; ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    ctx.strokeStyle = '#4b5343'; ctx.strokeRect(x * cell + .5, y * cell + .5, cell - 1, cell - 1);
  }
  for (const item of items) {
    ctx.save();
    if (item.type === heldType) ctx.globalAlpha = .3;
    drawItem(ctx, item, item.x * cell, item.y * cell, cell);
    ctx.restore();
  }
  if (selected) { ctx.strokeStyle = '#f2d383'; ctx.lineWidth = 3; ctx.strokeRect(selected.x * cell + 3, selected.y * cell + 3, cell - 6, cell - 6); ctx.lineWidth = 1; }
}
