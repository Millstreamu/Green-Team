import { GEAR_WORDS, ABILITY_WORDS, MENU_WORD_VALUES } from '../src/menu-words.js';
import { LOOT_TYPES } from '../src/loot.js';
import { PERSONAL_UPGRADES } from '../src/profile.js';
// Editable menu wording. Defaults come from the game; values are today's effect numbers,
// shown in the editor. Playtests fill placeholders from the live game values instead.
export const WORD_SLOTS = Object.freeze(Object.fromEntries([
  ...Object.entries(GEAR_WORDS).map(([id, words]) => [id, { group: 'gear', name: LOOT_TYPES[id].name, ...words, values: MENU_WORD_VALUES[id]() }]),
  ...Object.entries(ABILITY_WORDS).map(([id, words]) => [id, { group: 'ability', name: PERSONAL_UPGRADES[id].name, ...words, values: MENU_WORD_VALUES[id]() }])
]));
