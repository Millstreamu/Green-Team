import { LOOT_TYPES } from './loot.js';
import { STASH, syncStashSlots, moveStashStack } from './lair.js';
import { drawInventoryGrid } from './inventory-grid.js';

export function createStashGrid(canvas, camp, onChange) {
  const cell = 56, ctx = canvas.getContext('2d'), label = document.querySelector('#stash-selection');
  canvas.width = STASH.width * cell; canvas.height = STASH.height * cell;
  let selected = { x: 0, y: 0 }, held = null;
  const paint = () => {
    syncStashSlots(camp);
    if (held && !camp.counts[held]) held = null;
    const items = camp.slots.flatMap((type, index) => type ? [{ type, x: index % STASH.width, y: Math.floor(index / STASH.width), rotation: 0, count: camp.counts[type] }] : []);
    drawInventoryGrid(ctx, STASH.width, STASH.height, cell, items, selected, held);
    const type = camp.slots[selected.y * STASH.width + selected.x];
    label.textContent = held ? `Moving ${LOOT_TYPES[held].name} stack · E / click empty square to place · Esc cancel` : type ? `${LOOT_TYPES[type].name} × ${camp.counts[type]} · E / click to move stack` : 'Empty square · WASD select · E / click to move a stack';
    document.querySelector('#stash-used').textContent = `${items.length} / ${STASH.width * STASH.height} stacks`;
  };
  const activate = () => {
    const index = selected.y * STASH.width + selected.x;
    if (!held) held = camp.slots[index];
    else if (moveStashStack(camp, held, index)) { held = null; onChange(); }
    paint();
  };
  canvas.addEventListener('keydown', event => {
    const dx = Number(event.code === 'KeyD' || event.code === 'ArrowRight') - Number(event.code === 'KeyA' || event.code === 'ArrowLeft');
    const dy = Number(event.code === 'KeyS' || event.code === 'ArrowDown') - Number(event.code === 'KeyW' || event.code === 'ArrowUp');
    if (dx || dy) { event.preventDefault(); event.stopPropagation?.(); selected = { x: Math.max(0, Math.min(STASH.width - 1, selected.x + dx)), y: Math.max(0, Math.min(STASH.height - 1, selected.y + dy)) }; paint(); }
    if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); event.stopPropagation?.(); activate(); }
    if (event.code === 'Escape' && held) { event.preventDefault(); event.stopPropagation?.(); held = null; paint(); }
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const bounds = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - bounds.left) / bounds.width * STASH.width), y = Math.floor((event.clientY - bounds.top) / bounds.height * STASH.height);
    if (x < 0 || x >= STASH.width || y < 0 || y >= STASH.height) return;
    event.preventDefault(); selected = { x, y }; canvas.focus(); activate();
  });
  return { paint, reset() { held = null; paint(); } };
}
