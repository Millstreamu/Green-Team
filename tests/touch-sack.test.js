import test from 'node:test';
import assert from 'node:assert/strict';
import { setupTouchSack } from '../src/touch-sack.js';
import { movePackedItem, rotatePackedItem, itemCount } from '../src/loot.js';
import { createDungeonSession } from '../server/dungeon-session.js';
import { createCamp } from '../src/lair.js';
import { createProfile } from '../src/profile.js';
import { selectJob } from '../src/jobs.js';

const item = (id, type, x, y, extra = {}) => ({ id, type, x, y, rotation: 0, ...extra });

test('packed moves reject blocked/outside positions without lifting, and preserve partial coin stacks and bag aliases', () => {
  const state = { held: null, bag: [item('a', 'coin', 0, 0, { count: 7 }), item('b', 'coin', 1, 0, { count: 8 }), item('r', 'ruby', 2, 0)] };
  const bag = state.bag, before = structuredClone(state);
  assert.equal(movePackedItem(state, 'a', 2, 0), false); assert.deepEqual(state, before);
  for (const x of [-1, 3, .5, NaN]) assert.equal(movePackedItem(state, 'a', x, 1), false);
  assert.equal(movePackedItem(state, 'a', 1, 0), true);
  assert.equal(state.bag, bag); assert.equal(state.held, null);
  assert.equal(state.bag.find(p => p.id === 'b').count, 9);
  assert.deepEqual(state.bag.find(p => p.id === 'a'), item('a', 'coin', 0, 0, { count: 6 }));
  assert.equal(state.bag.filter(p => p.type === 'coin').reduce((n, p) => n + itemCount(p), 0), 15);
  assert.ok(movePackedItem(state, 'r', 2, 2)); assert.equal(state.bag.find(p => p.id === 'r').y, 2);
});

test('selected rotation fits at bag edges and rejects collisions without losing or lifting the item', () => {
  const state = { held: null, bag: [item('s', 'sword', 2, 0)] };
  assert.ok(rotatePackedItem(state, 's'));
  assert.deepEqual(state.bag[0], item('s', 'sword', 0, 0, { rotation: 1 }));
  state.bag.push(item('r', 'ruby', 0, 1)); const before = structuredClone(state);
  assert.equal(rotatePackedItem(state, 's'), false); assert.deepEqual(state, before);
  assert.equal(rotatePackedItem(state, 'missing'), false);
});

test('touch taps select, captured drags use release coordinates/grab offset, and cancellations commit nothing', t => {
  class Surface extends EventTarget { setPointerCapture() {} }
  const oldWindow = globalThis.window, oldDoc = globalThis.document;
  globalThis.window = new Surface(); globalThis.document = new Surface();
  t.after(() => { globalThis.window = oldWindow; globalThis.document = oldDoc; });
  const canvas = new Surface(), calls = [], state = { held: null, bag: [item('c', 'candlestick', 0, 0)] };
  let enabled = true;
  const sack = { cellAt: p => p.x >= 0 && p.y >= 0 && p.x < 300 && p.y < 300 ? { x: Math.floor(p.x / 100), y: Math.floor(p.y / 100) } : null,
    holdOpen() {}, selectAt() {}, selectItem: i => calls.push(['select', i.id]), setTouchDrag: d => calls.push(['preview', d]) };
  setupTouchSack({ canvas, sack, getLoot: () => state, enabled: () => enabled, onBegin() {}, move: (...args) => calls.push(['move', ...args]), place: (...args) => calls.push(['place', ...args]), onBlocked: () => calls.push(['blocked']) });
  const pointer = (type, x, y, id = 1) => {
    const e = new Event(type, { cancelable: true }); Object.assign(e, { pointerId: id, pointerType: 'touch', button: 0, clientX: x, clientY: y }); canvas.dispatchEvent(e);
  };
  pointer('pointerdown', 50, 150); pointer('pointerup', 52, 151);
  assert.equal(calls.filter(c => c[0] === 'select').length, 1); assert.equal(calls.filter(c => c[0] === 'move').length, 0); assert.equal(state.held, null);
  pointer('pointerdown', 50, 150); pointer('pointermove', 250, 250); pointer('pointerup', 250, 250);
  assert.deepEqual(calls.find(c => c[0] === 'move'), ['move', 'c', 2, 1], 'grabbed lower square retains its offset despite capture');
  pointer('pointerdown', 50, 150); pointer('pointerup', 150, 250);
  assert.deepEqual(calls.filter(c => c[0] === 'move').at(-1), ['move', 'c', 1, 1], 'fast drag still commits when no intermediate move was delivered');
  const count = calls.filter(c => c[0] === 'move').length;
  for (const type of ['pointercancel', 'lostpointercapture']) { pointer('pointerdown', 50, 150); pointer('pointermove', 150, 150); pointer(type, 150, 150); pointer('pointerup', 150, 150); }
  pointer('pointerdown', 50, 150); window.dispatchEvent(new Event('gamecontrolsreset')); pointer('pointerup', 150, 250);
  pointer('pointerdown', 50, 150); pointer('pointermove', 400, 150); pointer('pointerup', 400, 150);
  assert.equal(calls.filter(c => c[0] === 'blocked').length, 1, 'outside drag flashes failure, cancelled drags stay quiet');
  pointer('pointerdown', 50, 150); pointer('pointerup', 250, 250, 2); enabled = false; pointer('pointerup', 250, 250);
  assert.equal(calls.filter(c => c[0] === 'move').length, count);
});

test('server commits one packed move/rotation and rejects foreign IDs, forged coordinates and downed actions', () => {
  const a = { id: 'a', name: 'A', connected: true, bag: [], profile: createProfile('a') }, b = { id: 'b', name: 'B', connected: true, bag: [], profile: createProfile('b') };
  const d = createDungeonSession({ id: 'touch', seed: 42, job: selectJob('manor', 'normal') }, [a, b], createCamp());
  a.bag.push(item('s', 'sword', 2, 0)); b.bag.push(item('other', 'ruby', 0, 0));
  assert.ok(d.action(a, { type: 'rotate-packed', id: 's' })); assert.equal(a.bag[0].rotation, 1);
  assert.ok(d.action(a, { type: 'move-packed', id: 's', x: 0, y: 2, count: 999 }));
  assert.equal(a.bag, a.loot.bag); assert.equal(a.bag[0].y, 2); assert.equal(a.loot.held, null);
  assert.equal(d.action(a, { type: 'move-packed', id: 'other', x: 0, y: 0 }), false);
  assert.equal(d.action(a, { type: 'move-packed', id: 's', x: .5, y: 0 }), false);
  a.state = 'down'; assert.equal(d.action(a, { type: 'rotate-packed', id: 's' }), false);
});
