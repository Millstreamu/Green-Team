import { itemLabel } from './loot.js';
import { LOOT_TYPES, SACK, bagItemAt, itemCells } from './loot.js';
import { STASH, syncStashSlots, moveStashStack } from './lair.js';
import { drawInventoryGrid } from './inventory-grid.js';

export function createStashGrid(canvas, camp, onChange, onTake = null, onMove = null, onFeedback = () => {}, onSelect = () => {}, onCross = null, {autoSort=false}={}) {
  const cell = 56, ctx = canvas.getContext('2d'), label = document.querySelector('#stash-selection');
  const tooltip = document.querySelector('#stash-tooltip');
  canvas.width = STASH.width * cell; canvas.height = STASH.height * cell;
  let selected = { x: 0, y: 0 }, held = null, page = 0, showName = false, hoverIndex = null, active = true;
  let slots=camp.slots;
  const pageCount = Math.ceil(STASH.width * STASH.height / 9);
  const paged = () => !!window.matchMedia?.('(any-pointer:coarse)').matches;
  const pageBy = delta => { showName = false; hoverIndex = null; page = Math.max(0, Math.min(pageCount - 1, page + delta)); selected = { x: (page * 9) % STASH.width, y: Math.floor(page * 9 / STASH.width) }; paint(); onSelect(); };
  const paint = () => {
    const previous=slots?.[selected.y*STASH.width+selected.x];
    syncStashSlots(camp);
    if(autoSort){const sorted=camp.slots.filter(Boolean).sort((a,b)=>LOOT_TYPES[a].name.localeCompare(LOOT_TYPES[b].name,'en',{sensitivity:'base'}));slots=Array.from({length:36},(_,i)=>sorted[i]??null);const at=previous?slots.indexOf(previous):-1;if(at>=0)selected={x:at%STASH.width,y:Math.floor(at/STASH.width)};else if(previous){const empty=Math.min(35,sorted.length);selected={x:empty%STASH.width,y:Math.floor(empty/STASH.width)};}}else slots=camp.slots;
    if (held && !camp.counts[held]) held = null;
    const mobile = paged(), columns = mobile ? 3 : STASH.width, rows = mobile ? 3 : STASH.height;
    canvas.width = columns * cell; canvas.height = rows * cell;
    if (mobile) page = Math.floor((selected.y * STASH.width + selected.x) / 9);
    const start = mobile ? page * 9 : 0;
    const visible = slots.slice(start, start + columns * rows);
    const items = visible.flatMap((type, index) => type ? [{ type, x: index % columns, y: Math.floor(index / columns), rotation: 0, count: camp.counts[type] }] : []);
    const selectedIndex = selected.y * STASH.width + selected.x - start;
    drawInventoryGrid(ctx, columns, rows, cell, items, active?{ x: selectedIndex % columns, y: Math.floor(selectedIndex / columns) }:null, held, { stackIcons: true, book: true });
    const type = slots[selected.y * STASH.width + selected.x];
    if (tooltip) {
      const tooltipIndex = hoverIndex ?? (selected.y * STASH.width + selected.x), tooltipType = slots[tooltipIndex];
      tooltip.hidden = !showName || !tooltipType || !!held;
      tooltip.textContent = tooltipType ? LOOT_TYPES[tooltipType].name : '';
      const localIndex = tooltipIndex - start, column = localIndex % columns, row = Math.floor(localIndex / columns);
      tooltip.style.left = column === 0 ? '4px' : column === columns - 1 ? 'auto' : `${(column + .5) / columns * 100}%`;
      tooltip.style.right = column === columns - 1 ? '4px' : 'auto';
      tooltip.style.top = `${(row === 0 ? row + 1 : row) / rows * 100}%`;
      tooltip.style.transform = `translate(${column === 0 || column === columns - 1 ? '0' : '-50%'}, ${row === 0 ? '3px' : 'calc(-100% - 3px)'})`;
    }

    label.textContent = held ? `Moving ${LOOT_TYPES[held].name}` : type ? `${LOOT_TYPES[type].name} × ${camp.counts[type]}` : 'Empty square';
    document.querySelector('#stash-used').textContent = `${camp.slots.filter(Boolean).length} / ${STASH.width * STASH.height} stacks`;
    document.querySelector('#stash-page-controls').hidden = !mobile;
    document.querySelector('#stash-page-label').textContent = `${page + 1} / ${pageCount}`;
    document.querySelector('#stash-page-prev').disabled = page === 0;
    document.querySelector('#stash-page-next').disabled = page === pageCount - 1;
  };
  const beginMove = () => { if(autoSort)return; held = held ? null : slots[selected.y * STASH.width + selected.x]; paint(); onSelect(); };
  const activate = () => {
    const index = selected.y * STASH.width + selected.x;
    if (!held && onTake) { const type = slots[index]; if (type) onTake(type); }
    else if (!held) held = slots[index];
    else {
      const moved = onMove ? onMove(held, index) : moveStashStack(camp, held, index);
      if (moved) { held = null; onChange(); }
      onFeedback(!!moved);
    }
    paint(); onSelect();
  };
  canvas.addEventListener('keydown', event => {
    hoverIndex = null; onSelect();
    const dx = Number(event.code === 'KeyD' || event.code === 'ArrowRight') - Number(event.code === 'KeyA' || event.code === 'ArrowLeft');
    const dy = Number(event.code === 'KeyS' || event.code === 'ArrowDown') - Number(event.code === 'KeyW' || event.code === 'ArrowUp');
    if (dx || dy) {
      showName=true;event.preventDefault();event.stopPropagation?.();
      const columns=paged()?3:STASH.width,rows=paged()?3:STASH.height,start=paged()?page*9:0,index=selected.y*STASH.width+selected.x-start,column=index%columns,row=Math.floor(index/columns);
      if(dx===1&&column===columns-1&&!held&&onCross){const bounds=canvas.getBoundingClientRect();onCross(bounds.top+(row+.5)/rows*bounds.height);return;}
      const nextColumn=Math.max(0,Math.min(columns-1,column+dx)),nextRow=Math.max(0,Math.min(rows-1,row+dy));
      const next=start+nextRow*columns+nextColumn;selected={x:next%STASH.width,y:Math.floor(next/STASH.width)};paint();onSelect();
    }
    if (event.code === 'KeyR' && !event.repeat) { event.preventDefault(); event.stopPropagation?.(); beginMove(); }
    if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); event.stopPropagation?.(); activate(); }
    if (event.code === 'Escape' && held) { event.preventDefault(); event.stopPropagation?.(); held = null; paint(); onSelect(); }
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const bounds = canvas.getBoundingClientRect();
    const columns = paged() ? 3 : STASH.width, rows = paged() ? 3 : STASH.height;
    const x = Math.floor((event.clientX - bounds.left) / bounds.width * columns), y = Math.floor((event.clientY - bounds.top) / bounds.height * rows);
    if (x < 0 || x >= columns || y < 0 || y >= rows) return;
    const index = (paged() ? page * 9 : 0) + y * columns + x;
    event.preventDefault(); showName = true; hoverIndex = null; selected = { x: index % STASH.width, y: Math.floor(index / STASH.width) }; canvas.focus();
    paint(); onSelect();
  });
  canvas.addEventListener('pointermove', event => {
    if (['touch', 'pen'].includes(event.pointerType) || held) return;
    const bounds = canvas.getBoundingClientRect(), columns = paged() ? 3 : STASH.width, rows = paged() ? 3 : STASH.height;
    const x = Math.floor((event.clientX - bounds.left) / bounds.width * columns), y = Math.floor((event.clientY - bounds.top) / bounds.height * rows);
    if (x < 0 || y < 0 || x >= columns || y >= rows) return;
    const index = (paged() ? page * 9 : 0) + y * columns + x;
    hoverIndex = index; showName = true; paint();
  });
  canvas.addEventListener('pointerleave', event => {
    if (['touch', 'pen'].includes(event.pointerType)) return;
    showName = false; hoverIndex = null; paint();
  });
  document.querySelector('#stash-page-prev').addEventListener('click', () => pageBy(-1));
  document.querySelector('#stash-page-next').addEventListener('click', () => pageBy(1));
  return { paint,setActive(value){active=value;paint();}, beginMove, activate, focusEdge(screenY){const bounds=canvas.getBoundingClientRect(),columns=paged()?3:STASH.width,rows=paged()?3:STASH.height,row=Math.max(0,Math.min(rows-1,Math.floor((screenY-bounds.top)/bounds.height*rows))),index=(paged()?page*9:0)+row*columns+columns-1;selected={x:index%STASH.width,y:Math.floor(index/STASH.width)};showName=true;hoverIndex=null;canvas.focus();paint();onSelect();}, selection() { return { type: slots[selected.y * STASH.width + selected.x], held }; }, reset() { held = null; showName = false; hoverIndex = null; paint(); } };
}

// The same grid renderer and WASD/E pattern as stash and dungeon sack.
export function createLairSackGrid(canvas, getLoot, onReturn, onSelect = () => {}, onCross = null) {
  const cell = 56, ctx = canvas.getContext('2d');
  canvas.width = SACK.width * cell; canvas.height = SACK.height * cell;
  let selected = { x: 0, y: 0 }, preview = null, active = true;
  const paint = () => {
    const loot = getLoot(); if (!loot) return;
    drawInventoryGrid(ctx, SACK.width, SACK.height, cell, loot.bag, active?selected:null, null, { book: true });
    if(preview){ctx.strokeStyle='#6c844f';ctx.lineWidth=3;ctx.setLineDash([5,3]);for(const [dx,dy]of itemCells(preview))ctx.strokeRect((preview.x+dx)*cell+4,(preview.y+dy)*cell+4,cell-8,cell-8);ctx.setLineDash([]);ctx.lineWidth=1;}
    const item = bagItemAt(loot.bag, selected.x, selected.y);
    document.querySelector('#lair-sack-used').textContent = `${loot.bag.reduce((n, item) => n + itemCells(item).length, 0)} / 9`;
    document.querySelector('#lair-sack-selection').textContent = item ? `${itemLabel(item)}${item.debugSupply ? ' (test)' : ''}` : 'Empty square';
  };
  const activate = () => { const item = bagItemAt(getLoot().bag, selected.x, selected.y); if (item) onReturn(item); paint(); onSelect(); };
  canvas.addEventListener('keydown', event => {
    onSelect();
    const dx = Number(event.code === 'KeyD' || event.code === 'ArrowRight') - Number(event.code === 'KeyA' || event.code === 'ArrowLeft');
    const dy = Number(event.code === 'KeyS' || event.code === 'ArrowDown') - Number(event.code === 'KeyW' || event.code === 'ArrowUp');
    if (dx || dy) { event.preventDefault(); event.stopPropagation?.();if(dx===-1&&selected.x===0&&onCross){const bounds=canvas.getBoundingClientRect();onCross(bounds.top+(selected.y+.5)/3*bounds.height);return;} selected = { x: Math.max(0, Math.min(2, selected.x + dx)), y: Math.max(0, Math.min(2, selected.y + dy)) }; paint(); onSelect(); }
    if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); event.stopPropagation?.(); activate(); }
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const bounds = canvas.getBoundingClientRect(), x = Math.floor((event.clientX - bounds.left) / bounds.width * 3), y = Math.floor((event.clientY - bounds.top) / bounds.height * 3);
    if (x < 0 || x > 2 || y < 0 || y > 2) return;
    event.preventDefault(); canvas.focus(); selected = { x, y };
    paint(); onSelect();
  });
  return { paint,setActive(value){active=value;paint();}, activate, setPreview(item){preview=item;paint();},focusEdge(screenY){const bounds=canvas.getBoundingClientRect();selected={x:0,y:Math.max(0,Math.min(2,Math.floor((screenY-bounds.top)/bounds.height*3)))};canvas.focus();paint();onSelect();}, selection() { return bagItemAt(getLoot().bag, selected.x, selected.y); }, reset() { selected = { x: 0, y: 0 }; paint(); onSelect(); } };
}
