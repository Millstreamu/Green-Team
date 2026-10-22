import { drawStationSprite } from './station-art.js';
import { itemCount } from './loot.js';
import { renderItemList } from './item-list.js';

export function createResultsView(dialog) {
  const $ = selector => document.querySelector(selector);
  const list = $('#haul-list'), summary = $('#run-summary'), details = $('#run-loot-panel'), detailsButton = $('#result-details');
  let showingDetails = false;
  const showDetails = open => {
    showingDetails = open;
    summary.hidden = open; details.hidden = !open;
    detailsButton.textContent = open ? '×' : 'ⓘ';
    detailsButton.setAttribute('aria-label', open ? 'Back to result' : 'Run details');
    detailsButton.setAttribute('aria-expanded', String(open));
    if (open) $('#run-loot-scroll').scrollTop = 0;
  };
  detailsButton.addEventListener('click', () => { showDetails(!showingDetails); detailsButton.focus(); });
  dialog.addEventListener('cancel', e => { e.preventDefault(); if (showingDetails) { showDetails(false); detailsButton.focus(); } });
  return {
    open(result) {
      const down = result.outcome === 'down';
      drawStationSprite($('#result-gold-art'), 'gold');
      $('#result-loot-icons').setAttribute('aria-label', down ? 'Items left behind' : result.team ? 'Recovered team haul' : 'Recovered items');
      const xp = result.personalXp ?? { earned: 0, total: 0 };
      $('#result-gold-label').textContent = result.team || result.leftBehind ? 'TEAM GOLD' : 'SHARED GOLD';
      $('#result-gold-earned').textContent = `+${result.soldGold ?? 0}`;
      $('#result-xp-earned').textContent = result.networkXpPending ? '—' : `+${xp.earned}`;
      $('#result-xp-balance').textContent = result.networkXpPending ? 'XP unavailable in this test' : `${xp.total} XP available`;
      $('#result-time').textContent = `${Math.floor(result.elapsed / 60)}:${String(result.elapsed % 60).padStart(2, '0')}`;
      document.querySelector('#result-xp').textContent = result.networkXpPending ? 'Network XP rewards are not enabled in this test.' : `Your goblin: +${xp.earned} XP · ${xp.total} XP available`;
      document.querySelector('#result-job').textContent = result.job ? `${result.job.jobName} · ${result.job.difficultyName}` : '';
      document.querySelector('#result-eyebrow').textContent = down ? 'THE RUN IS OVER' : 'BACK THROUGH THE TUNNEL';
      document.querySelector('#results-title').textContent = result.aborted ? 'The admin ended this run.' : result.leftBehind ? 'Your team escaped. You were left behind.' : down ? 'You went down.' : 'You made it out.';
      document.querySelector('#results-description').textContent = result.aborted ? 'Carried loot and supplies were lost. No gold or XP was awarded.' : result.leftBehind ? 'Your sack spilled when you went down. Anything teammates carried out is safe in the lair.' : down ? 'Nobody was left standing. Carried loot and cart cargo were lost.' : `Valuables sold for ${result.soldGold ?? 0} shared gold. Materials and unused gear are in the central stash.`;
      list.setAttribute('aria-label', down ? 'Items lost in the dungeon' : 'Loot brought back');
      const lostCount = [...(result.lostItems ?? []), ...(result.lostCartItems ?? [])].reduce((n, item) => n + itemCount(item), 0);
      const shown = down ? [...(result.lostItems ?? []), ...(result.lostCartItems ?? [])] : result.items ?? [];
      $('#result-loot-title').textContent = down ? 'Left behind' : result.team ? 'Team haul' : 'Recovered';
      $('#result-loot-name').textContent = shown.length ? 'Tap an item' : down ? 'No carried items' : 'Empty-handed';
      renderItemList($('#result-loot-icons'), shown, { tiles: true, onSelect: text => { $('#result-loot-name').textContent = text; } });
      $('#result-items-title').textContent = down ? 'Items left behind' : result.team ? 'Team haul' : 'Recovered items';
      showDetails(false);
      renderItemList(list, shown);
      document.querySelector('#empty-haul').hidden = shown.length > 0;
      document.querySelector('#empty-haul').textContent = down ? 'You were carrying no loot. You can return on the next run.' : 'You slipped out empty-handed. There is more to steal next time.';
      document.querySelector('#haul-total').textContent = down ? `${lostCount} ${lostCount === 1 ? 'item' : 'items'} lost · ${Math.floor(result.elapsed / 60)}m ${result.elapsed % 60}s` : `${result.count} ${result.count === 1 ? 'loot item' : 'loot items'} · +${result.soldGold ?? 0} gold · ${result.cartSlots ? `${result.slots-result.cartSlots} sack squares + ${result.cartSlots} cart squares` : `${result.slots}${result.team ? ' team sack squares' : ' / 9 sack squares'}`} · ${Math.floor(result.elapsed / 60)}m ${result.elapsed % 60}s`;
      if (!dialog.open) dialog.showModal();
      document.querySelector('#next-run').focus();
    },
    close() { showDetails(false); if (dialog.open) dialog.close(); }
  };
}
