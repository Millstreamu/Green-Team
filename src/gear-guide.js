import { TRAPS, RESCUE } from './config.js';
import { GEAR_WORDS, fillMenuWords } from './menu-words.js';
import { LOOT_TYPES, SACK, itemCells } from './loot.js';
import { RECIPES } from './lair.js';
import { knowsRecipe } from './profile.js';

export const GEAR_TYPES = Object.freeze(['bell', 'snare', 'smoke', 'disguise', 'vanish', 'lucky', 'dart', 'orb', 'lunch', 'berries']);
export function gearDetails(type) {
  const entries = {
    berries: { controls: 'E equip → move → Space aim → Space throw. Esc cancels aim.' },
    bell: { controls: 'E equip → move → Space aim → Space throw. Esc cancels aim.' },
    snare: { controls: `E equip → release E → WASD aim → hold E ${TRAPS.placeTime}s to place. Esc cancels.` },
    smoke: { controls: 'E equip → move → Space deploys one bomb.' },
    lucky: { controls: 'E equip → move → Space drinks the selected bottle.' },
    vanish: { controls: 'E equip → move → Space drinks the selected bottle.' },
    disguise: { controls: 'E equip → move → Space drinks the selected bottle.' },
    dart: { controls: 'E equip → move → Space aim → Space fire. Esc cancels aim.' },
    orb: { controls: 'E equip → move → Space pings once. Open Map to see marks.' },
    lunch: { controls: `Keep it packed; hold E near a downed teammate for ${RESCUE.reviveSeconds}s. No equip needed.` }
  };
  if (!entries[type]) return null;
  const recipe = RECIPES[type];
  const words = Object.fromEntries(Object.entries(GEAR_WORDS[type]).map(([key, text]) => [key, fillMenuWords(text, type)]));
  return { type, name: LOOT_TYPES[type].name, ...words, ...entries[type], footprint: '1 sack square · 1 use',
    xp: recipe?.xpCost ?? null, materials: recipe?.materials ?? null,
    cost: type === 'berries' ? 'Found resource · throw one portion or bank it for cooking' : recipe ? `${recipe.xpCost ? `${recipe.xpCost} XP recipe` : 'Recipe known from the start'} · craft ${Object.entries(recipe.materials).map(([item, n]) => `${n} ${item}`).join(' + ')}` : 'No recipe or crafting cost set. Pack an existing lunch.' };
}
export const SUGGESTED_LOADOUTS = Object.freeze({
  distraction: { name: 'Distraction', items: { bell: 2, smoke: 1 }, plan: 'Throw a bell before entering a watched route. Keep smoke for breaking sight if spotted.' },
  sneaking: { name: 'Sneaking', items: { orb: 1, disguise: 1, dart: 1 }, plan: 'Ping first, then drink the disguise and cross. Keep the dart for a guard blocking your route; firing ends the disguise.' },
  rescue: { name: 'Team rescue', items: { lunch: 1, smoke: 1, orb: 1 }, plan: 'Ping to plan the approach, use smoke for cover, then hold E to revive. Craft a Packed Lunch at the workbench first, or pack one from shared stock.' }
});
export function loadoutStatus(id, bag, camp, profile) {
  const kit = SUGGESTED_LOADOUTS[id]; if (!kit) return null;
  const capacity = SACK.width * SACK.height, used = bag.reduce((n, i) => n + itemCells(i).length, 0);
  const rows = Object.entries(kit.items).map(([type, needed]) => ({ type, needed, name: LOOT_TYPES[type].name,
    packed: bag.filter(i => i.type === type).length, stock: camp.counts[type] ?? 0 }));
  const missing = rows.reduce((n, row) => n + Math.max(0, row.needed - row.packed), 0);
  const materials = {}, noRecipe = []; let unlockXp = 0;
  for (const row of rows) {
    const recipe = RECIPES[row.type];
    if (!recipe) { noRecipe.push(row.name); continue; }
    if (!knowsRecipe(profile, row.type)) unlockXp += recipe.xpCost;
    for (const [type, n] of Object.entries(recipe.materials)) materials[type] = (materials[type] ?? 0) + n * row.needed;
  }
  const slots = rows.reduce((n, row) => n + row.needed, 0);
  return { ...kit, rows, slots, lootSpace: capacity - slots, used, missing, fits: used + missing <= capacity,
    freeAfterPacking: Math.max(0, capacity - used - missing), unlockXp, materials, noRecipe };
}
