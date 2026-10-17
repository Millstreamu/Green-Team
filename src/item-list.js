import { LOOT_TYPES } from './loot.js';
import { drawItem } from './item-view.js';

// One item-row display for haul, stash and workbench contents.
export function renderItemList(list, items) {
  list.replaceChildren();
  const grouped = new Map();
  for (const item of items) {
    const group = grouped.get(item.type) ?? { item, count: 0 };
    group.count += item.count ?? 1; grouped.set(item.type, group);
  }
  for (const { item, count } of grouped.values()) {
    if (!count) continue;
    const row = document.createElement('li'); row.className = 'haul-row';
    const icon = document.createElement('canvas'); icon.width = 60; icon.height = 60;
    icon.setAttribute('aria-hidden', 'true'); drawItem(icon.getContext('2d'), item, 3, 3, 18);
    const name = document.createElement('span'); name.textContent = `${LOOT_TYPES[item.type].name}${LOOT_TYPES[item.type].sellValue ? ` · ${LOOT_TYPES[item.type].sellValue} gold each` : ''}`;
    const quantity = document.createElement('strong'); quantity.textContent = `× ${count}`;
    row.append(icon, name, quantity); list.append(row);
  }
}
