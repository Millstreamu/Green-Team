import { createTuningView } from './tuning-view.js';
import { LOOT_TYPES } from './loot.js';
const $ = selector => document.querySelector(selector);
const key = location.hash.slice(1);
let state = null, busy = false, access = !!key;
const tuningView = createTuningView(command => run(command));
const status = (text, error = false) => { $('#admin-status').textContent = text; $('#admin-status').dataset.error = String(error); };
function options(select, entries) {
  const signature = JSON.stringify(entries);
  if (select.dataset.options === signature) return;
  const previous = select.value;
  select.replaceChildren(...entries.map(([value, label]) => {
    const option = document.createElement('option'); option.value = value; option.textContent = label; return option;
  }));
  if (entries.some(([value]) => value === previous)) select.value = previous;
  else select.value = entries[0]?.[0] ?? '';
  select.dataset.options = signature;
}
function selectedGoblin() { return state?.players.find(p => p.id === $('#admin-goblin').value); }
function controls() {
  const locked = busy || !access || !state || state.saveFailed;
  for (const node of document.querySelectorAll('button')) node.disabled = locked;
  for (const node of document.querySelectorAll('[data-edit]')) node.disabled = locked || state.runActive;
  $('#end-run').disabled = locked || !(state?.selectedRunActive ?? state?.runActive);
  if (state?.lairs && !state.selectedLairId) { $('#set-stock').disabled = true; $('#reset-lair').disabled = true; }
  $('#set-xp').disabled ||= !selectedGoblin(); $('#reset-goblin').disabled ||= !selectedGoblin();
  $('#admin-lair').disabled = locked;
  tuningView.paint(state, locked);
  $('#restore-backup').disabled ||= !state?.backups.some(b => b.id === $('#admin-backup').value && b.valid);
}
function details() {
  const p = selectedGoblin();
  $('#goblin-summary').textContent = p ? `${p.connected ? 'Online' : 'Offline'} · ${p.xp} XP · ${p.purchases.length} unlocks · ${p.bagCount} sack items` : 'No goblins saved yet. Open the game to create one.';
}
function paint(next) {
  state = next;
  $('#admin-lair-section').hidden = !state.lairs;
  if (state.lairs) {
    options($('#admin-lair'), state.lairs.map(l => [l.id, l.name]));
    $('#admin-lair').value = state.selectedLairId ?? '';
    $('#admin-lair-code').textContent = state.lairs.find(l => l.id === state.selectedLairId)?.code ?? 'No lairs yet';
  }
  $('#run-state').textContent = state.saveFailed ? 'Saving failed · game paused. Check Terminal and restart after fixing disk access.' : state.runActive ? 'Run active · settings apply next departure. End all runs before editing stock or progress.' : 'At the lair · edits are available.';
  $('#stock-summary').textContent = Object.entries(state.camp.counts).filter(([type]) => !LOOT_TYPES[type].sellValue).map(([type, count]) => `${LOOT_TYPES[type].name}: ${count}`).join(' · ');
  options($('#admin-goblin'), state.players.map(p => [p.id, p.name]));
  options($('#admin-backup'), state.backups.map(b => [b.id, `${b.label} · ${b.createdAt ? new Date(b.createdAt).toLocaleString() : 'cannot restore'}`]));
  details(); controls();
}
async function request(command) {
  const response = await fetch(`/admin/api${!command && $('#admin-lair').value ? '?lair=' + encodeURIComponent($('#admin-lair').value) : ''}`, { method: command ? 'POST' : 'GET', cache: 'no-store', credentials: 'omit',
    headers: { 'x-green-team-admin': key, ...(command ? { 'Content-Type': 'application/json' } : {}) },
    ...(command ? { body: JSON.stringify({ ...command, ...(state?.selectedLairId ? { lairId: state.selectedLairId } : {}) }) } : {}) });
  const data = await response.json();
  if (!response.ok) { if (response.status === 403) access = false; throw Error(data.error ?? 'Admin request failed.'); }
  return data;
}
async function refresh() {
  if (busy || !access) return;
  busy = true; controls();
  try { paint(await request()); } catch (error) { status(error.message, true); }
  finally { busy = false; controls(); }
}
async function run(command, confirmation) {
  if (busy || !access || !state) return;
  if (confirmation && !window.confirm(confirmation)) return;
  busy = true; controls(); status('Working…');
  try { const result = await request(command); if (['set-tuning', 'reset-tuning'].includes(command.type)) tuningView.saved(); paint(result.state); if (result.backupId) $('#admin-backup').value = result.backupId; status(result.message); }
  catch (error) { status(error.message, true); }
  finally { busy = false; controls(); }
}
options($('#admin-item'), Object.entries(LOOT_TYPES).filter(([, def]) => !def.sellValue).map(([id, def]) => [id, def.name]));
$('#admin-item').value = 'gold';
$('#admin-lair').addEventListener('change', refresh);
$('#admin-item').addEventListener('change', () => { $('#stock-amount').value = state?.camp.counts[$('#admin-item').value] ?? 0; });
$('#admin-goblin').addEventListener('change', () => { details(); $('#xp-amount').value = selectedGoblin()?.xp ?? 0; controls(); });
$('#admin-backup').addEventListener('change', controls);
$('#stock-form').addEventListener('submit', event => { event.preventDefault(); run({ type: 'set-stock', item: $('#admin-item').value, amount: Number($('#stock-amount').value) }); });
$('#xp-form').addEventListener('submit', event => { event.preventDefault(); run({ type: 'set-xp', id: selectedGoblin()?.id, amount: Number($('#xp-amount').value) }); });
$('#make-backup').addEventListener('click', () => run({ type: 'backup' }));
$('#restore-backup').addEventListener('click', () => run({ type: 'restore', backupId: $('#admin-backup').value }, 'Restore this SERVER backup? ALL lairs, sacks and personal progress return to that point. Newer lairs reset to starter stock. Goblins created later keep their identities but reset to zero progress. A backup of the current home is made first.'));
$('#reset-lair').addEventListener('click', () => run({ type: 'reset-lair' }, 'Reset the SELECTED lair’s gold, stock and destination to starter values? Personal sacks and progress stay. A backup is made first.'));
$('#reset-goblin').addEventListener('click', () => run({ type: 'reset-goblin', id: selectedGoblin()?.id }, `Reset ${selectedGoblin()?.name ?? 'this goblin'}? Its sacks in ALL lairs, XP and unlocks will be cleared. Its identity stays. A backup is made first.`));
$('#reset-all').addEventListener('click', () => run({ type: 'reset-all' }, 'Reset ALL lairs and ALL goblin sacks, XP and unlocks? Goblin identities stay. A backup is made first.'));
$('#end-run').addEventListener('click', () => run({ type: 'end-run' }, 'End this run and return everyone home? All carried loot and supplies are lost. No gold or XP is awarded. Waiting goblins keep their home sacks. A backup is made first.'));
controls();
if (!access) status('Open the private admin link printed in Terminal after npm start.', true);
else { await refresh(); if (state) status('Connected. Every change makes a backup first.'); }
setInterval(refresh, 3000);
