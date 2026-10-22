import test from 'node:test';
import assert from 'node:assert/strict';
import { setupGameDisplay } from '../src/game-screen.js';
import { createInput } from '../src/input.js';

function fixture(t) {
  class Surface extends EventTarget {
    attrs = {}; dataset = {}; open = false; hidden = false; textContent = '';
    closest() { return null; } focus() { this.focused = true; }
    contains(node) { return node === this; }
    setAttribute(key, value) { this.attrs[key] = value; }
  }
  const old = Object.fromEntries(['window', 'document', 'HTMLElement', 'KeyboardEvent'].map(k => [k, globalThis[k]]));
  t.after(() => { for (const [k, v] of Object.entries(old)) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v; } });
  const win = globalThis.window = new Surface(), doc = globalThis.document = new Surface();
  globalThis.HTMLElement = Surface;
  globalThis.KeyboardEvent = class extends Event { constructor(type, props) { super(type, props); this.code = props.code; } };
  const elements = Object.fromEntries(['game-menu', 'fullscreen', 'fullscreen-label', 'toggle-map', 'dungeon-map', 'screen-message', 'status'].map(id => [id, new Surface()]));
  doc.querySelector = selector => elements[selector.slice(1)];
  doc.documentElement = new Surface();
  const canvas = new Surface(); canvas.dispatchEvent = event => win.dispatchEvent(event);
  const key = code => win.dispatchEvent(new KeyboardEvent('keydown', { code, cancelable: true }));
  return { win, doc, canvas, elements, key };
}

test('fullscreen targets the document, handles browser exit and explains unavailable or denied requests', async t => {
  const { doc, canvas, elements } = fixture(t);
  let enters = 0, exits = 0;
  doc.fullscreenEnabled = true;
  doc.documentElement.requestFullscreen = async function () {
    assert.equal(this, doc.documentElement, 'menus and station dialogs must stay inside fullscreen');
    enters++; doc.fullscreenElement = this; doc.dispatchEvent(new Event('fullscreenchange'));
  };
  doc.exitFullscreen = async () => { exits++; doc.fullscreenElement = null; doc.dispatchEvent(new Event('fullscreenchange')); };
  setupGameDisplay(canvas);
  const click = async () => { elements.fullscreen.dispatchEvent(new Event('click')); await new Promise(resolve => setImmediate(resolve)); };
  await click(); assert.equal(enters, 1); assert.equal(elements.fullscreen.attrs['aria-pressed'], 'true');
  assert.equal(elements['fullscreen-label'].textContent, 'Windowed');
  await click(); assert.equal(exits, 1); assert.equal(elements.fullscreen.attrs['aria-pressed'], 'false');
  doc.fullscreenElement = doc.documentElement; doc.dispatchEvent(new Event('fullscreenchange'));
  doc.fullscreenElement = null; doc.dispatchEvent(new Event('fullscreenchange'));
  assert.equal(elements.fullscreen.attrs['aria-label'], 'Enter fullscreen');
  doc.documentElement.requestFullscreen = async () => { throw new Error('Browser denied request'); };
  await click(); assert.match(elements['screen-message'].textContent, /could not open/);
  doc.fullscreenEnabled = false; await click(); assert.match(elements['screen-message'].textContent, /unavailable/);
});

test('menu clears held controls, blocks movement until closed, and map toggle preserves gameplay controls', t => {
  const { doc, win, canvas, elements, key } = fixture(t);
  setupGameDisplay(canvas);
  const input = createInput(win), menu = elements['game-menu'];
  key('KeyW'); key('KeyE'); assert.equal(input.read().y, -1); assert.equal(input.held('KeyE'), true);
  menu.open = true; menu.dispatchEvent(new Event('toggle'));
  assert.deepEqual(input.read(), { x: 0, y: 0 }); assert.equal(input.held('KeyE'), false);
  key('KeyD'); key('KeyE'); assert.deepEqual(input.read(), { x: 0, y: 0 }); assert.equal(input.held('KeyE'), false);
  key('Escape'); assert.equal(menu.open, false); assert.equal(canvas.focused, true);
  menu.dispatchEvent(new Event('toggle')); key('KeyD'); assert.equal(input.read().x, 1);
  elements['toggle-map'].dispatchEvent(new Event('click'));
  assert.equal(elements['dungeon-map'].hidden, true); assert.equal(elements['toggle-map'].attrs['aria-pressed'], 'false');
  assert.equal(input.read().x, 1);
  elements['toggle-map'].dispatchEvent(new Event('click')); assert.equal(elements['dungeon-map'].hidden, false);
  menu.open = true; menu.dispatchEvent(new Event('toggle'));
  doc.dispatchEvent(new Event('pointerdown')); assert.equal(menu.open, false);
});
