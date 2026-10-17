import { PROGRESSION } from './config.js';
import { knowsRecipe, ownsUpgrade, buyPersonalUpgrade, PERSONAL_UPGRADES } from './profile.js';
import { RECIPES, canCraftRecipe, craftForSack, takeStashItem, returnStashItem } from './lair.js';
import { createStashGrid, createLairSackGrid } from './stash-view.js';

export function createLairView(dialog, camp, profile, getLoot, onChange, onClose, onProfileChange = () => {}) {
  const title = document.querySelector('#lair-title'), description = document.querySelector('#lair-description');
  const status = document.querySelector('#craft-status'), recipePanel = document.querySelector('#recipes');
  const grid = createStashGrid(document.querySelector('#stash-grid'), camp, onChange, type => {
    if (!takeStashItem(camp, getLoot(), type)) { status.textContent = 'No room in your sack, or that stack is empty.'; return; }
    onChange(); refresh(); status.textContent = 'One item packed. Shared stock updated.';
  });
  const sackGrid = createLairSackGrid(document.querySelector('#lair-sack-grid'), getLoot, item => {
    if (!returnStashItem(camp, getLoot(), item.id)) return;
    onChange(); refresh(); status.textContent = item.debugSupply ? 'Debug supply removed; shared stock unchanged.' : 'Item returned to the shared stash.';
  });
  document.querySelector('#stash-move').addEventListener('click', () => { grid.beginMove(); document.querySelector('#stash-grid').focus(); });
  for (const type of ['snare', 'smoke']) document.querySelector(`#debug-pack-${type}`).addEventListener('click', () => {
    if (!takeStashItem(camp, getLoot(), type, true)) { status.textContent = 'Your sack is full.'; return; }
    onChange(); refresh(); status.textContent = 'Free debug supply packed. It never adds real stock.';
  });
  let mode = 'stash';
  const refresh = () => {
    grid.paint(); sackGrid.paint(); document.querySelector('#lair-gold').textContent = `${camp.counts.gold} shared gold`;
    recipePanel.hidden = mode !== 'craft';
    document.querySelector('#personal-xp').textContent = `Available XP: ${profile.xp}`;
    if (mode === 'craft') description.textContent = 'Spend personal XP on recipes and passives. Crafting uses shared materials.';
    for (const [id, selector] of [['smoke', '#buy-smoke'], ['quickSearch', '#buy-quick-search']]) {
      const upgrade = PERSONAL_UPGRADES[id], owned = ownsUpgrade(profile, id), button = document.querySelector(selector);
      button.textContent = owned ? `${upgrade.name} · Owned` : `Buy ${upgrade.name} · ${upgrade.cost} XP`;
      button.disabled = owned || profile.xp < upgrade.cost;
    }
    document.querySelector('#passive-search-state').textContent = `${ownsUpgrade(profile, 'quickSearch') ? 'Owned' : 'Permanent passive'} · ${Math.round(PROGRESSION.quickSearchBonus * 100)}% faster searching.`;

    for (const [type, recipe] of Object.entries(RECIPES)) {
      const button = document.querySelector(`#craft-${type}`), unlocked = knowsRecipe(profile, type);
      button.textContent = unlocked ? `Craft ${recipe.name} · ${Object.entries(recipe.materials).map(([item, count]) => `${count} ${item}`).join(' + ')}` : `Buy the recipe first · ${recipe.xpCost} XP`;
      button.disabled = !canCraftRecipe(camp, type, profile);
      const cost = Object.entries(recipe.materials).map(([item, count]) => `${count} ${item}`).join(' + ');
      document.querySelector(`#recipe-${type}-state`).textContent = `${unlocked ? 'Known by your goblin' : `Not purchased · costs ${recipe.xpCost} XP`}. Materials: ${cost}.`;
    }
  };
  for (const [id, selector] of [['smoke', '#buy-smoke'], ['quickSearch', '#buy-quick-search']]) document.querySelector(selector).addEventListener('click', () => {
    if (mode !== 'craft' || !buyPersonalUpgrade(profile, id)) return;
    onProfileChange(); refresh(); status.textContent = `${PERSONAL_UPGRADES[id].name} purchased for ${PERSONAL_UPGRADES[id].cost} XP. It stays with your goblin.`;
  });
  const close = () => { grid.reset(); dialog.close(); onClose(); };
  dialog.addEventListener('keydown', event => { if (event.code === 'KeyQ' && ['stash-grid', 'lair-sack-grid'].includes(event.target.id)) { event.preventDefault(); event.stopPropagation?.(); document.querySelector(event.target.id === 'stash-grid' ? '#lair-sack-grid' : '#stash-grid').focus(); } if (event.code === 'Tab' && mode === 'stash') { event.preventDefault(); event.stopPropagation?.(); close(); } });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  document.querySelector('#close-lair').addEventListener('click', close);
  for (const [type, recipe] of Object.entries(RECIPES)) document.querySelector(`#craft-${type}`).addEventListener('click', () => {
    if (mode !== 'craft') return;
    const crafted = craftForSack(camp, getLoot(), type, profile); if (!crafted) return;
    onChange(); refresh(); status.textContent = `${recipe.name} crafted into ${crafted.destination === 'sack' ? 'your sack' : 'the shared stash (sack full)'}. Your XP and gold were not spent.`;
  });
  return { open(kind) {
    mode = kind; dialog.dataset.mode = kind; title.textContent = kind === 'craft' ? 'Workbench & recipes' : 'Central lair stash';
    description.textContent = kind === 'craft' ? 'Spend personal XP on recipes and passives. Crafting uses shared materials.' : 'E or click takes one item. In your sack, E or click returns one. R moves a whole stash stack.';
    status.textContent = ''; grid.reset(); sackGrid.reset(); refresh(); dialog.showModal();
    (kind === 'craft' ? ['#buy-smoke', '#craft-smoke', '#buy-quick-search', '#craft-snare'].map(selector => document.querySelector(selector)).find(button => !button.disabled) ?? document.querySelector('#close-lair') : document.querySelector('#stash-grid')).focus();
  } };
}
