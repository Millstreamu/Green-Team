import { PROGRESSION } from './config.js';
import { knowsRecipe, ownsUpgrade, buyPersonalUpgrade, PERSONAL_UPGRADES } from './profile.js';
import { RECIPES, canCraftRecipe, craftForSack, takeStashItem, returnStashItem } from './lair.js';
import { createStashGrid, createLairSackGrid } from './stash-view.js';

export function createLairView(dialog, camp, profile, getLoot, onChange, onClose, onProfileChange = () => {}, commands = null) {
  const title = document.querySelector('#lair-title'), description = document.querySelector('#lair-description');
  const status = document.querySelector('#craft-status'), recipePanel = document.querySelector('#recipes');
  const grid = createStashGrid(document.querySelector('#stash-grid'), camp, onChange, type => {
    if (mode === 'campfire') return;
    if (commands) { commands({ type: 'take', item: type }); return; }
    if (!takeStashItem(camp, getLoot(), type)) { status.textContent = 'No room in your sack, or that stack is empty.'; return; }
    onChange(); refresh(); status.textContent = 'One item packed. Shared stock updated.';
  }, commands ? (item, slot) => { commands({ type: 'stack', item, slot }); return true; } : null);
  const sackGrid = createLairSackGrid(document.querySelector('#lair-sack-grid'), getLoot, item => {
    if (mode === 'campfire') return;
    if (commands) { commands({ type: 'return', id: item.id }); return; }
    if (!returnStashItem(camp, getLoot(), item.id)) return;
    onChange(); refresh(); status.textContent = item.debugSupply ? 'Debug supply removed; shared stock unchanged.' : 'Item returned to the shared stash.';
  });
  document.querySelector('#stash-move').addEventListener('click', () => { grid.beginMove(); document.querySelector('#stash-grid').focus(); });
  for (const type of ['snare', 'smoke']) document.querySelector(`#debug-pack-${type}`).addEventListener('click', () => {
    if (mode === 'campfire' || commands) return;
    if (!takeStashItem(camp, getLoot(), type, true)) { status.textContent = 'Your sack is full.'; return; }
    onChange(); refresh(); status.textContent = 'Free debug supply packed. It never adds real stock.';
  });
  let mode = 'stash';
  const refresh = () => {
    grid.paint(); sackGrid.paint(); document.querySelector('#lair-gold').textContent = `${camp.counts.gold} shared gold`;
    recipePanel.hidden = mode !== 'craft';
    document.querySelector('#passives').hidden = mode !== 'campfire';
    document.querySelector('#stash-section').hidden = mode === 'campfire';
    document.querySelector('#sack-section').hidden = mode === 'campfire';
    document.querySelector('#lair-gold').hidden = mode === 'campfire';
    document.querySelector('#campfire-xp').textContent = `Available XP: ${profile.xp}`;
    document.querySelector('#personal-xp').textContent = `Available XP: ${profile.xp}`;
    if (mode === 'craft') description.textContent = 'Spend personal XP on recipes. Crafting uses shared materials.';
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
    const station = PERSONAL_UPGRADES[id].kind === 'passive' ? 'campfire' : 'craft';
    if (mode !== station) return;
    if (commands) { commands({ type: 'buy', upgrade: id }); return; }
    if (!buyPersonalUpgrade(profile, id)) return;
    onProfileChange(); refresh(); status.textContent = `${PERSONAL_UPGRADES[id].name} purchased for ${PERSONAL_UPGRADES[id].cost} XP. It stays with your goblin.`;
  });
  const close = () => { grid.reset(); dialog.close(); onClose(); };
  dialog.addEventListener('keydown', event => { if (event.code === 'KeyQ' && ['stash-grid', 'lair-sack-grid'].includes(event.target.id)) { event.preventDefault(); event.stopPropagation?.(); document.querySelector(event.target.id === 'stash-grid' ? '#lair-sack-grid' : '#stash-grid').focus(); } if (event.code === 'Tab' && mode === 'stash') { event.preventDefault(); event.stopPropagation?.(); close(); } });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  document.querySelector('#close-lair').addEventListener('click', close);
  for (const [type, recipe] of Object.entries(RECIPES)) document.querySelector(`#craft-${type}`).addEventListener('click', () => {
    if (mode !== 'craft') return;
    if (commands) { commands({ type: 'craft', item: type }); return; }
    const crafted = craftForSack(camp, getLoot(), type, profile); if (!crafted) return;
    onChange(); refresh(); status.textContent = `${recipe.name} crafted into ${crafted.destination === 'sack' ? 'your sack' : 'the shared stash (sack full)'}. Your XP and gold were not spent.`;
  });
  return { refresh, open(kind) {
    mode = kind; dialog.dataset.mode = kind; title.textContent = kind === 'campfire' ? 'Campfire · personal upgrades' : kind === 'craft' ? 'Workbench & recipes' : 'Central lair stash';
    document.querySelector('#lair-eyebrow').textContent = kind === 'campfire' ? 'FOR YOUR GOBLIN' : 'LAIR PREPARATION';
    description.textContent = kind === 'campfire' ? 'Spend personal XP on permanent passive upgrades for your goblin.' : kind === 'craft' ? 'Spend personal XP on recipes. Crafting uses shared materials.' : 'E or click takes one item. In your sack, E or click returns one. R moves a whole stash stack.';
    for (const type of ['snare', 'smoke']) document.querySelector(`#debug-pack-${type}`).hidden = !!commands;
    status.textContent = ''; grid.reset(); sackGrid.reset(); refresh(); dialog.showModal();
    (kind === 'campfire' ? !document.querySelector('#buy-quick-search').disabled ? document.querySelector('#buy-quick-search') : document.querySelector('#close-lair') : kind === 'craft' ? ['#buy-smoke', '#craft-smoke', '#craft-snare'].map(selector => document.querySelector(selector)).find(button => !button.disabled) ?? document.querySelector('#close-lair') : document.querySelector('#stash-grid')).focus();
  } };
}
