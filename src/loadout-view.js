import { buildTrapLoadout } from './loadout.js';

export function createLoadoutView(dialog, onStart, available = () => ({ snare: 9, smoke: 9 }), onCancel = () => {}) {
  const quantity = document.querySelector('#snare-count'), smoke = document.querySelector('#smoke-count');
  const debug = document.querySelector('#debug-supplies');
  const summary = document.querySelector('#loadout-total');
  const start = document.querySelector('#start-run');
  const read = () => [quantity, smoke].some(input => input.value.trim() === '') ? null : buildTrapLoadout({ snare: quantity.value, smoke: smoke.value }, 0);
  const refresh = () => {
    const selection = read(), short = selection && !debug.checked && ['snare', 'smoke'].some(type => selection.bag.filter(item => item.type === type).length > available()[type]);
    start.disabled = !selection || short;
    document.querySelector('#snare-stock').textContent = `${available().snare} snares · ${available().smoke} smoke bombs in shared stock`;
    summary.textContent = !selection ? 'Use whole numbers from 0–9, with at most 9 items total.' : short ? 'Not enough shared stock. Craft more, take fewer, or enable debug supplies.' : `${selection.slots} / 9 sack squares used · ${9 - selection.slots} free for loot${debug.checked ? ' · FREE DEBUG SUPPLIES' : ''}`;
  };
  const cancel = () => { dialog.close(); onCancel(); };
  dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });
  document.querySelector('#cancel-loadout').addEventListener('click', cancel);
  quantity.addEventListener('input', refresh); smoke.addEventListener('input', refresh); debug.addEventListener('change', refresh);
  start.addEventListener('click', () => {
    const selection = read();
    if (!selection || !debug.checked && ['snare', 'smoke'].some(type => selection.bag.filter(item => item.type === type).length > available()[type])) { refresh(); return; }
    if (onStart({ snare: Number(quantity.value), smoke: Number(smoke.value) }, debug.checked) === false) { refresh(); return; }
    dialog.close();
  });
  return { open() {
    for (const [type, input] of [['snare', quantity], ['smoke', smoke]]) if (!debug.checked && Number.isInteger(Number(input.value))) input.value = String(Math.max(0, Math.min(Number(input.value), available()[type])));
    refresh(); dialog.showModal(); quantity.focus();
  } };
}
