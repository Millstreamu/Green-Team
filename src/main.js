import { createSurfaceLoot } from './surface-loot.js';
import { searchableName } from './room-types.js';
import { createRoomDoors, beginRoomDoor, cancelRoomDoor, tickRoomDoors } from './room-doors.js';
import { passiveStatus } from './passive-effects.js';
import { createRaidCartView, cartBubbleAnchor } from './raid-cart-view.js';
import { transferCart, boardRunCart, tickRunCart } from './run-cart.js';
import { equipBerries, beginBerryAim, throwBerry, updateBerries } from './berries.js';
import { equipOrb, useOrb, updateScrying } from './scrying.js';
import { equipPotion, drinkPotion, isPotion } from './potions.js';
import { inShadow, updateShadowStillness } from './shadows.js';
import { litTorches } from './lighting.js';
import { equipDart, beginDartAim, fireDart, updateDarts, boundDartAim } from './darts.js';
import { equipBell, beginBellAim, throwBell, updateBells } from './bells.js';
import { DART, BELL, BERRY } from './config.js';
import { createFeedback } from './feedback.js';
import { setupTouchSack } from './touch-sack.js';
import { createTreasureRoom, unlockTreasure } from './treasure.js';
import { itemLabel } from './loot.js';
import { setupGameScreen, updateGameHud, controlHint } from './game-screen.js';
import { loadProfile, saveProfile, awardPersonalXp, personalSearchRate, passiveEffects } from './profile.js';
import { createPressure, updatePressure } from './pressure.js';
import { pressureLabel } from './pressure-view.js';
import { createHidingSpots, beginHiding, cancelHiding, updateHiding, leaveHiding, useHidingAnchor, anchorMessage } from './hiding.js';
import { seesPlayer } from './guard.js';
import { selectJob, createDeparture, setDestination, toggleCartSeat, tickDeparture } from './jobs.js';
import { useSmoke, updateSmoke } from './smoke.js';
import { loadCamp, saveCamp, createLairWorld, lairTarget, departWithSack, bankEscape } from './lair.js';
import { createLairView } from './lair-view.js';
import { createMapPlanningView, createDepartureView } from './loadout-view.js';
import { createPlacement, cancelPlacement, interruptPlacement, equipSnare, placementPoint, updatePlacement, updateTraps, moveTrapAim } from './traps.js';
import { dungeonConfig, GENERATOR_PRESETS } from './generator-settings.js';
import { generateDungeon, movePlayer } from './world.js';
import { createInput } from './input.js';
import { createRenderer, screenToWorld } from './render.js';
import { createLoot, selectTarget, autoPickup, liftItem, placeHeld, dropHeld, bagItemAt, LOOT_TYPES, itemSaleValue, movePackedItem, rotatePackedItem } from './loot.js';
import { createSackView } from './sack-view.js';
import { createRun, atTunnel, finishRun, loseRun } from './run.js';
import { createResultsView } from './results-view.js';
import { createGuards, updateGuard, createVitality, tickVitality } from './guard.js';
import { createSearchables, createSearchSession, selectInteraction, beginSearch, cancelSearch, updateSearch, SEARCHABLE_TYPES } from './search.js';

const canvas = document.querySelector('#game');
setupGameScreen(canvas);
const feedback = createFeedback();
const sackCanvas = document.querySelector('#sack-grid');
const input = createInput(window, () => sack.isNavigating());
const sack = createSackView(sackCanvas, document.querySelector('#held-ghost'));
const results = createResultsView(document.querySelector('#run-results'));
let campStorage;
try { campStorage = window.localStorage; } catch {}
const camp = loadCamp(campStorage);
const profile = loadProfile(campStorage);
let lairSaved = false, goblinSaved = false;
const refreshSaveStatus = () => {
  document.querySelector('#save-status').textContent = lairSaved && goblinSaved ? 'LAIR + GOBLIN SAVED IN THIS BROWSER'
    : lairSaved ? 'LAIR SAVED · GOBLIN KEPT WHILE OPEN' : goblinSaved ? 'GOBLIN SAVED · LAIR KEPT WHILE OPEN' : 'LAIR + GOBLIN KEPT WHILE THIS GAME IS OPEN';
};
const persistCamp = () => { lairSaved = saveCamp(camp, campStorage); refreshSaveStatus(); };
const persistProfile = () => { goblinSaved = saveProfile(profile, campStorage); refreshSaveStatus(); }; 
let render;
try {
  render = await createRenderer(canvas, document.querySelector('#map'));
} catch (error) {
  document.querySelector('#status').textContent = 'Goblin art could not load. Download the game again, or keep assets/goblin.png alongside the source files.';
  throw error;
}
let pressure, cart, cartOutside = null;
let world, player, loot, run, guards, previous = 0, target = null, dragStart = null;
let hidingSpots = [], hideTarget = null;
let objects = [], searchSession = createSearchSession(), searchTarget = null, unlockTarget = null, doorTarget = null;
let traps = [], placement = createPlacement(), clouds = [], darts = [], bells = [], scryPings = [], berryShots = [], quickType = null;
let messageUntil = 0;
const pointer = { x: 0, y: 0, active: false, overGame: false };
const tell = text => { document.querySelector('#status').textContent = controlHint(text); messageUntil = performance.now() + 3500; };
const updateTarget = () => {
  if (world.lair || placement.itemId || player.hiding) { target = null; searchTarget = null; hideTarget = null; unlockTarget = null; doorTarget = null; return; }
  const interaction = player.enteringHide ? { kind: 'hide', item: player.enteringHide.spot } : searchSession.active ? { kind: 'search', item: searchSession.active } : selectInteraction(world, player, loot.ground, objects, pointer.active && pointer.overGame ? screenToWorld(canvas, player, pointer) : null, hidingSpots);
  doorTarget = interaction?.kind === 'door' ? interaction.item : null;
  unlockTarget = interaction?.kind === 'unlock' ? interaction.item : null;
  hideTarget = interaction?.kind === 'hide' ? interaction.item : null;
  target = interaction?.kind === 'loot' ? interaction.item : null;
  searchTarget = interaction?.kind === 'search' ? interaction.item : null;
};
const enterLair = () => {
  results.close();
  world = createLairWorld(camp); pressure = createPressure(world); cart = createDeparture(['goblin'], camp.destination); cartOutside = null;
  player = { ...world.spawn, id: 'goblin', ...createVitality(), ...passiveEffects(profile), facing: 1, phase: 0, moving: false };
  guards = []; objects = []; hidingSpots = []; hideTarget = null; loot = createLoot(); loot.bag = camp.preparedBag; traps = []; placement = createPlacement(); clouds = []; darts = []; bells = []; scryPings = []; berryShots = []; quickType = null; searchSession = createSearchSession();
  createRoomDoors(world, [...guards, objects.find(o => o.id === world.treasure?.keyContainerId)].filter(Boolean));
  run = createRun(world, performance.now()); run.phase = 'lair'; run.entrance = { ...world.stations.find(station => station.kind === 'tunnel') };
  input.clear(); sack.reset(); dragStart = null; previous = 0;
  pointer.active = false; pointer.overGame = false;
  document.querySelector('#seed').textContent = 'Home'; document.querySelector('#rooms').textContent = 'Your little lair'; document.querySelector('#job-label').textContent = `${cart.selection.jobName} · ${cart.selection.difficultyName}`;
  document.querySelector('#regenerate').hidden = true; document.querySelector('#sack-tab').hidden = true;
  persistCamp(); persistProfile(); canvas.focus(); updateTarget();
  tell('Welcome home. WASD to walk. E at the stash, workbench, campfire, map table or departure minecart.');
};
const reset = () => {
  if (run?.phase === 'exploring' && !window.confirm('Abandon this run? Carried items and cart cargo will be lost. Your lair stash is safe.')) return;
  enterLair();
};
const closeLairPanel = () => { run.phase = 'lair'; input.clear(); canvas.focus(); };
const lairView = createLairView(document.querySelector('#lair-panel'), camp, profile, () => loot, persistCamp, closeLairPanel, persistProfile, null, { feedback: ok => feedback.result(ok, 'lair', '#lair-station-shell') });
const launchRun = (selection) => {
  if (!world.lair || run.phase !== 'lair') return false;
  const job = selection && selectJob(selection.jobId, selection.difficultyId);
  if (!job) return false;
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const dungeon = generateDungeon(seed, dungeonConfig(GENERATOR_PRESETS[job.jobId]));
  const bag = departWithSack(camp, loot);
  if (!bag) return false;
  world = dungeon; world.roomThemes=true; world.job = job; player = { ...world.spawn, id: 'goblin', ...createVitality(), ...passiveEffects(profile), facing: 1, phase: 0, moving: false };
  loot = createLoot(); loot.bag = bag;
  objects = createSearchables(world); hidingSpots = createHidingSpots(world, objects); createTreasureRoom(world, objects); loot.ground = createSurfaceLoot(world, objects); guards = createGuards(world); pressure = createPressure(world, [...objects, ...hidingSpots]); hideTarget = null; traps = []; placement = createPlacement(); clouds = []; darts = []; bells = []; scryPings = []; berryShots = []; quickType = null; searchSession = createSearchSession();
  createRoomDoors(world, [...guards, objects.find(o => o.id === world.treasure?.keyContainerId)].filter(Boolean));
  run = createRun(world, performance.now());
  input.clear(); sack.reset(); previous = 0; pointer.active = false; pointer.overGame = false; canvas.focus(); persistCamp();
  document.querySelector('#seed').textContent = String(world.seed);
  document.querySelector('#job-label').textContent = `${job.jobName} · ${job.difficultyName}`;
  document.querySelector('#rooms').textContent = `${world.rooms.length} rooms · ${world.shortcuts.length} extra routes`;
  document.querySelector('#regenerate').hidden = false; document.querySelector('#sack-tab').hidden = false;
  tell(`${job.jobName} · ${job.difficultyName}. ${world.treasure ? 'Look for a visible treasure key on furniture and its locked room, or escape with what you find.' : 'Search furniture, avoid guards, then escape through the tunnel.'}`);
  return true;
};
const planning = createMapPlanningView(document.querySelector('#map-planning'), selection => {
  if (run.phase !== 'planning' || !setDestination(cart, selection.jobId, selection.difficultyId)) return false;
  camp.destination = { jobId: selection.jobId, difficultyId: selection.difficultyId }; persistCamp();
  closeLairPanel(); tell(`Destination set: ${selection.jobName} · ${selection.difficultyName}. Board the minecart when ready.`); return true;
}, () => cart.selection, () => loot.bag, closeLairPanel);
const boardCart = station => {
  const aboard = toggleCartSeat(cart, player.id);
  if (aboard === null) return;
  input.clear(); player.moving = false; player.phase = 0;
  if (aboard) {
    cartOutside = { x: player.x, y: player.y }; player.x = station.x; player.y = station.y - .15;
    tell('Aboard. E to hop out and cancel departure.');
  } else {
    if (cartOutside) Object.assign(player, cartOutside); cartOutside = null;
    tell('Hopped out. Departure cancelled; your sack is still packed.');
  }
};
const departureView = createDepartureView(document.querySelector('#departure-panel'), () => ({ cart, selfId: player.id, players: [player], bag: loot.bag, active: world.lair && run.phase === 'lair' }), () => { boardCart(world.stations.find(s => s.kind === 'tunnel')); return true; }, () => { input.clear(); canvas.focus(); });
const interactLair = () => {
  const station = lairTarget(world, player);
  if (!station) { tell('Walk close to the stash, workbench, campfire, map table or departure minecart, then press E.'); return; }
  input.clear(); player.moving = false;
  if (station.kind === 'tunnel') departureView.open();
  else if (station.kind === 'planning') { run.phase = 'planning'; planning.open(); }
  else { run.phase = 'lair-panel'; lairView.open(station.kind); }
};
const raidCartView = createRaidCartView(document.querySelector('#raid-cart-panel'), () => ({anchor:cartBubbleAnchor(canvas,world,player),cart:run?.cart, bag:loot.bag,selfId:player.id, active:run?.phase==='exploring'&&player.state==='active'&&!player.hiding&&atTunnel(run,world,player)}), message => {
  if(run.phase!=='exploring'||!atTunnel(run,world,player)||loot.held||player.hiding||placement.itemId)return false;
  input.clear();cancelSearch(searchSession);
  if(message.type==='cart-board')return boardRunCart(run.cart,player.id,message.active);
  if(run.cart.aboard.includes(player.id))return false;
  const moved=transferCart(run.cart,loot,message.id,message.toCart);
  if(moved){for(const field of ['dartId','bellId','potionId','orbId','berryId'])if(player[field]===message.id)player[field]=null;quickType=null;}
  return moved;
},()=>{input.clear();canvas.focus();},{feedback:ok=>feedback.result(ok,'pickup','#raid-cart-action-icon')});
const showRunResult = (result, message) => {
  if (!result) return;
  if(document.querySelector('#raid-cart-panel').open)raidCartView.close();
  if (bankEscape(camp, result, loot, run.cart)) persistCamp();
  result.personalXp = awardPersonalXp(profile, result); persistProfile();
  cancelSearch(searchSession); cancelHiding(player); leaveHiding(player);
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
  if (feedback.result(placeHeld(loot, cell.x, cell.y))) tell(`${name} packed.`);
  else tell('It will not fit there. R rotates; try another space, or E to drop it.');
};
const trackPointer = e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; pointer.overGame = e.target === canvas; if (placement.itemId && pointer.overGame) { placement.aimPoint = placementPoint(player, screenToWorld(canvas, player, pointer), placement.kind === 'dart' ? DART.range : placement.kind === 'bell' ? BELL.range : placement.kind === 'berries' ? BERRY.range : undefined); } if (e.target === sackCanvas) sack.selectAt(pointer); };
// Boundaries for clicks are checked from event targets; cursor proximity never extends pickup reach.
document.addEventListener('pointermove', trackPointer);
document.addEventListener('pointerleave', () => { pointer.active = false; pointer.overGame = false; });
for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, event => {
  if (event.pointerType === 'touch') { pointer.active = false; pointer.overGame = false; }
});
setupTouchSack({ canvas: sackCanvas, sack, getLoot: () => loot,
  enabled: () => run.phase === 'exploring' && !player.hiding && !placement.itemId && !document.querySelector('#game-menu')?.open,
  onBegin: () => { input.clearMovement(); cancelSearch(searchSession); cancelHiding(player); },
  move: (id, x, y) => feedback.result(movePackedItem(loot, id, x, y), null), place: (x, y) => feedback.result(placeHeld(loot, x, y)), onBlocked: () => feedback.play('blocked') });
canvas.addEventListener('touchrotate', () => {
  if (run.phase === 'exploring' && player.hiding && player.hidingAnchor) { tell(anchorMessage(useHidingAnchor(player, hidingSpots, guards, true), player)); return; }
  if (run.phase !== 'exploring' || player.hiding || placement.itemId) return;
  if (loot.held) { loot.held.rotation = (loot.held.rotation + 1) % 4; }
  else { const item = sack.itemForEquip(loot, pointer); if (item) feedback.result(rotatePackedItem(loot, item.id), null); }
});
canvas.addEventListener('touchlift', () => {
  if (run.phase !== 'exploring' || player.hiding || placement.itemId || loot.held || !sack.isOpen()) return;
  const item = sack.itemForEquip(loot, pointer);
  if (item && liftItem(loot, 'bag', item.id)) tell(`${LOOT_TYPES[item.type].name} lifted. Tap a sack square to place; Rotate turns it.`);
});
document.addEventListener('pointerdown', e => {
  if(document.querySelector('#raid-cart-panel').open&&e.target===canvas){e.preventDefault();raidCartView.close();return;}
  if (['touch', 'pen'].includes(e.pointerType) && e.target === sackCanvas) return;
  if (e.button !== 0 || !world || player.hiding || run.phase !== 'exploring') return;
  trackPointer(e);
  if (e.target !== canvas && e.target !== sackCanvas) return;
  e.preventDefault(); canvas.focus();
  if (placement.itemId) return;
  cancelSearch(searchSession); cancelHiding(player);
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
      if (liftItem(loot, 'ground', clicked.id)) feedback.play('pickup', '#sack-panel');
      tell(`${LOOT_TYPES[clicked.type].name} lifted. R rotates; click the sack to place.`);
    } else tell('Hold E beside a highlighted object to search. Click spilled loot to lift it.');
  }
  if (e.pointerType !== 'touch' && !wasHolding && loot.held) dragStart = { x: e.clientX, y: e.clientY, id: loot.held.id };
});
document.addEventListener('pointerup', e => {
  const start = dragStart; dragStart = null;
  if (run.phase !== 'exploring' || !start || start.id !== loot.held?.id || Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return;
  trackPointer(e);
  if (e.target === sackCanvas) placeAtPointer();
  else if (e.target === canvas) drop();
});
const cancelDartAim = () => { if (['dart', 'bell', 'berries'].includes(placement?.kind)) cancelPlacement(placement); };
window.addEventListener('gamecontrolsreset', cancelDartAim);
window.addEventListener('blur', cancelDartAim);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelDartAim(); });
window.addEventListener('blur', () => { pointer.active = false; pointer.overGame = false; dragStart = null; cancelSearch(searchSession); cancelHiding(player); interruptPlacement(placement); });
window.addEventListener('keyup', e => {
  if (e.code === 'KeyE' && player?.enteringHide) { cancelHiding(player); tell('Hiding cancelled. Hold E to try again.'); }
  if (e.code === 'KeyE' && searchSession.active) { cancelSearch(searchSession); tell('Search cancelled. Hold E again when it is safe.'); }
});
window.addEventListener('keydown', e => {
  if (document.querySelector('#departure-panel').open) return;
  if(document.querySelector('#raid-cart-panel').open){if(e.code==='KeyE'&&!e.repeat&&!e.target.closest?.('button')){e.preventDefault();raidCartView.interactDown();}if(['Escape','Tab'].includes(e.code)){e.preventDefault();raidCartView.close();}return;}
  if (document.querySelector('#game-menu')?.open) return;
  if (!world || e.target.closest?.('input,textarea,select,button,summary')) return;
  if (run.phase === 'lair') {
    if (cart.aboard.has(player.id)) { if (e.code === 'Tab' || e.code === 'Space') e.preventDefault(); if (e.code === 'KeyE' && !e.repeat) { e.preventDefault(); boardCart(world.stations.find(s => s.kind === 'tunnel')); } return; }
    if (e.code === 'Tab') { e.preventDefault(); if (e.repeat) return; input.clear(); player.moving = false; run.phase = 'lair-panel'; lairView.open('stash'); }
    else if (e.code === 'KeyE' && !e.repeat) { e.preventDefault(); interactLair(); }
    return;
  }
  if (run.phase !== 'exploring') return;
  if(run.cart.aboard.includes(player.id)){if(e.code==='KeyE'&&!e.repeat){e.preventDefault();input.clear();raidCartView.interactDown();}return;}
  if (player.hiding) {
    if (['KeyE', 'Tab', 'Space', 'KeyR'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyE' && !e.repeat) { leaveHiding(player); input.clear(); tell('Out of hiding. Watch the guards before moving.'); }
    if (['Space', 'KeyR'].includes(e.code) && !e.repeat && player.hidingAnchor) tell(anchorMessage(useHidingAnchor(player, hidingSpots, guards, e.code === 'KeyR'), player));
    return;
  }
  if (['Tab', 'Space', 'Escape'].includes(e.code)) cancelHiding(player);
  const dx = Number(e.code === 'KeyD' || e.code === 'ArrowRight') - Number(e.code === 'KeyA' || e.code === 'ArrowLeft');
  const dy = Number(e.code === 'KeyS' || e.code === 'ArrowDown') - Number(e.code === 'KeyW' || e.code === 'ArrowUp');
  if ((dx || dy) && sack.isNavigating()) { e.preventDefault(); sack.navigate(dx, dy); return; }
  if (e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (placement.kind === 'berries') {
      boundDartAim(placement, player, canvas);
      if (feedback.result(throwBerry(world, player, loot, placement, berryShots, placement.itemId), 'berryThrow', '#game')) input.clear();
      return;
    }
    if (player.berryId && !placement.itemId && !sack.isNavigating()) { if (beginBerryAim(placement, loot, player)) { cancelSearch(searchSession); input.clear(); player.moving = false; } return; }
    if (player.orbId && !placement.itemId && !sack.isNavigating()) {
      if (feedback.result(useOrb(loot, player, guards, scryPings), 'orbPing', '#game')) { cancelSearch(searchSession); input.clear(); }
      return;
    }
    if (player.potionId && !placement.itemId && !sack.isNavigating()) {
      if (feedback.result(drinkPotion(loot, player), 'potionDrink', '#game')) { cancelSearch(searchSession); input.clear(); }
      return;
    }
    if (placement.kind === 'bell') {
      boundDartAim(placement, player, canvas);
      if (feedback.result(throwBell(world, player, loot, placement, bells, placement.itemId), 'bellThrow', '#game')) input.clear();
      return;
    }
    if (player.bellId && !placement.itemId && !sack.isNavigating()) { if (beginBellAim(placement, loot, player)) { cancelSearch(searchSession); input.clear(); player.moving = false; } return; }
    if (placement.kind === 'dart') {
      boundDartAim(placement, player, canvas);
      if (feedback.result(fireDart(world, player, loot, placement, darts, placement.itemId), 'dartFire', '#game')) { input.clear(); }
      return;
    }
    if (player.dartId && !placement.itemId && !sack.isNavigating()) { if (beginDartAim(placement, loot, player)) { cancelSearch(searchSession); input.clear(); player.moving = false; } return; }
    if (quickType === 'smoke' && !placement.itemId && !sack.isNavigating() && useSmoke(loot, player, clouds)) {
      cancelSearch(searchSession); tell('Smoke deployed! Break sight and move away before it clears.');
    } else tell(quickType === 'smoke' ? 'No smoke bomb ready. Close the sack and keep your hands free.' : 'Select a smoke bomb in the sack and press E to equip it, then Space to use.');
    return;
  }
  if (e.code === 'Escape' && placement.itemId) { e.preventDefault(); cancelPlacement(placement); tell('Placement cancelled. Snare is still in your sack.'); return; }
  if (e.code === 'Tab') { e.preventDefault(); input.clear(); cancelPlacement(placement); sack.toggle(); canvas.focus(); return; }
  if (e.code === 'KeyR' && loot.held) {
    e.preventDefault(); loot.held.rotation = (loot.held.rotation + 1) % 4;
    tell(`${itemLabel(loot.held)} rotated. Click the sack to place.`);
  }
  if (e.code !== 'KeyE') return;
  e.preventDefault();
  if (placement.itemId) return;
  const chosen = sack.itemForEquip(loot, pointer);
  if (chosen?.type === 'berries' && equipBerries(placement, loot, player, chosen.id)) { quickType = null; cancelSearch(searchSession); input.clear(); sack.reset(); return; }
  if (chosen?.type === 'orb' && equipOrb(placement, loot, player, chosen.id)) { quickType = null; cancelSearch(searchSession); input.clear(); sack.reset(); return; }
  if (isPotion(chosen?.type) && equipPotion(placement, loot, player, chosen.id)) { quickType = null; cancelSearch(searchSession); input.clear(); sack.reset(); return; }
  if (chosen?.type === 'bell' && equipBell(placement, loot, player, chosen.id)) { quickType = null; cancelSearch(searchSession); input.clear(); sack.reset(); return; }
  if (chosen?.type === 'dart' && equipDart(placement, loot, player, chosen.id)) { quickType = null; cancelSearch(searchSession); input.clear(); sack.reset(); return; }
  if (chosen?.type === 'smoke' && !loot.held) {
    player.dartId = null; player.bellId = null; player.potionId = null; player.orbId = null; player.berryId = null; quickType = 'smoke'; cancelPlacement(placement); cancelSearch(searchSession); input.clearMovement(); sack.reset();
    tell('Smoke bomb equipped. Space uses one; each spare takes its own sack square.'); return;
  }
  if (chosen?.type === 'snare' && equipSnare(placement, loot, chosen.id)) { player.dartId = null; player.bellId = null; player.potionId = null; player.orbId = null; player.berryId = null; quickType = null; cancelSearch(searchSession); input.clearMovement(); sack.reset(); placement.aimPoint = placementPoint(player); tell('WASD aims the preview. Release E, then hold E for one second to place. Escape cancels.'); return; }
  if (loot.held) { drop(); return; }
  if(atTunnel(run,world,player)){input.clear();cancelSearch(searchSession);raidCartView.interactDown();return;}
  updateTarget();
  if (doorTarget) { cancelSearch(searchSession); cancelHiding(player); beginRoomDoor(world,player,doorTarget.id); return; }
  if (unlockTarget) {
    cancelSearch(searchSession); cancelHiding(player);
    tell(unlockTreasure(world, player, loot) ? 'Treasure room unlocked! The key is used. The door stays open for the team.' : 'Locked treasure room. Find its key by searching elsewhere in the dungeon.');
    return;
  }
  if (hideTarget) {
    const witnesses = guards.filter(guard => seesPlayer(world, guard, player, ['chase', 'search'].includes(guard.state), clouds));
    if (beginHiding(world, player, hideTarget, witnesses)) {
      cancelSearch(searchSession); cancelPlacement(placement); sack.reset();
      tell('Hold E and stay still for half a second to hide.');
    }
    return;
  }
  if (searchTarget) {
    if (beginSearch(searchSession, world, player, loot, searchTarget)) tell(`Searching ${searchableName(searchTarget)}. Keep E held and stay still.`);
    return;
  }
  if (!target) { tell('No loot or unsearched object within reach. Move closer.'); return; }
  const name = LOOT_TYPES[target.type].name;
  sack.reveal();
  if (feedback.result(autoPickup(loot, target.id), 'pickup', '#sack-panel')) tell(`${name} packed into your sack.`);
  else tell(`Rearrange your sack to fit this: ${name}. It is still on the floor.`);
});
document.querySelector('#regenerate').addEventListener('click', reset);
document.querySelector('#next-run').addEventListener('click', reset);
document.querySelector('#sack-tab').addEventListener('click', () => {
  if (run.phase !== 'exploring' || player.hiding) return;
  cancelHiding(player); input.clear(); cancelPlacement(placement); sack.toggle(); canvas.focus();
});
const frame = time => {
  const dt = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
  previous = time;
  if (run.phase === 'lair') {
    movePlayer(world, player, document.querySelector('#departure-panel').open || cart.aboard.has(player.id) ? { x: 0, y: 0 } : input.read(), dt);
    const departure = tickDeparture(cart, dt);
    if (departure) launchRun(departure);
  }
  departureView.refresh();
  if (run.phase === 'exploring') {
    updateSmoke(clouds, dt);
    updateScrying(scryPings, dt);
    const rings = updateBells(world, bells, guards, [player], dt, clouds);
    if (rings.length) feedback.play('bellRing', '#game');
    const dartHits = updateDarts(world, darts, guards, dt);
    if (dartHits.length) feedback.play('dartHit', '#game');
    if (updateBerries(world, berryShots, guards, dt).some(hit => hit.blinded)) feedback.play('berryHit', '#game');
    const direction = document.querySelector('#raid-cart-panel').open || run.cart.aboard.includes(player.id) ? {x:0,y:0} : input.read();
    const aiming = !!placement.itemId && moveTrapAim(placement, player, direction, dt);
    boundDartAim(placement, player, canvas);
    movePlayer(world, player, placement.itemId || sack.isNavigating() ? { x: 0, y: 0 } : direction, dt); tickVitality(player, dt, world);
    // Same torch list and obstacles the renderer lights the scene with.
    if (player.shadowStillness) updateShadowStillness(player, dt, inShadow(litTorches(world, [...objects, ...hidingSpots, ...(run.cages ?? []), ...(pressure?.doors ?? []).map(d => d.spawn)]), player), !!searchSession.active || !!player.enteringHide);
    for (const event of updateTraps(traps, [player], guards, dt)) {
      if (event.type === 'goblin-triggered') tell('A goblin triggered the snare. No harm, but the trap is spent.');
      if (event.type === 'guard-triggered') tell('Guard snared! You have three seconds to get away.');
    }
    const events = { hit: false, spotted: false, exposed: false };
    for (const guard of guards) {
      const event = updateGuard(world, guard, player, dt, clouds, pressure.heat);
      events.hit ||= event.hit; events.spotted ||= event.spotted; events.exposed ||= event.exposed;
    }
    if (events.exposed) { input.clear(); tell('The guard pulled you out! Run!'); }
    if (events.spotted) tell('Spotted! Get out of sight or return to the cart.');
    if (events.hit) { cancelRoomDoor(world,player); cancelHiding(player); interruptPlacement(placement); cancelSearch(searchSession); tell(`Hit! ${player.health} health left. Knocked back! Keep moving and dodge the next swing.`); }
    if (tickRoomDoors(world,[player],dt,p => input.held('KeyE') && !loot.held && !placement.itemId && !sack.isNavigating() && !document.querySelector('#raid-cart-panel').open)) tell('Door open. It stays open.');
    if (player.state === 'down') showRunResult(loseRun(run, loot, performance.now()), 'You went down. With nobody left to recover you, this run is over.');
    else {
      const hideWitnesses = player.enteringHide ? guards.filter(guard => seesPlayer(world, guard, player, ['chase', 'search'].includes(guard.state), clouds)) : [];
      const hidden = updateHiding(world, player, input.held('KeyE'), dt, hideWitnesses, !!loot.held || !!placement.itemId || sack.isNavigating());
      if (hidden?.type === 'hidden') { input.clear(); sack.reset(); tell(hidden.witnessed ? 'A guard saw you hide! It is coming to pull you out.' : 'Hidden. E to come out; guards keep searching.'); }
      else if (hidden?.type === 'cancelled') tell('Hiding cancelled. Hold E and stay still to try again.');
      for (const item of loot.ground) if (item.spillAge !== undefined) item.spillAge += dt;
      const placed = updatePlacement(placement, world, player, loot, traps, [...objects, ...hidingSpots], placement.aimPoint ?? placementPoint(player), input.held('KeyE') && !aiming, dt);
      if (placed) tell('Snare placed. Step fully clear to arm it. Goblins can waste armed snares.');
      const searched = !placement.itemId && updateSearch(searchSession, world, player, loot, input.held('KeyE'), dt);
      if (searched?.type === 'completed') tell(searched.count === 0 ? 'Nothing worth taking. Try the next one.' : `Found ${searched.count} ${searched.count === 1 ? 'item' : 'items'}. Release E, then press again to pack loot, or click to lift it.`);
      else if (searched?.type === 'cancelled') tell('Search cancelled. Hold E while standing still beside the object.');
      updatePressure(world, pressure, guards, dt);
    }
  }
  if(run.phase==='exploring') {
    if(!atTunnel(run,world,player)||player.hiding||loot.held) {run.cart.aboard=[];run.cart.countdown=null;}
    if(tickRunCart(run.cart,player.state==='active'?[player.id]:[],dt))showRunResult(finishRun(run,world,player,loot,performance.now()),'The cart returned with your haul.');
  }
  raidCartView.refresh();
  const tunnelReady = !player.hiding && atTunnel(run, world, player) && !loot.held && !placement.itemId;
  updateTarget();
  sack.updateVisibility({ moving: player.moving, targetId: !tunnelReady && !loot.held ? target?.id ?? null : null, held: loot.held, pointer, active: run.phase === 'exploring' && !placement.itemId && !player.hiding }, dt);
  render(world, player, loot, target, run, tunnelReady, guards, objects, searchTarget, searchSession, traps, placement, clouds, hidingSpots, hideTarget, pressure, [], null, darts, bells, scryPings, berryShots); sack.paint(loot, pointer);
  if (world.lair) document.querySelector('#job-label').textContent = `${cart.selection.jobName} · ${cart.selection.difficultyName}`;
  const destinationLabel = document.querySelector('#destination-label'); destinationLabel.hidden = !world.lair;
  if (world.lair) destinationLabel.textContent = `Planned: ${cart.selection.jobName} · ${cart.selection.difficultyName}`;
  const xpText = `Your goblin · ${profile.xp} XP available`;
  if (document.querySelector('#xp-label').textContent !== xpText) document.querySelector('#xp-label').textContent = xpText;
  const heatLabel = document.querySelector('#heat-label');
  heatLabel.hidden = world.lair;
  heatLabel.textContent = pressureLabel(pressure);
  heatLabel.style.background = `linear-gradient(90deg, #6d392c ${Math.round(pressure.heat * 100)}%, #10191be6 0)`;
  const quickLabel = document.querySelector('#quick-label');
  quickLabel.hidden = run.phase !== 'exploring' || !quickType || !!player.hiding;
  quickLabel.textContent = quickType ? `Smoke bomb × ${loot.bag.filter(item => item.type === quickType).length} · Space` : '';
  let targetText;
  if (world.lair && run.phase === 'lair') {
    const station = lairTarget(world, player);
    targetText = cart.aboard.has(player.id) ? `Aboard ${cart.aboard.size}/${cart.participants.length} · leaving in ${Math.ceil(cart.countdown ?? 0)}s · ${cart.selection.jobName} · ${cart.selection.difficultyName} · E to hop out` : station ? `${station.name} · E to ${station.kind === 'tunnel' ? 'board' : 'open'}` : 'Lair · E at a station';
  }
  else if (run.phase === 'lair-panel') targetText = 'Lair station · Esc to return';
  else if (run.phase === 'planning') targetText = 'Map table · choose destination and difficulty';
  else if (run.phase === 'results') targetText = run.result.outcome === 'down' ? 'You went down · run complete' : 'Back through the tunnel · run complete';
  else if (player.hiding) targetText = `Hidden in barrel · E to exit${player.hidingAnchor ? ' · Space anchor' : ''} · guards still active`;
  else if (player.enteringHide) targetText = 'Hiding… hold E and stay still';
  else if (hideTarget && !loot.held && !sack.isNavigating()) targetText = 'Hiding barrel · hold E for half a second';
  else if (placement.itemId) targetText = 'WASD aim snare · hold E for 1 second · Esc cancel';
  else if (sack.isNavigating()) targetText = 'Sack · WASD select · E equip gear · Tab close';
  else if (loot.held) targetText = 'Item in hand · R rotate · E drop';
  else if (tunnelReady) targetText = 'Raid minecart · E to unload or leave';
  else if (searchSession.active) targetText = `Searching ${searchableName(searchSession.active)} · hold E and stay still`;
  else if (doorTarget) targetText = 'Door · hold E to open';
  else if (unlockTarget) targetText = 'Locked treasure room · E to use its key';
  else if (searchTarget) targetText = `${searchableName(searchTarget)} · hold E to search`;
  else if (target) targetText = `${itemLabel(target)}${LOOT_TYPES[target.type].sellValue ? ` · ${itemSaleValue(target)} gold` : ''} · E pack / click to lift`;
  else targetText = 'Explore · find something worth stealing';
  targetText = controlHint(targetText);
  if (document.querySelector('#target-label').textContent !== targetText) document.querySelector('#target-label').textContent = targetText;
  const passiveHud = document.querySelector('#passive-status');
  if (passiveHud) { passiveHud.textContent = passiveStatus(player); passiveHud.hidden = run.phase !== 'exploring' || !passiveHud.textContent; }
  const luckyStatus = document.querySelector('#lucky-status');
  if (luckyStatus) { luckyStatus.hidden = run.phase !== 'exploring' || !(player.lucky || player.passiveLuck); luckyStatus.textContent = `LUCKY · +${(player.lucky ? 5 : 0) + (player.passiveLuck ? 5 : 0)}% gold finds`; }
  const disguiseStatus = document.querySelector('#disguise-status');
  if (disguiseStatus) { disguiseStatus.hidden = !(run.phase === 'exploring') || !(player.disguiseLeft > 0 || player.vanishLeft > 0); disguiseStatus.textContent = player.vanishLeft > 0 ? `VANISH ${Math.ceil(player.vanishLeft)}s` : `DISGUISE ${Math.ceil(player.disguiseLeft ?? 0)}s`; }
  if (player.berryId && !loot.bag.some(i => i.id === player.berryId && i.type === 'berries')) { player.berryId = null; cancelDartAim(); }
  if (player.orbId && !loot.bag.some(i => i.id === player.orbId && i.type === 'orb')) player.orbId = null;
  if (player.potionId && !loot.bag.some(i => i.id === player.potionId && isPotion(i.type))) player.potionId = null;
  if (player.bellId && !loot.bag.some(i => i.id === player.bellId && i.type === 'bell')) { player.bellId = null; cancelDartAim(); }
  if (player.dartId && !loot.bag.some(i => i.id === player.dartId && i.type === 'dart')) { player.dartId = null; cancelDartAim(); }
  const dartHud = document.querySelector('#dart-equipped');
  if (dartHud) {
    dartHud.hidden = run.phase !== 'exploring' || !(player.dartId || player.bellId || player.potionId || player.orbId || player.berryId) || !!player.hiding;
    dartHud.textContent = controlHint(player.berryId ? `BERRIES · ${placement.kind === 'berries' ? 'Space throw · Esc cancel' : 'Space aim'}` : player.orbId ? 'ORB · Space ping' : player.potionId ? `${loot.bag.find(i => i.id === player.potionId)?.type === 'lucky' ? 'LUCKY' : loot.bag.find(i => i.id === player.potionId)?.type === 'vanish' ? 'VANISH' : 'DISGUISE'} · Space drink` : `${player.bellId ? 'BELL' : 'DART'} ×${loot.bag.filter(i => i.type === (player.bellId ? 'bell' : 'dart')).length} · ${placement.kind === 'bell' ? 'Space throw · Esc cancel' : placement.kind === 'dart' ? 'Space fire · Esc cancel' : 'Space aim'}`);
  }
  updateGameHud({ lair: world.lair, placing: placement.itemId, health: player.health, maxHealth: player.maxHealth });
  const healthText = `Health ${'●'.repeat(player.health)}${'○'.repeat(player.maxHealth - player.health)}`;
  if (document.querySelector('#health-label').textContent !== healthText) document.querySelector('#health-label').textContent = healthText;
  const guardText = world.lair ? '' : run.phase === 'results' ? '' : guards.some(g => g.windup > 0) ? 'Guard about to swing—move!' : guards.some(g => g.state === 'chase') ? 'GUARDS CHASING · get to safety' : guards.some(g => g.state === 'search' && (g.trailLeft > 0 || g.trail.length)) ? 'A guard is following your fading trail' : guards.some(g => g.state === 'search') ? 'A guard is searching where the trail ended' : guards.some(g => g.state === 'suspicious') ? 'A guard is noticing you… break its sight' : '';
  if (document.querySelector('#alert-label').textContent !== guardText) document.querySelector('#alert-label').textContent = guardText;
  if (time > messageUntil && document.querySelector('#status').textContent) document.querySelector('#status').textContent = '';
  requestAnimationFrame(frame);
};
enterLair(); requestAnimationFrame(frame);
