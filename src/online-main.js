import { createCamp, createLairWorld, lairTarget } from './lair.js';
import { createProfile } from './profile.js';
import { createLairView } from './lair-view.js';
import { createMapPlanningView } from './loadout-view.js';
import { createInput } from './input.js';
import { createRenderer, screenToWorld } from './render.js';
import { createLoot, selectTarget, LOOT_TYPES, bagItemAt } from './loot.js';
import { generateDungeon } from './world.js';
import { selectInteraction, SEARCHABLE_TYPES } from './search.js';
import { createSackView } from './sack-view.js';
import { createResultsView } from './results-view.js';
import { atTunnel } from './run.js';

const $ = selector => document.querySelector(selector);
let world = createLairWorld(), state = null, connected = false, socket, previous = 0, dragStart = null;
let shownResult = null, shownNotice = null;
const camp = createCamp(), profile = createProfile(), loot = createLoot();
const pointer = { x: 0, y: 0, active: false, overGame: false };
const sack = createSackView($('#sack-grid'), $('#held-ghost'), { equipmentEnabled: false });
const results = createResultsView($('#run-results'));
const render = await createRenderer($('#game'), $('#map'));
const modal = () => $('#lair-panel').open || $('#map-planning').open || $('#run-results').open;
const input = createInput(window, () => modal() || !world.lair && sack.isNavigating());
const tell = text => { $('#status').textContent = text; };
const send = message => { if (socket?.readyState === WebSocket.OPEN && connected) socket.send(JSON.stringify(message)); };
const clear = () => {
  input.clear(); dragStart = null;
  send({ type: 'move', x: 0, y: 0, searchHeld: false }); $('#game').focus();
};
const stopSearch = () => send({ type: 'cancel-search' });
const self = () => state?.players.find(p => p.id === state.selfId);
const activeDungeon = () => connected && state?.dungeon && !state.result && !self()?.waiting;
const runView = () => ({ phase: 'exploring', entrance: state.dungeon.entrance });
function interaction() {
  const player = self();
  return state?.dungeon && player ? selectInteraction(world, player, loot.ground, state.dungeon.objects,
    pointer.active && pointer.overGame ? screenToWorld($('#game'), player, pointer) : null) : null;
}
const lair = createLairView($('#lair-panel'), camp, profile, () => loot, () => {}, clear, () => {}, send);
const planning = createMapPlanningView($('#map-planning'), selection => {
  send({ type: 'destination', job: selection.jobId, difficulty: selection.difficultyId }); clear(); return true;
}, () => state.cart.selection, () => loot.bag, clear);
$('#regenerate').hidden = true; $('#sack-tab').hidden = true; $('#seed').textContent = 'Shared home';
$('#rooms').textContent = 'Network dungeon test';
$('.controls').textContent = 'WASD move · Tab sack / lair stash · Hold E search · E pack loot / drop held item · Click loot to lift · R rotate · Click sack to place · E at tunnel: leave together';
$('.note').textContent = 'Two tabs share one dungeon and its loot. One goblin searches each container at a time. Everyone returns to the secret tunnel to leave. Guards, trap use and network XP are still coming. Temporary home: restarting the server resets stock and progress. Solo saves are separate.';
$('#xp-label').textContent = 'Test goblin · 0 XP';
$('#next-run').addEventListener('click', () => { send({ type: 'dismiss-result' }); results.close(); clear(); });
$('#sack-tab').addEventListener('click', () => { if (activeDungeon()) { clear(); stopSearch(); sack.toggle(); } });
function connect() {
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/session`);
  socket.addEventListener('open', () => {
    let token; try { token = sessionStorage.getItem('green-team-test-token'); } catch {}
    socket.send(JSON.stringify({ type: 'hello', token }));
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.type === 'welcome') {
      connected = true; try { sessionStorage.setItem('green-team-test-token', message.token); } catch {}
      tell('Connected. WASD to walk; Tab opens your inventory.'); return;
    }
    if (message.type === 'rejected') {
      tell('That action could not finish. Check sack space, distance, or whether another goblin got there first.'); return;
    }
    if (message.type !== 'state') return;
    const oldRun = state?.dungeon?.id;
    const changed = oldRun !== message.dungeon?.id || state?.location !== message.location;
    state = message;
    if (changed) {
      if (message.dungeon) { world = generateDungeon(message.dungeon.seed); world.job = message.dungeon.job; }
      else world = createLairWorld();
      $('#lair-panel').close(); $('#map-planning').close(); input.clear(); sack.reset(); dragStart = null;
      pointer.active = false; previous = 0;
      tell(message.dungeon ? 'Same dungeon, shared loot. Hold E to search; gather at the tunnel to leave together.' : 'Back at the lair. Recovered loot is in the shared stash.');
    }
    Object.assign(camp, message.camp); Object.assign(profile, message.profile);
    loot.bag = message.bag; loot.held = message.held; loot.ground = message.dungeon?.ground ?? [];
    $('#xp-label').textContent = `${message.name} · ${profile.xp} XP available`;
    $('#save-status').textContent = 'TEMPORARY SERVER HOME · SOLO SAVE UNCHANGED';
    $('#seed').textContent = message.dungeon ? String(message.dungeon.seed) : 'Shared home';
    $('#rooms').textContent = message.dungeon ? `${world.rooms.length} rooms · ${world.shortcuts.length} extra routes` : 'Shared lair';
    $('#sack-tab').hidden = !message.dungeon;
    if ($('#lair-panel').open) lair.refresh();
    if (message.notice && message.notice.id !== shownNotice) { shownNotice = message.notice.id; tell(message.notice.text); }
    if (!message.result && $('#run-results').open) results.close();
    if (message.result && (message.result.runId !== shownResult || !$('#run-results').open)) {
      shownResult = message.result.runId; input.clear(); results.open(message.result);
    }
  });
  socket.addEventListener('close', event => {
    connected = false; input.clear(); dragStart = null; $('#lair-panel').close(); $('#map-planning').close();
    tell('Disconnected. Controls paused; reconnecting…');
    if (event.reason === 'Session already open') { try { sessionStorage.removeItem('green-team-test-token'); } catch {} }
    setTimeout(connect, 1000);
  });
  socket.addEventListener('error', () => {});
}
window.addEventListener('keydown', event => {
  if (!connected || !state || modal() || event.target.closest?.('input,textarea,select,button')) return;
  const player = self(); if (!player || player.waiting) return;
  if (world.lair) {
    if (event.code === 'Tab') { event.preventDefault(); if (!state.cart.aboard.includes(player.id)) { clear(); lair.open('stash'); } return; }
    if (event.code !== 'KeyE' || event.repeat) return;
    event.preventDefault(); const station = lairTarget(world, player);
    if (state.cart.aboard.includes(player.id) || station?.kind === 'tunnel') send({ type: 'board' });
    else if (station?.kind === 'planning') { clear(); planning.open(); }
    else if (station) { clear(); lair.open(station.kind); }
    return;
  }
  if (!activeDungeon()) return;
  const dx = Number(['KeyD', 'ArrowRight'].includes(event.code)) - Number(['KeyA', 'ArrowLeft'].includes(event.code));
  const dy = Number(['KeyS', 'ArrowDown'].includes(event.code)) - Number(['KeyW', 'ArrowUp'].includes(event.code));
  if ((dx || dy) && sack.isNavigating()) { event.preventDefault(); sack.navigate(dx, dy); return; }
  if (event.code === 'Tab') { event.preventDefault(); if (!event.repeat) { clear(); stopSearch(); sack.toggle(); } return; }
  if (event.code === 'KeyR' && loot.held && !event.repeat) { event.preventDefault(); send({ type: 'rotate' }); return; }
  if (event.code !== 'KeyE' || event.repeat) return;
  event.preventDefault();
  if (loot.held) { send({ type: 'drop' }); return; }
  if (atTunnel(runView(), world, player)) {
    const others = state.players.filter(p => !p.ghost && !p.waiting);
    if (others.some(p => !atTunnel(runView(), world, p))) { tell('Everyone needs to be together at the secret tunnel to leave.'); return; }
    send({ type: 'extract' }); return;
  }
  const target = interaction();
  if (target?.kind === 'search') {
    if (target.item.searcherId && target.item.searcherId !== player.id) { tell(`${target.item.searcherName} is searching that already.`); return; }
    send({ type: 'search', id: target.item.id });
    tell(`Searching ${SEARCHABLE_TYPES[target.item.type].name}. Hold E and stay still.`);
  } else if (target?.kind === 'loot') { sack.reveal(); send({ type: 'pickup', id: target.item.id }); }
});
window.addEventListener('keyup', event => { if (event.code === 'KeyE' && activeDungeon()) stopSearch(); });
window.addEventListener('blur', () => { clear(); if (activeDungeon()) stopSearch(); pointer.active = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clear(); if (activeDungeon()) stopSearch(); } });
const trackPointer = event => {
  Object.assign(pointer, { x: event.clientX, y: event.clientY, active: true, overGame: event.target === $('#game') });
  if (event.target === $('#sack-grid')) sack.selectAt(pointer);
};
function placeAtPointer() {
  const cell = sack.cellAt(pointer); if (cell) send({ type: 'place', x: cell.x, y: cell.y });
}
document.addEventListener('pointermove', trackPointer);
document.addEventListener('pointerleave', () => { pointer.active = false; pointer.overGame = false; });
document.addEventListener('pointerdown', event => {
  if (!activeDungeon() || modal() || event.button !== 0 || ![$('#game'), $('#sack-grid')].includes(event.target)) return;
  event.preventDefault(); trackPointer(event); $('#game').focus(); stopSearch();
  if (event.target === $('#sack-grid')) {
    if (loot.held) placeAtPointer();
    else {
      const cell = sack.cellAt(pointer), item = cell && bagItemAt(loot.bag, cell.x, cell.y);
      if (item) { send({ type: 'lift', source: 'bag', id: item.id }); dragStart = { x: pointer.x, y: pointer.y, id: item.id }; }
    }
  } else if (loot.held) send({ type: 'drop' });
  else {
    const at = screenToWorld($('#game'), self(), pointer), item = selectTarget(world, self(), loot.ground, at);
    if (item && Math.hypot(item.x - at.x, item.y - at.y) <= .8) {
      sack.reveal(); send({ type: 'lift', source: 'ground', id: item.id }); dragStart = { x: pointer.x, y: pointer.y, id: item.id };
    }
  }
});
document.addEventListener('pointerup', event => {
  const start = dragStart; dragStart = null;
  if (!activeDungeon() || !start || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) return;
  trackPointer(event);
  // TCP order lets a fast drag place the preceding lift before its snapshot arrives.
  if (event.target === $('#sack-grid')) placeAtPointer();
  else if (event.target === $('#game')) send({ type: 'drop' });
});
setInterval(() => {
  if (!connected || !state || state.result || self()?.waiting) return;
  const paused = document.hidden || modal() || !world.lair && sack.isNavigating();
  send({ type: 'move', ...(paused ? { x: 0, y: 0 } : input.read()), searchHeld: !paused && input.held('KeyE') });
}, 100);
function frame(time) {
  const dt = previous ? Math.min(.05, (time - previous) / 1000) : 0; previous = time;
  const player = self();
  if (player) {
    const dungeon = state.dungeon, selection = dungeon?.job ?? state.cart.selection;
    $('#destination-label').hidden = !!dungeon;
    $('#destination-label').textContent = `${selection.jobName} · ${selection.difficultyName}`;
    $('#job-label').textContent = `${selection.jobName} · ${selection.difficultyName}`;
    const aboard = state.cart.aboard.includes(player.id), station = world.lair ? lairTarget(world, player) : null;
    const target = dungeon ? interaction() : null;
    const searching = dungeon?.objects.find(o => o.searcherId === player.id);
    $('#target-label').textContent = !connected ? 'Connection lost' : player.waiting ? 'Waiting in the lair for the next run' : dungeon
      ? loot.held ? `Holding ${LOOT_TYPES[loot.held.type].name} · R rotate · E drop` : searching ? 'Searching · hold E' : atTunnel(runView(), world, player) ? 'E · leave together' : target?.kind === 'loot' ? `E · pack ${LOOT_TYPES[target.item.type].name}` : target?.kind === 'search' ? target.item.searcherId ? `${target.item.searcherName} is searching` : `Hold E · ${SEARCHABLE_TYPES[target.item.type].name}` : 'Explore · Tab opens sack'
      : aboard ? `${state.cart.aboard.length}/${state.cart.participants.length} aboard · ${state.cart.countdown === null ? 'waiting for team' : `${Math.ceil(state.cart.countdown)}s`} · E hop out` : station ? `E · ${station.name}` : 'Tab · shared stash';
    sack.updateVisibility({ moving: player.moving && !sack.isNavigating(), targetId: target?.kind === 'loot' ? target.item.id : null, held: loot.held, pointer, active: !!dungeon && connected && !modal() }, dt);
    sack.paint(loot, pointer);
    render(world, player, loot, target?.kind === 'loot' ? target.item : null,
      dungeon ? runView() : { entrance: { x: 9, y: 2.5 } }, !!dungeon && atTunnel(runView(), world, player), [], dungeon?.objects ?? [],
      searching ?? (target?.kind === 'search' ? target.item : null), searching ? { active: searching, elapsed: searching.elapsed, duration: searching.duration } : { active: null },
      [], null, [], [], null, null, state.players.filter(p => p.id !== player.id));
  }
  requestAnimationFrame(frame);
}
connect(); requestAnimationFrame(frame);
