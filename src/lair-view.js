import { knowsRecipe } from './profile.js';
import { RECIPES, canCraftRecipe, craftRecipe } from './lair.js';
import { createStashGrid } from './stash-view.js';

export function createLairView(dialog, camp, profile, onChange, onClose) {
  const title = document.querySelector('#lair-title'), description = document.querySelector('#lair-description');
  const status = document.querySelector('#craft-status'), recipePanel = document.querySelector('#recipes');
  const grid = createStashGrid(document.querySelector('#stash-grid'), camp, onChange);
  let mode = 'stash';
  const refresh = () => {
    grid.paint(); document.querySelector('#lair-gold').textContent = `${camp.counts.gold} shared gold`;
    recipePanel.hidden = mode !== 'craft';
    for (const [type, recipe] of Object.entries(RECIPES)) {
      const button = document.querySelector(`#craft-${type}`), unlocked = knowsRecipe(profile, type);
      button.textContent = unlocked ? `Craft ${recipe.name} · ${Object.entries(recipe.materials).map(([item, count]) => `${count} ${item}`).join(' + ')}` : `Learn at ${recipe.requiredXp} XP · ${profile.xp}/${recipe.requiredXp}`;
      button.disabled = !canCraftRecipe(camp, type, profile);
      const cost = Object.entries(recipe.materials).map(([item, count]) => `${count} ${item}`).join(' + ');
      document.querySelector(`#recipe-${type}-state`).textContent = `${unlocked ? 'Known by your goblin' : `Not yet learned · ${profile.xp}/${recipe.requiredXp} XP (${recipe.requiredXp - profile.xp} to go)`}. Materials: ${cost}.`;
    }
  };
  const close = () => { grid.reset(); dialog.close(); onClose(); };
  dialog.addEventListener('keydown', event => { if (event.code === 'Tab' && mode === 'stash') { event.preventDefault(); event.stopPropagation?.(); close(); } });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  document.querySelector('#close-lair').addEventListener('click', close);
  for (const [type, recipe] of Object.entries(RECIPES)) document.querySelector(`#craft-${type}`).addEventListener('click', () => {
    if (mode !== 'craft') return;
    if (!craftRecipe(camp, type, profile)) return;
    onChange(); refresh(); status.textContent = `${recipe.name} crafted into the shared stash. Your XP and gold were not spent.`;
  });
  return { open(kind) {
    mode = kind; dialog.dataset.mode = kind; title.textContent = kind === 'craft' ? 'Workbench & recipes' : 'Central lair stash';
    description.textContent = kind === 'craft' ? `Your goblin: ${profile.xp} XP. Recipes are learned automatically; crafting uses shared materials.` : 'Valuables sell on return. Gold, materials and crafted items stack here for the whole lair.';
    status.textContent = ''; grid.reset(); refresh(); dialog.showModal();
    (kind === 'craft' ? !document.querySelector('#craft-smoke').disabled ? document.querySelector('#craft-smoke') : !document.querySelector('#craft-snare').disabled ? document.querySelector('#craft-snare') : document.querySelector('#close-lair') : document.querySelector('#stash-grid')).focus();
  } };
}
