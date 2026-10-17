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
  doc.createElement = tag => new Surface(tag);
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
  assert.equal(session.action(player, { type: 'take', item: 'snare' }), true);
  for (const p of [player, other]) { p.x = 9; p.y = 2.5; session.action(p, { type: 'board' }); }
  for (let i = 0; i < 61; i++) session.tick(.05);
  sync(); frames.shift()(16);
  assert.equal(element('sack-tab').hidden, false);
  assert.match(element('rooms').textContent, /rooms/);
  const dungeon = session.snapshot(player).dungeon, chest = dungeon.objects[0];
  player.x = chest.x; player.y = chest.y + .8; sync();
  doc.send('pointermove', { target: element('game'), clientX: 450, clientY: 300 - .8 * 24 * 2 });
  key('KeyE'); assert.equal(sent.at(-1).type, 'search'); assert.equal(sent.at(-1).id, chest.id);
  assert.equal(session.action(player, sent.at(-1)), true);
  for (let i = 0; i < 80; i++) {
    intervals[0](); session.action(player, sent.at(-1)); session.tick(.05);
  }
  sync(); frames.shift()(32);
  assert.equal(session.snapshot(other).dungeon.objects[0].searched, true, JSON.stringify({seed:dungeon.seed, input: player.input, pos: {x:player.x,y:player.y}, chest, search:player.search, last:sent.at(-1)}));
  win.send('keyup', { code: 'KeyE', target: element('game') });
  assert.equal(sent.at(-1).type, 'cancel-search'); session.action(player, sent.at(-1));
  key('Tab'); frames.shift()(48);
  assert.equal(element('sack-panel').dataset.open, 'true');
  // A delayed moving snapshot must not immediately close the manually opened sack.
  player.moving = true; sync(); frames.shift()(64);
  assert.equal(element('sack-panel').dataset.open, 'true');
  player.moving = false;
  doc.send('pointerdown', { target: element('sack-grid'), clientX: 728, clientY: 398 });
  assert.equal(sent.at(-1).type, 'lift');
  const id = player.bag[0].id;
  assert.equal(session.action(player, sent.at(-1)), true); sync();
  assert.equal(player.loot.held.id, id);
  key('KeyR'); assert.equal(sent.at(-1).type, 'rotate'); session.action(player, sent.at(-1)); sync();
  doc.send('pointerdown', { target: element('sack-grid'), clientX: 840, clientY: 510 });
  assert.equal(sent.at(-1).type, 'place'); assert.equal(session.action(player, sent.at(-1)), true); sync();
  assert.equal(player.bag[0].x, 2); assert.equal(player.bag[0].y, 2);
  doc.send('pointerdown', { target: element('sack-grid'), clientX: 840, clientY: 510 });
  session.action(player, sent.at(-1)); sync();
  key('KeyE'); assert.equal(sent.at(-1).type, 'drop'); session.action(player, sent.at(-1)); sync();
  const dropped = session.snapshot(player).dungeon.ground.find(item => item.id === id);
  player.x = dropped.x; player.y = dropped.y; sync();
  key('Tab'); frames.shift()(80);
  key('KeyE'); assert.equal(sent.at(-1).type, 'pickup'); assert.equal(sent.at(-1).id, id);
  session.action(player, sent.at(-1)); sync();
  assert.equal(player.bag[0].id, id);
  Object.assign(player, dungeon.entrance); Object.assign(other, dungeon.entrance); sync();
  key('KeyE'); assert.equal(sent.at(-1).type, 'extract');
  assert.equal(session.action(player, sent.at(-1)), true); sync();
  assert.equal(element('run-results').open, true);
  assert.match(element('haul-total').textContent, /team sack squares/);
  element('next-run').send('click');
  assert.equal(sent.at(-2).type, 'dismiss-result'); session.action(player, sent.at(-2)); sync();
  assert.equal(element('run-results').open, false);
  assert.equal(element('sack-tab').hidden, true);

});
