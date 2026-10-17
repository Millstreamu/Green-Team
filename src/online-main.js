import { createHomeView } from './home-view.js';
import { createOnlineIdentity } from './online-identity.js';
import { createCamp, createLairWorld, lairTarget } from './lair.js';
import { createProfile } from './profile.js';
import { createLairView } from './lair-view.js';
import { createMapPlanningView } from './loadout-view.js';
import { createInput } from './input.js';
import { createRenderer, screenToWorld } from './render.js';
import { createLoot, selectTarget, LOOT_TYPES, bagItemAt } from './loot.js';
import { generateDungeon, setSolidObjects } from './world.js';
import { selectInteraction, SEARCHABLE_TYPES } from './search.js';
import { createSackView } from './sack-view.js';
import { createResultsView } from './results-view.js';
import { selectRescue } from './rescue.js';
import { pressureLabel } from './pressure-view.js';
import { atTunnel } from './run.js';

const $ = selector => document.querySelector(selector);
$('#game-shell').hidden = true; $('#home-screen').hidden = false;
let identityStorage, identityTabStorage;
try { identityStorage = window.localStorage; } catch {}
try { identityTabStorage = sessionStorage; } catch {}
const identity = createOnlineIdentity(identityStorage, identityTabStorage);
let identityToken, identityChoices = '';
function showIdentities(name) {
  if (identityToken) identity.remember(identityToken, name);
  const entries = identity.list(), signature = JSON.stringify(entries);
  if (signature !== identityChoices) {
    identityChoices = signature;
    for (const selector of ['#goblin-choice', '#home-goblin-choice']) {
      const choices = entries.map(p => {
        const option = document.createElement('option'); option.value = p.token; option.textContent = p.name; return option;
      });
      const add = document.createElement('option'); add.value = ''; add.textContent = 'New goblin';
      $(selector).replaceChildren(...choices, add);
    }
  }
  $('#goblin-choice').value = identityToken ?? '';
  $('#home-goblin-choice').value = identityToken ?? '';
}
let world = createLairWorld(), state = null, connected = false, socket, previous = 0, dragStart = null, aimDirty = false;
let shownResult = null, shownNotice = null;
const camp = createCamp(), profile = createProfile(), loot = createLoot();
const pointer = { x: 0, y: 0, active: false, overGame: false };
const sack = createSackView($('#sack-grid'), $('#held-ghost'));
const results = createResultsView($('#run-results'));
const render = await createRenderer($('#game'), $('#map'));
const modal = () => state?.screen === 'home' || $('#lair-panel').open || $('#map-planning').open || $('#run-results').open;
const input = createInput(window, () => modal() || !world.lair && sack.isNavigating());
const tell = text => { $('#status').textContent = text; if (!state || state.screen === 'home') $('#home-message').textContent = text; };
const send = message => { if (socket?.readyState === WebSocket.OPEN && connected) socket.send(JSON.stringify(message)); };
const home = createHomeView(send);
const clear = () => {
  input.clear(); dragStart = null;
  if (state && state.screen !== 'home') { send({ type: 'move', x: 0, y: 0, searchHeld: false }); $('#game').focus(); }
};
const stopSearch = () => send({ type: 'cancel-search' });
const self = () => state?.players.find(p => p.id === state.selfId);
const activeDungeon = () => connected && state?.dungeon && !state.result && !self()?.waiting && self()?.state === 'active';
const runView = () => ({ phase: 'exploring', entrance: state.dungeon.entrance, cages: state.dungeon.cages, rescues: state.dungeon.rescues });
function interaction() {
  const player = self(); if (!state?.dungeon || !player) return null;
  const at = pointer.active && pointer.overGame ? screenToWorld($('#game'), player, pointer) : null;
  const normal = selectInteraction(world, player, loot.ground, state.dungeon.objects, at, state.dungeon.hidingSpots ?? []);
  const rescue = selectRescue(world, player, state.players, state.dungeon.cages ?? [], at);
  if (!rescue) return normal;
  if (at) {
    const rd = Math.hypot(rescue.item.x - at.x, rescue.item.y - at.y);
    const nd = normal ? Math.hypot(normal.item.x - at.x, normal.item.y - at.y) : Infinity;
    if (nd <= .8 && nd < rd) return normal;
    if (rd <= .8) return rescue;
  }
  return rescue.kind === 'rescue' || loot.bag.some(i => i.type === 'lunch') ? rescue : normal ?? rescue;
}
const lair = createLairView($('#lair-panel'), camp, profile, () => loot, () => {}, clear, () => {}, send, { debugSupplies: true });
const planning = createMapPlanningView($('#map-planning'), selection => {
  send({ type: 'destination', job: selection.jobId, difficulty: selection.difficultyId }); clear(); return true;
}, () => state.cart.selection, () => loot.bag, clear);
$('#regenerate').hidden = true; $('#sack-tab').hidden = true; $('#seed').textContent = 'Shared home';
$('#rooms').textContent = 'Network dungeon test';
$('.controls').textContent = 'WASD move · Tab sack / lair stash · Hold E search · E pack loot / drop held item · Click loot to lift · R rotate · Click sack to place · Hold E revive / cage rescue · E at tunnel: leave together · Hold E hide / E exit · E equip selected gear · WASD aim · Hold E place · Space smoke';
$('.note').textContent = 'Two tabs share one dungeon and its loot. One goblin searches each container at a time. Everyone returns to the secret tunnel to leave. Guards can chase either goblin. Hide, snare or smoke to escape. Packed Lunch revives a downed teammate. Cage rescue needs no lunch. Escaping earns each departed goblin XP from the team’s recovered valuables. Spend it on recipes at the workbench or passives at the campfire. Use Debug supplies in the lair to test gear. The shared lair and home sacks save on the server. Restarting during a run loses that run’s carried supplies and loot. Choose a saved goblin above when returning. Solo saves are separate.';
$('#xp-label').textContent = 'Test goblin · 0 XP';
$('#next-run').addEventListener('click', () => { send({ type: 'dismiss-result' }); results.close(); clear(); });
$('#sack-tab').addEventListener('click', () => { if (activeDungeon() && !self().hiding) { clear(); stopSearch(); send({ type: 'cancel-placement' }); sack.toggle(); } });
$('#online-identity').hidden = false;
function chooseIdentity(event) {
  if (!connected || state?.screen !== 'home' && (state?.location !== 'home' || state?.launched)) return;
  clear(); $('#lair-panel').close(); $('#map-planning').close();
  identity.select(event.target.value); connected = false;
  const old = socket; socket = null; old.close(); state = null; identityToken = null;
  tell('Connecting to the selected goblin…'); connect();
}
$('#goblin-choice').addEventListener('change', chooseIdentity);
$('#home-goblin-choice').addEventListener('change', chooseIdentity);
$('#leave-lair').addEventListener('click', () => { clear(); send({ type: 'leave-lair' }); });
function connect() {
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/session`);
  const connection = socket;
  socket.addEventListener('open', () => {
    if (connection !== socket) return;
    socket.send(JSON.stringify({ type: 'hello', token: identity.token() }));
  });
  socket.addEventListener('message', event => {
    if (connection !== socket) return;
    const message = JSON.parse(event.data);
    if (message.type === 'welcome') {
      connected = true; identityToken = message.token; identity.remember(message.token, 'Goblin');
      tell('Connected. WASD to walk; Tab opens your inventory.'); return;
    }
    if (message.type === 'save-error') { connected = false; if (state?.screen === 'home') home.show(state, false); $('#save-status').textContent = 'SAVE FAILED · GAME PAUSED'; tell('Saving failed. Game paused. Check the server Terminal before restarting.'); return; }
    if (message.type === 'rejected') {
      tell(message.message || 'That action could not finish. Check sack space, distance, or whether another goblin got there first.'); return;
    }
    if (message.type !== 'state') return;
    if (message.screen === 'home') {
      const entering = state?.screen !== 'home';
      state = message; home.show(message, connected); showIdentities(message.name);
      $('#lair-panel').close(); $('#map-planning').close(); results.close(); input.clear(); sack.reset();
      if (entering) home.message('Join a friend’s lair with its name and code, or create your own.');
      return;
    }
    home.hide();
    $('#lair-bar').hidden = !message.lair;
    $('#current-lair-name').textContent = message.lair?.name ?? '';
    $('#current-lair-code').textContent = message.lair?.code ?? '';
    $('#leave-lair').disabled = message.location === 'dungeon';
    const equipped = message.placement?.itemId && message.placement.itemId !== state?.placement?.itemId || message.quickType && message.quickType !== state?.quickType;
    const oldRun = state?.dungeon?.id;
    const changed = oldRun !== message.dungeon?.id || state?.location !== message.location;
    state = message;
    if (equipped) { sack.reset(); aimDirty = pointer.active && pointer.overGame; }
    if (changed) {
      if (message.dungeon) { world = generateDungeon(message.dungeon.seed, message.dungeon.layout); world.job = message.dungeon.job; world.tuning = message.dungeon.tuning; setSolidObjects(world, message.dungeon.objects); }
      else world = createLairWorld();
      $('#lair-panel').close(); $('#map-planning').close(); input.clear(); sack.reset(); dragStart = null;
      pointer.active = false; previous = 0;
      tell(message.dungeon ? 'Same dungeon, shared loot. Hold E to search; gather at the tunnel to leave together.' : 'Back at the lair. Recovered loot is in the shared stash.');
    }
    Object.assign(camp, message.camp); Object.assign(profile, message.profile);
    loot.bag = message.bag; loot.held = message.held; loot.ground = message.dungeon?.ground ?? [];
    $('#xp-label').textContent = `${message.name} · ${profile.xp} XP available`;
    showIdentities(message.name);
    $('#goblin-choice').disabled = message.location !== 'home' || !!message.launched;
    $('#save-status').textContent = message.saving === 'saved'
      ? `LAIR SAVED ON SERVER${identity.remembered() ? '' : ' · BROWSER CANNOT REMEMBER YOUR GOBLIN'}`
      : 'TEMPORARY TEST HOME · NOT SAVED';
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
    if (connection !== socket) return;
    connected = false; input.clear(); dragStart = null; $('#lair-panel').close(); $('#map-planning').close();
    if (state?.screen === 'home') home.show(state, false);
    if (event.reason === 'Save failed') { $('#save-status').textContent = 'SAVE FAILED · GAME PAUSED'; tell('Saving failed. Game paused. Check the server Terminal before restarting.'); return; }
    tell('Disconnected. Controls paused; reconnecting…');
    if (event.reason === 'Session already open') identity.select(null);
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
  if (player.hiding) {
    if (['KeyE', 'Tab', 'Space', 'KeyR'].includes(event.code)) event.preventDefault();
    if (event.code === 'KeyE' && !event.repeat) { clear(); send({ type: 'hide' }); } return;
  }
  if (event.code === 'Escape' && state.placement?.itemId) { event.preventDefault(); clear(); send({ type: 'cancel-placement' }); return; }
  if (event.code === 'Space') { event.preventDefault(); if (!event.repeat && !sack.isNavigating()) send({ type: 'smoke' }); return; }
  const dx = Number(['KeyD', 'ArrowRight'].includes(event.code)) - Number(['KeyA', 'ArrowLeft'].includes(event.code));
  const dy = Number(['KeyS', 'ArrowDown'].includes(event.code)) - Number(['KeyW', 'ArrowUp'].includes(event.code));
  if ((dx || dy) && sack.isNavigating()) { event.preventDefault(); sack.navigate(dx, dy); return; }
  if (event.code === 'Tab') { event.preventDefault(); if (!event.repeat) { clear(); stopSearch(); send({ type: 'cancel-placement' }); sack.toggle(); } return; }
  if (event.code === 'KeyR' && loot.held && !event.repeat) { event.preventDefault(); send({ type: 'rotate' }); return; }
  if (event.code !== 'KeyE' || event.repeat) return;
  event.preventDefault();
  if (state.placement?.itemId) return; // Held E is sent in the input heartbeat.
  const chosen = sack.itemForEquip(loot, pointer);
  if (!loot.held && chosen?.type === 'lunch') { tell('Carry a Packed Lunch, close the sack, and hold E near a downed teammate.'); return; }
  if (!loot.held && chosen && LOOT_TYPES[chosen.type].equipment) {
    input.clearMovement(); dragStart = null;
    send({ type: 'move', x: 0, y: 0, searchHeld: input.held('KeyE') });
    send({ type: 'equip', id: chosen.id }); sack.reset();
    tell(chosen.type === 'smoke' ? 'Smoke equipped. Space uses one.' : 'WASD aims. Release E, then hold E for a second to place. Esc cancels.'); return;
  }
  if (loot.held) { send({ type: 'drop' }); return; }
  const target = interaction();
  if (target && ['revive', 'rescue'].includes(target.kind)) {
    if (target.kind === 'revive' && !loot.bag.some(i => i.type === 'lunch')) { tell('You need a Packed Lunch. Test lunches are in lair Debug supplies.'); return; }
    input.clearMovement(); send({ type: 'move', x: 0, y: 0, searchHeld: input.held('KeyE') });
    send({ type: 'rescue', id: target.item.id }); return;
  }
  if (atTunnel(runView(), world, player)) {
    const others = state.players.filter(p => !p.ghost && !p.waiting && p.state === 'active');
    if (others.some(p => !atTunnel(runView(), world, p))) { tell('Everyone needs to be together at the secret tunnel to leave.'); return; }
    send({ type: 'extract' }); return;
  }
  if (target?.kind === 'hide') { send({ type: 'hide', id: target.item.id }); return; }
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
  if (state?.placement?.itemId && pointer.overGame) aimDirty = true;
};
function placeAtPointer() {
  const cell = sack.cellAt(pointer); if (cell) send({ type: 'place', x: cell.x, y: cell.y });
}
document.addEventListener('pointermove', trackPointer);
document.addEventListener('pointerleave', () => { pointer.active = false; pointer.overGame = false; });
document.addEventListener('pointerdown', event => {
  if (!activeDungeon() || self().hiding || state.placement?.itemId || modal() || event.button !== 0 || ![$('#game'), $('#sack-grid')].includes(event.target)) return;
  event.preventDefault(); trackPointer(event); $('#game').focus(); stopSearch();
  if (event.target === $('#sack-grid')) {
    if (loot.held) placeAtPointer();
    else {
      const cell = sack.cellAt(pointer), item = cell && bagItemAt(loot.bag, cell.x, cell.y);
      if (item) {
        const deferred = !!LOOT_TYPES[item.type].equipment && !LOOT_TYPES[item.type].rescue;
        if (!deferred) send({ type: 'lift', source: 'bag', id: item.id });
        else tell(`${LOOT_TYPES[item.type].name} selected. E equips; drag to move it.`);
        dragStart = { x: pointer.x, y: pointer.y, id: item.id, deferred };
      }
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
  if (start.deferred) send({ type: 'lift', source: 'bag', id: start.id });
  // TCP order lets a fast drag place the preceding lift before its snapshot arrives.
  if (event.target === $('#sack-grid')) placeAtPointer();
  else if (event.target === $('#game')) send({ type: 'drop' });
});
setInterval(() => {
  if (!connected || !state || state.screen === 'home' || state.result || self()?.waiting) return;
  const paused = document.hidden || modal() || self()?.state === 'down' || self()?.hiding || !world.lair && sack.isNavigating();
  if (!paused && aimDirty && state.placement?.itemId && pointer.active && pointer.overGame) {
    aimDirty = false;
    const aim = screenToWorld($('#game'), self(), pointer); send({ type: 'aim', x: aim.x, y: aim.y });
  }
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
    const target = dungeon && player.state === 'active' ? interaction() : null;
    $('#health-label').textContent = dungeon ? player.state !== 'active' ? `${player.state.toUpperCase()} · teammates can rescue you` : `Health ${player.health} / ${player.maxHealth}` : '';
    $('#heat-label').hidden = !dungeon;
    $('#heat-label').textContent = dungeon ? pressureLabel(dungeon.pressure) : '';
    $('#alert-label').textContent = dungeon && dungeon.guards.some(g => g.state === 'chase') ? 'TEAM SPOTTED' : '';
    $('#quick-label').hidden = !dungeon || !state.quickType;
    $('#quick-label').textContent = state.quickType === 'smoke' ? `SPACE · smoke (${loot.bag.filter(i => i.type === 'smoke').length})` : '';
    const rescuing = dungeon?.rescues?.find(a => a.actorId === player.id);
    const searching = dungeon?.objects.find(o => o.searcherId === player.id);
    $('#target-label').textContent = !connected ? 'Connection lost' : player.waiting ? 'Waiting in the lair for the next run' : dungeon
      ? player.state === 'down' ? 'Downed · teammate needs Packed Lunch' : player.state === 'carried' ? 'Captured · guard taking you to a cage' : player.state === 'caged' ? 'Caged · teammates can hold E to rescue you' : player.hiding ? 'Hidden · E to exit' : player.enteringHide ? 'Hiding · hold E' : state.placement?.itemId ? 'WASD aim · hold E to place · Esc cancel' : rescuing ? 'Rescuing · hold E and stay still' : loot.held ? `Holding ${LOOT_TYPES[loot.held.type].name} · R rotate · E drop` : searching ? 'Searching · hold E' : atTunnel(runView(), world, player) ? 'E · leave together' : target?.kind === 'loot' ? `E · pack ${LOOT_TYPES[target.item.type].name}` : target?.kind === 'search' ? target.item.searcherId ? `${target.item.searcherName} is searching` : `Hold E · ${SEARCHABLE_TYPES[target.item.type].name}` : target?.kind === 'revive' ? `Hold E · revive ${target.item.name} · Packed Lunch` : target?.kind === 'rescue' ? `Hold E · rescue ${target.item.name}` : target?.kind === 'hide' ? 'Hold E · hide' : 'Explore · Tab opens sack'
      : aboard ? `${state.cart.aboard.length}/${state.cart.participants.length} aboard · ${state.cart.countdown === null ? 'waiting for team' : `${Math.ceil(state.cart.countdown)}s`} · E hop out` : station ? `E · ${station.name}` : 'Tab · shared stash';
    sack.updateVisibility({ moving: player.moving && !sack.isNavigating(), targetId: target?.kind === 'loot' ? target.item.id : null, held: loot.held, pointer, active: !!dungeon && connected && player.state === 'active' && !player.hiding && !state.placement?.itemId && !modal() }, dt);
    sack.paint(loot, pointer);
    render(world, player, loot, target?.kind === 'loot' ? target.item : null,
      dungeon ? runView() : { entrance: { x: 9, y: 2.5 } }, !!dungeon && atTunnel(runView(), world, player), dungeon?.guards ?? [], dungeon?.objects ?? [],
      searching ?? (target?.kind === 'search' ? target.item : null), searching ? { active: searching, elapsed: searching.elapsed, duration: searching.duration } : { active: null },
      dungeon?.traps ?? [], state.placement, dungeon?.clouds ?? [], dungeon?.hidingSpots ?? [], target?.kind === 'hide' ? target.item : null, dungeon?.pressure ?? null, state.players.filter(p => p.id !== player.id), target && ['revive', 'rescue'].includes(target.kind) ? target : null);
  }
  requestAnimationFrame(frame);
}
connect(); requestAnimationFrame(frame);
