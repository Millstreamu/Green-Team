import { GENERATOR_PRESETS } from '../src/generator-settings.js';
import { createDungeonPreview } from '../src/dungeon-preview.js';

const args = process.argv.slice(2), count = args.length ? Number(args[0]) : 100;
if (!Number.isInteger(count) || count < 1 || count > 1000) throw Error('Usage: npm run check:dungeons -- 100 (1–1000 layouts per architecture/difficulty)');
let checked = 0, failed = 0, warned = 0;
for (const [id, values] of Object.entries(GENERATOR_PRESETS)) for (const difficulty of ['normal', 'hard']) {
  for (let i = 0; i < count; i++) {
    const seed = Math.imul(i + 1, 2654435761) >>> 0;
    const report = createDungeonPreview(seed, values, id, difficulty).checks;
    checked++; failed += Number(report.errors > 0); warned += Number(report.warnings > 0);
    if (report.issues.length) console.log(JSON.stringify({ architecture: id, difficulty, seed, errors: report.errors, warnings: report.warnings, issues: report.issues }));
  }
  console.log(`${id} ${difficulty}: ${count} layouts checked`);
}
console.log(`${checked} layouts checked; ${failed} with problems; ${warned} with warnings.`);
if (failed) process.exitCode = 1;
