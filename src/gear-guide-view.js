import { GEAR_TYPES, gearDetails, loadoutStatus } from './gear-guide.js';
import { controlHint } from './game-screen.js';

export function createGearGuide(getBag, camp, profile) {
  const $ = id => document.querySelector(`#${id}`);
  let tab = 'items';
  const refresh = () => {
    for (const name of ['items', 'loadouts', 'costs']) {
      $(`guide-${name}`).hidden = tab !== name;
      $(`guide-tab-${name}`).setAttribute('aria-pressed', String(tab === name));
    }
    const item = gearDetails($('guide-item-choice').value || 'bell');
    $('guide-item-title').textContent = item.name;
    $('guide-item-use').textContent = controlHint(item.controls);
    $('guide-item-effect').textContent = item.effect;
    $('guide-item-limits').textContent = item.limits;
    $('guide-item-cost').textContent = `${item.footprint}. ${item.cost}.`;
    const kit = loadoutStatus($('guide-loadout-choice').value || 'distraction', getBag(), camp, profile);
    $('guide-loadout-plan').textContent = controlHint(kit.plan);
    $('guide-loadout-space').textContent = `Suggested kit: ${kit.slots} / 9 squares · ${kit.lootSpace} free for loot in an otherwise empty sack.`;
    $('guide-loadout-packed').textContent = kit.rows.map(row => `${row.name}: ${Math.min(row.packed, row.needed)} / ${row.needed} packed · ${row.stock} in shared stock`).join('\n');
    $('guide-loadout-status').textContent = kit.missing === 0 ? `Kit packed · ${9 - kit.used} squares free now.` : kit.fits ? `${kit.missing} more items to pack · ${kit.freeAfterPacking} squares free afterwards.` : `Make room for ${kit.missing} missing items before packing this kit.`;
    $('guide-loadout-cost').textContent = `Crafting a fresh kit: ${Object.entries(kit.materials).map(([type,n])=>`${n} ${type}`).join(' + ')}${kit.noRecipe.length ? `, plus ${kit.noRecipe.join(', ')} from stock` : ''}. Unlearned recipes: ${kit.unlockXp} XP total; needed to craft, not to use stocked gear. Pack the suggested items at the stash.`;
    $('guide-cost-rows').replaceChildren(...GEAR_TYPES.map(type => {
      const details = gearDetails(type), row = document.createElement('tr');
      for (const value of [details.name, details.type === 'berries' ? 'No unlock needed' : details.xp === null ? 'No recipe yet' : details.xp ? `${details.xp} XP` : 'Known', details.materials ? Object.entries(details.materials).map(([type,n])=>`${n} ${type}`).join(' + ') : details.type === 'berries' ? 'Find / pack berries' : 'Existing stock', details.summary]) {
        const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
      }
      return row;
    }));
  };
  for (const name of ['items', 'loadouts', 'costs']) $(`guide-tab-${name}`).addEventListener('click', () => { tab = name; refresh(); });
  for (const id of ['guide-item-choice', 'guide-loadout-choice']) $(id).addEventListener('change', refresh);
  return { refresh, reset() { tab = 'items'; refresh(); } };
}
