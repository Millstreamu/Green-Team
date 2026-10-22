import { PASSIVE_IDS, PERSONAL_UPGRADES } from '../src/profile.js';
// Replacement icons for campfire abilities. Ability rules, costs and slots are unchanged.
// 32 × 40 matches the menu icon canvas shared by abilities and recipes.
export const ABILITY_ART_SLOTS = Object.freeze(Object.fromEntries(PASSIVE_IDS.map(id => [id, { name: PERSONAL_UPGRADES[id].name, width: 32, height: 40 }])));
