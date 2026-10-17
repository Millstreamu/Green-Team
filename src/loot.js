import { canStand, isFloor } from './world.js';

export const SACK = Object.freeze({ width: 3, height: 3, reach: 1.7 });
// One definition supplies footprints and colours everywhere an item is shown.
export const LOOT_TYPES = Object.freeze({
  ruby: { sellValue: 25, name: 'Ruby', color: '#d77581', cells: [[0, 0]], mark: '◆' },
  coin: { sellValue: 3, name: 'Gold coin', color: '#e0bd5e', cells: [[0, 0]], mark: '●' },
  candlestick: { sellValue: 12, name: 'Candlestick', color: '#dbba74', cells: [[0, 0], [0, 1]], mark: '†' },
  scroll: { sellValue: 8, name: 'Scroll case', color: '#b7cb9e', cells: [[0, 0], [1, 0]], mark: '≡' },
  sword: { sellValue: 20, name: 'Ceremonial sword', color: '#94b7c8', cells: [[0, 0], [0, 1], [0, 2]], mark: '+' },
  horn: { sellValue: 10, name: 'Dwarf drinking horn', color: '#c6a084', cells: [[0, 0], [0, 1], [1, 1]], mark: '⌁' },
  scrap: { name: 'Metal scrap', color: '#9ba8a4', cells: [[0, 0]], mark: '⊟', material: true },
  cloth: { name: 'Cloth', color: '#c9b998', cells: [[0, 0]], mark: '≈', material: true },
  gold: { name: 'Gold', color: '#e3be59', cells: [[0, 0]], mark: 'G' },
  smoke: { name: 'Smoke bomb', color: '#a8b7bf', cells: [[0, 0]], mark: '☁', equipment: true, quickUse: true },
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
  for (let i = 0; i <= steps; i++) if (!isFloor(world, Math.floor(a.x + (b.x - a.x) * i / steps), Math.floor(a.y + (b.y - a.y) * i / steps))) return false;
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

export function autoPickup(state, id) {
  if (state.held) return false;
  const index = state.ground.findIndex(item => item.id === id);
  if (index < 0) return false;
  const placement = findSpace(state.bag, state.ground[index]);
  if (!placement) return false;
  state.ground.splice(index, 1); state.bag.push(placement);
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

export function placeHeld(state, x, y) {
  if (!state.held || !fits(state.bag, state.held, x, y)) return false;
  state.bag.push({ ...state.held, x, y }); state.held = null;
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
