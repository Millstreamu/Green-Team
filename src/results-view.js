import { renderItemList } from './item-list.js';

export function createResultsView(dialog) {
  const list = document.querySelector('#haul-list');
  dialog.addEventListener('cancel', e => e.preventDefault());
  return {
    open(result) {
      const down = result.outcome === 'down';
      const xp = result.personalXp ?? { earned: 0, total: 0 };
      document.querySelector('#result-xp').textContent = result.networkXpPending ? 'Network XP rewards are not enabled in this test.' : `Your goblin: +${xp.earned} XP · ${xp.total} XP available`;
      document.querySelector('#result-job').textContent = result.job ? `${result.job.jobName} · ${result.job.difficultyName}` : '';
      document.querySelector('#result-eyebrow').textContent = down ? 'THE RUN IS OVER' : 'BACK THROUGH THE TUNNEL';
      document.querySelector('#results-title').textContent = down ? 'You went down.' : 'You made it out.';
      document.querySelector('#results-description').textContent = down ? 'Nobody was left to recover you. Your carried loot and supplies were lost.' : `Valuables sold for ${result.soldGold ?? 0} shared gold. Materials and unused gear are in the central stash.`;
      list.setAttribute('aria-label', down ? 'Items lost in the dungeon' : 'Loot brought back');
      const shown = down ? result.lostItems : result.items;
      renderItemList(list, shown);
      document.querySelector('#empty-haul').hidden = shown.length > 0;
      document.querySelector('#empty-haul').textContent = down ? 'You were carrying no loot. You can return on the next run.' : 'You slipped out empty-handed. There is more to steal next time.';
      document.querySelector('#haul-total').textContent = down ? `${result.lostItems.length} ${result.lostItems.length === 1 ? 'item' : 'items'} lost · ${Math.floor(result.elapsed / 60)}m ${result.elapsed % 60}s` : `${result.count} ${result.count === 1 ? 'loot item' : 'loot items'} · +${result.soldGold ?? 0} gold · ${result.slots}${result.team ? ' team sack squares' : ' / 9 sack squares'} · ${Math.floor(result.elapsed / 60)}m ${result.elapsed % 60}s`;
      dialog.showModal();
      document.querySelector('#next-run').focus();
    },
    close() { if (dialog.open) dialog.close(); }
  };
}
