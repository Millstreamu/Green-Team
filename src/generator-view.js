import { dungeonCheckSummary } from './dungeon-checks.js';
import { createNumberFields } from './number-fields.js';
import { GENERATOR_FIELDS, validateGenerator } from './generator-settings.js';
import { JOBS } from './jobs.js';
import { createDungeonPreview, drawDungeonPreview } from './dungeon-preview.js';

export function createGeneratorView(send) {
  const $ = id => document.querySelector('#' + id);
  let previous = '', state = null, timer = null, lastPreview = null, batchToken = 0, running = false, lockedNow = false;
  function cancelBatch() {
    batchToken++; running = false; $('generator-batch').disabled = lockedNow || !state?.generator;
    $('generator-batch-status').textContent = ''; $('generator-batch-results').replaceChildren();
  }
  function showChecks(report) {
    $('generator-check-summary').textContent = `${dungeonCheckSummary(report)} · ${report.reachable}/${report.walkable} floor tiles reachable${report.treasure ? ' after unlocking' : ''}`;
    const rows = report.issues.slice(0, 50).map(issue => {
      const row = document.createElement('li');
      row.textContent = `${issue.severity === 'warning' ? 'Warning: ' : ''}${issue.message}${Number.isFinite(issue.x) && Number.isFinite(issue.y) ? ` (tile ${Math.floor(issue.x)}, ${Math.floor(issue.y)})` : ''}`; return row;
    });
    if (report.issues.length > 50) { const row = document.createElement('li'); row.textContent = `${report.issues.length - 50} more marked on the map.`; rows.push(row); }
    $('generator-check-issues').replaceChildren(...rows);
  }
  const note = text => { $('generator-note').textContent = text; };
  const fields = createNumberFields($('generator-fields'), 'generator-', GENERATOR_FIELDS, () => {
    cancelBatch();
    note('Unsaved layout changes. Preview updates below; save to use them in future runs.');
    clearTimeout(timer); timer = setTimeout(preview, 150);
  });
  for (const [id, job] of Object.entries(JOBS)) {
    const option = document.createElement('option'); option.value = id; option.textContent = job.name; $('generator-job').appendChild(option);
  }
  $('generator-job').value = 'manor';
  function preview(preserveBatch = false) {
    clearTimeout(timer);
    if (preserveBatch !== true) cancelBatch();
    try {
      const seed = Number($('generator-seed').value);
      if ($('generator-seed').value === '' || !Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw Error('Layout number must be a whole number from 0 to 4294967295.');
      lastPreview = createDungeonPreview(seed, validateGenerator(fields.read()), $('generator-job').value, $('generator-difficulty').value || 'normal', state?.tuning);
      $('generator-summary').textContent = drawDungeonPreview($('generator-map'), lastPreview, $('generator-grid').checked);
      showChecks(lastPreview.checks);
      $('generator-map').setAttribute('aria-label', `${JOBS[$('generator-job').value].name} example floor plan. ${$('generator-summary').textContent}`);
    } catch (error) { lastPreview = null; $('generator-check-summary').textContent = 'Checks unavailable until the layout settings are valid.'; $('generator-check-issues').replaceChildren(); $('generator-summary').textContent = error.message; const canvas = $('generator-map'); canvas.width = 1; canvas.height = 1; }
  }
  function load() {
    const values = state?.generator?.[$('generator-job').value];
    if (values) { fields.write(values); note('Saved layout. Choose this dungeon at the lair map table to play it.'); preview(); }
  }
  $('generator-job').addEventListener('change', load);
  $('generator-difficulty').addEventListener('change', preview);
  $('generator-grid').addEventListener('change', () => { if (lastPreview) drawDungeonPreview($('generator-map'), lastPreview, $('generator-grid').checked); });
  $('generator-seed').addEventListener('input', () => { cancelBatch(); clearTimeout(timer); timer = setTimeout(preview, 150); });
  $('generator-seed').addEventListener('change', cancelBatch);
  $('generator-batch').addEventListener('click', async () => {
    if (running || lockedNow || !state?.generator) return;
    preview(); if (!lastPreview) return;
    const token = ++batchToken, settings = validateGenerator(fields.read()), jobId = $('generator-job').value;
    const difficulty = $('generator-difficulty').value || 'normal', tuning = structuredClone(state?.tuning), firstSeed = lastPreview.world.seed;
    let problems = 0, warnings = 0; running = true; $('generator-batch').disabled = true;
    try {
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 0));
        if (token !== batchToken) return;
        const seed = (firstSeed + i) >>> 0, report = createDungeonPreview(seed, settings, jobId, difficulty, tuning).checks;
        problems += Number(report.errors > 0); warnings += Number(report.warnings > 0);
        $('generator-batch-status').textContent = `${i + 1}/30 layouts checked · ${problems} with problems · ${warnings} with warnings`;
        if (report.issues.length) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary';
          button.textContent = `View layout ${seed} · ${dungeonCheckSummary(report)}`;
          button.addEventListener('click', () => { $('generator-seed').value = seed; preview(true); });
          $('generator-batch-results').appendChild(button);
        }
      }
      $('generator-batch-status').textContent += problems || warnings ? '. Select a layout below to inspect it.' : '. No route problems found.';
    } catch (error) { if (token === batchToken) $('generator-batch-status').textContent = `Checks stopped: ${error.message}`; }
    finally { if (token === batchToken) { running = false; $('generator-batch').disabled = lockedNow || !state?.generator; } }
  });
  $('generator-another').addEventListener('click', () => { $('generator-seed').value = crypto.getRandomValues(new Uint32Array(1))[0]; preview(); });
  $('generator-preview').addEventListener('click', preview);
  $('generator-form').addEventListener('submit', event => {
    event.preventDefault();
    try { send({ type: 'set-generator', jobId: $('generator-job').value, values: validateGenerator(fields.read()) }); }
    catch (error) { note(error.message); }
  });
  $('generator-reset').addEventListener('click', () => send({ type: 'reset-generator', jobId: $('generator-job').value }));
  return {
    saved() { previous = ''; },
    paint(next, locked) {
      lockedNow = locked; state = next; $('generator-section').hidden = !state?.generator;
      const signature = JSON.stringify([state?.selectedLairId, state?.generator]);
      if (signature !== previous) {
        previous = signature; cancelBatch();
        if (state?.generator) load();
        else { lastPreview = null; $('generator-check-summary').textContent = ''; $('generator-check-issues').replaceChildren(); }
      }
      if (locked && running) cancelBatch();
      $('generator-batch').disabled = locked || running || !state?.generator;
      fields.disable(locked || !state?.generator);
      for (const id of ['generator-save', 'generator-reset', 'generator-another', 'generator-preview', 'generator-job', 'generator-difficulty', 'generator-seed', 'generator-grid']) $(id).disabled = locked || !state?.generator;
    }
  };
}
