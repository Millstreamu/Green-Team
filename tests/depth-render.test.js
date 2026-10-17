import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRenderer } from '../src/render.js';
import { CONFIG } from '../src/config.js';

test('actual renderer sorts goblins, guards and furniture by grounded positions, with UI above bodies', async t => {
  const old = Object.fromEntries(['Image', 'fetch', 'ResizeObserver', 'document'].map(k => [k, globalThis[k]]));
  t.after(() => Object.assign(globalThis, old));
  globalThis.Image = class { naturalWidth = 128; naturalHeight = 64; async decode() {} };
  globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(readFileSync(new URL('../assets/human/GreenTeam-tileset.json', import.meta.url), 'utf8')) });
  globalThis.ResizeObserver = class { constructor(fn) { this.fn = fn; } observe() { this.fn(); } };
  const calls = [];
  const ctx = new Proxy({
    fillRect() { calls.push(this.fillStyle); },
    drawImage(image) { if (image.src === 'assets/goblin.png') calls.push('goblin'); },
    fillText(text) { calls.push(text); },
    createRadialGradient() { return { addColorStop() {} }; }
  }, { get: (obj, key) => obj[key] ?? (() => {}) });
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  const canvas = { getContext: () => ctx, getBoundingClientRect: () => ({ width: 800, height: 600 }) };
  const render = await createRenderer(canvas, { getContext: () => ctx });
  const world = { width: 12, height: 12, rooms: [], tiles: new Uint8Array(144).fill(1), seed: 1 };
  const prop = { id: 'cupboard', type: 'cupboard', x: 5.5, y: 5.5, tileX: 5, tileY: 5, height: 1 };
  const guard = { x: 5.5, y: 7, state: 'patrol', behaviour: 'lookout', angle: 0 };
  const draw = (y, hop = 0, teammates = [], cages = []) => {
    calls.length = 0;
    render(world, { x: 5.5, y, facing: -1, name: 'Player', moving: hop !== 0, phase: hop }, { held: null, ground: [] }, null, { entrance: { x: 2, y: 2 }, cages, rescues: [] }, false, [guard], [prop], prop, {}, [], null, [], [], null, null, teammates);
    return [...calls];
  };
  for (const phase of [0, Math.PI / 2]) {
    let order = draw(4.8, phase);
    assert.ok(order.indexOf('goblin') < order.indexOf('#40534a'));
    assert.ok(order.indexOf('#40534a') < order.indexOf('#557d89'));
    assert.ok(order.indexOf('HOLD E') > order.indexOf('#557d89'));
    assert.ok(order.indexOf('Player') > order.indexOf('#557d89'));
    order = draw(7.5, phase);
    assert.ok(order.indexOf('#40534a') < order.indexOf('#557d89'));
    assert.ok(order.indexOf('#557d89') < order.indexOf('goblin'));
  }
  const order = draw(7.5, 0, [{ x: 5.5, y: 4.5, facing: -1 }]);
  assert.ok(order.indexOf('goblin') < order.indexOf('#40534a'));
  assert.ok(order.lastIndexOf('goblin') > order.indexOf('#557d89'));
  const cage = { x: 5.5, y: 5.5, prisoners: ['captive'] };
  const captiveOrder = draw(5.5, 0, [], [cage]);
  assert.ok(captiveOrder.indexOf('#4b5554') < captiveOrder.indexOf('goblin'));
  assert.ok(captiveOrder.indexOf('goblin') < captiveOrder.indexOf('#a4aaa0'));
  const frontOrder = draw(6.3, 0, [], [cage]);
  assert.ok(frontOrder.indexOf('#a4aaa0') < frontOrder.indexOf('goblin'));
  assert.equal(CONFIG.tile, 24);
});
