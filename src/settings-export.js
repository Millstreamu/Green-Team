import { validateTuning } from './tuning.js';
import { generatorSettings } from './generator-settings.js';

// This is a shareable settings file, deliberately projected from an admin summary.
export function createSettingsExport(summary, now = new Date()) {
  const lair = summary?.lairs?.find(l => l.id === summary.selectedLairId);
  if (!lair || !summary.tuning || !summary.generator) throw Error('Choose a lair with saved builder settings first.');
  const data = {
    format: 'green-team-builder-settings', version: 1, gameVersion: 'V78', exportedAt: now.toISOString(),
    lairName: lair.name,
    tuning: validateTuning(summary.tuning), generator: generatorSettings(summary.generator)
  };
  const label = lair.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'lair';
  return { filename: `green-team-settings-${label}.json`, text: JSON.stringify(data, null, 2) + '\n' };
}
export function downloadSettings(file) {
  const url = URL.createObjectURL(new Blob([file.text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  try {
    anchor.href = url; anchor.download = file.filename;
    document.body.appendChild(anchor); anchor.click();
  } finally {
    anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
