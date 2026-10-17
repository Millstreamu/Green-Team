import { drawInventoryGrid } from './inventory-grid.js';
import { bagItemAt, fits, itemCells, LOOT_TYPES, SACK } from './loot.js';
import { drawItem } from './item-view.js';
import { createSackPanel, toggleSackPanel, revealSackPanel, stepSackPanel } from './sack-panel.js';

export function createSackView(canvas, ghost) {
  const ctx = canvas.getContext('2d'), ghostCtx = ghost.getContext('2d');
  const panel = document.querySelector('#sack-panel'), tab = document.querySelector('#sack-tab');
  let visibility = createSackPanel(), currentTarget = null, holding = false;
  let selected = { x: 0, y: 0 }, keyboardSelection = false, heldDismissed = false;
  const cell = 56;
  canvas.width = SACK.width * cell; canvas.height = SACK.height * cell;
  ghost.width = 96; ghost.height = 96;
  const cellAt = (pointer) => {
    if (!visibility.open) return null;
    const rect = canvas.getBoundingClientRect();
    if (pointer.x < rect.left || pointer.y < rect.top || pointer.x >= rect.right || pointer.y >= rect.bottom) return null;
    return { x: Math.floor((pointer.x - rect.left) / rect.width * SACK.width), y: Math.floor((pointer.y - rect.top) / rect.height * SACK.height) };
  };
  const paint = (state, pointer) => {
    drawInventoryGrid(ctx, SACK.width, SACK.height, cell, state.bag);
    const hovered = cellAt(pointer);
    const chosen = keyboardSelection && visibility.open ? selected : hovered;
    if (chosen && !state.held) { ctx.strokeStyle = '#f2d383'; ctx.lineWidth = 3; ctx.strokeRect(chosen.x * cell + 3, chosen.y * cell + 3, cell - 6, cell - 6); ctx.lineWidth = 1; }
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
    const heldText = state.held ? `Holding ${LOOT_TYPES[state.held.type].name} · R rotate · E drop` : 'Click loot to lift · select gear, E equip';
    document.querySelector('#held-label').textContent = heldText;
  };
  const updateVisibility = ({ moving, targetId, held, pointer, active }, dt) => {
    currentTarget = targetId; holding = !!held;
    if (!held) heldDismissed = false;
    const bounds = panel.getBoundingClientRect();
    const hovering = pointer.active && pointer.x >= bounds.left && pointer.x < bounds.right && pointer.y >= bounds.top && pointer.y < bounds.bottom;
    const open = stepSackPanel(visibility, { moving, targetId, holding, hovering, active: active && !heldDismissed }, dt);
    if (!open) keyboardSelection = false;
    panel.dataset.open = String(open); panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open)); tab.setAttribute('aria-expanded', String(open));
    tab.textContent = open ? 'SACK › · Tab' : '‹ SACK · Tab';
    canvas.tabIndex = open ? 0 : -1;
  };
  return { paint, cellAt, updateVisibility, isOpen: () => visibility.open, isNavigating: () => visibility.manual,
    navigate: (dx, dy) => { keyboardSelection = true; selected = { x: Math.max(0, Math.min(2, selected.x + dx)), y: Math.max(0, Math.min(2, selected.y + dy)) }; },
    selectAt: pointer => { const at = cellAt(pointer); if (at) { selected = at; keyboardSelection = true; } },
    itemForEquip: (state, pointer) => { const at = keyboardSelection ? selected : cellAt(pointer); return visibility.open && at ? bagItemAt(state.bag, at.x, at.y) : null; },
    toggle: () => {
      if (visibility.manual) {
        if (holding) { heldDismissed = true; visibility = createSackPanel(); }
        else toggleSackPanel(visibility, currentTarget, false);
      } else { heldDismissed = false; visibility.manual = true; visibility.open = true; visibility.suppressed = null; }
      keyboardSelection = visibility.open && !holding;
    }, reveal: () => revealSackPanel(visibility), reset: () => { heldDismissed = false; visibility = createSackPanel(); keyboardSelection = false; selected = { x: 0, y: 0 }; } };
}
