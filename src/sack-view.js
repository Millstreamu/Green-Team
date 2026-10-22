import { gearDetails } from './gear-guide.js';
import { controlHint } from './game-screen.js';
import { itemLabel } from './loot.js';
import { drawInventoryGrid } from './inventory-grid.js';
import { bagItemAt, canPlaceItem, itemCells, LOOT_TYPES, SACK } from './loot.js';
import { drawItem } from './item-view.js';
import { createSackPanel, toggleSackPanel, revealSackPanel, stepSackPanel } from './sack-panel.js';

export function createSackView(canvas, ghost, { equipmentEnabled = true } = {}) {
  const ctx = canvas.getContext('2d'), ghostCtx = ghost.getContext('2d');
  const panel = document.querySelector('#sack-panel'), tab = document.querySelector('#sack-tab');
  let visibility = createSackPanel(), currentTarget = null, holding = false;
  let selectedId = null, touchDrag = null;
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
    const dragged = touchDrag && state.bag.find(p => p.id === touchDrag.id);
    drawInventoryGrid(ctx, SACK.width, SACK.height, cell, dragged ? state.bag.filter(p => p.id !== dragged.id) : state.bag);
    const hovered = pointer.active ? cellAt(pointer) : null;
    if (state.held?.id === selectedId) selectedId = null;
    const selectedItem = selectedId && state.bag.find(p => p.id === selectedId);
    const chosen = keyboardSelection && visibility.open ? selectedItem ? { x: selectedItem.x, y: selectedItem.y } : selected : hovered;
    if (chosen && !state.held && !dragged) { ctx.strokeStyle = '#f2d383'; ctx.lineWidth = 3; for (const [dx, dy] of selectedItem ? itemCells(selectedItem) : [[0, 0]]) ctx.strokeRect((chosen.x + dx) * cell + 3, (chosen.y + dy) * cell + 3, cell - 6, cell - 6); ctx.lineWidth = 1; }
    if (state.held && hovered) {
      ctx.save(); ctx.globalAlpha = 0.7;
      drawItem(ctx, state.held, hovered.x * cell, hovered.y * cell, cell, canPlaceItem(state.bag, state.held, hovered.x, hovered.y) ? '#c7ee7b' : '#ff6774');
      ctx.restore();
    }
    if (dragged) {
      const at = cellAt(touchDrag.point);
      if (at) {
        const x = at.x - touchDrag.grabX, y = at.y - touchDrag.grabY;
        ctx.save(); ctx.globalAlpha = .8;
        drawItem(ctx, dragged, x * cell, y * cell, cell, canPlaceItem(state.bag.filter(p => p.id !== dragged.id), dragged, x, y) ? '#c7ee7b' : '#ff6774');
        ctx.restore();
      } else drawItem(ctx, dragged, dragged.x * cell, dragged.y * cell, cell, '#ff6774');
    }
    ghost.hidden = !state.held || !!hovered || !pointer.active;
    if (state.held) {
      ghost.style.left = `${pointer.x + 14}px`; ghost.style.top = `${pointer.y + 14}px`;
      ghostCtx.clearRect(0, 0, ghost.width, ghost.height);
      drawItem(ghostCtx, state.held, 0, 0, 28, '#c7ee7b');
    }
    const used = state.bag.reduce((n, item) => n + itemCells(item).length, 0);
    document.querySelector('#sack-used').textContent = `${used} / 9`;
    const described = selectedItem ?? (chosen && bagItemAt(state.bag, chosen.x, chosen.y));
    const gear = described && gearDetails(described.type);
    const heldText = state.held ? `Holding ${itemLabel(state.held)} · R rotate · E drop` : selectedItem ? `${itemLabel(selectedItem)} · Rotate${LOOT_TYPES[selectedItem.type].equipment ? ' · E equip' : ''}` : equipmentEnabled ? 'Click loot to lift · select gear, E equip' : 'Click items to move · E packs nearby loot';
    document.querySelector('#held-label').textContent = controlHint(!state.held && gear ? `${itemLabel(described)} · ${gear.summary}${described.type === 'lunch' ? ' · hold E near teammate' : ' · E equip'}` : heldText);
  };
  const updateVisibility = ({ moving, targetId, held, pointer, active }, dt) => {
    currentTarget = targetId; holding = !!held;
    if (!held) heldDismissed = false;
    const bounds = panel.getBoundingClientRect();
    const hovering = pointer.active && pointer.x >= bounds.left && pointer.x < bounds.right && pointer.y >= bounds.top && pointer.y < bounds.bottom;
    const open = stepSackPanel(visibility, { moving, targetId, holding, hovering, active: active && !heldDismissed }, dt);
    if (!open) { keyboardSelection = false; selectedId = null; touchDrag = null; }
    panel.dataset.open = String(open); panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open)); tab.setAttribute('aria-expanded', String(open));
    tab.textContent = 'Tab';
    canvas.tabIndex = open ? 0 : -1;
  };
  return { paint, cellAt,
    selectItem: item => { selectedId = item.id; selected = { x: item.x, y: item.y }; keyboardSelection = true; },
    setTouchDrag: drag => { touchDrag = drag; },
    holdOpen: () => { visibility.manual = true; visibility.open = true; }, updateVisibility, isOpen: () => visibility.open, isNavigating: () => visibility.manual,
    navigate: (dx, dy) => { selectedId = null; keyboardSelection = true; selected = { x: Math.max(0, Math.min(2, selected.x + dx)), y: Math.max(0, Math.min(2, selected.y + dy)) }; },
    selectAt: pointer => { const at = cellAt(pointer); if (at) { selectedId = null; selected = at; keyboardSelection = true; } },
    itemForEquip: (state, pointer) => { if (selectedId && visibility.open) return state.bag.find(p => p.id === selectedId) ?? null; const at = keyboardSelection ? selected : pointer.active ? cellAt(pointer) : null; return visibility.open && at ? bagItemAt(state.bag, at.x, at.y) : null; },
    toggle: () => {
      if (visibility.manual) {
        if (holding) { heldDismissed = true; visibility = createSackPanel(); }
        else toggleSackPanel(visibility, currentTarget, false);
      } else { heldDismissed = false; visibility.manual = true; visibility.open = true; visibility.suppressed = null; }
      keyboardSelection = visibility.open && !holding;
    }, reveal: () => revealSackPanel(visibility), reset: () => { selectedId = null; touchDrag = null; heldDismissed = false; visibility = createSackPanel(); keyboardSelection = false; selected = { x: 0, y: 0 }; } };
}
