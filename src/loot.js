import { canStand, isSightOpen } from './world.js';

export const SACK = Object.freeze({ width: 3, height: 3, reach: 1.7 });
// One definition supplies footprints and colours everywhere an item is shown.
export const LOOT_TYPES = Object.freeze({
  treasureKey: { name: 'Treasure key', runOnly: true, color: '#ddcc80', cells: [[0, 0]], mark: 'K' },
  ruby: { sellValue: 25, name: 'Ruby', color: '#d77581', cells: [[0, 0]], mark: '◆' },
  coin: { sellValue: 3, stackLimit: 9, name: 'Gold coin', color: '#e0bd5e', cells: [[0, 0]], mark: 'G' },
  silverCoin: { sellValue: 2, stackLimit: 9, name: 'Silver coin', color: '#c2ccd1', cells: [[0, 0]], mark: 'S' },
  copperCoin: { sellValue: 1, stackLimit: 9, name: 'Copper coin', color: '#bd8059', cells: [[0, 0]], mark: 'C' },
  candlestick: { sellValue: 12, name: 'Candlestick', color: '#dbba74', cells: [[0, 0], [0, 1]], mark: '†' },
  scroll: { sellValue: 8, name: 'Scroll case', color: '#b7cb9e', cells: [[0, 0], [1, 0]], mark: '≡' },
  sword: { sellValue: 20, name: 'Ceremonial sword', color: '#94b7c8', cells: [[0, 0], [0, 1], [0, 2]], mark: '+' },
  horn: { sellValue: 10, name: 'Dwarf drinking horn', color: '#c6a084', cells: [[0, 0], [0, 1], [1, 1]], mark: '⌁' },
  scrap: { name: 'Metal scrap', color: '#9ba8a4', cells: [[0, 0]], mark: '⊟', material: true },
  cloth: { name: 'Cloth', color: '#c9b998', cells: [[0, 0]], mark: '≈', material: true },
  gold: { name: 'Gold', color: '#e3be59', cells: [[0, 0]], mark: 'G' },
  smoke: { name: 'Smoke bomb', color: '#a8b7bf', cells: [[0, 0]], mark: '☁', equipment: true, quickUse: true },
  lunch: { name: 'Packed Lunch', color: '#c4a66c', cells: [[0, 0]], mark: 'L', equipment: true, rescue: true },
  snare: { name: 'Snare trap', color: '#a9c3a3', cells: [[0, 0]], mark: '⌘', equipment: true }
});

export function itemCells(item) {
  let cells = LOOT_TYPES[item.type].cells.map(([x, y]) => [x, y]);
  for (let i = 0; i < ((item.rotation % 4) + 4) % 4; i++) cells = cells.map(([x, y]) => [-y, x]);
  const minX = Math.min(...cells.map(c => c[0])), minY = Math.min(...cells.map(c => c[1]));
  return cells.map(([x, y]) => [x - minX, y - minY]);
}

export function fits(bag, item, x, y) {
  const occupied = new Set(bag.flatMap(p => itemCells(p).map(([dx, dy]) => `${p.x + dx},${p.y + dy}`)));
  return itemCells(item).every(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < SACK.width && y + dy < SACK.height && !occupied.has(`${x + dx},${y + dy}`));
}

export function findSpace(bag, item) {
  for (let turn = 0; turn < 4; turn++) {
    const rotated = { ...item, rotation: (item.rotation + turn) % 4 };
    for (let y = 0; y < SACK.height; y++) for (let x = 0; x < SACK.width; x++) if (fits(bag, rotated, x, y)) return { ...rotated, x, y };
  }
  return null;
}

export function bagItemAt(bag, x, y) {
  return bag.find(p => itemCells(p).some(([dx, dy]) => p.x + dx === x && p.y + dy === y)) ?? null;
}

export function clearPath(world, a, b) {
  const steps = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) * 12));
  for (let i = 0; i <= steps; i++) if (!isSightOpen(world, Math.floor(a.x + (b.x - a.x) * i / steps), Math.floor(a.y + (b.y - a.y) * i / steps))) return false;
  return true;
}

export function reachable(world, player, item) {
  return Math.hypot(player.x - item.x, player.y - item.y) <= SACK.reach && clearPath(world, player, item);
}

export function selectTarget(world, player, ground, pointer = null) {
  const candidates = ground.filter(item => reachable(world, player, item));
  if (pointer) {
    const nearCursor = candidates.filter(item => Math.hypot(pointer.x - item.x, pointer.y - item.y) <= 0.8);
    if (nearCursor.length) return nearCursor.sort((a, b) => Math.hypot(a.x - pointer.x, a.y - pointer.y) - Math.hypot(b.x - pointer.x, b.y - pointer.y))[0];
  }
  return candidates.sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0] ?? null;
}

export function createLoot() {
  // New valuables come from searches; floor items exist only after a spill/drop.
  return { ground: [], bag: [], held: null };
}

export function itemCount(item) { return item.count ?? 1; }
export function itemLabel(item) { return `${LOOT_TYPES[item.type].name}${itemCount(item) > 1 ? ` × ${itemCount(item)}` : ''}`; }
export function validItemCount(item) {
  return Object.hasOwn(LOOT_TYPES, item.type) && Number.isInteger(itemCount(item)) && itemCount(item) >= 1 && itemCount(item) <= (LOOT_TYPES[item.type]?.stackLimit ?? 1);
}
export function matchingStack(a, b) {
  return a.type === b.type && (LOOT_TYPES[a.type]?.stackLimit ?? 1) > 1
    && (a.saleMultiplier ?? 1) === (b.saleMultiplier ?? 1) && !!a.debugSupply === !!b.debugSupply;
}
// Shared packing for floor pickups and lair withdrawals. Returns units packed.
export function packItem(bag, item) {
  if (!validItemCount(item)) return 0;
  let remaining = itemCount(item);
  for (const target of bag) if (matchingStack(target, item)) {
    const amount = Math.min(remaining, LOOT_TYPES[item.type].stackLimit - itemCount(target));
    if (amount > 0) { target.count = itemCount(target) + amount; remaining -= amount; }
    if (!remaining) break;
  }
  if (remaining) {
    const placement = findSpace(bag, { ...item, ...(LOOT_TYPES[item.type].stackLimit ? { count: remaining } : {}) });
    if (placement) { bag.push(placement); remaining = 0; }
  }
  return itemCount(item) - remaining;
}
export function autoPickup(state, id) {
  if (state.held) return false;
  const index = state.ground.findIndex(item => item.id === id);
  if (index < 0) return false;
  const item = state.ground[index], moved = packItem(state.bag, item);
  if (!moved) return false;
  if (moved === itemCount(item)) state.ground.splice(index, 1);
  else item.count = itemCount(item) - moved;
  return true;
}

export function liftItem(state, source, id) {
  if (state.held || !['ground', 'bag'].includes(source)) return false;
  const index = state[source].findIndex(item => item.id === id);
  if (index < 0) return false;
  const [item] = state[source].splice(index, 1);
  state.held = { ...item };
  return true;
}

export function canPlaceItem(bag, item, x, y) {
  if (!validItemCount(item) || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= SACK.width || y >= SACK.height) return false;
  const target = bagItemAt(bag, x, y);
  return target ? matchingStack(target, item) && itemCount(target) < LOOT_TYPES[target.type].stackLimit : fits(bag, item, x, y);
}
export function placeHeld(state, x, y) {
  if (!state.held || !canPlaceItem(state.bag, state.held, x, y)) return false;
  const target = bagItemAt(state.bag, x, y);
  if (target) {
    const amount = Math.min(itemCount(state.held), LOOT_TYPES[target.type].stackLimit - itemCount(target));
    target.count = itemCount(target) + amount;
    const remaining = itemCount(state.held) - amount;
    state.held = remaining ? { ...state.held, count: remaining } : null;
  } else { state.bag.push({ ...state.held, x, y }); state.held = null; }
  return true;
}

export function dropHeld(state, world, player) {
  if (!state.held) return false;
  const offsets = [[0.7, 0], [0, 0.7], [-0.7, 0], [0, -0.7], [0.7, 0.7], [-0.7, -0.7], [0, 0]];
  const candidates = offsets.map(([dx, dy]) => ({ x: player.x + dx, y: player.y + dy }))
    .filter(p => canStand(world, p.x, p.y, 0.15) && clearPath(world, player, p));
  const at = candidates.find(p => state.ground.every(item => Math.hypot(item.x - p.x, item.y - p.y) > 0.35)) ?? candidates[0];
  if (!at) return false;
  state.ground.push({ ...state.held, ...at }); state.held = null;
  return true;
}

// Sale price travels with a found item so floor hints, haul rows and gold agree.
export function unitSaleValue(item) {
  return Math.round((LOOT_TYPES[item.type].sellValue ?? 0) * (item.saleMultiplier ?? 1));
}
export function itemSaleValue(item) { return unitSaleValue(item) * itemCount(item); }

