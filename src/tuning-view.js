import { TUNING_FIELDS } from './tuning.js';

export function createTuningView(send) {
  const $ = id => document.querySelector('#' + id);
  const inputs = new Map();
  const scale = f => f.group === 'loot' ? 100 : 1;
  for (const f of TUNING_FIELDS) {
    const label = document.createElement('label'), title = document.createElement('span'), input = document.createElement('input');
    title.textContent = `${f.label} · ${f.group === 'loot' ? 'percent' : f.unit} (${f.min * scale(f)}–${f.max * scale(f)})`;
    input.type = 'number'; input.min = f.min * scale(f); input.max = f.max * scale(f); input.step = f.step * scale(f); input.required = true;
    input.id = 'tuning-' + f.id;
    input.addEventListener('input', () => { $('tuning-note').textContent = 'Unsaved changes. Save settings to use them on the next run.'; });
    label.replaceChildren(title, input); inputs.set(f.id, input);
    $('tuning-fields').appendChild(label);
  }
  let previous = '';
  $('tuning-form').addEventListener('submit', event => {
    event.preventDefault();
    send({ type: 'set-tuning', values: Object.fromEntries(TUNING_FIELDS.map(f => [f.id, inputs.get(f.id).value === '' ? null : Number(inputs.get(f.id).value) / scale(f)])) });
  });
  $('reset-tuning').addEventListener('click', () => send({ type: 'reset-tuning' }));
  return {
    saved() { previous = ''; },
    paint(state, locked) {
      $('tuning-section').hidden = !state?.tuning;
      const signature = JSON.stringify([state?.selectedLairId, state?.tuning]);
      if (signature !== previous && state?.tuning) {
        for (const f of TUNING_FIELDS) inputs.get(f.id).value = Math.round(state.tuning[f.id] * scale(f) * 10000) / 10000;
        $('tuning-note').textContent = 'Saved values. Changes apply to the next run; the current run keeps its settings.';
        previous = signature;
      }
      for (const input of inputs.values()) input.disabled = locked || !state?.tuning;
      $('save-tuning').disabled = $('reset-tuning').disabled = locked || !state?.tuning;
    }
  };
}
