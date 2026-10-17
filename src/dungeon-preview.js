import { generateDungeon } from './world.js';
import { dungeonConfig } from './generator-settings.js';
import { selectJob } from './jobs.js';
import { runTuning } from './tuning.js';
import { createSearchables } from './search.js';
import { createHidingSpots } from './hiding.js';
import { createGuards } from './guard.js';
import { createCages } from './rescue.js';
import { createReinforcementDoors } from './pressure.js';

// Compose the actual generation functions; there is no separate preview generator.
export function createDungeonPreview(seed, values, jobId, difficultyId = 'normal', tuning) {
  const world = generateDungeon(seed, dungeonConfig(values));
  world.job = selectJob(jobId, difficultyId); world.tuning = runTuning(tuning);
  if (!world.job) throw Error('Choose a dungeon and difficulty.');
  const objects = createSearchables(world), hidingSpots = createHidingSpots(world, objects), guards = createGuards(world);
  const obstacles = [...objects, ...hidingSpots], doors = createReinforcementDoors(world, obstacles);
  const cages = createCages(world, [...obstacles, ...guards.map(g => g.home), ...doors.map(d => d.spawn)]);
  return { world, objects, hidingSpots, guards, doors, cages };
}
export function drawDungeonPreview(canvas, preview, showGrid = true) {
  const { world, objects, hidingSpots, cages, doors, guards } = preview;
  const size = 8; canvas.width = world.width * size; canvas.height = world.height * size;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#111a1b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) if (world.tiles[y * world.width + x]) {
    ctx.fillStyle = (x + y) % 2 ? '#4b5a54' : '#45534e';
    ctx.fillRect(x * size, y * size, size - (showGrid ? 1 : 0), size - (showGrid ? 1 : 0));
  }
  const mark = (list, color, width = .75) => { ctx.fillStyle = color; for (const p of list) ctx.fillRect((p.x - width / 2) * size, (p.y - width / 2) * size, width * size, width * size); };
  mark(objects.filter(o => o.type === 'chest'), '#d7ab66'); mark(objects.filter(o => o.type === 'cupboard'), '#a5b5d4'); mark(objects.filter(o => o.type === 'crate'), '#a97954');
  mark(hidingSpots, '#a6d878'); mark(cages, '#df8c9c', 1); mark(doors, '#f09553', .9); mark(guards, '#f4db94', .4); mark([world.spawn], '#6dd6dd', 1);
  return `${world.rooms.length}/${world.layout.rooms} rooms · ${world.shortcuts.length}/${world.layout.extraConnections} extra routes · ${objects.length} searchables · ${hidingSpots.length} hiding spots · ${cages.length} cages · ${doors.length} guard doors`;
}
