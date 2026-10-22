import { LOOT_TYPES, unitSaleValue, itemCells } from './loot.js';
import { drawItem } from './item-view.js';
import { drawStationItem } from './station-item-view.js';

// One item-row display for haul, stash and workbench contents.
export function renderItemList(list, items, { tiles = false, onSelect = () => {} } = {}) {
  list.replaceChildren();
  const grouped = new Map();
  for (const item of items) {
    const key = `${item.type}:${unitSaleValue(item)}`;
    const group = grouped.get(key) ?? { item, count: 0 };
    group.count += item.count ?? 1; grouped.set(key, group);
  }
  for (const { item, count } of grouped.values()) {
    if (!count) continue;
    const row = document.createElement('li'); row.className = tiles ? 'haul-tile' : 'haul-row';
    if (tiles) {
      const button = document.createElement('button'), icon = document.createElement('canvas'), quantity = document.createElement('span');
      button.type = 'button'; button.setAttribute('aria-label', `${LOOT_TYPES[item.type].name} × ${count}`); button.setAttribute('aria-pressed','false');
      icon.width = 60; icon.height = 60; icon.setAttribute('aria-hidden','true');
      const cells = itemCells(item), w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1, size = 52 / Math.max(w,h);
      drawStationItem(icon.getContext('2d'), {...item,count:undefined}, (60-w*size)/2, (60-h*size)/2, size);
      quantity.textContent = `×${count}`; button.append(icon, quantity); row.append(button); list.append(row);
      button.addEventListener('click', () => {
        for (const child of list.children) child.children[0].setAttribute('aria-pressed',String(child === row));
        onSelect(`${LOOT_TYPES[item.type].name} × ${count}${LOOT_TYPES[item.type].sellValue ? ` · ${unitSaleValue(item)} gold each` : ''}`);
      });
      continue;
    }
    const icon = document.createElement('canvas'); icon.width = 60; icon.height = 60;
    icon.setAttribute('aria-hidden', 'true'); drawItem(icon.getContext('2d'), { ...item, count: undefined }, 3, 3, 18);
    const name = document.createElement('span'); name.textContent = `${LOOT_TYPES[item.type].name}${LOOT_TYPES[item.type].sellValue ? ` · ${unitSaleValue(item)} gold each` : ''}`;
    const quantity = document.createElement('strong'); quantity.textContent = `× ${count}`;
    row.append(icon, name, quantity); list.append(row);
  }
}
