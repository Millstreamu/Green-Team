import { RECIPES, canCraftRecipe, craftRecipe, unlockRecipe } from './lair.js';
import { createStashGrid } from './stash-view.js';

export function createLairView(dialog, camp, onChange, onClose) {
  const title = document.querySelector('#lair-title'), description = document.querySelector('#lair-description');
  const status = document.querySelector('#craft-status'), recipePanel = document.querySelector('#recipes');
  const grid = createStashGrid(document.querySelector('#stash-grid'), camp, onChange);
  let mode = 'stash';
  const refresh = () => {
    grid.paint(); document.querySelector('#lair-gold').textContent = `${camp.counts.gold} shared gold`;
    recipePanel.hidden = mode !== 'craft';
    for (const [type, recipe] of Object.entries(RECIPES)) {
      const button = document.querySelector(`#craft-${type}`), unlocked = camp.unlocked[type];
      button.textContent = unlocked ? `Craft ${recipe.name} · ${Object.entries(recipe.materials).map(([item, count]) => `${count} ${item}`).join(' + ')}` : `Unlock ${recipe.name} recipe · ${recipe.unlockCost} gold`;
      button.disabled = unlocked ? !canCraftRecipe(camp, type) : camp.counts.gold < recipe.unlockCost;
      const cost = Object.entries(recipe.materials).map(([item, count]) => `${count} ${item}`).join(' + ');
      document.querySelector(`#recipe-${type}-state`).textContent = `${unlocked ? 'Known by the whole lair' : 'Buy once for the whole lair'}. Materials: ${cost}.`;
    }
  };
  const close = () => { grid.reset(); dialog.close(); onClose(); };
  dialog.addEventListener('keydown', event => { if (event.code === 'Tab' && mode === 'stash') { event.preventDefault(); event.stopPropagation?.(); close(); } });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  document.querySelector('#close-lair').addEventListener('click', close);
  for (const [type, recipe] of Object.entries(RECIPES)) document.querySelector(`#craft-${type}`).addEventListener('click', () => {
    if (mode !== 'craft') return;
    const wasUnlocked = camp.unlocked[type];
    if (!(wasUnlocked ? craftRecipe(camp, type) : unlockRecipe(camp, type))) return;
    onChange(); refresh(); status.textContent = wasUnlocked ? `${recipe.name} crafted into the shared stash.` : `${recipe.name} recipe unlocked for the whole lair. Use materials to craft it.`;
  });
  return { open(kind) {
    mode = kind; dialog.dataset.mode = kind; title.textContent = kind === 'craft' ? 'Workbench & recipes' : 'Central lair stash';
    description.textContent = kind === 'craft' ? 'Buy recipes with shared gold, then craft with shared materials.' : 'Valuables sell on return. Gold, materials and crafted items stack here for the whole lair.';
    status.textContent = ''; grid.reset(); refresh(); dialog.showModal();
    (kind === 'craft' ? !document.querySelector('#craft-smoke').disabled ? document.querySelector('#craft-smoke') : !document.querySelector('#craft-snare').disabled ? document.querySelector('#craft-snare') : document.querySelector('#close-lair') : document.querySelector('#stash-grid')).focus();
  } };
}
