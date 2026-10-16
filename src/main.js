import { generateDungeon, movePlayer } from './world.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';

const canvas = document.querySelector('#game');
const input = createInput(window);
let render;
try {
  render = await createRenderer(canvas, document.querySelector('#map'));
} catch (error) {
  document.querySelector('#status').textContent = 'Goblin art could not load. Download play.html again, or keep assets/goblin.png alongside the source files.';
  throw error;
}
let world, player, previous = 0;
const reset = () => {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  world = generateDungeon(seed);
  player = { ...world.spawn, facing: 1, phase: 0, moving: false };
  input.clear();
  document.querySelector('#seed').textContent = String(seed);
  document.querySelector('#rooms').textContent = `${world.rooms.length} connected rooms`;
  document.querySelector('#status').textContent = 'Dungeon ready. Click the dungeon, then use WASD to explore.';
  canvas.focus();
};
document.querySelector('#regenerate').addEventListener('click', reset);
canvas.addEventListener('pointerdown', () => canvas.focus());
const frame = time => {
  const dt = previous ? Math.min((time - previous) / 1000, 0.05) : 0;
  previous = time;
  movePlayer(world, player, input.read(), dt);
  render(world, player);
  requestAnimationFrame(frame);
};
reset(); requestAnimationFrame(frame);
