import { buildTrapLoadout } from './loadout.js';

export function createLoadoutView(dialog, onStart) {
  const quantity = document.querySelector('#snare-count');
  const summary = document.querySelector('#loadout-total');
  const start = document.querySelector('#start-run');
  const read = () => quantity.value.trim() === '' ? null : buildTrapLoadout({ snare: quantity.value }, 0);
  const refresh = () => {
    const selection = read();
    start.disabled = !selection;
    summary.textContent = selection ? `${selection.slots} / 9 sack squares used · ${9 - selection.slots} free for loot` : 'Choose a whole number from 0 to 9.';
  };
  dialog.addEventListener('cancel', event => event.preventDefault());
  quantity.addEventListener('input', refresh);
  start.addEventListener('click', () => {
    if (!read()) { refresh(); return; }
    onStart({ snare: Number(quantity.value) });
    dialog.close();
  });
  return { open() { refresh(); dialog.showModal(); quantity.focus(); } };
}
