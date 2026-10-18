import { createLoot, LOOT_TYPES } from '../src/loot.js';

// Isolated packing/run tests can seed loose loot without bypassing the actual
// game's search-before-looting rule. Integration tests use the real searches.
export function createLooseLoot(world) {
  const state = createLoot(), types = Object.keys(LOOT_TYPES).filter(type => !LOOT_TYPES[type].runOnly);
  const offsets = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1]];
  offsets.forEach(([dx, dy], i) => state.ground.push({ id: `${world.seed}-fixture-${i}`, type: types[i], rotation: 0, x: world.spawn.x + dx, y: world.spawn.y + dy }));
  return state;
}
