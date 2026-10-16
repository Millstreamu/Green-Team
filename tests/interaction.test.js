import test from 'node:test';
import assert from 'node:assert/strict';

// Exercise real event wiring without claiming this is a rendered browser test.
test('game loop connects packing, tunnel extraction, paused results and another run', async () => {
  class Surface {
    constructor(id = '') { this.id = id; this.listeners = {}; this.style = {}; this.width = 0; this.height = 0; this.textContent = ''; }
    addEventListener(type, callback) { (this.listeners[type] ??= []).push(callback); }
    send(type, properties = {}) {
      const event = { target: this, code: '', button: 0, preventDefault() {}, ...properties };
      for (const callback of this.listeners[type] ?? []) callback(event);
    }
    getBoundingClientRect() { return this.id === 'sack-grid' ? { left: 700, top: 370, right: 868, bottom: 538, width: 168, height: 168 } : { left: 0, top: 0, right: 900, bottom: 600, width: 900, height: 600 }; }
    getContext() { return new Proxy({}, { get: (obj, key) => obj[key] ?? (() => {}) }); }
    closest() { return null; }
    focus() {}
    append(...children) { (this.children ??= []).push(...children); }
    replaceChildren() { this.children = []; }
    setAttribute() {}
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  const elements = new Map(['game', 'sack-grid', 'map', 'held-ghost', 'status', 'seed', 'rooms', 'regenerate', 'sack-used', 'held-label', 'target-label', 'run-results', 'haul-list', 'empty-haul', 'haul-total', 'next-run'].map(id => [id, new Surface(id)]));
  const doc = new Surface(), win = new Surface(), frames = [];
  doc.querySelector = selector => elements.get(selector.slice(1));
  doc.createElement = tag => new Surface(tag);
  win.confirm = () => true;
  globalThis.HTMLElement = Surface; globalThis.document = doc; globalThis.window = win;
  globalThis.Image = class { async decode() {} };
  globalThis.ResizeObserver = class { constructor(callback) { this.callback = callback; } observe() { this.callback(); } };
  globalThis.requestAnimationFrame = callback => frames.push(callback);
  await import('../src/main.js');
  let clock = 0;
  const tick = () => frames.shift()(clock += 16);
  const key = code => win.send('keydown', { code, target: elements.get('game') });
  tick();
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  assert.match(elements.get('target-label').textContent, /Secret tunnel/);
  key('KeyD'); for (let i = 0; i < 14; i++) tick(); win.send('keyup', { code: 'KeyD' });
  assert.match(elements.get('target-label').textContent, /Ruby/);
  key('KeyE'); tick();
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  doc.send('pointerdown', { target: elements.get('sack-grid'), clientX: 710, clientY: 380 }); tick();
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  assert.match(elements.get('held-label').textContent, /Holding Ruby/);
  key('KeyR'); assert.match(elements.get('status').textContent, /rotated/);
  key('KeyE'); tick();
  assert.match(elements.get('status').textContent, /dropped nearby/);
  assert.equal(elements.get('held-label').textContent, 'Click an item to lift it');
  key('KeyE'); tick();
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  key('KeyA'); for (let i = 0; i < 14; i++) tick(); win.send('keyup', { code: 'KeyA' });
  assert.match(elements.get('target-label').textContent, /Secret tunnel/);
  key('KeyE'); tick();
  assert.equal(elements.get('run-results').open, true);
  assert.match(elements.get('haul-total').textContent, /^1 treasure/);
  const summary = elements.get('haul-total').textContent;
  key('KeyE'); key('KeyD'); for (let i = 0; i < 14; i++) tick();
  doc.send('pointerdown', { target: elements.get('sack-grid'), clientX: 710, clientY: 380 }); tick();
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  assert.equal(elements.get('haul-total').textContent, summary);
  assert.match(elements.get('target-label').textContent, /run complete/);
  elements.get('next-run').send('click'); tick();
  assert.equal(elements.get('run-results').open, false);
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  assert.match(elements.get('target-label').textContent, /Secret tunnel/);
});
