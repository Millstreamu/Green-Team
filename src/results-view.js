import { LOOT_TYPES } from './loot.js';
import { drawItem } from './item-view.js';

export function createResultsView(dialog) {
  const list = document.querySelector('#haul-list');
  dialog.addEventListener('cancel', e => e.preventDefault());
  return {
    open(result) {
      const down = result.outcome === 'down';
      document.querySelector('#result-eyebrow').textContent = down ? 'THE RUN IS OVER' : 'BACK THROUGH THE TUNNEL';
      document.querySelector('#results-title').textContent = down ? 'You went down.' : 'You made it out.';
      document.querySelector('#results-description').textContent = down ? 'Nobody was left to recover you. Your carried loot was lost.' : 'Here is what you brought back in your sack.';
      list.replaceChildren();
      list.setAttribute('aria-label', down ? 'Loot lost in the dungeon' : 'Loot brought back');
      const grouped = new Map();
      const shown = down ? result.lostItems : result.items;
      shown.forEach(item => {
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
      document.querySelector('#empty-haul').hidden = shown.length > 0;
      document.querySelector('#empty-haul').textContent = down ? 'You were carrying no loot. You can return on the next run.' : 'You slipped out empty-handed. There is more to steal next time.';
      document.querySelector('#haul-total').textContent = down ? `${result.lostItems.length} ${result.lostItems.length === 1 ? 'treasure' : 'treasures'} lost · ${Math.floor(result.elapsed / 60)}m ${result.elapsed % 60}s` : `${result.count} ${result.count === 1 ? 'treasure' : 'treasures'} · ${result.slots} / 9 sack squares · ${Math.floor(result.elapsed / 60)}m ${result.elapsed % 60}s`;
      dialog.showModal();
      document.querySelector('#next-run').focus();
    },
    close() { if (dialog.open) dialog.close(); }
  };
}
