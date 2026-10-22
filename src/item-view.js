import { itemCells, LOOT_TYPES } from './loot.js';

// Shared item display for floor loot, sack contents and the held-item preview.
export function drawItem(ctx, item, x, y, size, outline = null) {
  if (size < 18 && item.type === 'treasureKey') {
    ctx.fillStyle='#4b3925';ctx.fillRect(x-1,y-1,6,6);
    ctx.fillStyle='#ffe49a';ctx.fillRect(x,y,4,4);ctx.fillRect(x+3,y+3,5,2);ctx.fillRect(x+6,y+4,2,3);
    ctx.fillStyle='#5b4325';ctx.fillRect(x+1,y+1,2,2);return;
  }
  if (size < 18 && ['coin','silverCoin','copperCoin'].includes(item.type)) {
    ctx.fillStyle='#342b22';ctx.fillRect(x+1,y+2,5,4);
    ctx.fillStyle=LOOT_TYPES[item.type].color;ctx.fillRect(x+1,y+1,5,3);ctx.fillRect(x+2,y,3,1);
    ctx.fillStyle='#fff0bc';ctx.fillRect(x+2,y+1,2,1);return;
  }
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
  if (item.count !== undefined && size >= 18) {
    const font = Math.max(7, Math.floor(size * .2)), count = item.count >= 10000 ? `${Math.floor(item.count / 1000)}k` : String(item.count);
    ctx.font = `bold ${font}px monospace`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#10191b'; ctx.fillRect(x + 3, y + size - font - 6, size - 6, font + 3);
    ctx.fillStyle = '#f1e6bc'; ctx.fillText(count, x + size - 5, y + size - 4);
  }

}
