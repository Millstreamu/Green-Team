// Read-only seeded content audit. This measures generated opportunities, not
// survival, travel time, a human route or what fits/returns in a player's sack.
import { generateDungeon } from '../src/world.js';
import { GENERATOR_PRESETS, dungeonConfig } from '../src/generator-settings.js';
import { createSearchables } from '../src/search.js';
import { createHidingSpots } from '../src/hiding.js';
import { createTreasureRoom } from '../src/treasure.js';
import { selectJob } from '../src/jobs.js';
import { runTuning, DEFAULT_TUNING } from '../src/tuning.js';
import { itemSaleValue } from '../src/loot.js';

const count = Number(process.argv[2] ?? 100);
if (!Number.isInteger(count) || count < 1 || count > 1000) throw Error('Use 1–1000 seeds per scenario.');
const mean = values => Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100;
const summary = (objects, multiplier) => ({
  searches: objects.length, empty: objects.filter(o => !o.contents.length).length,
  gold: objects.flatMap(o => o.contents).reduce((sum, type) => sum + itemSaleValue({ type, saleMultiplier: multiplier }), 0),
  scrap: objects.flatMap(o => o.contents).filter(t => t === 'scrap').length,
  cloth: objects.flatMap(o => o.contents).filter(t => t === 'cloth').length,
  meat: objects.flatMap(o => o.contents).filter(t => t === 'meat').length,
  berries: objects.flatMap(o => o.contents).filter(t => t === 'berries').length
});
const results = [];
for (const [label, jobId, candidate, difficulty = 'normal'] of [
  ['v66-manor', 'manor', false], ['v66-hold', 'hold', false], ['v66-sanctuary', 'sanctuary', false],
  ['experiment-manor-empties-only', 'manor', 'empties'],
  ['v67-manor', 'manor', 'mix'],
  ['v67-hold', 'hold', 'mix'],
  ['v67-sanctuary', 'sanctuary', 'mix'],
  ['v67-manor-hard', 'manor', 'mix', 'hard'],
  ['v67-hold-hard', 'hold', 'mix', 'hard'],
  ['v67-sanctuary-hard', 'sanctuary', 'mix', 'hard']
]) {
  const runs = [];
  for (let i = 0; i < count; i++) {
    const seed = Math.imul(i + 1, 2654435761) >>> 0;
    const world = generateDungeon(seed, dungeonConfig(GENERATOR_PRESETS[jobId]));
    world.job = selectJob(jobId, difficulty);
    world.tuning = runTuning(candidate === 'mix' ? DEFAULT_TUNING : { ...DEFAULT_TUNING, nearEmptyChance: candidate ? .45 : .7, farEmptyChance: candidate ? .35 : .5, nearMaterialChance: .75 });
    const objects = createSearchables(world); createHidingSpots(world, objects); createTreasureRoom(world, objects);
    // Skip locked-room contents; sort by original approach-path distance. This
    // is a reproducible opportunity sample, not a traversable route simulation.
    const available = objects.filter(o => !o.treasure).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
    runs.push({ first6: summary(available.slice(0, 6), world.job.goldMultiplier), first12: summary(available.slice(0, 12), world.job.goldMultiplier), all: summary(objects, world.job.goldMultiplier) });
  }
  const result = { label, difficulty, seeds: count };
  for (const group of ['first6', 'first12', 'all']) {
    result[group] = Object.fromEntries(['searches', 'empty', 'gold', 'scrap', 'cloth', 'meat', 'berries'].map(k => [k, mean(runs.map(r => r[group][k]))]));
    result[group].noValuablesPct = Math.round(mean(runs.map(r => Number(r[group].gold === 0))) * 100);
  }
  results.push(result);
}
console.log(JSON.stringify({ method: 'Default presets, named Normal/Hard scenarios, seeds imul(i+1,2654435761)>>>0; V66 baseline uses explicit prior endpoints; V67 uses production defaults. All scenarios use the current V77 resource generator (including map-specific resource weights); labels identify tuning presets, not historical resource mixes. No combat, route/packing, survival or player time simulated. No saves opened.', results }, null, 2));
