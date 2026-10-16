import { buildTrapLoadout } from './loadout.js';

export function createLoadoutView(dialog, onStart, available = () => 9, onCancel = () => {}) {
  const quantity = document.querySelector('#snare-count');
  const debug = document.querySelector('#debug-supplies');
  const summary = document.querySelector('#loadout-total');
  const start = document.querySelector('#start-run');
  const read = () => quantity.value.trim() === '' ? null : buildTrapLoadout({ snare: quantity.value }, 0);
  const refresh = () => {
    const selection = read(), short = selection && !debug.checked && selection.bag.length > available();
    start.disabled = !selection || short;
    document.querySelector('#snare-stock').textContent = `${available()} snares in your stash`;
    summary.textContent = !selection ? 'Choose a whole number from 0 to 9.' : short ? 'Not enough snares. Craft more, take fewer, or enable debug supplies.' : `${selection.slots} / 9 sack squares used · ${9 - selection.slots} free for loot${debug.checked ? ' · FREE DEBUG SUPPLIES' : ''}`;
  };
  const cancel = () => { dialog.close(); onCancel(); };
  dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });
  document.querySelector('#cancel-loadout').addEventListener('click', cancel);
  quantity.addEventListener('input', refresh); debug.addEventListener('change', refresh);
  start.addEventListener('click', () => {
    if (!read() || !debug.checked && read().bag.length > available()) { refresh(); return; }
    if (onStart({ snare: Number(quantity.value) }, debug.checked) === false) { refresh(); return; }
    dialog.close();
  });
  return { open() {
    if (!debug.checked && Number.isInteger(Number(quantity.value))) quantity.value = String(Math.max(0, Math.min(Number(quantity.value), available())));
    refresh(); dialog.showModal(); quantity.focus();
  } };
}
