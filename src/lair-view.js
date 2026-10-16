import { renderItemList } from './item-list.js';
import { canCraftSnare, craftSnare } from './lair.js';

export function createLairView(dialog, camp, onChange, onClose) {
  const title = document.querySelector('#lair-title'), description = document.querySelector('#lair-description');
  const list = document.querySelector('#stash-list'), craft = document.querySelector('#craft-snare');
  const status = document.querySelector('#craft-status');
  let mode = 'stash';
  const refresh = () => {
    renderItemList(list, Object.entries(camp.counts).map(([type, count]) => ({ type, rotation: 0, count })));
    craft.hidden = mode !== 'craft'; craft.disabled = !canCraftSnare(camp);
    document.querySelector('#stash-empty').hidden = Object.values(camp.counts).some(count => count > 0);
  };
  const close = () => { dialog.close(); onClose(); };
  dialog.addEventListener('keydown', event => { if (event.code === 'Tab' && mode === 'stash') { event.preventDefault(); event.stopPropagation?.(); close(); } });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  document.querySelector('#close-lair').addEventListener('click', close);
  craft.addEventListener('click', () => {
    if (mode !== 'craft' || !craftSnare(camp)) return;
    onChange(); refresh(); status.textContent = 'Snare crafted and stored in your lair stash.';
  });
  return { open(kind) {
    mode = kind; title.textContent = kind === 'craft' ? 'Workbench' : 'Lair stash';
    description.textContent = kind === 'craft' ? '1 snare = 2 scrap + 1 cloth. Crafted traps go into your stash.' : 'Escaped loot and unused traps are stored here automatically.';
    status.textContent = ''; refresh(); dialog.showModal();
    (kind === 'craft' && !craft.disabled ? craft : document.querySelector('#close-lair')).focus();
  } };
}
