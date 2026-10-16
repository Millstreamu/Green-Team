import { generateDungeon, movePlayer } from './world.js';
import { createInput } from './input.js';
import { createRenderer, screenToWorld } from './render.js';
import { createLoot, selectTarget, autoPickup, liftItem, placeHeld, dropHeld, bagItemAt, LOOT_TYPES } from './loot.js';
import { createSackView } from './sack-view.js';

const canvas = document.querySelector('#game');
const sackCanvas = document.querySelector('#sack-grid');
const input = createInput(window);
const sack = createSackView(sackCanvas, document.querySelector('#held-ghost'));
let render;
try {
  render = await createRenderer(canvas, document.querySelector('#map'));
} catch (error) {
  document.querySelector('#status').textContent = 'Goblin art could not load. Download the game again, or keep assets/goblin.png alongside the source files.';
  throw error;
}
let world, player, loot, previous = 0, target = null, dragStart = null;
let messageUntil = 0;
const pointer = { x: 0, y: 0, active: false, overGame: false };
const tell = text => { document.querySelector('#status').textContent = text; messageUntil = performance.now() + 3500; };
const updateTarget = () => {
  target = selectTarget(world, player, loot.ground, pointer.active && pointer.overGame ? screenToWorld(canvas, player, pointer) : null);
};
const reset = () => {
  if (world && !window.confirm('Start a new dungeon? This resets the sack and all loot in this test.')) { canvas.focus(); return; }
  world = generateDungeon(crypto.getRandomValues(new Uint32Array(1))[0]);
  player = { ...world.spawn, facing: 1, phase: 0, moving: false };
  loot = createLoot(world); dragStart = null;
  input.clear();
  document.querySelector('#seed').textContent = String(world.seed);
  document.querySelector('#rooms').textContent = `${world.rooms.length} connected rooms`;
  tell('Loot is scattered around your feet. E packs the highlighted item; click to place it yourself.');
  canvas.focus(); updateTarget();
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
const trackPointer = e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; pointer.overGame = e.target === canvas; };
// Boundaries for clicks are checked from event targets; cursor proximity never extends pickup reach.
document.addEventListener('pointermove', trackPointer);
document.addEventListener('pointerleave', () => { pointer.active = false; pointer.overGame = false; });
document.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !world) return;
  trackPointer(e);
  if (e.target !== canvas && e.target !== sackCanvas) return;
  e.preventDefault(); canvas.focus();
  const wasHolding = !!loot.held;
  if (e.target === sackCanvas) {
    if (loot.held) placeAtPointer();
    else {
      const cell = sack.cellAt(pointer), item = cell && bagItemAt(loot.bag, cell.x, cell.y);
      if (item && liftItem(loot, 'bag', item.id)) tell(`${LOOT_TYPES[item.type].name} lifted. R rotates; click a sack square to place.`);
    }
  } else if (loot.held) drop();
  else {
    updateTarget();
    const at = screenToWorld(canvas, player, pointer);
    if (target && Math.hypot(target.x - at.x, target.y - at.y) <= 0.8) {
      liftItem(loot, 'ground', target.id);
      tell(`${LOOT_TYPES[target.type].name} lifted. R rotates; click the sack to place.`);
    } else tell('Click loot within reach, or use E for the highlighted item.');
  }
  if (!wasHolding && loot.held) dragStart = { x: e.clientX, y: e.clientY, id: loot.held.id };
});
document.addEventListener('pointerup', e => {
  const start = dragStart; dragStart = null;
  if (!start || start.id !== loot.held?.id || Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return;
  trackPointer(e);
  if (e.target === sackCanvas) placeAtPointer();
  else if (e.target === canvas) drop();
});
window.addEventListener('blur', () => { pointer.active = false; pointer.overGame = false; dragStart = null; });
window.addEventListener('keydown', e => {
  if (!world || e.repeat || e.target.closest?.('input,textarea,select,button')) return;
  if (e.code === 'KeyR' && loot.held) {
    e.preventDefault(); loot.held.rotation = (loot.held.rotation + 1) % 4;
    tell(`${LOOT_TYPES[loot.held.type].name} rotated. Click the sack to place.`);
  }
  if (e.code !== 'KeyE') return;
  e.preventDefault();
  if (loot.held) { drop(); return; }
  updateTarget();
  if (!target) { tell('No loot within reach. Move closer.'); return; }
  const name = LOOT_TYPES[target.type].name;
  if (autoPickup(loot, target.id)) tell(`${name} packed into your sack.`);
  else tell(`Rearrange your sack to fit this: ${name}. It is still on the floor.`);
});
document.querySelector('#regenerate').addEventListener('click', reset);
const frame = time => {
  const dt = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
  previous = time;
  movePlayer(world, player, input.read(), dt);
  updateTarget(); render(world, player, loot, target); sack.paint(loot, pointer);
  const targetText = loot.held ? 'Item in hand · R rotate · E drop' : target ? `${LOOT_TYPES[target.type].name} · E pack / click to lift` : 'Walk closer to loot';
  if (document.querySelector('#target-label').textContent !== targetText) document.querySelector('#target-label').textContent = targetText;
  if (time > messageUntil) {
    const hint = loot.held ? 'Click the sack to place. R rotates. E or click the dungeon to drop nearby.' : 'WASD move · E pack highlighted loot · Click loot or sack contents to lift';
    if (document.querySelector('#status').textContent !== hint) document.querySelector('#status').textContent = hint;
  }
  requestAnimationFrame(frame);
};
reset(); requestAnimationFrame(frame);
