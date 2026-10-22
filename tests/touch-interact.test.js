import test from 'node:test';
import assert from 'node:assert/strict';
import { setupTouchInteract } from '../src/game-screen.js';
import { createInput } from '../src/input.js';

test('touch E shares held keyboard input and releases on cancel, capture loss and focus loss', () => {
  class Surface extends EventTarget {
    closest() { return null; }
    focus() {}
    setPointerCapture(id) { this.capture = id; }
    setAttribute() {}
    classList = { add() {}, remove() {} };
  }
  const old = Object.fromEntries(['document', 'window', 'HTMLElement', 'KeyboardEvent'].map(k => [k, globalThis[k]]));
  try {
    const win = globalThis.window = new Surface();
    const doc = globalThis.document = new Surface();
    globalThis.HTMLElement = Surface;
    globalThis.KeyboardEvent = class extends Event { constructor(type, props) { super(type, props); Object.assign(this, { code: props.code, key: props.key, repeat: props.repeat }); } };
    const canvas = new Surface(), button = new Surface();
    // Model canvas -> window keyboard bubbling, as in the real DOM.
    canvas.dispatchEvent = event => { const result = EventTarget.prototype.dispatchEvent.call(canvas, event); if (event.bubbles && !event.cancelBubble) win.dispatchEvent(event); return result; };
    doc.querySelector = () => button;
    setupTouchInteract(canvas);
    const input = createInput(win);
    let starts = 0, ends = 0;
    win.addEventListener('keydown', e => { assert.equal(e.code, 'KeyE'); starts++; });
    win.addEventListener('keyup', () => ends++);
    const pointer = (type, id = 1) => { const e = new Event(type, { cancelable: true }); Object.assign(e, { pointerId: id, button: 0 }); button.dispatchEvent(e); };
    pointer('pointerdown');
    assert.equal(input.held('KeyE'), true);
    pointer('pointerdown', 2); pointer('pointerup', 2);
    assert.equal(starts, 1); assert.equal(input.held('KeyE'), true);
    pointer('pointerup'); assert.equal(input.held('KeyE'), false);
    for (const type of ['pointercancel', 'lostpointercapture']) {
      pointer('pointerdown'); pointer(type); assert.equal(input.held('KeyE'), false);
    }
    pointer('pointerdown'); win.dispatchEvent(new Event('blur')); assert.equal(input.held('KeyE'), false);
    pointer('pointerdown'); doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); assert.equal(input.held('KeyE'), false);
    assert.equal(starts, 5); assert.equal(ends, 5);
    for (const type of ['selectstart', 'contextmenu']) { const event = new Event(type, { cancelable: true }); button.dispatchEvent(event); assert.equal(event.defaultPrevented, true); }
  } finally { for (const [key, value] of Object.entries(old)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } }
});

test('movement stick and action buttons work with two thumbs, dead zone and inventory pause', async () => {
  const { setupGameScreen } = await import('../src/game-screen.js');
  class Surface extends EventTarget {
    style = { setProperty() {} }; dataset = {}; classList = { add() {}, remove() {} };
    closest() { return null; } focus() {} setPointerCapture() {} setAttribute() {}
    getBoundingClientRect() { return { left: 0, top: 0, width: 112, height: 112 }; }
  }
  const old = Object.fromEntries(['document', 'window', 'HTMLElement', 'KeyboardEvent'].map(k => [k, globalThis[k]]));
  try {
    const win = globalThis.window = new Surface(), doc = globalThis.document = new Surface();
    globalThis.HTMLElement = Surface;
    globalThis.KeyboardEvent = class extends Event { constructor(type, props) { super(type, props); Object.assign(this, { code: props.code, repeat: false }); } };
    const ids = ['touch-move-zone', 'touch-stick', 'touch-interact', 'touch-use', 'touch-sack', 'touch-rotate', 'touch-cancel', 'touch-lift'];
    const elements = Object.fromEntries(ids.map(id => [id, new Surface()]));
    doc.querySelector = selector => elements[selector.slice(1)];
    const canvas = new Surface(); canvas.dispatchEvent = event => { const result = EventTarget.prototype.dispatchEvent.call(canvas, event); if (event.bubbles && !event.cancelBubble) win.dispatchEvent(event); return result; };
    setupGameScreen(canvas);
    let open = false; const input = createInput(win, () => open), actions = [];
    win.addEventListener('keydown', e => actions.push(e.code));
    let lifted = 0; canvas.addEventListener('touchlift', () => lifted++);
    const pointer = (id, type, pointerId, x = 56, y = 56, pointerType = 'touch') => {
      const event = new Event(type, { cancelable: true });
      Object.assign(event, { pointerId, clientX: x, clientY: y, button: 0, pointerType }); (id === 'touch-stick' ? canvas : elements[id]).dispatchEvent(event);
    };
    pointer('touch-stick', 'pointerdown', 1); assert.deepEqual(input.read(), { x: 0, y: 0 });
    pointer('touch-stick', 'pointermove', 1, 105, 105); assert.deepEqual(input.read(), { x: 1, y: 1 });
    pointer('touch-interact', 'pointerdown', 2); assert.equal(input.held('KeyE'), true);
    assert.deepEqual(input.read(), { x: 1, y: 1 });
    pointer('touch-stick', 'pointerup', 2); assert.deepEqual(input.read(), { x: 1, y: 1 });
    pointer('touch-interact', 'pointerup', 2); assert.equal(input.held('KeyE'), false);
    pointer('touch-stick', 'pointercancel', 1);
    assert.equal(elements['touch-move-zone'].dataset.active, 'false'); assert.deepEqual(input.read(), { x: 0, y: 0 });
    pointer('touch-stick', 'pointerdown', 1, 160, 56);
    assert.equal(elements['touch-move-zone'].dataset.active, 'false', 'right-hand touches must not become movement');
    pointer('touch-stick', 'pointerdown', 1, 56, 56, 'mouse');
    assert.equal(elements['touch-move-zone'].dataset.active, 'false', 'mouse gameplay stays available on hybrid devices');
    open = true; pointer('touch-stick', 'pointerdown', 1, 105, 56); assert.deepEqual(input.read(), { x: 0, y: 0 });
    pointer('touch-stick', 'pointerup', 1); open = false;
    for (const [id, code] of [['touch-use', 'Space'], ['touch-sack', 'Tab'], ['touch-cancel', 'Escape']]) {
      pointer(id, 'pointerdown', 3); pointer(id, 'pointerup', 3); assert.equal(actions.at(-1), code);
    }
    let rotations = 0; canvas.addEventListener('touchrotate', () => rotations++);
    pointer('touch-rotate', 'pointerdown', 3); pointer('touch-rotate', 'pointerup', 3); assert.equal(rotations, 1);
    pointer('touch-lift', 'pointerdown', 3); pointer('touch-lift', 'pointerup', 3); assert.equal(lifted, 1);
    pointer('touch-stick', 'pointerdown', 1, 50, 80); assert.equal(input.read().x, 0);
    assert.equal(elements['touch-move-zone'].dataset.active, 'true');
    pointer('touch-stick', 'pointermove', 1, 3, 80); assert.equal(input.read().x, -1);
    input.clearMovement(); assert.deepEqual(input.read(), { x: 0, y: 0 });
    pointer('touch-stick', 'pointermove', 1, 3, 80); win.dispatchEvent(new Event('blur')); assert.deepEqual(input.read(), { x: 0, y: 0 });
    for (const type of ['resize', 'orientationchange']) {
      pointer('touch-stick', 'pointerdown', 1, 56, 56); pointer('touch-stick', 'pointermove', 1, 105, 56);
      pointer('touch-interact', 'pointerdown', 2); assert.equal(input.held('KeyE'), true);
      win.dispatchEvent(new Event(type));
      assert.deepEqual(input.read(), { x: 0, y: 0 }); assert.equal(input.held('KeyE'), false);
      assert.equal(elements['touch-move-zone'].dataset.active, 'false');
      pointer('touch-stick', 'pointermove', 1, 105, 56); assert.equal(input.read().x, 0, 'old captured contact cannot restart movement');
    }
    pointer('touch-stick', 'pointerdown', 1, 56, 56); pointer('touch-stick', 'pointermove', 1, 105, 56); doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); assert.deepEqual(input.read(), { x: 0, y: 0 });
  } finally { for (const [key, value] of Object.entries(old)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } }
});
