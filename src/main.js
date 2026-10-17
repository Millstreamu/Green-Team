import { createHidingSpots, enterHiding, leaveHiding } from './hiding.js';
import { seesPlayer } from './guard.js';
import { selectJob } from './jobs.js';
import { useSmoke, updateSmoke } from './smoke.js';
import { loadCamp, saveCamp, createLairWorld, lairTarget, takeSupplies, bankEscape } from './lair.js';
import { createLairView } from './lair-view.js';
import { createLoadoutView } from './loadout-view.js';
import { createPlacement, cancelPlacement, interruptPlacement, equipSnare, placementPoint, updatePlacement, updateTraps, moveTrapAim } from './traps.js';
import { generateDungeon, movePlayer } from './world.js';
import { createInput } from './input.js';
import { createRenderer, screenToWorld } from './render.js';
import { createLoot, selectTarget, autoPickup, liftItem, placeHeld, dropHeld, bagItemAt, LOOT_TYPES, itemSaleValue } from './loot.js';
import { createSackView } from './sack-view.js';
import { createRun, atTunnel, finishRun, loseRun } from './run.js';
import { createResultsView } from './results-view.js';
import { createGuards, updateGuard, createVitality, tickVitality } from './guard.js';
import { createSearchables, createSearchSession, selectInteraction, beginSearch, cancelSearch, updateSearch, SEARCHABLE_TYPES } from './search.js';

const canvas = document.querySelector('#game');
const sackCanvas = document.querySelector('#sack-grid');
const input = createInput(window, () => sack.isNavigating());
const sack = createSackView(sackCanvas, document.querySelector('#held-ghost'));
const results = createResultsView(document.querySelector('#run-results'));
let campStorage;
try { campStorage = window.localStorage; } catch {}
const camp = loadCamp(campStorage);
const persistCamp = () => { document.querySelector('#save-status').textContent = saveCamp(camp, campStorage) ? 'LAIR SAVED IN THIS BROWSER' : 'LAIR KEPT WHILE THIS GAME IS OPEN'; }; 
let render;
try {
  render = await createRenderer(canvas, document.querySelector('#map'));
} catch (error) {
  document.querySelector('#status').textContent = 'Goblin art could not load. Download the game again, or keep assets/goblin.png alongside the source files.';
  throw error;
}
let world, player, loot, run, guards, previous = 0, target = null, dragStart = null;
let hidingSpots = [], hideTarget = null;
let objects = [], searchSession = createSearchSession(), searchTarget = null;
let traps = [], placement = createPlacement(), clouds = [], quickType = null;
let messageUntil = 0;
const pointer = { x: 0, y: 0, active: false, overGame: false };
const tell = text => { document.querySelector('#status').textContent = text; messageUntil = performance.now() + 3500; };
const updateTarget = () => {
  if (world.lair || placement.itemId || player.hiding) { target = null; searchTarget = null; hideTarget = null; return; }
  const interaction = searchSession.active ? { kind: 'search', item: searchSession.active } : selectInteraction(world, player, loot.ground, objects, pointer.active && pointer.overGame ? screenToWorld(canvas, player, pointer) : null, hidingSpots);
  hideTarget = interaction?.kind === 'hide' ? interaction.item : null;
  target = interaction?.kind === 'loot' ? interaction.item : null;
  searchTarget = interaction?.kind === 'search' ? interaction.item : null;
};
const enterLair = () => {
  results.close();
  world = createLairWorld();
  player = { ...world.spawn, id: 'goblin', ...createVitality(), facing: 1, phase: 0, moving: false };
  guards = []; objects = []; hidingSpots = []; hideTarget = null; loot = createLoot(); traps = []; placement = createPlacement(); clouds = []; quickType = null; searchSession = createSearchSession();
  run = createRun(world, performance.now()); run.phase = 'lair'; run.entrance = { ...world.stations.find(station => station.kind === 'tunnel') };
  input.clear(); sack.reset(); dragStart = null; previous = 0;
  pointer.active = false; pointer.overGame = false;
  document.querySelector('#seed').textContent = 'Home'; document.querySelector('#rooms').textContent = 'Your little lair'; document.querySelector('#job-label').textContent = 'At home';
  document.querySelector('#regenerate').hidden = true; document.querySelector('#sack-tab').hidden = true;
  persistCamp(); canvas.focus(); updateTarget();
  tell('Welcome home. WASD to walk. E at the stash, workbench or dungeon tunnel.');
};
const reset = () => {
  if (run?.phase === 'exploring' && !window.confirm('Abandon this run? Carried loot and traps will be lost. Your lair stash is safe.')) return;
  enterLair();
};
const closeLairPanel = () => { run.phase = 'lair'; input.clear(); canvas.focus(); };
const lairView = createLairView(document.querySelector('#lair-panel'), camp, persistCamp, closeLairPanel);
const loadout = createLoadoutView(document.querySelector('#run-setup'), (quantities, debug, selection) => {
  if (run.phase !== 'setup') return false;
  const job = selection && selectJob(selection.jobId, selection.difficultyId);
  if (!job) return false;
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const selected = takeSupplies(camp, quantities, seed, debug);
  if (!selected) return false;
  world = generateDungeon(seed); world.job = job; player = { ...world.spawn, id: 'goblin', ...createVitality(), facing: 1, phase: 0, moving: false };
  loot = createLoot(); loot.bag = selected.bag;
  guards = createGuards(world); objects = createSearchables(world); hidingSpots = createHidingSpots(world, objects); hideTarget = null; traps = []; placement = createPlacement(); clouds = []; quickType = null; searchSession = createSearchSession();
  run = createRun(world, performance.now());
  input.clear(); sack.reset(); previous = 0; pointer.active = false; pointer.overGame = false; canvas.focus(); persistCamp();
  document.querySelector('#seed').textContent = String(world.seed);
  document.querySelector('#job-label').textContent = `${job.jobName} · ${job.difficultyName}`;
  document.querySelector('#rooms').textContent = `${world.rooms.length} rooms · ${world.shortcuts.length} extra routes`;
  document.querySelector('#regenerate').hidden = false; document.querySelector('#sack-tab').hidden = false;
  tell(`${job.jobName} · ${job.difficultyName}. Search furniture, avoid guards, then escape through the tunnel.`);
  return true;
}, () => camp.counts, closeLairPanel);
const interactLair = () => {
  const station = lairTarget(world, player);
  if (!station) { tell('Walk close to the stash, workbench or dungeon tunnel, then press E.'); return; }
  input.clear(); player.moving = false;
  if (station.kind === 'tunnel') { run.phase = 'setup'; loadout.open(); }
  else { run.phase = 'lair-panel'; lairView.open(station.kind); }
};
const showRunResult = (result, message) => {
  if (!result) return;
  if (bankEscape(camp, result, loot)) persistCamp();
  cancelSearch(searchSession); leaveHiding(player);
  input.clear(); dragStart = null; player.moving = false; player.phase = 0;
  cancelPlacement(placement); results.open(result); tell(message);
};
const drop = () => {
  const name = LOOT_TYPES[loot.held.type].name;
  if (dropHeld(loot, world, player)) tell(`${name} dropped nearby. It stays on the floor.`);
};
const placeAtPointer = () => {
  const cell = sack.cellAt(pointer);
  if (!cell) return;
  const name = LOOT_TYPES[loot.held.type].name;
  if (placeHeld(loot, cell.x, cell.y)) tell(`${name} packed.`);
  else tell('It will not fit there. R rotates; try another space, or E to drop it.');
};
const trackPointer = e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; pointer.overGame = e.target === canvas; if (placement.itemId && pointer.overGame) { placement.aimPoint = placementPoint(player, screenToWorld(canvas, player, pointer)); } if (e.target === sackCanvas) sack.selectAt(pointer); };
// Boundaries for clicks are checked from event targets; cursor proximity never extends pickup reach.
document.addEventListener('pointermove', trackPointer);
document.addEventListener('pointerleave', () => { pointer.active = false; pointer.overGame = false; });
document.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !world || player.hiding || run.phase !== 'exploring') return;
  trackPointer(e);
  if (e.target !== canvas && e.target !== sackCanvas) return;
  e.preventDefault(); canvas.focus();
  if (placement.itemId) return;
  cancelSearch(searchSession);
  const wasHolding = !!loot.held;
  if (e.target === sackCanvas) {
    if (loot.held) placeAtPointer();
    else {
      const cell = sack.cellAt(pointer), item = cell && bagItemAt(loot.bag, cell.x, cell.y);
      if (item && LOOT_TYPES[item.type].equipment) { sack.selectAt(pointer); tell(`${LOOT_TYPES[item.type].name} selected. Press E to equip.`); return; }
      if (item && liftItem(loot, 'bag', item.id)) tell(`${LOOT_TYPES[item.type].name} lifted. R rotates; click a sack square to place.`);
    }
  } else if (loot.held) drop();
  else {
    const at = screenToWorld(canvas, player, pointer);
    const clicked = selectTarget(world, player, loot.ground, at);
    if (clicked && Math.hypot(clicked.x - at.x, clicked.y - at.y) <= 0.8) {
      liftItem(loot, 'ground', clicked.id);
      tell(`${LOOT_TYPES[clicked.type].name} lifted. R rotates; click the sack to place.`);
    } else tell('Hold E beside a highlighted object to search. Click spilled loot to lift it.');
  }
  if (!wasHolding && loot.held) dragStart = { x: e.clientX, y: e.clientY, id: loot.held.id };
});
document.addEventListener('pointerup', e => {
  const start = dragStart; dragStart = null;
  if (run.phase !== 'exploring' || !start || start.id !== loot.held?.id || Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return;
  trackPointer(e);
  if (e.target === sackCanvas) placeAtPointer();
  else if (e.target === canvas) drop();
});
window.addEventListener('blur', () => { pointer.active = false; pointer.overGame = false; dragStart = null; cancelSearch(searchSession); interruptPlacement(placement); });
window.addEventListener('keyup', e => {
  if (e.code === 'KeyE' && searchSession.active) { cancelSearch(searchSession); tell('Search cancelled. Hold E again when it is safe.'); }
});
window.addEventListener('keydown', e => {
  if (!world || e.target.closest?.('input,textarea,select,button')) return;
  if (run.phase === 'lair') {
    if (e.code === 'Tab') { e.preventDefault(); input.clear(); player.moving = false; run.phase = 'lair-panel'; lairView.open('stash'); }
    else if (e.code === 'KeyE' && !e.repeat) { e.preventDefault(); interactLair(); }
    return;
  }
  if (run.phase !== 'exploring') return;
  if (player.hiding) {
    if (['KeyE', 'Tab', 'Space', 'KeyR'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyE' && !e.repeat) { leaveHiding(player); input.clear(); tell('Out of hiding. Watch the guards before moving.'); }
    return;
  }
  const dx = Number(e.code === 'KeyD' || e.code === 'ArrowRight') - Number(e.code === 'KeyA' || e.code === 'ArrowLeft');
  const dy = Number(e.code === 'KeyS' || e.code === 'ArrowDown') - Number(e.code === 'KeyW' || e.code === 'ArrowUp');
  if ((dx || dy) && sack.isNavigating()) { e.preventDefault(); sack.navigate(dx, dy); return; }
  if (e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (quickType === 'smoke' && !placement.itemId && !sack.isNavigating() && useSmoke(loot, player, clouds)) {
      cancelSearch(searchSession); tell('Smoke deployed! Break sight and move away before it clears.');
    } else tell(quickType === 'smoke' ? 'No smoke bomb ready. Close the sack and keep your hands free.' : 'Select a smoke bomb in the sack and press E to equip it, then Space to use.');
    return;
  }
  if (e.code === 'Escape' && placement.itemId) { e.preventDefault(); cancelPlacement(placement); tell('Placement cancelled. Snare is still in your sack.'); return; }
  if (e.code === 'Tab') { e.preventDefault(); input.clear(); cancelPlacement(placement); sack.toggle(); canvas.focus(); return; }
  if (e.code === 'KeyR' && loot.held) {
    e.preventDefault(); loot.held.rotation = (loot.held.rotation + 1) % 4;
    tell(`${LOOT_TYPES[loot.held.type].name} rotated. Click the sack to place.`);
  }
  if (e.code !== 'KeyE') return;
  e.preventDefault();
  if (placement.itemId) return;
  const chosen = sack.itemForEquip(loot, pointer);
  if (chosen?.type === 'smoke' && !loot.held) {
    quickType = 'smoke'; cancelPlacement(placement); cancelSearch(searchSession); input.clearMovement(); sack.reset();
    tell('Smoke bomb equipped. Space uses one; each spare takes its own sack square.'); return;
  }
  if (chosen?.type === 'snare' && equipSnare(placement, loot, chosen.id)) { quickType = null; cancelSearch(searchSession); input.clearMovement(); sack.reset(); placement.aimPoint = placementPoint(player); tell('WASD aims the preview. Release E, then hold E for one second to place. Escape cancels.'); return; }
  if (loot.held) { drop(); return; }
  if (atTunnel(run, world, player)) {
    const result = finishRun(run, world, player, loot, performance.now());
    showRunResult(result, 'You slipped back through the tunnel with your haul.');
    return;
  }
  updateTarget();
  if (hideTarget) {
    const witnesses = guards.filter(guard => seesPlayer(world, guard, player, ['chase', 'search'].includes(guard.state), clouds));
    if (enterHiding(world, player, hideTarget, witnesses)) {
      cancelSearch(searchSession); cancelPlacement(placement); input.clear(); sack.reset();
      tell(witnesses.length ? 'A guard saw you hide! It is coming to pull you out.' : 'Hidden. E to come out; guards keep searching.');
    }
    return;
  }
  if (searchTarget) {
    if (beginSearch(searchSession, world, player, loot, searchTarget)) tell(`Searching ${SEARCHABLE_TYPES[searchTarget.type].name}. Keep E held and stay still.`);
    return;
  }
  if (!target) { tell('No loot or unsearched object within reach. Move closer.'); return; }
  const name = LOOT_TYPES[target.type].name;
  sack.reveal();
  if (autoPickup(loot, target.id)) tell(`${name} packed into your sack.`);
  else tell(`Rearrange your sack to fit this: ${name}. It is still on the floor.`);
});
document.querySelector('#regenerate').addEventListener('click', reset);
document.querySelector('#next-run').addEventListener('click', reset);
document.querySelector('#sack-tab').addEventListener('click', () => {
  if (run.phase !== 'exploring' || player.hiding) return;
  input.clear(); cancelPlacement(placement); sack.toggle(); canvas.focus();
});
const frame = time => {
  const dt = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
  previous = time;
  if (run.phase === 'lair') movePlayer(world, player, input.read(), dt);
  if (run.phase === 'exploring') {
    updateSmoke(clouds, dt);
    const direction = input.read();
    const aiming = !!placement.itemId && moveTrapAim(placement, player, direction, dt);
    movePlayer(world, player, placement.itemId || sack.isNavigating() ? { x: 0, y: 0 } : direction, dt); tickVitality(player, dt, world);
    for (const event of updateTraps(traps, [player], guards, dt)) {
      if (event.type === 'goblin-triggered') tell('A goblin triggered the snare. No harm, but the trap is spent.');
      if (event.type === 'guard-triggered') tell('Guard snared! You have three seconds to get away.');
    }
    const events = { hit: false, spotted: false, exposed: false };
    for (const guard of guards) {
      const event = updateGuard(world, guard, player, dt, clouds);
      events.hit ||= event.hit; events.spotted ||= event.spotted; events.exposed ||= event.exposed;
    }
    if (events.exposed) { input.clear(); tell('The guard pulled you out! Run!'); }
    if (events.spotted) tell('Spotted! Get out of sight or make for the tunnel.');
    if (events.hit) { interruptPlacement(placement); cancelSearch(searchSession); tell(`Hit! ${player.health} health left. Knocked back! Keep moving and dodge the next swing.`); }
    if (player.state === 'down') showRunResult(loseRun(run, loot, performance.now()), 'You went down. With nobody left to recover you, this run is over.');
    else {
      for (const item of loot.ground) if (item.spillAge !== undefined) item.spillAge += dt;
      const placed = updatePlacement(placement, world, player, loot, traps, [...objects, ...hidingSpots], placement.aimPoint ?? placementPoint(player), input.held('KeyE') && !aiming, dt);
      if (placed) tell('Snare placed. Step fully clear to arm it. Goblins can waste armed snares.');
      const searched = !placement.itemId && updateSearch(searchSession, world, player, loot, input.held('KeyE'), dt);
      if (searched?.type === 'completed') tell(searched.count === 0 ? 'Nothing worth taking. Try the next one.' : `Found ${searched.count} ${searched.count === 1 ? 'item' : 'items'}. Release E, then press again to pack loot, or click to lift it.`);
      else if (searched?.type === 'cancelled') tell('Search cancelled. Hold E while standing still beside the object.');
    }
  }
  const tunnelReady = !player.hiding && atTunnel(run, world, player) && !loot.held && !placement.itemId;
  updateTarget();
  sack.updateVisibility({ moving: player.moving, targetId: !tunnelReady && !loot.held ? target?.id ?? null : null, held: loot.held, pointer, active: run.phase === 'exploring' && !placement.itemId && !player.hiding }, dt);
  render(world, player, loot, target, run, tunnelReady, guards, objects, searchTarget, searchSession, traps, placement, clouds, hidingSpots, hideTarget); sack.paint(loot, pointer);
  const quickLabel = document.querySelector('#quick-label');
  quickLabel.hidden = run.phase !== 'exploring' || !quickType || !!player.hiding;
  quickLabel.textContent = quickType ? `Smoke bomb × ${loot.bag.filter(item => item.type === quickType).length} · Space` : '';
  let targetText;
  if (world.lair && run.phase === 'lair') {
    const station = lairTarget(world, player);
    targetText = station ? `${station.name} · E to ${station.kind === 'tunnel' ? 'prepare a run' : 'open'}` : 'Lair · WASD walk · E at stations · Tab stash';
  }
  else if (run.phase === 'lair-panel') targetText = 'Lair stash / workbench · Esc to return';
  else if (run.phase === 'setup') targetText = 'Choose your gear, then start the run';
  else if (run.phase === 'results') targetText = run.result.outcome === 'down' ? 'You went down · run complete' : 'Back through the tunnel · run complete';
  else if (player.hiding) targetText = 'Hidden in barrel · E to exit · guards still active';
  else if (hideTarget && !loot.held && !sack.isNavigating()) targetText = 'Hiding barrel · E to hide';
  else if (placement.itemId) targetText = 'WASD aim snare · hold E for 1 second · Esc cancel';
  else if (sack.isNavigating()) targetText = 'Sack · WASD select · E equip gear · Tab close';
  else if (loot.held) targetText = 'Item in hand · R rotate · E drop';
  else if (tunnelReady) targetText = 'Secret tunnel · E to leave with your sack';
  else if (searchSession.active) targetText = `Searching ${SEARCHABLE_TYPES[searchSession.active.type].name} · hold E and stay still`;
  else if (searchTarget) targetText = `${SEARCHABLE_TYPES[searchTarget.type].name} · hold E to search`;
  else if (target) targetText = `${LOOT_TYPES[target.type].name}${LOOT_TYPES[target.type].sellValue ? ` · ${itemSaleValue(target)} gold` : ''} · E pack / click to lift`;
  else targetText = 'Find a chest, cupboard or crate to search';
  if (document.querySelector('#target-label').textContent !== targetText) document.querySelector('#target-label').textContent = targetText;
  const healthText = `Health ${'●'.repeat(player.health)}${'○'.repeat(player.maxHealth - player.health)}`;
  if (document.querySelector('#health-label').textContent !== healthText) document.querySelector('#health-label').textContent = healthText;
  const guardText = world.lair ? 'Safe at home · craft and prepare' : run.phase === 'results' ? 'Run ended' : guards.some(g => g.windup > 0) ? 'Guard about to swing—move!' : guards.some(g => g.state === 'chase') ? 'GUARDS CHASING · get to safety' : guards.some(g => g.state === 'search' && (g.trailLeft > 0 || g.trail.length)) ? 'A guard is following your fading trail' : guards.some(g => g.state === 'search') ? 'A guard is searching where the trail ended' : guards.some(g => g.state === 'suspicious') ? 'A guard is noticing you… break its sight' : 'Watch guard pauses · a purple roamer links nearby rooms';
  if (document.querySelector('#alert-label').textContent !== guardText) document.querySelector('#alert-label').textContent = guardText;
  if (time > messageUntil && run.phase === 'exploring') {
    const hint = player.hiding ? 'Hidden · E to exit. A guard that saw you enter can pull you out.' : hideTarget ? 'E to hide in the barrel. Break guard sight before entering.' : placement.itemId ? 'WASD aim · hold E to place · Esc cancels · Tab opens sack' : loot.held ? 'Click the sack to place. R rotates. E or click the dungeon to drop nearby.' : tunnelReady ? 'E leaves through the tunnel. Step away to search objects or pack loot.' : 'Hold E to search · E packs spilled loot · Release E or move to cancel a search';
    if (document.querySelector('#status').textContent !== hint) document.querySelector('#status').textContent = hint;
  }
  requestAnimationFrame(frame);
};
enterLair(); requestAnimationFrame(frame);
