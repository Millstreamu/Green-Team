import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLairSession } from '../server/lair-session.js';

test('online entry connects shared loot, equipment, hiding and downed results without touching solo saves', async t => {
  class Surface {
    constructor(id = '') { this.id = id; this.listeners = {}; this.style = {}; this.dataset = {}; this.width = 0; this.height = 0; this.textContent = ''; }
    addEventListener(type, callback) { (this.listeners[type] ??= []).push(callback); }
    send(type, properties = {}) {
      const event = { target: this, code: '', button: 0, preventDefault() {}, ...properties };
      for (const callback of this.listeners[type] ?? []) callback(event);
    }
    getBoundingClientRect() { return this.id === 'sack-grid' ? { left: 700, top: 370, right: 868, bottom: 538, width: 168, height: 168 } : { left: 0, top: 0, right: 900, bottom: 600, width: 900, height: 600 }; }
    getContext() { return new Proxy({}, { get: (obj, key) => obj[key] ?? (key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}) }); }
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
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    assert.equal(url, 'assets/human/GreenTeam-tileset.json');
    return { ok: true, json: async () => JSON.parse(readFileSync(new URL('../assets/human/GreenTeam-tileset.json', import.meta.url), 'utf8')) };
  };
  test.after(() => { globalThis.fetch = previousFetch; });
  globalThis.Image = class { naturalWidth = 128; naturalHeight = 64; async decode() {} };
  globalThis.ResizeObserver = class { constructor(callback) { this.callback = callback; } observe() { this.callback(); } };
  globalThis.requestAnimationFrame = callback => frames.push(callback);
  const realInterval = globalThis.setInterval;
  globalThis.setInterval = callback => intervals.push(callback);
  t.after(() => { globalThis.setInterval = realInterval; });
  globalThis.location = { protocol: 'http:', host: 'localhost:8080' };
  const stored = new Map();
  globalThis.sessionStorage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) };
  const browserSaved = new Map();
  win.localStorage = {
    getItem(key) { assert.equal(key, 'green-team-online-goblins-v1'); return browserSaved.get(key); },
    setItem(key, value) { assert.equal(key, 'green-team-online-goblins-v1'); browserSaved.set(key, value); }
  };
  const session = createLairSession(), player = session.connect(), other = session.connect();
  const sent = [];
  let socket;
  globalThis.WebSocket = class extends Surface {
    static OPEN = 1;
    constructor() { super(); socket = this; this.readyState = 1; }
    send(data) { sent.push(JSON.parse(data)); }
    close() { this.readyState = 3; Surface.prototype.send.call(this, 'close', { reason: '' }); }
  };
  await import('../src/online-main.js');
  const receive = message => Surface.prototype.send.call(socket, 'message', { data: JSON.stringify(message) });
  Surface.prototype.send.call(socket, 'open');
  assert.equal(sent[0].type, 'hello');
  receive({ type: 'welcome', token: player.token });
  receive({ type: 'state', screen: 'home', selfId: player.id, name: player.name, profile: player.profile,
    level: 1, players: [], recentLairs: [], location: 'menu' });
  assert.equal(element('home-screen').hidden, false); assert.equal(element('game-shell').hidden, true);
  assert.equal(element('home-level').textContent, 'Level 1');
  element('create-lair-name').value = 'UI Lair'; element('create-lair-form').send('submit');
  assert.equal(sent.at(-1).type, 'create-lair'); assert.equal(sent.at(-1).name, 'UI Lair');
  const countAtHome = sent.length; intervals[0](); assert.equal(sent.length, countAtHome);
  const sync = () => receive(session.snapshot(player));
  sync(); frames.shift()();
  assert.equal(element('home-screen').hidden, true); assert.equal(element('game-shell').hidden, false);
  assert.equal(element('online-identity').hidden, false);
  receive({ ...session.snapshot(player), saving: 'saved' });
  assert.match(element('save-status').textContent, /LAIR SAVED ON SERVER/);
  assert.equal(JSON.parse(browserSaved.get('green-team-online-goblins-v1'))[0].name, player.name);
  assert.match(element('target-label').textContent, /Tab/);
  const key = code => win.send('keydown', { code, target: element('game') });
  key('Tab'); assert.equal(element('lair-panel').open, true);
  assert.equal(element('debug-pack-snare').hidden, false);
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
  // Keep random patrol combat out of this UI fixture; real combat is checked separately.
  player.invulnerable = other.invulnerable = 1000;
  sync(); frames.shift()(16);
  assert.equal(element('sack-tab').hidden, false);
  assert.match(element('rooms').textContent, /rooms/);
  const dungeon = session.snapshot(player).dungeon, chest = dungeon.objects[0];
  Object.assign(player, chest.approach); sync();
  doc.send('pointermove', { target: element('game'), clientX: 450 + (chest.x - player.x) * 48, clientY: 300 + (chest.y - player.y) * 48 });
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
  doc.send('pointerup', { target: element('sack-grid'), clientX: 744, clientY: 398 });
  const lift = sent.findLast(m => m.type === 'lift');
  const id = player.bag[0].id;
  assert.ok(lift);
  assert.equal(session.action(player, lift), true); sync();
  assert.equal(player.loot.held.id, id);
  key('KeyR'); assert.equal(sent.at(-1).type, 'rotate'); session.action(player, sent.at(-1)); sync();
  doc.send('pointerdown', { target: element('sack-grid'), clientX: 840, clientY: 510 });
  assert.equal(sent.at(-1).type, 'place'); assert.equal(session.action(player, sent.at(-1)), true); sync();
  assert.equal(player.bag[0].x, 2); assert.equal(player.bag[0].y, 2);
  doc.send('pointerdown', { target: element('sack-grid'), clientX: 840, clientY: 510 });
  doc.send('pointerup', { target: element('sack-grid'), clientX: 825, clientY: 510 });
  session.action(player, sent.findLast(m => m.type === 'lift')); sync();
  key('KeyE'); assert.equal(sent.at(-1).type, 'drop'); session.action(player, sent.at(-1)); sync();
  const dropped = session.snapshot(player).dungeon.ground.find(item => item.id === id);
  // Stay at the legal approach: a dropped item can land inside tunnel reach,
  // where E correctly means extract. Aim at the item to avoid other search loot.
  Object.assign(player, chest.approach); sync();
  doc.send('pointermove', { target: element('game'), clientX: 450 + (dropped.x - player.x) * 48, clientY: 300 + (dropped.y - player.y) * 48 });
  key('Tab'); frames.shift()(80);
  key('KeyE'); assert.equal(sent.at(-1).type, 'pickup'); assert.equal(sent.at(-1).id, id);
  session.action(player, sent.at(-1)); sync();
  assert.equal(player.bag[0].id, id);
  player.bag.splice(0, player.bag.length, { id: 'ui-haul-a', type: 'ruby', rotation: 0, x: 0, y: 0 }, { id: 'ui-haul-b', type: 'ruby', rotation: 0, x: 1, y: 0 });
  Object.assign(player, dungeon.entrance); Object.assign(other, dungeon.entrance); sync();
  key('KeyE'); assert.equal(sent.at(-1).type, 'extract');
  assert.equal(session.action(player, sent.at(-1)), true); sync();
  assert.equal(element('run-results').open, true);
  assert.match(element('haul-total').textContent, /team sack squares/);
  assert.match(element('result-xp').textContent, /\+50 XP/);
  assert.match(element('xp-label').textContent, /50 XP available/);
  element('next-run').send('click');
  assert.equal(sent.at(-2).type, 'dismiss-result'); session.action(player, sent.at(-2)); sync();
  assert.equal(element('run-results').open, false);
  assert.equal(element('sack-tab').hidden, true);
  session.action(other, { type: 'dismiss-result' });
  let consumed = sent.length;
  const flush = () => { for (const message of sent.slice(consumed)) session.action(player, message); consumed = sent.length; };
  player.x = 9; player.y = 11.5; sync(); key('KeyE'); flush(); sync();
  assert.equal(element('passives').hidden, false);
  assert.equal(element('buy-quick-search').disabled, false);
  element('buy-quick-search').send('click'); flush(); sync();
  assert.equal(player.profile.xp, 20); assert.equal(other.profile.xp, 50);
  assert.match(element('buy-quick-search').textContent, /Owned/);
  assert.match(element('xp-label').textContent, /20 XP available/);
  element('close-lair').send('click'); flush();
  key('Tab'); element('debug-pack-snare').send('click'); flush(); sync();
  element('debug-pack-smoke').send('click'); flush(); sync();
  element('debug-pack-lunch').send('click'); flush(); sync();
  assert.deepEqual(player.bag.map(i => i.type), ['snare', 'smoke', 'lunch']);
  element('lair-panel').send('keydown', { code: 'Tab' }); flush();
  for (const p of [player, other]) { p.x = 9; p.y = 2.5; session.action(p, { type: 'board' }); }
  for (let i = 0; i < 61; i++) session.tick(.05);
  // Keep random patrol combat out of this UI fixture; real combat is checked separately.
  player.invulnerable = other.invulnerable = 1000;
  sync(); frames.shift()(96);
  assert.ok(session.snapshot(player).dungeon.guards.length >= 4);
  assert.match(element('health-label').textContent, /Health 3/);
  assert.equal(element('goblin-choice').disabled, true);
  assert.match(element('heat-label').textContent, /Heat/);
  key('Tab'); flush(); frames.shift()(112); key('KeyE');
  assert.equal(sent.at(-1).type, 'equip'); flush(); sync(); frames.shift()(128);
  assert.ok(player.placement.itemId); assert.equal(element('sack-panel').dataset.open, 'false');
  win.send('keyup', { code: 'KeyE', target: element('game') }); flush(); intervals[0](); flush(); session.tick(.05);
  const beforeAim = { x: player.x, y: player.y };
  key('KeyW'); intervals[0](); flush(); session.tick(.1); sync();
  assert.deepEqual({ x: player.x, y: player.y }, beforeAim);
  win.send('keyup', { code: 'KeyW', target: element('game') });
  key('Escape'); flush(); sync(); assert.equal(player.placement.itemId, null);
  key('Tab'); flush(); frames.shift()(144); key('KeyD'); key('KeyE'); flush(); sync();
  assert.equal(player.quickType, 'smoke'); key('Space'); flush(); sync(); frames.shift()(160);
  assert.equal(session.snapshot(other).dungeon.clouds.length, 1);
  assert.ok(!player.bag.some(i => i.type === 'smoke'));
  const spot = session.snapshot(player).dungeon.hidingSpots[0];
  Object.assign(player, spot.approach); sync();
  doc.send('pointermove', { target: element('game'), clientX: 450 + (spot.x - player.x) * 48, clientY: 300 + (spot.y - player.y) * 48 });
  key('KeyE'); assert.equal(sent.at(-1).type, 'hide'); flush();
  for (let i = 0; i < 10; i++) { intervals[0](); flush(); session.tick(.05); }
  sync(); frames.shift()(176); assert.ok(player.hiding);
  assert.match(element('target-label').textContent, /Hidden/);
  const beforeTab = sent.length; key('Tab'); assert.equal(sent.length, beforeTab);
  key('KeyE'); flush(); sync(); assert.equal(player.hiding, null);
  other.state = 'down'; other.health = 0; session.tick(.05);
  player.x = other.x + .5; player.y = other.y; sync();
  doc.send('pointermove', { target: element('game'), clientX: 450 - .5 * 24 * 2, clientY: 300 });
  key('KeyE'); assert.equal(sent.at(-1).type, 'rescue'); flush(); sync(); frames.shift()(184);
  assert.match(element('target-label').textContent, /Rescuing/);
  for (let i = 0; i < 41; i++) { intervals[0](); flush(); session.tick(.05); }
  sync(); assert.equal(other.state, 'active'); assert.equal(other.health, 1); assert.ok(!player.bag.some(i => i.type === 'lunch'));
  const cage = session.snapshot(player).dungeon.cages[0];
  Object.assign(other, { state: 'caged', health: 0, cageId: cage.id, x: cage.x, y: cage.y, downSpilled: true }); cage.prisoners.push(other.id);
  player.x = cage.entry.x; player.y = cage.entry.y; player.invulnerable = 10; sync();
  doc.send('pointermove', { target: element('game'), clientX: 450, clientY: 300 });
  key('KeyE'); assert.equal(sent.at(-1).type, 'rescue'); flush(); sync(); frames.shift()(188);
  for (let i = 0; i < 61; i++) { intervals[0](); flush(); session.tick(.05); }
  sync(); assert.equal(other.state, 'active'); assert.equal(other.health, 1); assert.equal(cage.prisoners.length, 0);
  other.invulnerable = 10; // Isolate the following downed-control UI check from jailer damage.
  player.state = 'down'; player.health = 0; session.tick(.05); sync(); frames.shift()(192);
  assert.match(element('health-label').textContent, /DOWN/);
  const beforeDownAction = sent.length; key('KeyE'); assert.equal(sent.length, beforeDownAction);
  Object.assign(other, session.snapshot(other).dungeon.entrance);
  assert.equal(session.action(other, { type: 'extract' }), true); sync();
  assert.match(element('results-title').textContent, /left behind/);
  assert.equal(element('goblin-choice').disabled, false);
  const oldSocket = socket;
  element('goblin-choice').value = '';
  element('goblin-choice').send('change');
  assert.notEqual(socket, oldSocket); assert.equal(oldSocket.readyState, 3);
  Surface.prototype.send.call(socket, 'open');
  assert.equal(sent.at(-1).type, 'hello'); assert.equal(sent.at(-1).token, undefined);
  receive({ type: 'welcome', token: other.token }); receive(session.snapshot(other));
  assert.equal(element('goblin-choice').value, other.token);
  assert.equal(JSON.parse(browserSaved.get('green-team-online-goblins-v1')).length, 2);

});
