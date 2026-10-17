import test from 'node:test';
import assert from 'node:assert/strict';
import { createLairSession } from '../server/lair-session.js';

test('online entry reuses inventory commands and renders shared goblins without touching solo saves', async t => {
  class Surface {
    constructor(id = '') { this.id = id; this.listeners = {}; this.style = {}; this.dataset = {}; this.width = 0; this.height = 0; this.textContent = ''; }
    addEventListener(type, callback) { (this.listeners[type] ??= []).push(callback); }
    send(type, properties = {}) {
      const event = { target: this, code: '', button: 0, preventDefault() {}, ...properties };
      for (const callback of this.listeners[type] ?? []) callback(event);
    }
    getBoundingClientRect() { return this.id === 'sack-grid' ? { left: 700, top: 370, right: 868, bottom: 538, width: 168, height: 168 } : { left: 0, top: 0, right: 900, bottom: 600, width: 900, height: 600 }; }
    getContext() { return new Proxy({}, { get: (obj, key) => obj[key] ?? (() => {}) }); }
    closest() { return null; }
    focus() { this.focused = true; }
    append(...children) { (this.children ??= []).push(...children); }
    replaceChildren() { this.children = []; }
    setAttribute() {}
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  const elements = new Map();
  const element = id => { if (!elements.has(id)) elements.set(id, new Surface(id)); return elements.get(id); };
  const doc = new Surface(), win = new Surface(), frames = [], intervals = [];
  doc.querySelector = selector => element(selector.slice(1));
  globalThis.HTMLElement = Surface; globalThis.document = doc; globalThis.window = win;
  globalThis.Image = class { async decode() {} };
  globalThis.ResizeObserver = class { constructor(callback) { this.callback = callback; } observe() { this.callback(); } };
  globalThis.requestAnimationFrame = callback => frames.push(callback);
  const realInterval = globalThis.setInterval;
  globalThis.setInterval = callback => intervals.push(callback);
  t.after(() => { globalThis.setInterval = realInterval; });
  globalThis.location = { protocol: 'http:', host: 'localhost:8080' };
  const stored = new Map();
  globalThis.sessionStorage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) };
  win.localStorage = { getItem() { assert.fail('Online entry read solo save'); }, setItem() { assert.fail('Online entry changed solo save'); } };
  const session = createLairSession(), player = session.connect(), other = session.connect();
  const sent = [];
  let socket;
  globalThis.WebSocket = class extends Surface {
    static OPEN = 1;
    constructor() { super(); socket = this; this.readyState = 1; }
    send(data) { sent.push(JSON.parse(data)); }
  };
  await import('../src/online-main.js');
  const receive = message => Surface.prototype.send.call(socket, 'message', { data: JSON.stringify(message) });
  Surface.prototype.send.call(socket, 'open');
  assert.equal(sent[0].type, 'hello');
  receive({ type: 'welcome', token: player.token });
  const sync = () => receive(session.snapshot(player));
  sync(); frames.shift()();
  assert.match(element('target-label').textContent, /Tab/);
  const key = code => win.send('keydown', { code, target: element('game') });
  key('Tab'); assert.equal(element('lair-panel').open, true);
  assert.equal(element('debug-pack-snare').hidden, true);
  const stock = session.snapshot(player).camp.counts.snare;
  const slot = session.snapshot(player).camp.slots.indexOf('snare');
  element('stash-grid').send('pointerdown', { clientX: (slot % 6 + .5) * 150, clientY: (Math.floor(slot / 6) + .5) * 100 });
  const command = sent.at(-1); assert.equal(command.type, 'take'); assert.equal(command.item, 'snare');
  assert.equal(session.snapshot(player).camp.counts.snare, stock);
  assert.equal(session.action(player, command), true); sync();
  assert.equal(player.bag.length, 1); assert.equal(other.bag.length, 0);
  element('lair-sack-grid').send('keydown', { code: 'KeyE' });
  assert.equal(sent.at(-1).type, 'return');
  assert.equal(session.action(player, sent.at(-1)), true); sync();
  element('lair-panel').send('keydown', { code: 'Tab' });
  assert.equal(element('lair-panel').open, false);
  player.x = 5; player.y = 2.5; sync(); key('KeyE');
  assert.equal(element('map-planning').open, true);
  element('difficulty-choice').value = 'hard'; element('confirm-job').send('click');
  assert.equal(sent.at(-2).type, 'destination');
  assert.equal(session.action(player, sent.at(-2)), true); sync();
  assert.equal(session.snapshot(other).cart.selection.difficultyId, 'hard');
  intervals[0](); assert.equal(sent.at(-1).type, 'move');
  frames.shift()();
  assert.match(element('destination-label').textContent, /Hard/);
  assert.equal(stored.get('green-team-test-token'), player.token);
});
