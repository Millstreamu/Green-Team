import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeneratorView } from '../src/generator-view.js';
import { GENERATOR_PRESETS } from '../src/generator-settings.js';

test('builder checks unsaved settings, yields during batches, cancels stale work and never sends save actions', async t => {
  const old = globalThis.document;
  t.after(() => { globalThis.document = old; });
  class Node {
    listeners = {}; children = []; value = ''; checked = true;
    addEventListener(type, fn) { this.listeners[type] = fn; }
    replaceChildren(...nodes) { this.children = nodes; }
    appendChild(node) { this.children.push(node); }
    setAttribute() {}
    getContext() { return { fillRect() {} }; }
    send(type) { return this.listeners[type]?.({ preventDefault() {} }); }
  }
  const nodes = new Map(), get = id => { if (!nodes.has(id)) nodes.set(id, new Node()); return nodes.get(id); };
  globalThis.document = { querySelector: s => get(s.slice(1)), createElement: () => new Node() };
  get('generator-seed').value = '42'; get('generator-difficulty').value = 'normal';
  const commands = [], view = createGeneratorView(command => commands.push(command));
  const state = { selectedLairId: 'one', generator: structuredClone(GENERATOR_PRESETS) };
  view.paint(state, false);
  assert.match(get('generator-check-summary').textContent, /Route checks passed/);
  const task = get('generator-batch').send('click');
  assert.equal(get('generator-batch').disabled, true);
  await task;
  assert.match(get('generator-batch-status').textContent, /30\/30 layouts checked.*No route problems/);
  assert.equal(commands.length, 0); assert.equal(get('generator-seed').value, '42');
  const stale = get('generator-batch').send('click');
  get('generator-seed').value = '43'; get('generator-seed').send('change'); await stale;
  assert.equal(get('generator-batch-status').textContent, '');
  const hidden = get('generator-batch').send('click'); view.paint({}, false); await hidden;
  assert.equal(get('generator-section').hidden, true); assert.equal(get('generator-batch-status').textContent, '');
  view.paint(state, false);
  // Unsaved but valid settings that only fit one room: warnings must be inspectable.
  const input = id => get('generator-fields').children.map(label => label.children[1]).find(node => node.id === 'generator-' + id);
  for (const [id, value] of Object.entries({ width: 40, height: 32, rooms: 4, minRoomWidth: 16, maxRoomWidth: 16, minRoomHeight: 14, maxRoomHeight: 14, maxCorridorLength: 8 })) input(id).value = value;
  await get('generator-batch').send('click');
  assert.match(get('generator-batch-status').textContent, /30 with warnings/);
  assert.equal(get('generator-batch-results').children.length, 30);
  const summary = get('generator-batch-status').textContent;
  get('generator-batch-results').children[2].send('click');
  assert.equal(get('generator-seed').value, 45);
  assert.match(get('generator-check-summary').textContent, /warnings/);
  assert.ok(get('generator-check-issues').children.some(node => /No cages/.test(node.textContent)));
  assert.equal(get('generator-batch-status').textContent, summary);
  assert.equal(commands.length, 0);
  get('generator-seed').value = ''; get('generator-preview').send('click');
  assert.match(get('generator-check-summary').textContent, /unavailable/);
  assert.equal(get('generator-map').width, 1); assert.equal(commands.length, 0);
});
