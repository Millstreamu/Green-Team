import { fits, itemCells, LOOT_TYPES, SACK } from './loot.js';
import { drawItem } from './item-view.js';

export function createSackView(canvas, ghost) {
  const ctx = canvas.getContext('2d'), ghostCtx = ghost.getContext('2d');
  const cell = 56;
  canvas.width = SACK.width * cell; canvas.height = SACK.height * cell;
  ghost.width = 96; ghost.height = 96;
  const cellAt = (pointer) => {
    const rect = canvas.getBoundingClientRect();
    if (pointer.x < rect.left || pointer.y < rect.top || pointer.x >= rect.right || pointer.y >= rect.bottom) return null;
    return { x: Math.floor((pointer.x - rect.left) / rect.width * SACK.width), y: Math.floor((pointer.y - rect.top) / rect.height * SACK.height) };
  };
  const paint = (state, pointer) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < SACK.height; y++) for (let x = 0; x < SACK.width; x++) {
      ctx.fillStyle = '#10191b'; ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      ctx.strokeStyle = '#4b5343'; ctx.strokeRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
    }
    state.bag.forEach(item => drawItem(ctx, item, item.x * cell, item.y * cell, cell, null));
    const hovered = cellAt(pointer);
    if (state.held && hovered) {
      ctx.save(); ctx.globalAlpha = 0.7;
      drawItem(ctx, state.held, hovered.x * cell, hovered.y * cell, cell, fits(state.bag, state.held, hovered.x, hovered.y) ? '#c7ee7b' : '#ff6774');
      ctx.restore();
    }
    ghost.hidden = !state.held || !!hovered || !pointer.active;
    if (state.held) {
      ghost.style.left = `${pointer.x + 14}px`; ghost.style.top = `${pointer.y + 14}px`;
      ghostCtx.clearRect(0, 0, ghost.width, ghost.height);
      drawItem(ghostCtx, state.held, 0, 0, 28, '#c7ee7b');
    }
    const used = state.bag.reduce((n, item) => n + itemCells(item).length, 0);
    document.querySelector('#sack-used').textContent = `${used} / 9`;
    const heldText = state.held ? `Holding ${LOOT_TYPES[state.held.type].name} · R rotate · E drop` : 'Click an item to lift it';
    document.querySelector('#held-label').textContent = heldText;
  };
  return { paint, cellAt };
}
