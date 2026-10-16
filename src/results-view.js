import { LOOT_TYPES } from './loot.js';
import { drawItem } from './item-view.js';

export function createResultsView(dialog) {
  const list = document.querySelector('#haul-list');
  dialog.addEventListener('cancel', e => e.preventDefault());
  return {
    open(result) {
      list.replaceChildren();
      const grouped = new Map();
      result.items.forEach(item => {
        const group = grouped.get(item.type) ?? { item, count: 0 };
        group.count++; grouped.set(item.type, group);
      });
      for (const { item, count } of grouped.values()) {
        const row = document.createElement('li'); row.className = 'haul-row';
        const icon = document.createElement('canvas'); icon.width = 60; icon.height = 60;
        icon.setAttribute('aria-hidden', 'true'); drawItem(icon.getContext('2d'), item, 3, 3, 18);
        const name = document.createElement('span'); name.textContent = LOOT_TYPES[item.type].name;
        const quantity = document.createElement('strong'); quantity.textContent = `× ${count}`;
        row.append(icon, name, quantity); list.append(row);
      }
      document.querySelector('#empty-haul').hidden = result.count > 0;
      document.querySelector('#haul-total').textContent = `${result.count} ${result.count === 1 ? 'treasure' : 'treasures'} · ${result.slots} / 9 sack squares · ${Math.floor(result.elapsed / 60)}m ${result.elapsed % 60}s`;
      dialog.showModal();
      document.querySelector('#next-run').focus();
    },
    close() { if (dialog.open) dialog.close(); }
  };
}
