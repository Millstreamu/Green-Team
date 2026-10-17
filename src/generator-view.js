import { createNumberFields } from './number-fields.js';
import { GENERATOR_FIELDS, validateGenerator } from './generator-settings.js';
import { JOBS } from './jobs.js';
import { createDungeonPreview, drawDungeonPreview } from './dungeon-preview.js';

export function createGeneratorView(send) {
  const $ = id => document.querySelector('#' + id);
  let previous = '', state = null, timer = null, lastPreview = null;
  const note = text => { $('generator-note').textContent = text; };
  const fields = createNumberFields($('generator-fields'), 'generator-', GENERATOR_FIELDS, () => {
    note('Unsaved layout changes. Preview updates below; save to use them in future runs.');
    clearTimeout(timer); timer = setTimeout(preview, 150);
  });
  for (const [id, job] of Object.entries(JOBS)) {
    const option = document.createElement('option'); option.value = id; option.textContent = job.name; $('generator-job').appendChild(option);
  }
  $('generator-job').value = 'manor';
  function preview() {
    try {
      const seed = Number($('generator-seed').value);
      if ($('generator-seed').value === '' || !Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw Error('Layout number must be a whole number from 0 to 4294967295.');
      lastPreview = createDungeonPreview(seed, validateGenerator(fields.read()), $('generator-job').value, $('generator-difficulty').value || 'normal', state?.tuning);
      $('generator-summary').textContent = drawDungeonPreview($('generator-map'), lastPreview, $('generator-grid').checked);
      $('generator-map').setAttribute('aria-label', `${JOBS[$('generator-job').value].name} example floor plan. ${$('generator-summary').textContent}`);
    } catch (error) { lastPreview = null; $('generator-summary').textContent = error.message; const canvas = $('generator-map'); canvas.width = 1; canvas.height = 1; }
  }
  function load() {
    const values = state?.generator?.[$('generator-job').value];
    if (values) { fields.write(values); note('Saved layout. Choose this dungeon at the lair map table to play it.'); preview(); }
  }
  $('generator-job').addEventListener('change', load);
  $('generator-difficulty').addEventListener('change', preview);
  $('generator-grid').addEventListener('change', () => { if (lastPreview) drawDungeonPreview($('generator-map'), lastPreview, $('generator-grid').checked); });
  $('generator-seed').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(preview, 150); });
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
      state = next; $('generator-section').hidden = !state?.generator;
      const signature = JSON.stringify([state?.selectedLairId, state?.generator]);
      if (signature !== previous && state?.generator) { previous = signature; load(); }
      fields.disable(locked || !state?.generator);
      for (const id of ['generator-save', 'generator-reset', 'generator-another', 'generator-preview', 'generator-job', 'generator-difficulty', 'generator-seed', 'generator-grid']) $(id).disabled = locked || !state?.generator;
    }
  };
}
