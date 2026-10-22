import test from 'node:test';
import assert from 'node:assert/strict';
import { createResultsView } from '../src/results-view.js';

test('run-end summary keeps rewards/return visible while item details open, reset and close for every outcome', t => {
  class Element {
    listeners = {}; attrs = {}; children = []; open = false; hidden = false; scrollTop = 123;
    addEventListener(type, fn) { this.listeners[type] = fn; }
    setAttribute(key, value) { this.attrs[key] = value; }
    replaceChildren(...children) { this.children = children; }
    append(...children) { this.children.push(...children); }
    focus() { this.focused = true; }
    showModal() { this.open = true; this.shows = (this.shows ?? 0) + 1; }
    close() { this.open = false; }
    getContext() { return new Proxy({}, { get: () => () => {} }); }
    send(type) { let prevented = false; this.listeners[type]?.({ preventDefault() { prevented = true; } }); return prevented; }
  }
  const old = globalThis.document, nodes = new Map();
  t.after(() => { globalThis.document = old; });
  const get = id => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
  globalThis.document = { querySelector: key => get(key.slice(1)), createElement: () => new Element() };
  const dialog = get('run-results'), view = createResultsView(dialog);
  const success = { outcome: 'escaped', job: { jobName: 'Human Manor', difficultyName: 'Normal' }, items: [{ id: 'c', type: 'coin', count: 9, rotation: 0 }, { id: 'r', type: 'ruby', rotation: 0 }], count: 10, slots: 2, soldGold: 52, elapsed: 65, personalXp: { earned: 52, total: 82 } };
  view.open(success);
  assert.equal(get('run-summary').hidden, false); assert.equal(get('run-loot-panel').hidden, true); assert.equal(get('next-run').focused, true);
  assert.equal(get('result-gold-earned').textContent, '+52'); assert.equal(get('result-xp-earned').textContent, '+52'); assert.equal(get('result-time').textContent, '1:05');
  assert.equal(get('result-details').attrs['aria-label'], 'Run details');
  assert.equal(get('result-loot-icons').children.length,2);
  const coinTile=get('result-loot-icons').children[0].children[0];
  assert.equal(coinTile.attrs['aria-label'],'Gold coin × 9');
  coinTile.send('click');assert.match(get('result-loot-name').textContent,/Gold coin × 9.*3 gold each/);
  assert.equal(coinTile.attrs['aria-pressed'],'true');
  get('result-loot-icons').children[1].children[0].send('click');assert.equal(coinTile.attrs['aria-pressed'],'false');
  assert.match(get('result-loot-name').textContent,/Ruby/); assert.equal(get('haul-list').children.length, 2);
  get('result-details').send('click');
  assert.equal(get('run-summary').hidden, true); assert.equal(get('run-loot-panel').hidden, false);
  assert.equal(get('run-loot-scroll').scrollTop, 0); assert.equal(get('result-details').attrs['aria-expanded'], 'true');
  assert.equal(dialog.send('cancel'), true); assert.equal(dialog.open, true); assert.equal(get('run-summary').hidden, false);
  get('result-details').send('click');
  view.open({ ...success, outcome: 'down', leftBehind: true, team: true, items: [], count: 0, slots: 0, lostItems: [{ type: 'silverCoin', count: 7, rotation: 0 }] });
  assert.equal(dialog.shows, 1); assert.equal(get('run-summary').hidden, false);
  assert.match(get('results-title').textContent, /left behind/); assert.equal(get('result-gold-label').textContent, 'TEAM GOLD');
  assert.equal(get('result-gold-earned').textContent, '+52', 'team rewards remain distinct from this goblin’s lost sack');
  assert.equal(get('result-loot-title').textContent, 'Left behind');
  assert.equal(get('result-loot-icons').children[0].children[0].attrs['aria-label'],'Silver coin × 7');
  assert.equal(get('result-loot-name').textContent,'Tap an item'); assert.match(get('haul-total').textContent, /^7 items lost/);
  view.open({ outcome: 'down', aborted: true, items: [], lostItems: [], count: 0, slots: 0, elapsed: 0 });
  assert.match(get('results-title').textContent, /admin/); assert.equal(get('result-gold-earned').textContent, '+0'); assert.equal(get('result-xp-earned').textContent, '+0');
  assert.equal(get('result-loot-icons').children.length,0);
  assert.equal(get('result-loot-name').textContent,'No carried items');
  assert.equal(get('empty-haul').hidden, false); assert.equal(get('haul-list').children.length, 0);
  view.open({...success,slots:12,cartSlots:10});assert.match(get('haul-total').textContent,/2 sack squares \+ 10 cart squares/);
  view.open({...success,outcome:'down',items:[],lostItems:[],lostCartItems:[{type:'ruby',rotation:0}],count:0,slots:0});assert.match(get('haul-total').textContent,/1 item lost/);assert.equal(get('result-loot-icons').children.length,1);
  get('result-details').send('click'); view.close(); assert.equal(dialog.open, false); assert.equal(get('run-summary').hidden, false);
});
