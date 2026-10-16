import { itemCells, LOOT_TYPES } from './loot.js';

// Shared item display for floor loot, sack contents and the held-item preview.
export function drawItem(ctx, item, x, y, size, outline = null) {
  const type = LOOT_TYPES[item.type];
  const cells = itemCells(item);
  for (const [dx, dy] of cells) {
    const px = Math.round(x + dx * size), py = Math.round(y + dy * size);
    ctx.fillStyle = outline ?? '#182022'; ctx.fillRect(px, py, size, size);
    ctx.fillStyle = type.color; ctx.fillRect(px + 2, py + 2, size - 4, size - 4);
    ctx.fillStyle = '#ffffff45'; ctx.fillRect(px + 3, py + 3, size - 6, Math.max(1, Math.floor(size / 10)));
  }
  if (size >= 18) {
    const [dx, dy] = cells[0];
    ctx.fillStyle = '#26302b'; ctx.font = `bold ${Math.floor(size * 0.46)}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(type.mark, x + dx * size + size / 2, y + dy * size + size / 2);
  }
}
