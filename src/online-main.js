import { createCamp, createLairWorld, lairTarget } from './lair.js';
import { createProfile } from './profile.js';
import { createLairView } from './lair-view.js';
import { createMapPlanningView } from './loadout-view.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { createLoot } from './loot.js';

const $ = selector => document.querySelector(selector);
const world = createLairWorld(), camp = createCamp(), profile = createProfile(), loot = createLoot();
const render = await createRenderer($('#game'), $('#map'));
const input = createInput(window, () => $('#lair-panel').open || $('#map-planning').open);
let state = null, connected = false;
const tell = text => { $('#status').textContent = text; };
const send = message => { if (socket?.readyState === WebSocket.OPEN && connected) socket.send(JSON.stringify(message)); };
const clear = () => { input.clear(); send({ type: 'move', x: 0, y: 0 }); $('#game').focus(); };
const lair = createLairView($('#lair-panel'), camp, profile, () => loot, () => {}, clear, () => {}, send);
const planning = createMapPlanningView($('#map-planning'), selection => {
  send({ type: 'destination', job: selection.jobId, difficulty: selection.difficultyId }); clear(); return true;
}, () => state.cart.selection, () => loot.bag, clear);
$('#regenerate').hidden = true;
$('#regenerate').textContent = 'Return team to lair';
$('#regenerate').addEventListener('click', () => send({ type: 'reset-test' })); $('#sack-tab').hidden = true; $('#seed').textContent = 'Shared home';
$('#rooms').textContent = 'Network lair test';
$('.controls').textContent = 'WASD move · Tab stash · E use nearby station / board / hop out · Q switches inventory grids · R moves a stash stack';
$('.note').textContent = 'Open this address in another tab. Each tab is a separate test goblin. Craft at the workbench; plan at the map table. Everyone boards to leave. This test ends at shared departure. Temporary home: restarting the server resets it. Your solo save is separate.';
$('#xp-label').textContent = 'Test goblin · 0 XP';
let socket;
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
      tell('Connected. WASD to walk; Tab opens shared stash.'); return;
    }
    if (message.type === 'rejected') { tell(message.message); return; }
    if (message.type !== 'state') return;
    state = message;
    $('#regenerate').hidden = !message.launched;
    Object.assign(camp, message.camp); Object.assign(profile, message.profile); loot.bag = message.bag;
    $('#xp-label').textContent = `${message.name} · ${profile.xp} XP available`;
    $('#save-status').textContent = 'TEMPORARY SERVER HOME · SOLO SAVE UNCHANGED';
    if ($('#lair-panel').open) lair.refresh();
    if (message.launched) {
      $('#lair-panel').close(); $('#map-planning').close(); input.clear();
      tell(`Team departure confirmed! ${message.launched.job.jobName} · ${message.launched.job.difficultyName} · shared seed ${message.launched.seed}. Shared dungeon is the next step.`);
    }
  });
  socket.addEventListener('close', event => {
    connected = false; input.clear(); $('#lair-panel').close(); $('#map-planning').close();
    tell('Disconnected. Controls paused; reconnecting to the test home…');
    // Duplicate-tab sessionStorage copies must get a separate test identity.
    if (event.reason === 'Session already open') { try { sessionStorage.removeItem('green-team-test-token'); } catch {} }
    setTimeout(connect, 1000);
  });
  socket.addEventListener('error', () => {});
}
window.addEventListener('keydown', event => {
  if (!connected || !state || state.launched || $('#lair-panel').open || $('#map-planning').open) return;
  if (event.code === 'Tab') { event.preventDefault(); if (!state.cart.aboard.includes(state.selfId)) { clear(); lair.open('stash'); } return; }
  if (event.code !== 'KeyE' || event.repeat) return;
  event.preventDefault();
  const player = state.players.find(p => p.id === state.selfId);
  if (!player || player.waiting) return;
  const station = lairTarget(world, player);
  if (state.cart.aboard.includes(player.id) || station?.kind === 'tunnel') send({ type: 'board' });
  else if (station?.kind === 'planning') { clear(); planning.open(); }
  else if (station) { clear(); lair.open(station.kind); }
});
window.addEventListener('blur', clear);
// Input is a request; the server moves and collides goblins at its own tick rate.
setInterval(() => {
  if (!connected || !state || state.launched) return;
  const paused = document.hidden || $('#lair-panel').open || $('#map-planning').open;
  send({ type: 'move', ...(paused ? { x: 0, y: 0 } : input.read()) });
}, 100);
function frame() {
  if (state) {
    const player = state.players.find(p => p.id === state.selfId);
    if (player) {
      const selection = state.cart.selection;
      $('#destination-label').hidden = false;
      $('#destination-label').textContent = `${selection.jobName} · ${selection.difficultyName}`;
      $('#job-label').textContent = `${selection.jobName} · ${selection.difficultyName}`;
      const aboard = state.cart.aboard.includes(player.id), station = lairTarget(world, player);
      $('#target-label').textContent = !connected ? 'Connection lost' : state.launched ? 'Shared departure test complete' : player.waiting ? 'Waiting for the next run' : aboard ? `${state.cart.aboard.length}/${state.cart.participants.length} aboard · ${state.cart.countdown === null ? 'waiting for team' : `${Math.ceil(state.cart.countdown)}s`} · E hop out` : station ? `E · ${station.name}` : 'Tab · shared stash';
      render(world, player, loot, null, { entrance: { x: 9, y: 2.5 } }, false, [], [], null, { active: null }, [], null, [], [], null, null, state.players.filter(p => p.id !== player.id));
    }
  }
  requestAnimationFrame(frame);
}
connect(); requestAnimationFrame(frame);
