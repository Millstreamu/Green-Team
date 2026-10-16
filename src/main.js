import { buildTrapLoadout } from './loadout.js';
import { createLoadoutView } from './loadout-view.js';
import { createPlacement, cancelPlacement, interruptPlacement, equipSnare, placementPoint, updatePlacement, updateTraps } from './traps.js';
import { generateDungeon, movePlayer } from './world.js';
import { createInput } from './input.js';
import { createRenderer, screenToWorld } from './render.js';
import { createLoot, selectTarget, autoPickup, liftItem, placeHeld, dropHeld, bagItemAt, LOOT_TYPES } from './loot.js';
import { createSackView } from './sack-view.js';
import { createRun, atTunnel, finishRun, loseRun } from './run.js';
import { createResultsView } from './results-view.js';
import { createGuards, updateGuard, createVitality, tickVitality } from './guard.js';
import { createSearchables, createSearchSession, selectInteraction, beginSearch, cancelSearch, updateSearch, SEARCHABLE_TYPES } from './search.js';

const canvas = document.querySelector('#game');
const sackCanvas = document.querySelector('#sack-grid');
const input = createInput(window, () => sack.isOpen());
const sack = createSackView(sackCanvas, document.querySelector('#held-ghost'));
const results = createResultsView(document.querySelector('#run-results'));
let render;
try {
  render = await createRenderer(canvas, document.querySelector('#map'));
} catch (error) {
  document.querySelector('#status').textContent = 'Goblin art could not load. Download the game again, or keep assets/goblin.png alongside the source files.';
  throw error;
}
let world, player, loot, run, guards, previous = 0, target = null, dragStart = null;
let objects = [], searchSession = createSearchSession(), searchTarget = null;
let traps = [], placement = createPlacement();
let messageUntil = 0;
const pointer = { x: 0, y: 0, active: false, overGame: false };
const tell = text => { document.querySelector('#status').textContent = text; messageUntil = performance.now() + 3500; };
const updateTarget = () => {
  if (placement.itemId) { target = null; searchTarget = null; return; }
  const interaction = searchSession.active ? { kind: 'search', item: searchSession.active } : selectInteraction(world, player, loot.ground, objects, pointer.active && pointer.overGame ? screenToWorld(canvas, player, pointer) : null);
  target = interaction?.kind === 'loot' ? interaction.item : null;
  searchTarget = interaction?.kind === 'search' ? interaction.item : null;
};
const reset = () => {
  if (world && run.phase === 'exploring' && !window.confirm('Abandon this run? This resets the sack and all dungeon loot.')) { canvas.focus(); return; }
  results.close();
  world = generateDungeon(crypto.getRandomValues(new Uint32Array(1))[0]);
  player = { ...world.spawn, id: 'goblin', ...createVitality(), facing: 1, phase: 0, moving: false };
  guards = createGuards(world);
  loot = createLoot(); traps = []; placement = createPlacement(); objects = createSearchables(world); searchSession = createSearchSession(); dragStart = null;
  run = createRun(world, performance.now()); run.phase = 'setup';
  sack.reset();
  input.clear();
  document.querySelector('#seed').textContent = String(world.seed);
  document.querySelector('#rooms').textContent = `${world.rooms.length} rooms · ${world.shortcuts.length} extra routes`;
  tell('Hold E beside a highlighted chest, cupboard or crate. Search it, collect the spilled loot, then return to the tunnel.');
  updateTarget(); loadout.open();
};
const loadout = createLoadoutView(document.querySelector('#run-setup'), quantities => {
  const selected = buildTrapLoadout(quantities, world.seed);
  if (!selected) return;
  loot.bag = selected.bag; run.phase = 'exploring'; run.startedAt = performance.now();
  input.clear(); previous = 0; canvas.focus();
  tell('Hold E to search furniture. I opens your sack; select a snare and press E to equip.');
});
const showRunResult = (result, message) => {
  if (!result) return;
  cancelSearch(searchSession);
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
const trackPointer = e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; pointer.overGame = e.target === canvas; if (e.target === sackCanvas) sack.selectAt(pointer); };
// Boundaries for clicks are checked from event targets; cursor proximity never extends pickup reach.
document.addEventListener('pointermove', trackPointer);
document.addEventListener('pointerleave', () => { pointer.active = false; pointer.overGame = false; });
document.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !world || run.phase !== 'exploring') return;
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
      if (item?.type === 'snare') { sack.selectAt(pointer); tell('Snare selected. Press E to equip.'); return; }
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
  if (!world || run.phase !== 'exploring' || e.repeat || e.target.closest?.('input,textarea,select,button')) return;
  if (e.code === 'Escape' && placement.itemId) { e.preventDefault(); cancelPlacement(placement); tell('Placement cancelled. Snare is still in your sack.'); return; }
  if (e.code === 'KeyI') { e.preventDefault(); cancelPlacement(placement); sack.toggle(); return; }
  if (e.code.startsWith('Arrow') && sack.isOpen()) { e.preventDefault(); sack.navigate(Number(e.code === 'ArrowRight') - Number(e.code === 'ArrowLeft'), Number(e.code === 'ArrowDown') - Number(e.code === 'ArrowUp')); return; }
  if (e.code === 'KeyR' && loot.held) {
    e.preventDefault(); loot.held.rotation = (loot.held.rotation + 1) % 4;
    tell(`${LOOT_TYPES[loot.held.type].name} rotated. Click the sack to place.`);
  }
  if (e.code !== 'KeyE') return;
  e.preventDefault();
  if (placement.itemId) return;
  const chosen = sack.itemForEquip(loot, pointer);
  if (chosen?.type === 'snare' && equipSnare(placement, loot, chosen.id)) { cancelSearch(searchSession); sack.reset(); tell('Release E, then hold E for one second to place. Aim nearby with the mouse. Escape cancels.'); return; }
  if (loot.held) { drop(); return; }
  if (atTunnel(run, world, player)) {
    const result = finishRun(run, world, player, loot, performance.now());
    showRunResult(result, 'You slipped back through the tunnel with your haul.');
    return;
  }
  updateTarget();
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
  if (run.phase !== 'exploring') return;
  cancelPlacement(placement); sack.toggle(); canvas.focus();
});
const frame = time => {
  const dt = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
  previous = time;
  if (run.phase === 'exploring') {
    movePlayer(world, player, input.read(), dt); tickVitality(player, dt);
    for (const event of updateTraps(traps, [player], guards, dt)) {
      if (event.type === 'goblin-triggered') tell('A goblin triggered the snare. No harm, but the trap is spent.');
      if (event.type === 'guard-triggered') tell('Guard snared! You have three seconds to get away.');
    }
    const events = { hit: false, spotted: false };
    for (const guard of guards) {
      const event = updateGuard(world, guard, player, dt);
      events.hit ||= event.hit; events.spotted ||= event.spotted;
    }
    if (events.spotted) tell('Spotted! Get out of sight or make for the tunnel.');
    if (events.hit) { interruptPlacement(placement); cancelSearch(searchSession); tell(`Hit! ${player.health} health left. Keep moving—the next strike takes a moment.`); }
    if (player.state === 'down') showRunResult(loseRun(run, loot, performance.now()), 'You went down. With nobody left to recover you, this run is over.');
    else {
      for (const item of loot.ground) if (item.spillAge !== undefined) item.spillAge += dt;
      const placed = updatePlacement(placement, world, player, loot, traps, objects, placementPoint(player, pointer.active && pointer.overGame ? screenToWorld(canvas, player, pointer) : null), input.held('KeyE'), dt);
      if (placed) tell('Snare placed. Step fully clear to arm it. Goblins can waste armed snares.');
      const searched = !placement.itemId && updateSearch(searchSession, world, player, loot, input.held('KeyE'), dt);
      if (searched?.type === 'completed') tell(`Found ${searched.count} items. Release E, then press again to pack loot, or click to lift it.`);
      else if (searched?.type === 'cancelled') tell('Search cancelled. Hold E while standing still beside the object.');
    }
  }
  const tunnelReady = atTunnel(run, world, player) && !loot.held && !placement.itemId;
  updateTarget();
  sack.updateVisibility({ moving: player.moving, targetId: !tunnelReady && !loot.held ? target?.id ?? null : null, held: loot.held, pointer, active: run.phase === 'exploring' && !placement.itemId }, dt);
  render(world, player, loot, target, run, tunnelReady, guards, objects, searchTarget, searchSession, traps, placement); sack.paint(loot, pointer);
  let targetText;
  if (run.phase === 'setup') targetText = 'Choose your traps, then start the run';
  else if (run.phase === 'results') targetText = run.result.outcome === 'down' ? 'You went down · run complete' : 'Back through the tunnel · run complete';
  else if (placement.itemId) targetText = 'Placing snare · hold E for 1 second · Escape cancel';
  else if (loot.held) targetText = 'Item in hand · R rotate · E drop';
  else if (tunnelReady) targetText = 'Secret tunnel · E to leave with your sack';
  else if (searchSession.active) targetText = `Searching ${SEARCHABLE_TYPES[searchSession.active.type].name} · hold E and stay still`;
  else if (searchTarget) targetText = `${SEARCHABLE_TYPES[searchTarget.type].name} · hold E to search`;
  else if (target) targetText = `${LOOT_TYPES[target.type].name} · E pack / click to lift`;
  else targetText = 'Find a chest, cupboard or crate to search';
  if (document.querySelector('#target-label').textContent !== targetText) document.querySelector('#target-label').textContent = targetText;
  const healthText = `Health ${'●'.repeat(player.health)}${'○'.repeat(player.maxHealth - player.health)}`;
  if (document.querySelector('#health-label').textContent !== healthText) document.querySelector('#health-label').textContent = healthText;
  const guardText = run.phase === 'results' ? 'Run ended' : guards.some(g => g.windup > 0) ? 'Guard winding up a strike—move!' : guards.some(g => g.state === 'chase') ? 'GUARDS CHASING · get to safety' : guards.some(g => g.state === 'search' && (g.trailLeft > 0 || g.trail.length)) ? 'A guard is following your fading trail' : guards.some(g => g.state === 'search') ? 'A guard is searching where the trail ended' : guards.some(g => g.state === 'suspicious') ? 'A guard is noticing you… break its sight' : 'Observe lookouts and room patrols · learn their pauses';
  if (document.querySelector('#alert-label').textContent !== guardText) document.querySelector('#alert-label').textContent = guardText;
  if (time > messageUntil && run.phase === 'exploring') {
    const hint = placement.itemId ? 'Aim nearby · stand still and hold E · Escape cancels · I opens sack' : loot.held ? 'Click the sack to place. R rotates. E or click the dungeon to drop nearby.' : tunnelReady ? 'E leaves through the tunnel. Step away to search objects or pack loot.' : 'Hold E to search · E packs spilled loot · Release E or move to cancel a search';
    if (document.querySelector('#status').textContent !== hint) document.querySelector('#status').textContent = hint;
  }
  requestAnimationFrame(frame);
};
reset(); requestAnimationFrame(frame);
