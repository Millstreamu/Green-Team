import { LOOT_TYPES as stashLootTypes } from '../src/loot.js';
import { createTreasureRoom as raidTreasure } from '../src/treasure.js';
import { selectJob as raidJob } from '../src/jobs.js';
import { generateDungeon as raidWorld, movePlayer as stepActor } from '../src/world.js';
import { dungeonConfig as raidConfig } from '../src/generator-settings.js';
import { createSearchables as raidSearchables } from '../src/search.js';
import { createHidingSpots as raidHiding } from '../src/hiding.js';
import { findPath as raidPath } from '../src/navigation.js';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

// Exercise real event wiring without claiming this is a rendered browser test.
test('lair crafting and stock connect to searching, packing, escape, guard loss and debug runs', async () => {
  class Surface {
    constructor(id = '') { this.id = id; this.listeners = {}; this.style = {}; this.dataset = {}; this.width = 0; this.height = 0; this.textContent = ''; }
    addEventListener(type, callback) { (this.listeners[type] ??= []).push(callback); }
    send(type, properties = {}) {
      const event = { target: this, code: '', button: 0, preventDefault() {}, stopPropagation() {}, ...properties };
      for (const callback of this.listeners[type] ?? []) callback(event);
    }
    getBoundingClientRect() { return this.id === 'sack-grid' ? { left: 700, top: 370, right: 868, bottom: 538, width: 168, height: 168 } : { left: 0, top: 0, right: 900, bottom: 600, width: 900, height: 600 }; }
    getContext() { return new Proxy({}, { get: (obj, key) => obj[key] ?? (key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}) }); }
    dispatchEvent(event) { this.send(event.type, event); if (this.id === 'game') win.send(event.type, event); return true; }
    closest() { return null; }
    focus() { this.focused = true; }
    setPointerCapture() {}
    append(...children) { (this.children ??= []).push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute() {}
    show() { this.open = true; this.nonModal = true; }
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  const elements = new Map([...readFileSync(new URL('../index.html', import.meta.url),'utf8').matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Surface(m[1])]));
  elements.get('job-choice').value = 'manor'; elements.get('difficulty-choice').value = 'normal';
  const doc = new Surface(), win = new Surface(), frames = [];
  doc.querySelector = selector => elements.get(selector.slice(1));
  doc.createElement = tag => new Surface(tag);
  win.confirm = () => true;
  const saved = new Map(); win.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  // A saved camp fixture has enough materials to test two actual recipes.
  saved.set('green-team-camp-v1', JSON.stringify({ version: 1, counts: { snare: 1, scrap: 3, cloth: 3 } }));
  // Saved personal-wallet fixture can buy both upgrades after the ruby escape.
  saved.set('green-team-goblin-v1', JSON.stringify({ version: 2, id: 'local-goblin', xp: 55, earnedXp: 55, purchases: [] }));
  const campCounts = () => JSON.parse(saved.get('green-team-camp-v1')).counts;
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
  let generatedRuns = 0;
  let dungeonSeed = 1471; // Generated entrance chest contains ruby, without production overrides.
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues(array) { generatedRuns++; array[0] = dungeonSeed; return array; } } });
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
  const waitForDeparture = () => { for (let i = 0; i < 200; i++) tick(); assert.match(elements.get('target-label').textContent, /Raid minecart/); };
  const prepareRun = () => { walk('KeyW', 80); tap('KeyE'); elements.get('departure-board').send('click'); waitForDeparture(); };
  let travelPosition=null;
  const travel = destination => {
    const terrain=raidWorld(dungeonSeed,raidConfig());const furniture=raidSearchables(terrain);raidHiding(terrain,furniture);
    travelPosition ??= {...terrain.spawn};
    const goal=destination==='cart'?terrain.spawn:furniture[typeof destination==='number'?destination:0].approach;
    for(const point of [...raidPath(terrain,travelPosition,goal),goal])for(let n=0;n<150&&Math.hypot(point.x-travelPosition.x,point.y-travelPosition.y)>.045;n++){
      const dx=point.x-travelPosition.x,dy=point.y-travelPosition.y;
      const code=Math.abs(dx)>.04?(dx>0?'KeyD':'KeyA'):(dy>0?'KeyS':'KeyW');
      key(code);tick();release(code);stepActor(terrain,travelPosition,{x:code==='KeyD'?1:code==='KeyA'?-1:0,y:code==='KeyS'?1:code==='KeyW'?-1:0},.016);
    }
    tick();
  };
  const leaveRaid = async () => { assert.equal(elements.get('raid-cart-panel').open,true);elements.get('raid-cart-board').send('pointerdown');await new Promise(resolve=>setTimeout(resolve,1050));elements.get('raid-cart-board').send('pointerup');for(let n=0;n<200;n++)tick();travelPosition=null; };
  const prepared = () => JSON.parse(saved.get('green-team-camp-v1')).preparedBag;
  const takeStock = type => {
    const index = JSON.parse(saved.get('green-team-camp-v1')).slots.filter(Boolean).sort((a,b)=>stashLootTypes[a].name.localeCompare(stashLootTypes[b].name,'en',{sensitivity:'base'})).indexOf(type);
    assert.ok(index >= 0, `No ${type} in stash`);
    elements.get('stash-grid').send('pointerdown', { clientX: (index % 6 + .5) * 150, clientY: (Math.floor(index / 6) + .5) * 100 }); elements.get('stash-action').send('click'); tick();
  };
  const packAtHome = type => { tap('Tab'); takeStock(type); elements.get('lair-panel').send('keydown', { code: 'Tab' }); tick(); };

  tick();
  assert.match(elements.get('target-label').textContent, /Lair/);
  assert.equal(elements.get('xp-label').textContent, 'Your goblin · 55 XP available');
  win.send('keydown', { code: 'Tab', repeat: true, target: elements.get('game') }); tick();
  assert.notEqual(elements.get('lair-panel').open, true);
  tap('Tab'); assert.equal(elements.get('lair-panel').open, true);
  elements.get('lair-panel').send('keydown', { code: 'Tab', repeat: true }); tick();
  assert.equal(elements.get('lair-panel').open, true, 'holding the stash shortcut must not close it');
  const hoverStock=JSON.stringify(campCounts());
  elements.get('stash-grid').send('pointermove',{pointerType:'mouse',clientX:75,clientY:50});
  assert.equal(elements.get('stash-tooltip').textContent,'Cloth');assert.equal(elements.get('stash-tooltip').hidden,false);
  assert.equal(JSON.stringify(campCounts()),hoverStock,'hover names do not take stock');
  elements.get('stash-grid').send('pointerleave',{pointerType:'mouse'});assert.equal(elements.get('stash-tooltip').hidden,true);
  elements.get('stash-grid').send('pointerdown',{pointerType:'touch',clientX:75,clientY:50});
  elements.get('stash-grid').send('pointerleave',{pointerType:'touch'});assert.equal(elements.get('stash-tooltip').hidden,false);
  assert.equal(JSON.stringify(campCounts()),hoverStock,'touch selection only shows the name');
  const guideStock=JSON.stringify(campCounts()),guideBag=JSON.stringify(prepared());
  elements.get('station-guide').send('click');assert.equal(elements.get('gear-guide').hidden,false);assert.equal(elements.get('station-inventory').hidden,true);
  elements.get('guide-tab-loadouts').send('click');assert.match(elements.get('guide-loadout-space').textContent,/3 \/ 9.*6 free/);
  elements.get('guide-loadout-choice').value='rescue';elements.get('guide-loadout-choice').send('change');assert.match(elements.get('guide-loadout-plan').textContent,/workbench/);
  elements.get('station-guide').send('click');assert.equal(elements.get('station-inventory').hidden,false);
  assert.equal(JSON.stringify(campCounts()),guideStock);assert.equal(JSON.stringify(prepared()),guideBag);
  elements.get('lair-sack-grid').focused = false;
  elements.get('lair-panel').send('keydown', { code: 'KeyQ', target: elements.get('stash-grid') });
  assert.equal(elements.get('lair-sack-grid').focused, true);
  const sortedStock=JSON.stringify(campCounts());elements.get('stash-grid').send('keydown',{code:'KeyR'});assert.doesNotMatch(elements.get('stash-selection').textContent,/Moving/);assert.equal(JSON.stringify(campCounts()),sortedStock);
  takeStock('snare'); assert.equal(campCounts().snare, 0); assert.equal(prepared().length, 1);
  elements.get('lair-sack-grid').send('keydown', { code: 'KeyE' }); tick();
  assert.equal(campCounts().snare, 1); assert.equal(prepared().length, 0);
  elements.get('lair-panel').send('keydown', { code: 'Tab' }); tick();
  assert.equal(elements.get('lair-panel').open, false);
  walk('KeyD', 56); walk('KeyW', 49); tap('KeyE');
  assert.equal(elements.get('lair-title').textContent,'Workbench');
  elements.get('choose-smoke').send('click');assert.match(elements.get('book-action').textContent,/unlock/i);assert.equal(elements.get('book-action').disabled,false);
  elements.get('choose-snare').send('click');elements.get('book-action').send('click');tick();
  assert.equal(campCounts().snare,1);assert.equal(campCounts().scrap,1);assert.equal(prepared()[0].type,'snare');assert.match(elements.get('craft-status').textContent,/In sack/);
  assert.equal(elements.get('book-action').disabled,true);elements.get('book-action').send('click');assert.equal(campCounts().snare,1);
  elements.get('close-lair').send('click'); tick();
  // Plan at the separate upper-left map table; confirmation never departs.
  walk('KeyA', 112); walk('KeyW', 32); tap('KeyE');
  assert.equal(elements.get('map-planning').open, true);
  assert.match(elements.get('route-status').textContent, /Human Manor/);
  const stockBeforeDeparture = campCounts().snare;
  elements.get('job-choice').value = 'missing'; elements.get('job-choice').send('change');
  assert.equal(elements.get('confirm-job').disabled, true);
  elements.get('confirm-job').send('click'); tick(); assert.equal(elements.get('map-planning').open, true);
  elements.get('job-choice').value = 'manor'; elements.get('difficulty-choice').value = 'normal'; elements.get('job-choice').send('change');
  elements.get('close-map').send('click'); tick();
  assert.equal(elements.get('map-planning').open, false); assert.equal(elements.get('seed').textContent, 'Home');
  assert.equal(generatedRuns, 0); assert.equal(prepared().length, 1);
  tap('KeyE'); elements.get('difficulty-choice').value = 'hard'; elements.get('difficulty-choice').send('change');
  elements.get('close-map').send('click'); tick();
  assert.equal(JSON.parse(saved.get('green-team-camp-v1')).destination.difficultyId, 'normal');
  // Board, cancel, wait past the old deadline, then board again and depart once.
  walk('KeyD', 56); tap('KeyE');
  assert.equal(elements.get('departure-panel').open,true);
  elements.get('departure-board').send('click'); tick();
  assert.match(elements.get('target-label').textContent, /Aboard.*leaving in 3s/);
  key('KeyD'); for (let i = 0; i < 30; i++) tick(); release('KeyD');
  elements.get('departure-board').send('click'); tick(); assert.equal(prepared().length, 1);
  for (let i = 0; i < 220; i++) tick(); assert.equal(elements.get('seed').textContent, 'Home');
  assert.equal(campCounts().snare, stockBeforeDeparture);
  assert.equal(generatedRuns, 0);
  elements.get('departure-board').send('click'); waitForDeparture(); assert.equal(generatedRuns, 1);
  assert.equal(campCounts().snare, stockBeforeDeparture); assert.equal(prepared().length, 0);
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  assert.match(elements.get('target-label').textContent, /Raid minecart/);
  assert.equal(elements.get('sack-panel').dataset.open, 'false');
  tap('Tab'); assert.equal(elements.get('sack-panel').dataset.open, 'true');
  key('KeyD'); for (let i = 0; i < 20; i++) tick(); release('KeyD');
  tap('Tab'); assert.match(elements.get('target-label').textContent, /Raid minecart/);
  tap('Tab'); tap('KeyA');
  assert.match(elements.get('target-label').textContent, /Sack.*WASD/);
  // A touch-selected trap can be moved and put back without equipping it.
  elements.get('sack-grid').send('pointerdown', { pointerType: 'touch', clientX: 728, clientY: 398 }); tick();
  elements.get('sack-grid').send('pointerup', { pointerType: 'touch', clientX: 728, clientY: 398 }); tick();
  elements.get('game').send('touchlift'); tick();
  assert.match(elements.get('held-label').textContent, /Holding Snare/);
  elements.get('sack-grid').send('pointerdown', { pointerType: 'touch', clientX: 728, clientY: 398 }); tick();
  elements.get('sack-grid').send('pointerup', { pointerType: 'touch', clientX: 728, clientY: 398 }); tick();
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  key('KeyE'); for (let i = 0; i < 5; i++) tick();
  assert.equal(elements.get('sack-panel').dataset.open, 'false');
  assert.match(elements.get('target-label').textContent, /WASD aim snare/);
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  release('KeyE'); tick(); tap('Escape');
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  tap('Tab'); tap('Tab'); assert.equal(elements.get('sack-panel').dataset.open, 'false');
  elements.get('sack-tab').send('click'); tick(); assert.equal(elements.get('sack-panel').dataset.open, 'true');
  tap('Tab');
  travelPosition=null;travel('chest');
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
  elements.get('sack-grid').send('pointerdown', { pointerType: 'touch', clientX: 770, clientY: 380 }); tick();
  elements.get('sack-grid').send('pointerup', { pointerType: 'touch', clientX: 770, clientY: 380 }); tick();
  assert.equal(elements.get('sack-used').textContent, '2 / 9', 'tap highlights without lifting');
  elements.get('game').send('touchlift'); tick();
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  assert.match(elements.get('held-label').textContent, /Holding Ruby/);
  tap('Tab'); assert.equal(elements.get('sack-panel').dataset.open, 'false', 'touch arrangement pinned the sack open before dismissal');
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
  travel('cart');
  assert.match(elements.get('target-label').textContent, /Raid minecart/);
  tap('KeyE');await leaveRaid();
  assert.equal(elements.get('run-results').open, true);
  assert.match(elements.get('haul-total').textContent, /^1 loot item/);
  const summary = elements.get('haul-total').textContent;
  key('KeyE'); key('KeyD'); for (let i = 0; i < 14; i++) tick();
  doc.send('pointerdown', { target: elements.get('sack-grid'), clientX: 770, clientY: 380 }); tick();
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  assert.equal(campCounts().ruby, 0); assert.equal(campCounts().gold, 25); assert.equal(campCounts().snare, 2);
  assert.equal(elements.get('result-xp').textContent, 'Your goblin: +25 XP · 80 XP available');
  assert.equal(elements.get('xp-label').textContent, 'Your goblin · 80 XP available');
  assert.equal(JSON.parse(saved.get('green-team-goblin-v1')).xp, 80);
  assert.equal(elements.get('haul-total').textContent, summary);
  assert.match(elements.get('target-label').textContent, /run complete/);
  elements.get('next-run').send('click'); tick();
  assert.match(elements.get('target-label').textContent, /Lair/);
  walk('KeyD', 56); walk('KeyW', 49); tap('KeyE');
  elements.get('choose-smoke').send('click');assert.match(elements.get('book-action').textContent,/unlock/i);elements.get('book-action').send('pointerdown');await new Promise(resolve=>setTimeout(resolve,1050));elements.get('book-action').send('pointerup');elements.get('book-action').send('click');tick();
  assert.equal(JSON.parse(saved.get('green-team-goblin-v1')).xp,30);assert.equal(elements.get('book-action').textContent,'Craft');
  elements.get('choose-quickSearch').send('click');assert.equal(elements.get('book-title').textContent,'Smoke bomb');
  elements.get('book-action').send('click');tick();assert.equal(campCounts().gold,25);assert.equal(JSON.parse(saved.get('green-team-goblin-v1')).xp,30);assert.equal(campCounts().smoke,0);assert.equal(prepared()[0].type,'smoke');
  assert.equal(elements.get('book-action').disabled,true);elements.get('book-action').send('click');assert.equal(prepared().length,1);
  elements.get('close-lair').send('click');tick();tap('Tab');
  elements.get('lair-sack-grid').send('keydown', { code: 'KeyE' }); tick();
  assert.equal(campCounts().smoke, 1); takeStock('snare');
  elements.get('close-lair').send('click'); tick();
  // Go back to the usual home spawn so the next launch helper stays reusable.
  walk('KeyA', 56); walk('KeyS', 49);
  walk('KeyS', 28); tap('KeyE');
  assert.equal(elements.get('lair-title').textContent,'Campfire');assert.equal(elements.get('station-inventory').hidden,true);assert.equal(elements.get('personal-xp').textContent,'30 XP');
  assert.equal(elements.get('station-passives').hidden,false);assert.equal(elements.get('station-book').hidden,true);
  elements.get('passive-quickSearch').send('pointerdown',{button:0}); await new Promise(resolve=>setTimeout(resolve,1050)); elements.get('passive-quickSearch').send('pointerup'); elements.get('passive-quickSearch').send('click');tick();assert.equal(JSON.parse(saved.get('green-team-goblin-v1')).xp,0);elements.get('passive-quickSearch').send('click');tick();assert.deepEqual(JSON.parse(saved.get('green-team-goblin-v1')).activePassives,['quickSearch']);
  elements.get('lair-panel').send('cancel'); tick();
  walk('KeyW', 28);
  prepareRun();
  assert.equal(elements.get('run-results').open, false);
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  assert.match(elements.get('target-label').textContent, /Raid minecart/);
  // Search again, lift actual spilled loot and deliberately approach a lookout.
  // Guards no longer wander into the starting room on their normal routine.
  travelPosition=null;travel('chest');
  key('KeyE'); for (let i = 0; i < 145; i++) tick(); release('KeyE'); tick();
  const chestLoot=raidSearchables(raidWorld(dungeonSeed,raidConfig()))[0];doc.send('pointerdown', { target: elements.get('game'), clientX: 450+(chestLoot.approach.x-travelPosition.x)*48, clientY: 300+(chestLoot.approach.y-travelPosition.y)*48 }); tick();
  assert.match(elements.get('held-label').textContent, /Holding Ruby/);
  travel('cart');
  const { generateDungeon } = await import('../src/world.js');
  const { createGuards } = await import('../src/guard.js');
  const { findPath } = await import('../src/navigation.js');
  const { dungeonConfig } = await import('../src/generator-settings.js');
  const map = generateDungeon(1471, dungeonConfig());map.job=raidJob('manor','normal');const placed=raidSearchables(map);raidHiding(map,placed);raidTreasure(map,placed);const post=createGuards(map)[0];
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
  assert.equal(elements.get('result-xp').textContent, 'Your goblin: +0 XP · 0 XP available');
  assert.equal(JSON.parse(saved.get('green-team-goblin-v1')).xp, 0);
  assert.match(elements.get('heat-label').textContent, /Heat [1-9][0-9]*%.*Alerts [1-9]/);
  assert.equal(campCounts().ruby, 0); assert.equal(campCounts().gold, 25); assert.equal(campCounts().snare, 1);
  assert.match(elements.get('haul-total').textContent, /^2 items lost/);
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  assert.equal(elements.get('held-label').textContent, 'Click loot to lift · select gear, E equip');
  elements.get('next-run').send('click'); tick();
  assert.match(elements.get('target-label').textContent, /Lair/);
  packAtHome('snare'); prepareRun();
  assert.equal(elements.get('run-results').open, false);
  assert.equal(elements.get('health-label').textContent, 'Health ●●●');
  tap('Tab'); tap('KeyE');
  key('KeyA'); for (let i = 0; i < 20; i++) tick(); release('KeyA'); tick();
  assert.match(elements.get('target-label').textContent, /WASD aim snare/);
  key('KeyE');
  for (let i = 0; i < 65; i++) tick(); release('KeyE'); tick();
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  assert.match(elements.get('status').textContent, /Snare placed/);
  elements.get('regenerate').send('click'); tick(); tap('Tab');
  const realStock = { ...campCounts() };
  for (let i = 0; i < 9; i++) elements.get('debug-pack-snare').send('click');
  assert.equal(prepared().length, 9); assert.deepEqual(campCounts(), realStock);
  elements.get('debug-pack-snare').send('click'); assert.equal(prepared().length, 9);
  elements.get('lair-panel').send('keydown', { code: 'Tab' }); tick(); prepareRun();
  assert.equal(elements.get('sack-used').textContent, '9 / 9');
  elements.get('regenerate').send('click'); tick(); dungeonSeed = 1471; prepareRun();
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  travelPosition=null;travel(2); key('KeyE'); for (let i = 0; i < 160; i++) tick(); release('KeyE'); tick();
  assert.match(elements.get('status').textContent, /Nothing worth taking/);
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  elements.get('regenerate').send('click'); tick(); dungeonSeed=42;packAtHome('smoke'); prepareRun();
  assert.equal(campCounts().smoke, 0); assert.equal(elements.get('sack-used').textContent, '1 / 9');
  tap('Tab'); tap('KeyE');
  assert.match(elements.get('quick-label').textContent, /Smoke bomb × 1.*Space/);
  tap('Space');
  assert.match(elements.get('status').textContent, /Smoke deployed/);
  assert.equal(elements.get('sack-used').textContent, '0 / 9');
  assert.match(elements.get('quick-label').textContent, /Smoke bomb × 0/);
  elements.get('regenerate').send('click'); tick();
  walk('KeyA', 56); walk('KeyW', 80); tap('KeyE');
  elements.get('difficulty-choice').value = 'hard'; elements.get('difficulty-choice').send('change');
  assert.match(elements.get('job-preview').textContent, /Hard.*2 extra guards/);
  elements.get('confirm-job').send('click'); tick();
  assert.equal(elements.get('seed').textContent, 'Home');
  walk('KeyD', 56); tap('KeyE');
  assert.equal(elements.get('departure-panel').open,true);
  elements.get('departure-board').send('click'); tick(); waitForDeparture();
  assert.equal(elements.get('job-label').textContent, 'Human Manor · Hard');
  tap('KeyE');await leaveRaid();
  assert.equal(elements.get('result-job').textContent, 'Human Manor · Hard');
  // Reach a real generated hiding barrel using the same movement/event loop.
  elements.get('next-run').send('click'); tick();
  walk('KeyA', 56); walk('KeyW', 80); tap('KeyE');
  elements.get('difficulty-choice').value = 'normal'; elements.get('difficulty-choice').send('change');
  elements.get('confirm-job').send('click'); tick(); dungeonSeed=1471;walk('KeyD', 56); tap('KeyE');
  assert.equal(elements.get('departure-panel').open,true);
  elements.get('departure-board').send('click'); tick(); waitForDeparture();
  const { createHidingSpots } = await import('../src/hiding.js');
  const { createSearchables } = await import('../src/search.js');
  const hideWorld = generateDungeon(1471, dungeonConfig()), barrel = createHidingSpots(hideWorld, createSearchables(hideWorld))[0];
  const hideRoute = findPath(hideWorld, hideWorld.spawn, barrel.approach), position = { ...hideWorld.spawn };
  for (const goal of hideRoute) {
    for (let i = 0; i < 150 && Math.hypot(goal.x - position.x, goal.y - position.y) > 0.06; i++) {
      const dx = goal.x - position.x, dy = goal.y - position.y, horizontal = Math.abs(dx) > 0.045;
      const code = horizontal ? dx > 0 ? 'KeyD' : 'KeyA' : dy > 0 ? 'KeyS' : 'KeyW';
      key(code); tick(); release(code);
      if (horizontal) position.x += Math.sign(dx) * 4.5 * 0.016; else position.y += Math.sign(dy) * 4.5 * 0.016;
    }
  }
  assert.match(elements.get('target-label').textContent, /Hiding barrel/);
  assert.match(elements.get('heat-label').textContent, /Heat 0%.*Alerts 0/);
  key('KeyE'); for (let i = 0; i < 12; i++) tick();
  assert.match(elements.get('target-label').textContent, /Hiding…/);
  release('KeyE'); tick(); assert.match(elements.get('target-label').textContent, /Hiding barrel/);
  key('KeyE'); tick(); walk('KeyD', 3); release('KeyE'); tick();
  assert.doesNotMatch(elements.get('target-label').textContent, /Hidden in barrel|Hiding…/);
  walk('KeyA', 3);
  key('KeyE'); for (let i = 0; i < 34; i++) tick(); release('KeyE'); tick();
  assert.match(elements.get('target-label').textContent, /Hidden in barrel/);
  walk('KeyD', 80); tap('Tab'); tap('Space');
  doc.send('pointerdown', { target: elements.get('game'), clientX: 450, clientY: 300 }); tick();
  assert.match(elements.get('target-label').textContent, /Hidden in barrel/);
  assert.equal(elements.get('sack-panel').dataset.open, 'false');
  key('KeyE'); tick(); win.send('keydown', { code: 'KeyE', repeat: true, target: elements.get('game') }); tick(); release('KeyE');
  assert.match(elements.get('target-label').textContent, /Hiding barrel/);

  // Actual solo wiring for the new aim/cancel/fire loop; existing smoke/snare
  // checks above remain unchanged.
  elements.get('regenerate').send('click'); tick(); tap('Tab');
  elements.get('debug-pack-dart').send('click'); elements.get('debug-pack-dart').send('click');
  elements.get('lair-panel').send('keydown', { code: 'Tab' }); tick(); prepareRun();
  assert.equal(elements.get('sack-used').textContent, '2 / 9');
  tap('Tab'); tap('KeyE'); assert.equal(elements.get('dart-equipped').hidden, false);
  assert.match(elements.get('dart-equipped').textContent, /Space aim/);
  walk('KeyD', 3); // Equipped dart permits ordinary movement before aiming.
  tap('Space'); assert.match(elements.get('dart-equipped').textContent, /Space fire/);
  win.send('keydown', { code: 'Space', repeat: true, target: elements.get('game') }); tick();
  assert.equal(elements.get('sack-used').textContent, '2 / 9', 'held Space does not fire');
  tap('Escape'); assert.match(elements.get('dart-equipped').textContent, /Space aim/);
  assert.equal(elements.get('sack-used').textContent, '2 / 9', 'cancel keeps the equipped dart');
  tap('Space'); assert.equal(elements.get('sack-used').textContent, '2 / 9', 'first press only aims');
  tap('Space'); assert.equal(elements.get('sack-used').textContent, '1 / 9', 'second press fires one copy');
  win.send('keydown', { code: 'Space', repeat: true, target: elements.get('game') }); tick();
  assert.equal(elements.get('sack-used').textContent, '1 / 9');
  tap('Tab'); tap('KeyD'); tap('KeyE'); tap('Space'); win.send('blur'); tick();
  assert.match(elements.get('dart-equipped').textContent, /Space aim/);
  assert.equal(elements.get('sack-used').textContent, '1 / 9', 'focus loss cancels aim, retaining equipped copy');

  // Bell uses the same actual controls, with valid floor targeting and no spend on cancel.
  elements.get('regenerate').send('click'); tick(); tap('Tab');
  elements.get('debug-pack-bell').send('click'); elements.get('debug-pack-bell').send('click');
  elements.get('lair-panel').send('keydown', { code: 'Tab' }); tick(); prepareRun();
  tap('Tab'); tap('KeyE'); assert.match(elements.get('dart-equipped').textContent, /BELL.*Space aim/);
  tap('Space'); assert.match(elements.get('dart-equipped').textContent, /Space throw/);
  tap('Escape'); assert.equal(elements.get('sack-used').textContent, '2 / 9');
  tap('Space');
  const bellWorld = generateDungeon(42, dungeonConfig());
  const { validBellPosition } = await import('../src/bells.js');
  const bellPoint = [[.5,0],[0,.5],[-.5,0],[0,-.5]].map(([x,y]) => ({x:bellWorld.spawn.x+x,y:bellWorld.spawn.y+y})).find(p => validBellPosition(bellWorld, bellWorld.spawn, p));
  assert.ok(bellPoint);
  doc.send('pointermove', { target: elements.get('game'), clientX:450+(bellPoint.x-bellWorld.spawn.x)*48, clientY:300+(bellPoint.y-bellWorld.spawn.y)*48 });
  tap('Space'); assert.equal(elements.get('sack-used').textContent, '1 / 9');
  win.send('keydown', {code:'Space', repeat:true, target:elements.get('game')}); tick();
  assert.equal(elements.get('sack-used').textContent, '1 / 9');

  elements.get('regenerate').send('click'); tick(); tap('Tab');
  elements.get('debug-pack-disguise').send('click'); elements.get('debug-pack-disguise').send('click');
  elements.get('lair-panel').send('keydown',{code:'Tab'});tick();prepareRun();
  tap('Tab');tap('KeyE');assert.match(elements.get('dart-equipped').textContent,/DISGUISE.*Space drink/);
  assert.equal(elements.get('sack-used').textContent,'2 / 9');tap('Space');
  assert.equal(elements.get('sack-used').textContent,'1 / 9');assert.equal(elements.get('disguise-status').hidden,false);assert.match(elements.get('disguise-status').textContent,/DISGUISE 10s/);
  win.send('keydown',{code:'Space',repeat:true,target:elements.get('game')});tick();assert.equal(elements.get('sack-used').textContent,'1 / 9');
  for(let i=0;i<630;i++)tick();assert.equal(elements.get('disguise-status').hidden,true);

  elements.get('regenerate').send('click');tick();tap('Tab');
  elements.get('debug-pack-vanish').send('click');elements.get('debug-pack-vanish').send('click');
  elements.get('lair-panel').send('keydown',{code:'Tab'});tick();prepareRun();
  tap('Tab');tap('KeyE');assert.match(elements.get('dart-equipped').textContent,/VANISH.*Space drink/);
  walk('KeyD',3);assert.equal(elements.get('sack-used').textContent,'2 / 9');
  tap('Space');assert.equal(elements.get('sack-used').textContent,'1 / 9');assert.match(elements.get('disguise-status').textContent,/VANISH 8s/);
  win.send('keydown',{code:'Space',repeat:true,target:elements.get('game')});tick();assert.equal(elements.get('sack-used').textContent,'1 / 9');
  for(let i=0;i<510;i++)tick();assert.equal(elements.get('disguise-status').hidden,true);

  elements.get('regenerate').send('click');tick();tap('Tab');
  elements.get('debug-pack-lucky').send('click');elements.get('debug-pack-lucky').send('click');
  elements.get('lair-panel').send('keydown',{code:'Tab'});tick();prepareRun();
  tap('Tab');tap('KeyE');assert.match(elements.get('dart-equipped').textContent,/LUCKY.*Space drink/);
  walk('KeyD',3);tap('Space');assert.equal(elements.get('sack-used').textContent,'1 / 9');assert.equal(elements.get('lucky-status').hidden,false);
  win.send('keydown',{code:'Space',repeat:true,target:elements.get('game')});tick();assert.equal(elements.get('sack-used').textContent,'1 / 9');
  for(let i=0;i<510;i++)tick();assert.equal(elements.get('lucky-status').hidden,false);
  elements.get('regenerate').send('click');tick();assert.equal(elements.get('lucky-status').hidden,true);

  elements.get('regenerate').send('click');tick();tap('Tab');
  elements.get('debug-pack-orb').send('click');elements.get('debug-pack-orb').send('click');
  elements.get('lair-panel').send('keydown',{code:'Tab'});tick();prepareRun();
  tap('Tab');tap('KeyE');assert.match(elements.get('dart-equipped').textContent,/ORB.*Space ping/);
  walk('KeyD',3);assert.equal(elements.get('sack-used').textContent,'2 / 9');
  tap('Space');assert.equal(elements.get('sack-used').textContent,'1 / 9');
  win.send('keydown',{code:'Space',repeat:true,target:elements.get('game')});tick();assert.equal(elements.get('sack-used').textContent,'1 / 9');

  elements.get('regenerate').send('click');tick();tap('Tab');elements.get('debug-pack-berries').send('click');elements.get('debug-pack-berries').send('click');
  elements.get('lair-panel').send('keydown',{code:'Tab'});tick();prepareRun();tap('Tab');tap('KeyE');assert.match(elements.get('dart-equipped').textContent,/BERRIES.*Space aim/);
  walk('KeyD',3);tap('Space');assert.match(elements.get('dart-equipped').textContent,/Space throw/);tap('Escape');assert.equal(elements.get('sack-used').textContent,'2 / 9');
  tap('Space');win.send('keydown',{code:'Space',repeat:true,target:elements.get('game')});tick();assert.equal(elements.get('sack-used').textContent,'2 / 9');
  tap('Space');assert.equal(elements.get('sack-used').textContent,'1 / 9');win.send('keydown',{code:'Space',repeat:true,target:elements.get('game')});tick();assert.equal(elements.get('sack-used').textContent,'1 / 9');

});
