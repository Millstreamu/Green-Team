import { createNumberFields } from './number-fields.js';
import { TUNING_FIELDS } from './tuning.js';

export function createTuningView(send) {
  const $ = id => document.querySelector('#' + id);
  const fields = createNumberFields($('tuning-fields'), 'tuning-', TUNING_FIELDS.map(f => ({ ...f, scale: f.group === 'loot' ? 100 : 1, unit: f.group === 'loot' ? 'percent' : f.unit })), () => {
    $('tuning-note').textContent = 'Unsaved changes. Save settings to use them on the next run.';
  });
  let previous = '';
  $('tuning-form').addEventListener('submit', event => {
    event.preventDefault();
    send({ type: 'set-tuning', values: fields.read() });
  });
  $('reset-tuning').addEventListener('click', () => send({ type: 'reset-tuning' }));
  return {
    saved() { previous = ''; },
    paint(state, locked) {
      $('tuning-section').hidden = !state?.tuning;
      const signature = JSON.stringify([state?.selectedLairId, state?.tuning]);
      if (signature !== previous && state?.tuning) {
        fields.write(state.tuning);
        $('tuning-note').textContent = 'Saved values. Changes apply to the next run; the current run keeps its settings.';
        previous = signature;
      }
      fields.disable(locked || !state?.tuning);
      $('save-tuning').disabled = $('reset-tuning').disabled = locked || !state?.tuning;
    }
  };
}
