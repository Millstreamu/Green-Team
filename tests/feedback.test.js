import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedback } from '../src/feedback.js';

function fixture(t, reduced = false) {
  class Surface extends EventTarget {
    dataset = {}; animations = []; attrs = {};
    setAttribute(k, v) { this.attrs[k] = v; }
    animate(frames, options) { this.animations.push({ frames, options }); }
  }
  const old = { window: globalThis.window, document: globalThis.document };
  t.after(() => Object.assign(globalThis, old));
  const elements = new Map(), get = id => { if (!elements.has(id)) elements.set(id, new Surface()); return elements.get(id); };
  const doc = globalThis.document = new Surface(), win = globalThis.window = new Surface();
  doc.querySelector = s => get(s.slice(1)); win.matchMedia = () => ({ matches: reduced });
  const timers=[];win.setTimeout=fn=>timers.push(fn);
  let created = 0, started = 0;
  win.AudioContext = class {
    state = 'suspended'; currentTime = 0; destination = {};
    constructor() { created++; }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    createOscillator() { return { frequency: {}, connect() {}, disconnect() {}, start() { started++; }, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  };
  return { doc, win, get, timers, created: () => created, started: () => started };
}

test('feedback is visual before audio unlock, optional, mutable with sound toggle and reduced motion', t => {
  const f = fixture(t, true), feedback = createFeedback();
  feedback.result(false); assert.equal(f.get('sack-grid').dataset.feedback, 'blocked'); assert.equal(f.created(), 0);
  assert.equal(f.get('sack-grid').animations[0].options.duration, 240);
  f.doc.dispatchEvent(new Event('pointerdown')); assert.equal(f.created(), 1);
  feedback.play('pickup'); assert.equal(f.started(), 2);
  f.get('toggle-sound').dispatchEvent(new Event('click')); assert.equal(f.get('toggle-sound').attrs['aria-pressed'], 'false');
  feedback.play('lair', '#lair-station-shell'); assert.equal(f.started(), 2); assert.equal(f.get('book-sprite').dataset.feedback, 'lair'); assert.equal(f.get('lair-station-shell').animations.length,0);
  assert.ok(f.get('book-sprite').animations[0].frames.every(frame=>!('transform' in frame)));
  f.get('toggle-sound').dispatchEvent(new Event('click')); feedback.play('blocked'); assert.equal(f.started(), 4);
  assert.equal(f.get('toggle-sound').textContent, 'Sound on');
  f.win.AudioContext = class { constructor() { throw Error('unavailable'); } };
  const noAudio = createFeedback(); f.doc.dispatchEvent(new Event('keydown'));
  assert.doesNotThrow(() => noAudio.result(true));
});

test('online feedback waits for a matching private receipt, ignores duplicates, unknown actions and stale connections', t => {
  const f = fixture(t), feedback = createFeedback();
  const sent = feedback.request({ type: 'pickup', id: 'ruby' });
  assert.ok(sent.feedbackId); assert.equal(f.get('sack-panel').animations.length, 0);
  feedback.receive({ feedbackId: sent.feedbackId, action: 'take', ok: true });
  assert.equal(f.get('sack-panel').animations.length, 0);
  const receipt = { feedbackId: sent.feedbackId, action: 'pickup', ok: true };
  feedback.receive(receipt); assert.equal(f.get('sack-panel').dataset.feedback, 'pickup');
  feedback.receive(receipt); assert.equal(f.get('sack-panel').animations.length, 1);
  const moved = feedback.request({ type: 'move-packed', id: 'ruby', x: 0, y: 1 });
  feedback.receive({ ...moved, action: 'move-packed', ok: true }); assert.equal(f.get('sack-grid').animations.length, 0, 'valid rearrangement stays quiet');
  const failed = feedback.request({ type: 'rotate-packed', id: 'sword' });
  feedback.receive({ ...failed, action: failed.type, ok: false }); assert.equal(f.get('sack-grid').dataset.feedback, 'blocked');
  const lair = feedback.request({ type: 'craft', item: 'snare' });
  feedback.receive({ ...lair, action: 'craft', ok: true }); assert.equal(f.get('book-sprite').dataset.feedback, 'lair'); assert.equal(f.get('lair-station-shell').animations.length,0);
  const stale = feedback.request({ type: 'return', id: 'sword' }); feedback.reset();
  feedback.receive({ ...stale, action: 'return', ok: true }); assert.equal(f.get('book-sprite').animations.length, 1);
  assert.deepEqual(feedback.request({ type: 'move', x: 1, y: 0 }), { type: 'move', x: 1, y: 0 });
});

 test('station feedback pulses only its item icon and respects reduced motion', t => {
  const f=fixture(t), feedback=createFeedback();f.get('lair-panel').dataset.mode='stash';
  feedback.result(true,'lair','#lair-station-shell');
  const pulse=f.get('stash-action-icon').animations[0];
  assert.equal(pulse.options.duration,300);assert.equal(pulse.frames[1].transform,'scale(1.1)');
  assert.equal(pulse.frames.at(-1).transform,'scale(1)');assert.ok(pulse.frames.every(frame=>!('boxShadow' in frame)));
  assert.equal(f.get('lair-station-shell').animations.length,0);assert.equal(f.get('book-sprite').animations.length,0);
});

test('last transferred icon stays visible for feedback and older cleanup cannot erase a newer selection', t => {
 const f=fixture(t), feedback=createFeedback();f.get('lair-panel').dataset.mode='stash';
 const icon=f.get('stash-action-icon');icon.dataset.itemType='';icon.feedbackSnapshot={};let drawn=0,cleared=0;
 icon.getContext=()=>({drawImage(){drawn++;},clearRect(){cleared++;}});
 feedback.play('lair','#lair-station-shell');assert.equal(drawn,1);const old=f.timers.at(-1);
 feedback.play('lair','#lair-station-shell');old();assert.equal(cleared,0);
 icon.dataset.itemType='smoke';f.timers.at(-1)();assert.equal(cleared,0,'newly selected icon survives');
 icon.dataset.itemType='';feedback.play('lair','#lair-station-shell');f.timers.at(-1)();assert.equal(cleared,1);
});
