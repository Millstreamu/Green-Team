import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import WebSocket from 'ws';
import { openSaveStore, restoreSave } from '../server/save-store.js';
import { createLairSession } from '../server/lair-session.js';
import { createGameServer } from '../server/index.js';

function fixture(t) {
  const base = join(process.cwd(), 'data'); mkdirSync(base, { recursive: true });
  const dir = mkdtempSync(join(base, 'test-'));
  const filename = join(dir, 'home.sqlite');
  const stores = [];
  function open() { const store = openSaveStore(filename); stores.push(store); return { store, s: createLairSession({ store }) }; }
  t.after(() => { for (const store of stores) { try { store.close(); } catch {} } rmSync(dir, { recursive: true, force: true }); });
  return { filename, open };
}
function launch(s, players) {
  for (const p of players) { p.x = 9; p.y = 2.5; assert.ok(s.action(p, { type: 'board' })); }
  for (let i = 0; i < 61; i++) s.tick(.05);
  assert.ok(s.snapshot(players[0]).dungeon);
}

test('SQLite restart restores stock, separate sacks, stash arrangement, destination and personal purchases', t => {
  const f = fixture(t), { s, store } = f.open(), a = s.connect(), b = s.connect();
  assert.ok(s.action(a, { type: 'take', item: 'snare' }));
  b.x = 13; b.y = 6; assert.ok(s.action(b, { type: 'craft', item: 'snare' }));
  assert.ok(s.action(a, { type: 'stack', item: 'scrap', slot: 20 }) === false); // consumed by crafting
  assert.ok(s.action(a, { type: 'return', id: a.bag[0].id }));
  assert.ok(s.action(a, { type: 'stack', item: 'snare', slot: 20 }));
  a.x = 5; a.y = 2.5; assert.ok(s.action(a, { type: 'destination', job: 'manor', difficulty: 'hard' }));
  // Server-only fixture supplies existing progress; no protocol can grant XP.
  a.profile.xp = a.profile.earnedXp = 100; a.x = 9; a.y = 11.5;
  assert.ok(s.action(a, { type: 'buy', upgrade: 'quickSearch' }));
  assert.ok(s.action(a, { type: 'take', item: 'cloth' }) === false); // also consumed
  const before = s.snapshot(a), otherBag = structuredClone(b.bag), nextItemId = store.load().camp.nextItemId;
  store.close();
  const restored = f.open(), ra = restored.s.connect(a.token), rb = restored.s.connect(b.token);
  assert.equal(ra.id, a.id); assert.equal(rb.id, b.id);
  assert.deepEqual(restored.s.snapshot(ra).camp, before.camp);
  assert.deepEqual(ra.profile, a.profile); assert.deepEqual(rb.bag, otherBag);
  assert.equal(restored.s.snapshot(ra).cart.selection.difficultyId, 'hard');
  assert.equal(restored.s.snapshot(ra).saving, 'saved');
  assert.equal(restored.store.load().camp.nextItemId, nextItemId);
  assert.ok(restored.s.action(ra, { type: 'take', item: 'snare' }));
  assert.notEqual(ra.bag[0].id, rb.bag[0].id);
  assert.equal(restored.s.action(rb, { type: 'take', item: 'snare' }), false);
});

test('restart during boarding cancels readiness and retains paid prepared supplies', t => {
  const f = fixture(t), { s, store } = f.open(), a = s.connect();
  s.action(a, { type: 'take', item: 'snare' }); a.x = 9; a.y = 2.5;
  s.action(a, { type: 'board' }); s.tick(.1); assert.ok(s.snapshot(a).cart.countdown);
  store.close();
  const r = f.open(), p = r.s.connect(a.token);
  assert.equal(p.bag.length, 1); assert.equal(r.s.snapshot(p).camp.counts.snare, 0);
  assert.deepEqual(r.s.snapshot(p).cart.aboard, []); assert.equal(r.s.snapshot(p).cart.countdown, null);
  assert.equal(p.location, 'home'); assert.equal(p.x, 9); assert.equal(p.y, 9.5);
});

test('run departure durably spends sacks; restart loses dungeon loot but preserves waiting goblin supplies', t => {
  const f = fixture(t), { s, store } = f.open(), a = s.connect();
  s.action(a, { type: 'take', item: 'snare' }); launch(s, [a]);
  a.bag.push({ id: 'unbanked-ruby', type: 'ruby', rotation: 0, x: 1, y: 0 });
  const waiting = s.connect(); waiting.bag.push({ id: 'waiting-smoke', type: 'smoke', rotation: 0, x: 0, y: 0 });
  s.tick(.05); const saved = store.load();
  assert.deepEqual(saved.players.find(p => p.id === a.id).bag, []);
  assert.equal(saved.players.find(p => p.id === a.id).interrupted, true);
  assert.equal(saved.players.find(p => p.id === waiting.id).bag.length, 1);
  assert.equal(saved.camp.counts.gold, 0); store.close();
  const { s: r } = f.open(), back = r.connect(a.token), waiter = r.connect(waiting.token);
  assert.equal(back.state, 'active'); assert.equal(back.health, 3); assert.deepEqual(back.bag, []);
  assert.match(back.notice.text, /Carried supplies.*lost/);
  assert.equal(r.snapshot(back).dungeon, null); assert.equal(r.snapshot(back).camp.counts.snare, 0);
  assert.equal(waiter.waiting, false); assert.equal(waiter.bag[0].id, 'waiting-smoke');
});

test('completed escape banks gold and gear once across repeated restarts, without saving result receipts', t => {
  const f = fixture(t), { s, store } = f.open(), a = s.connect();
  s.action(a, { type: 'take', item: 'snare' }); launch(s, [a]);
  a.bag.push({ id: 'banked-ruby', type: 'ruby', rotation: 0, x: 1, y: 0 });
  Object.assign(a, s.snapshot(a).dungeon.entrance);
  assert.equal(s.action(a, { type: 'extract' }), true);
  assert.equal(s.snapshot(a).camp.counts.gold, 25); assert.equal(s.snapshot(a).camp.counts.snare, 1);
  store.close();
  for (let i = 0; i < 2; i++) {
    const r = f.open(), p = r.s.connect(a.token);
    assert.equal(r.s.snapshot(p).camp.counts.gold, 25); assert.equal(r.s.snapshot(p).camp.counts.snare, 1);
    assert.deepEqual(p.bag, []); assert.equal(r.s.snapshot(p).result, null);
    assert.equal(r.s.action(p, { type: 'extract' }), false); r.store.close();
  }
});

test('bad save data and unsupported versions stop loading without silently creating a fresh home', t => {
  const f = fixture(t), { store, s } = f.open(); s.connect(); const valid = store.load(); store.close();
  for (const edit of [v => v.version = 999, v => v.camp.counts.gold = -1,
    v => v.players[0].profile.purchases = ['made-up'], v => v.players[0].bag = [{ id: 'x', type: 'unknown' }]]) {
    const value = structuredClone(valid); edit(value); assert.throws(() => restoreSave(value), /Invalid/);
  }
  const db = new DatabaseSync(f.filename);
  db.prepare('UPDATE home_save SET state=? WHERE id=1').run('{broken'); db.close();
  assert.throws(() => openSaveStore(f.filename));
  const check = new DatabaseSync(f.filename);
  assert.equal(check.prepare('SELECT state FROM home_save').get().state, '{broken'); check.close();
  writeFileSync(f.filename, 'not a database'); assert.throws(() => openSaveStore(f.filename));
});

test('failed commit never reports success and permanently blocks further session actions', () => {
  let fail = false, last;
  const s = createLairSession({ store: { load: () => null, save(value) { if (fail) throw new Error('Disk full'); last = structuredClone(value); } } });
  const a = s.connect(); fail = true;
  assert.throws(() => s.action(a, { type: 'take', item: 'snare' }), /Disk full/);
  assert.equal(last.camp.counts.snare, 1); assert.equal(last.players[0].bag.length, 0);
  assert.throws(() => s.tick(.05), /Disk full/); assert.throws(() => s.action(a, { type: 'return', id: a.bag[0].id }), /Disk full/);
});

test('real WebSocket client resumes the same saved goblin after a server restart; save files are never served', async t => {
  let current;
  t.after(async () => { if (current) await stop(); });
  const f = fixture(t);
  async function start() {
    const opened = f.open(), game = createGameServer({ session: opened.s });
    game.server.listen(0, '127.0.0.1'); await once(game.server, 'listening');
    const origin = `http://127.0.0.1:${game.server.address().port}`;
    current = { ...opened, ...game, origin }; return current;
  }
  async function stop() {
    const c = current; current = null;
    for (const ws of c.wss.clients) ws.terminate();
    c.wss.close(); await new Promise(resolve => c.server.close(resolve)); c.store.close();
  }
  async function client(token) {
    const ws = new WebSocket(current.origin.replace('http:', 'ws:') + '/session', { origin: current.origin });
    let state, key; ws.on('message', raw => { const m = JSON.parse(raw); if (m.type === 'state') state = m; if (m.type === 'welcome') key = m.token; });
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', token }));
    async function until(fn) {
      for (let i = 0; i < 200; i++) { if (fn()) return; await new Promise(resolve => setTimeout(resolve, 10)); }
      assert.fail('No expected saved network state');
    }
    await until(() => state); return { ws, until, state: () => state, token: key };
  }
  await start(); const a = await client(); const id = a.state().selfId;
  a.ws.send(JSON.stringify({ type: 'take', item: 'snare' })); await a.until(() => a.state().bag.length === 1);
  assert.equal((await fetch(current.origin + '/data/home.sqlite')).status, 404);
  const savedBag = a.state().bag; await stop(); await start();
  const b = await client(a.token);
  assert.equal(b.state().selfId, id); assert.deepEqual(b.state().bag, savedBag); assert.equal(b.state().camp.counts.snare, 0);
  assert.equal(b.state().saving, 'saved');
  const c = await client(); assert.notEqual(c.state().selfId, id); assert.equal(c.state().bag.length, 0);
});

test('save failure pauses the live server and sends no successful transfer snapshot', async t => {
  const errorLog = t.mock.method(console, 'error', () => {});
  const session = createLairSession({ store: { load: () => null, save(value) { if (value.camp.counts.snare === 0) throw Error('Disk full'); } } });
  const { server, wss } = createGameServer({ session });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const ws = new WebSocket(origin.replace('http:', 'ws:') + '/session', { origin });
  t.after(async () => { ws.terminate(); wss.close(); await new Promise(resolve => server.close(resolve)); });
  const messages = [];
  let receive;
  const ready = new Promise(resolve => { receive = resolve; });
  ws.on('message', bytes => { const m = JSON.parse(bytes); messages.push(m); if (m.type === 'state') receive(); });
  await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello' })); await ready;
  const closed = once(ws, 'close'); ws.send(JSON.stringify({ type: 'take', item: 'snare' }));
  const [code, reason] = await closed;
  assert.equal(code, 1011); assert.equal(reason.toString(), 'Save failed');
  assert.ok(messages.some(m => m.type === 'save-error'));
  assert.ok(messages.filter(m => m.type === 'state').every(m => m.bag.length === 0 && m.camp.counts.snare === 1));
  assert.equal(errorLog.mock.callCount(), 1);
});

test('debug supplies retain their tag across restart and cannot become real stash stock', t => {
  const f = fixture(t), { s, store } = f.open(), a = s.connect();
  assert.ok(s.action(a, { type: 'debug-pack', item: 'lunch' })); store.close();
  const r = f.open(), p = r.s.connect(a.token);
  assert.equal(p.bag[0].debugSupply, true);
  assert.ok(r.s.action(p, { type: 'return', id: p.bag[0].id }));
  assert.equal(r.s.snapshot(p).camp.counts.lunch, 0); assert.equal(p.bag.length, 0);
});
