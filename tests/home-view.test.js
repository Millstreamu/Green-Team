import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomeView } from '../src/home-view.js';
import { profileLevel } from '../src/profile.js';

test('home screen displays goblin/level, submits names/codes, and prefills recent names without exposing codes or overwriting typing', () => {
  class Element {
    constructor() { this.value = ''; this.listeners = {}; }
    addEventListener(type, fn) { this.listeners[type] = fn; }
    replaceChildren(...children) { this.children = children; }
    focus() { this.focused = true; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    send(type) { this.listeners[type]?.({ preventDefault() {} }); }
  }
  const elements = new Map(), get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  globalThis.document = { querySelector: key => get(key.slice(1)), createElement: () => new Element() };
  const commands = [], view = createHomeView(command => commands.push(command));
  const state = { name: 'Goblin 1', level: 2, profile: { xp: 40, earnedXp: 150 }, recentLairs: [{ id: 'a', name: 'Moss' }], ownedLairs: [{ id: 'a', name: 'Moss' }] };
  view.show(state, true); assert.equal(get('home-screen').hidden, false); assert.equal(get('game-shell').hidden, true);
  assert.equal(get('home-level').textContent, 'Level 2'); assert.equal(get('home-level-progress').value, 50);
  assert.equal(get('owned-lair-section').hidden, false); assert.equal(get('owned-lairs').value, 'a');
  get('enter-owned-lair').send('click'); assert.deepEqual(commands.at(-1), { type: 'enter-owned-lair', id: 'a' });
  assert.match(get('home-xp').textContent, /40 XP available/);
  get('recent-lairs').value = 'a'; get('recent-lairs').send('change'); assert.equal(get('join-lair-name').value, 'Moss'); assert.equal(get('join-lair-code').focused, true);
  get('join-lair-code').value = 'ABC234'; get('join-lair-form').send('submit');
  assert.deepEqual(commands.at(-1), { type: 'join-lair', name: 'Moss', code: 'ABC234' });
  get('create-lair-name').value = 'New Home'; view.show(state, true); assert.equal(get('create-lair-name').value, 'New Home');
  get('create-lair-form').send('submit'); assert.deepEqual(commands.at(-1), { type: 'create-lair', name: 'New Home' });
  view.show(state, false); assert.equal(get('join-lair').disabled, true); assert.equal(get('create-lair').disabled, true); assert.equal(get('enter-owned-lair').disabled, true);
  view.hide(); assert.equal(get('home-screen').hidden, true); assert.equal(get('game-shell').hidden, false);
});
test('displayed level uses lifetime XP, preserving level after purchases and at exact boundaries', () => {
  assert.equal(profileLevel({ earnedXp: 0 }), 1); assert.equal(profileLevel({ earnedXp: 99 }), 1);
  assert.equal(profileLevel({ earnedXp: 100, xp: 0 }), 2); assert.equal(profileLevel({ earnedXp: 250, xp: 20 }), 3);
});

test('compact home panels keep forms out of the dashboard, preserve drafts, return focus and close before entering gameplay', () => {
  class Element {
    value = ''; hidden = false; open = false; listeners = {};
    addEventListener(type, fn) { this.listeners[type] = fn; }
    replaceChildren(...nodes) { this.children = nodes; }
    focus() { this.focused = true; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    send(type) { this.listeners[type]?.({ preventDefault() {} }); }
  }
  const nodes = new Map(), get = id => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
  globalThis.document = { querySelector: key => get(key.slice(1)), createElement: () => new Element() };
  const sent = [], home = createHomeView(command => sent.push(command));
  const state = { selfId: 'a', name: 'Goblin', level: 1, profile: { xp: 0, earnedXp: 0 }, ownedLairs: [], recentLairs: [] };
  home.show(state, true);
  assert.equal(get('home-first-lair').hidden, false); assert.equal(get('owned-lair-section').hidden, true);
  get('home-join-entry').send('click');
  assert.equal(get('home-panel').open, true); assert.equal(get('home-join-panel').hidden, false); assert.equal(get('home-create-panel').hidden, true);
  get('join-lair-name').value = 'Typed draft'; get('join-lair-code').value = 'ABC234';
  home.show(state, true); assert.equal(get('join-lair-name').value, 'Typed draft'); assert.equal(get('home-panel').open, true);
  home.message('Wrong code'); assert.equal(get('home-panel-message').textContent, 'Wrong code');
  get('home-panel-back').send('click'); assert.equal(get('home-panel').open, false); assert.equal(get('home-join-entry').focused, true);
  state.ownedLairs = [{ id: 'one', name: 'Moss' }]; home.show(state, true);
  assert.equal(get('home-first-lair').hidden, true); assert.equal(get('home-create-another').hidden, false); assert.equal(get('owned-lair-picker').hidden, true);
  assert.equal(get('home-owned-name').textContent, 'Moss');
  get('home-options-entry').send('click'); get('home-create-another').send('click');
  assert.equal(get('home-create-panel').hidden, false); assert.equal(get('home-panel-title').textContent, 'Create another lair');
  get('home-panel-back').send('click'); assert.equal(get('home-options-panel').hidden, false);
  get('home-options-profile').send('click'); assert.equal(get('home-profile-panel').hidden, false);
  get('home-panel').send('cancel'); assert.equal(get('home-panel').open, false); assert.equal(get('home-options-entry').focused, true);
  state.ownedLairs.push({ id: 'two', name: 'Fern' }); home.show(state, true);
  assert.equal(get('owned-lair-picker').hidden, false);
  get('owned-lairs').value = 'two'; get('owned-lairs').send('change'); home.show(state, true);
  assert.equal(get('home-owned-name').textContent, 'Fern'); get('enter-owned-lair').send('click');
  assert.deepEqual(sent.at(-1), { type: 'enter-owned-lair', id: 'two' });
  get('home-profile-entry').send('click'); home.hide();
  assert.equal(get('home-panel').open, false); assert.equal(get('home-screen').hidden, true);
});
