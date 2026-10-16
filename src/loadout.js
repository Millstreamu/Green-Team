import { LOOT_TYPES, SACK, findSpace } from './loot.js';

// Only implemented trap types belong here; quantities create separate items.
export const LOADOUT_TRAPS = Object.freeze(['snare']);
export function buildTrapLoadout(quantities, seed) {
  const bag = [];
  for (const type of LOADOUT_TRAPS) {
    const count = Number(quantities[type] ?? 0);
    if (!Number.isInteger(count) || count < 0 || count > SACK.width * SACK.height) return null;
    for (let i = 0; i < count; i++) {
      const item = findSpace(bag, { id: `${seed}-${type}-${i}`, type, rotation: 0 });
      if (!item) return null;
      bag.push(item);
    }
  }
  return { bag, slots: bag.reduce((total, item) => total + LOOT_TYPES[item.type].cells.length, 0) };
}
