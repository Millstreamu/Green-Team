import test from 'node:test';
import assert from 'node:assert/strict';

// Exercise real event wiring without claiming this is a rendered browser test.
test('lair crafting and stock connect to searching, packing, escape, guard loss and debug runs', async () => {
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
    focus() {}
    append(...children) { (this.children ??= []).push(...children); }
    replaceChildren() { this.children = []; }
    setAttribute() {}
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  const elements = new Map(['game', 'sack-grid', 'map', 'held-ghost', 'status', 'seed', 'rooms', 'regenerate', 'sack-used', 'held-label', 'target-label', 'run-results', 'haul-list', 'empty-haul', 'haul-total', 'next-run', 'result-eyebrow', 'results-title', 'results-description', 'health-label', 'alert-label', 'sack-panel', 'sack-tab', 'run-setup', 'snare-count', 'loadout-total', 'start-run', 'debug-supplies', 'snare-stock', 'cancel-loadout', 'save-status', 'lair-panel', 'lair-title', 'lair-description', 'stash-list', 'craft-snare', 'craft-status', 'close-lair', 'stash-empty', 'stash-grid', 'stash-selection', 'stash-used', 'lair-gold', 'recipes', 'craft-smoke', 'recipe-smoke-state', 'recipe-snare-state', 'smoke-count', 'quick-label', 'job-choice', 'difficulty-choice', 'job-preview', 'job-label', 'result-job'].map(id => [id, new Surface(id)]));
  elements.get('job-choice').value = 'manor'; elements.get('difficulty-choice').value = 'normal';
  elements.get('snare-count').value = '1'; elements.get('smoke-count').value = '0';
  const doc = new Surface(), win = new Surface(), frames = [];
  doc.querySelector = selector => elements.get(selector.slice(1));
  doc.createElement = tag => new Surface(tag);
  win.confirm = () => true;
  const saved = new Map(); win.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  // A saved camp fixture has enough materials to test two actual recipes.
  saved.set('green-team-camp-v1', JSON.stringify({ version: 1, counts: { snare: 1, scrap: 3, cloth: 3 } }));
  const campCounts = () => JSON.parse(saved.get('green-team-camp-v1')).counts;
  globalThis.HTMLElement = Surface; globalThis.document = doc; globalThis.window = win;
  globalThis.Image = class { async decode() {} };
  globalThis.ResizeObserver = class { constructor(callback) { this.callback = callback; } observe() { this.callback(); } };
  globalThis.requestAnimationFrame = callback => frames.push(callback);
  let dungeonSeed = 978983017; // Generated entrance chest contains ruby, without production overrides.
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues(array) { array[0] = dungeonSeed; return array; } } });
  let clock = 0;
  const realNow = performance.now;
  performance.now = () => clock;
  test.after(() => { performance.now = realNow; });
  await import('../src/main.js');
  const tick = () => frames.shift()(clock += 16);
  const key = code => win.send('keydown', { code, target: elements.get('game') });
  const release = code => win.send('keyup', { code, target: elements.get('game') });
  const tap = code => { key(code); tick(); release(code); tick(); };
  const walk = (code, count) => { key(code); for (let i = 0; i < count; i++) tick(); release(code); tick(); };
  const prepareRun = () => { walk('KeyW', 80); tap('KeyE'); assert.equal(elements.get('run-setup').open, true); };
  tick();
  assert.match(elements.get('target-label').textContent, /Lair/);
  tap('Tab'); assert.equal(elements.get('lair-panel').open, true);
  elements.get('stash-grid').send('keydown', { code: 'KeyE' });
  elements.get('stash-grid').send('keydown', { code: 'KeyD' });
  elements.get('stash-grid').send('keydown', { code: 'KeyE' });
  assert.match(elements.get('stash-selection').textContent, /Moving Metal scrap/);
  elements.get('stash-grid').send('keydown', { code: 'KeyS' });
  elements.get('stash-grid').send('keydown', { code: 'KeyE' });
  assert.equal(JSON.parse(saved.get('green-team-camp-v1')).slots[7], 'scrap');
  assert.equal(campCounts().scrap, 3);
  elements.get('lair-panel').send('keydown', { code: 'Tab' }); tick();
  assert.equal(elements.get('lair-panel').open, false);
  walk('KeyD', 56); walk('KeyW', 49); tap('KeyE');
  assert.equal(elements.get('lair-title').textContent, 'Workbench & recipes');
  elements.get('craft-snare').send('click'); tick();
  assert.equal(campCounts().snare, 2); assert.equal(campCounts().scrap, 1);
  assert.equal(elements.get('craft-snare').disabled, true);
  elements.get('craft-snare').send('click'); tick(); assert.equal(campCounts().snare, 2);
  elements.get('close-lair').send('click'); tick();
  walk('KeyA', 56); walk('KeyW', 32); tap('KeyE');
  assert.equal(elements.get('run-setup').open, true);
  elements.get('cancel-loadout').send('click'); tick();
  assert.equal(elements.get('run-setup').open, false);
  tap('KeyE'); assert.equal(elements.get('run-setup').open, true);
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  key('KeyD'); tick(); release('KeyD');
  elements.get('snare-count').value = '10'; elements.get('snare-count').send('input');
  assert.equal(elements.get('start-run').disabled, true);
  elements.get('start-run').send('click'); tick();
  assert.equal(elements.get('run-setup').open, true);
  elements.get('job-choice').value = 'manor'; elements.get('difficulty-choice').value = 'normal';
  elements.get('snare-count').value = '1'; elements.get('smoke-count').value = '0'; elements.get('snare-count').send('input');
  elements.get('start-run').send('click'); tick();
  assert.equal(elements.get('run-setup').open, false);
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  assert.match(elements.get('target-label').textContent, /Secret tunnel/);
  assert.equal(elements.get('sack-panel').dataset.open, 'false');
  tap('Tab'); assert.equal(elements.get('sack-panel').dataset.open, 'true');
  key('KeyD'); for (let i = 0; i < 20; i++) tick(); release('KeyD');
  tap('Tab'); assert.match(elements.get('target-label').textContent, /Secret tunnel/);
  tap('Tab'); tap('KeyA');
  assert.match(elements.get('target-label').textContent, /Sack.*WASD/);
  key('KeyE'); for (let i = 0; i < 5; i++) tick();
  assert.equal(elements.get('sack-panel').dataset.open, 'false');
  assert.match(elements.get('target-label').textContent, /WASD aim snare/);
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  release('KeyE'); tick(); tap('Escape');
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  tap('Tab'); tap('Tab'); assert.equal(elements.get('sack-panel').dataset.open, 'false');
  elements.get('sack-tab').send('click'); tick(); assert.equal(elements.get('sack-panel').dataset.open, 'true');
  tap('Tab');
  key('KeyD'); for (let i = 0; i < 14; i++) tick(); win.send('keyup', { code: 'KeyD' });
  assert.equal(elements.get('sack-panel').dataset.open, 'false');
  assert.match(elements.get('target-label').textContent, /Chest.*hold E/);
  key('KeyE'); for (let i = 0; i < 30; i++) tick();
  assert.match(elements.get('target-label').textContent, /Searching Chest/);
  release('KeyE'); tick();
  assert.doesNotMatch(elements.get('target-label').textContent, /Searching Chest/);
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  key('KeyE'); for (let i = 0; i < 160; i++) tick();
  assert.doesNotMatch(elements.get('target-label').textContent, /Searching Chest/);
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  assert.match(elements.get('target-label').textContent, /Ruby/);
  assert.equal(elements.get('sack-panel').dataset.open, 'true');
  release('KeyE'); tick();
  tap('KeyE');
  assert.equal(elements.get('sack-used').textContent, '2 / 9');
  doc.send('pointerdown', { target: elements.get('sack-grid'), clientX: 770, clientY: 380 }); tick();
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  assert.match(elements.get('held-label').textContent, /Holding Ruby/);
  tap('Tab'); assert.equal(elements.get('sack-panel').dataset.open, 'true');
  tap('Tab'); assert.equal(elements.get('sack-panel').dataset.open, 'false');
  tap('Tab'); assert.equal(elements.get('sack-panel').dataset.open, 'true');
  key('KeyR'); assert.match(elements.get('status').textContent, /rotated/);
  tap('KeyE');
  assert.match(elements.get('status').textContent, /dropped nearby/);
  assert.equal(elements.get('held-label').textContent, 'Click loot to lift · select gear, E equip');
  tap('KeyE');
  assert.equal(elements.get('sack-used').textContent, '2 / 9');
  tap('Tab');
  key('KeyA'); for (let i = 0; i < 14; i++) tick(); win.send('keyup', { code: 'KeyA' });
  assert.match(elements.get('target-label').textContent, /Secret tunnel/);
  tap('KeyE');
  assert.equal(elements.get('run-results').open, true);
  assert.match(elements.get('haul-total').textContent, /^1 loot item/);
  const summary = elements.get('haul-total').textContent;
  key('KeyE'); key('KeyD'); for (let i = 0; i < 14; i++) tick();
  doc.send('pointerdown', { target: elements.get('sack-grid'), clientX: 770, clientY: 380 }); tick();
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  assert.equal(campCounts().ruby, 0); assert.equal(campCounts().gold, 25); assert.equal(campCounts().snare, 2);
  assert.equal(elements.get('haul-total').textContent, summary);
  assert.match(elements.get('target-label').textContent, /run complete/);
  elements.get('next-run').send('click'); tick();
  assert.match(elements.get('target-label').textContent, /Lair/);
  walk('KeyD', 56); walk('KeyW', 49); tap('KeyE');
  assert.match(elements.get('craft-smoke').textContent, /Unlock/);
  elements.get('craft-smoke').send('click'); tick();
  assert.equal(campCounts().gold, 5);
  assert.equal(JSON.parse(saved.get('green-team-camp-v1')).unlocked.smoke, true);
  elements.get('craft-smoke').send('click'); tick();
  assert.equal(campCounts().smoke, 1); assert.equal(campCounts().gold, 5);
  elements.get('close-lair').send('click'); tick();
  // Go back to the usual home spawn so the next launch helper stays reusable.
  walk('KeyA', 56); walk('KeyS', 49);
  prepareRun();
  elements.get('start-run').send('click'); tick();
  assert.equal(elements.get('run-results').open, false);
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  assert.match(elements.get('target-label').textContent, /Secret tunnel/);
  // Search again, lift actual spilled loot and deliberately approach a lookout.
  // Guards no longer wander into the starting room on their normal routine.
  key('KeyD'); for (let i = 0; i < 14; i++) tick(); release('KeyD');
  key('KeyE'); for (let i = 0; i < 160; i++) tick(); release('KeyE'); tick();
  doc.send('pointerdown', { target: elements.get('game'), clientX: 445, clientY: 324 }); tick();
  assert.match(elements.get('held-label').textContent, /Holding Ruby/);
  key('KeyA'); for (let i = 0; i < 14; i++) tick(); release('KeyA');
  const { generateDungeon } = await import('../src/world.js');
  const { createGuards } = await import('../src/guard.js');
  const { findPath } = await import('../src/navigation.js');
  const map = generateDungeon(978983017), post = createGuards(map)[0];
  const route = findPath(map, map.spawn, post);
  const simulated = { ...map.spawn };
  for (const goal of route) {
    for (let i = 0; i < 100 && Math.hypot(goal.x - simulated.x, goal.y - simulated.y) > 0.05 && !elements.get('run-results').open; i++) {
      const dx = goal.x - simulated.x, dy = goal.y - simulated.y;
      const horizontal = Math.abs(dx) > 0.045;
      const code = horizontal ? dx > 0 ? 'KeyD' : 'KeyA' : dy > 0 ? 'KeyS' : 'KeyW';
      key(code); tick(); release(code);
      if (horizontal) simulated.x += Math.sign(dx) * 4.5 * 0.016; else simulated.y += Math.sign(dy) * 4.5 * 0.016;
    }
    if (elements.get('run-results').open) break;
  }
  for (let i = 0; i < 4000 && !elements.get('run-results').open; i++) tick();
  assert.equal(elements.get('run-results').open, true);
  assert.equal(elements.get('results-title').textContent, 'You went down.');
  assert.equal(campCounts().ruby, 0); assert.equal(campCounts().gold, 5); assert.equal(campCounts().snare, 1);
  assert.match(elements.get('haul-total').textContent, /^2 items lost/);
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  assert.equal(elements.get('held-label').textContent, 'Click loot to lift · select gear, E equip');
  elements.get('next-run').send('click'); tick();
  assert.match(elements.get('target-label').textContent, /Lair/);
  prepareRun();
  elements.get('start-run').send('click'); tick();
  assert.equal(elements.get('run-results').open, false);
  assert.equal(elements.get('health-label').textContent, 'Health ●●●');
  tap('Tab'); tap('KeyE');
  key('KeyA'); for (let i = 0; i < 20; i++) tick(); release('KeyA'); tick();
  assert.match(elements.get('target-label').textContent, /WASD aim snare/);
  key('KeyE');
  for (let i = 0; i < 65; i++) tick(); release('KeyE'); tick();
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  assert.match(elements.get('status').textContent, /Snare placed/);
  elements.get('regenerate').send('click'); tick(); prepareRun();
  elements.get('snare-count').value = '9';
  elements.get('snare-count').send('input'); assert.equal(elements.get('start-run').disabled, true);
  elements.get('debug-supplies').checked = true; elements.get('debug-supplies').send('change'); elements.get('snare-count').send('input');
  assert.match(elements.get('loadout-total').textContent, /9 \/ 9.*0 free/);
  elements.get('start-run').send('click'); tick();
  assert.equal(elements.get('sack-used').textContent, '9 / 9');
  elements.get('regenerate').send('click'); tick(); prepareRun();
  assert.equal(elements.get('snare-count').value, '9');
  elements.get('snare-count').value = '0'; elements.get('snare-count').send('input');
  dungeonSeed = 42;
  elements.get('start-run').send('click'); tick();
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  walk('KeyD', 14); key('KeyE'); for (let i = 0; i < 160; i++) tick(); release('KeyE'); tick();
  assert.match(elements.get('status').textContent, /Nothing worth taking/);
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  elements.get('regenerate').send('click'); tick(); prepareRun();
  elements.get('debug-supplies').checked = false;
  elements.get('snare-count').value = '0'; elements.get('smoke-count').value = '1';
  elements.get('smoke-count').send('input');
  elements.get('start-run').send('click'); tick();
  assert.equal(campCounts().smoke, 0); assert.equal(elements.get('sack-used').textContent, '1 / 9');
  tap('Tab'); tap('KeyE');
  assert.match(elements.get('quick-label').textContent, /Smoke bomb × 1.*Space/);
  tap('Space');
  assert.match(elements.get('status').textContent, /Smoke deployed/);
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  assert.match(elements.get('quick-label').textContent, /Smoke bomb × 0/);
  elements.get('regenerate').send('click'); tick(); prepareRun();
  elements.get('difficulty-choice').value = 'hard'; elements.get('difficulty-choice').send('change');
  assert.match(elements.get('job-preview').textContent, /Hard.*2 extra guards/);
  elements.get('start-run').send('click'); tick();
  assert.equal(elements.get('job-label').textContent, 'Human Manor · Hard');
  tap('KeyE');
  assert.equal(elements.get('result-job').textContent, 'Human Manor · Hard');
  // Reach a real generated hiding barrel using the same movement/event loop.
  elements.get('next-run').send('click'); tick(); prepareRun();
  elements.get('difficulty-choice').value = 'normal';
  elements.get('snare-count').value = '0'; elements.get('smoke-count').value = '0';
  elements.get('start-run').send('click'); tick();
  const { createHidingSpots } = await import('../src/hiding.js');
  const { createSearchables } = await import('../src/search.js');
  const hideWorld = generateDungeon(42), barrel = createHidingSpots(hideWorld, createSearchables(hideWorld))[0];
  const hideRoute = findPath(hideWorld, hideWorld.spawn, barrel), position = { ...hideWorld.spawn };
  for (const goal of hideRoute) {
    for (let i = 0; i < 150 && Math.hypot(goal.x - position.x, goal.y - position.y) > 0.06; i++) {
      const dx = goal.x - position.x, dy = goal.y - position.y, horizontal = Math.abs(dx) > 0.045;
      const code = horizontal ? dx > 0 ? 'KeyD' : 'KeyA' : dy > 0 ? 'KeyS' : 'KeyW';
      key(code); tick(); release(code);
      if (horizontal) position.x += Math.sign(dx) * 4.5 * 0.016; else position.y += Math.sign(dy) * 4.5 * 0.016;
    }
  }
  assert.match(elements.get('target-label').textContent, /Hiding barrel/);
  tap('KeyE'); assert.match(elements.get('target-label').textContent, /Hidden in barrel/);
  walk('KeyD', 80); tap('Tab'); tap('Space');
  doc.send('pointerdown', { target: elements.get('game'), clientX: 450, clientY: 300 }); tick();
  assert.match(elements.get('target-label').textContent, /Hidden in barrel/);
  assert.equal(elements.get('sack-panel').dataset.open, 'false');
  key('KeyE'); tick(); win.send('keydown', { code: 'KeyE', repeat: true, target: elements.get('game') }); tick(); release('KeyE');
  assert.match(elements.get('target-label').textContent, /Hiding barrel/);

});
