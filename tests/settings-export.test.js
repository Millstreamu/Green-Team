import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettingsExport, downloadSettings } from '../src/settings-export.js';
import { DEFAULT_TUNING } from '../src/tuning.js';
import { GENERATOR_PRESETS } from '../src/generator-settings.js';

test('shareable settings preserve tuned values and all architectures while omitting invite keys, identities and progress', () => {
  const summary = { selectedLairId: 'private-id', lairs: [{ id: 'private-id', name: 'Our Lair!', code: 'SECRET' }],
    players: [{ token: 'reconnect-secret', xp: 999 }], camp: { gold: 123 }, backups: ['private-backup'],
    tuning: { ...DEFAULT_TUNING, sight: 3, nearEmptyChance: .85 }, generator: structuredClone(GENERATOR_PRESETS) };
  summary.generator.hold.corridorWidth = 2;
  const exported = createSettingsExport(summary, new Date('2026-10-17T10:30:00Z')), data = JSON.parse(exported.text);
  assert.equal(exported.filename, 'green-team-settings-our-lair.json');
  assert.equal(data.format, 'green-team-builder-settings'); assert.equal(data.version, 1);
  assert.deepEqual(data.tuning, summary.tuning); assert.deepEqual(data.generator, summary.generator);
  for (const secret of ['private-id', 'SECRET', 'reconnect-secret', 'private-backup', '999']) assert.ok(!exported.text.includes(secret));
  assert.deepEqual(Object.keys(data).sort(), ['format', 'version', 'gameVersion', 'exportedAt', 'lairName', 'tuning', 'generator'].sort());
  assert.throws(() => createSettingsExport({ ...summary, selectedLairId: 'missing' }), /Choose a lair/);
  assert.throws(() => createSettingsExport({ ...summary, tuning: { ...DEFAULT_TUNING, sight: 1000 } }), /Invalid tuning/);
  assert.throws(() => createSettingsExport({ ...summary, generator: null }), /Choose a lair/);
});

test('settings download produces a JSON browser file and cleans up its temporary link', async t => {
  const original = { document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL, timeout: globalThis.setTimeout };
  t.after(() => { globalThis.document = original.document; URL.createObjectURL = original.create; URL.revokeObjectURL = original.revoke; globalThis.setTimeout = original.timeout; });
  let blob, revoked, cleanup, clicked = false, removed = false;
  const anchor = { click() { clicked = true; }, remove() { removed = true; } };
  globalThis.document = { createElement: () => anchor, body: { appendChild(node) { assert.equal(node, anchor); } } };
  URL.createObjectURL = value => { blob = value; return 'blob:settings-test'; };
  URL.revokeObjectURL = value => { revoked = value; };
  globalThis.setTimeout = fn => { cleanup = fn; };
  downloadSettings({ filename: 'settings.json', text: '{"test":1}\n' });
  assert.equal(blob.type, 'application/json'); assert.equal(await blob.text(), '{"test":1}\n');
  assert.equal(anchor.download, 'settings.json'); assert.equal(anchor.href, 'blob:settings-test');
  assert.ok(clicked && removed); cleanup(); assert.equal(revoked, 'blob:settings-test');
});
