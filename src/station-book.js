import { RECIPES, recipeStation, canCraftRecipe, POTION_STATION_COST } from './lair.js';
import { knowsRecipe } from './profile.js';

export const STATION_CHOICES = Object.freeze({ craft: ['snare','smoke','dart','bell','orb','lunch'], potion: ['disguise','vanish','lucky'], campfire: [] });
// The visible primary action always comes from current shared stock and personal
// knowledge, including immediately after a server confirmation or peer change.
export function stationActionState(camp, profile, mode, type) {
  if (!STATION_CHOICES[mode]?.includes(type)) return null;
  if (mode === 'potion' && !camp.buildings?.potion) return { type: 'build-potion-station', label: `Build · ${POTION_STATION_COST} gold`, disabled: camp.counts.gold < POTION_STATION_COST, note: 'Shared lair upgrade' };
  const recipe = RECIPES[type];
  if (!knowsRecipe(profile, type)) return { type: 'buy', upgrade: type, label: `Unlock · ${recipe.xpCost} XP`, disabled: profile.xp < recipe.xpCost, note: profile.xp < recipe.xpCost ? 'Need more personal XP' : 'Recipe · paid once' };
  return { type: 'craft', item: type, label: recipeStation(type) === 'potion' ? 'Brew' : recipeStation(type) === 'campfire' ? 'Cook' : 'Craft', disabled: !canCraftRecipe(camp, type, profile), note: canCraftRecipe(camp, type, profile) ? 'Shared ingredients' : 'Missing ingredients' };
}
