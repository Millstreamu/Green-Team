import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { once } from 'node:events';
import WebSocket from 'ws';
import { openSaveStore } from '../server/save-store.js';
import { createLairSession } from '../server/lair-session.js';
import { createAdminController, createBackupStore } from '../server/admin.js';
import { createAdminHttp } from '../server/admin-http.js';
import { createGameServer } from '../server/index.js';

function fixture(t) {
  const base = join(process.cwd(), 'data'); mkdirSync(base, { recursive: true });
  const dir = mkdtempSync(join(base, 'admin-test-')), store = openSaveStore(join(dir, 'home.sqlite'));
  const session = createLairSession({ store }), a = session.connect(), b = session.connect();
  const backups = createBackupStore(join(dir, 'backups')), admin = createAdminController(session, backups);
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  return { dir, store, session, a, b, backups, admin };
}
function launch(s, players) {
  for (const p of players) { p.x = 9; p.y = 2.5; s.action(p, { type: 'board' }); }
  for (let i = 0; i < 61; i++) s.tick(.05);
  assert.equal(s.adminInfo().runActive, true);
}

test('admin stock/XP edits back up first, update live actors and persist, without altering existing ownership', t => {
  const { session: s, a, b, admin, store, backups } = fixture(t);
  const before = s.adminState();
  const result = admin.command({ type: 'set-stock', item: 'gold', amount: 200 });
  assert.deepEqual(backups.read(result.backupId).state, before);
  assert.equal(s.snapshot(b).camp.counts.gold, 200); assert.equal(store.load().camp.counts.gold, 200);
  admin.command({ type: 'set-xp', id: a.id, amount: 80 });
  a.x = 9; a.y = 11.5; assert.equal(s.action(a, { type: 'buy', upgrade: 'quickSearch' }), true);
  admin.command({ type: 'set-xp', id: a.id, amount: 0 });
  assert.equal(a.profile.xp, 0); assert.deepEqual(a.profile.purchases, ['quickSearch']); assert.equal(a.profile.earnedXp, 80);
  assert.equal(b.profile.xp, 0); assert.deepEqual(b.profile.purchases, []);
  const info = admin.summary(); assert.equal(info.players[0].xp, 0);
  assert.ok(!JSON.stringify(info).includes(a.token)); assert.equal(Object.hasOwn(info, 'state'), false);
  const restored = createLairSession({ store }); assert.deepEqual(restored.connect(a.token).profile, a.profile);
});

test('lair-only, one-goblin and full resets have separate scopes and retain identity keys/item counter', t => {
  const { session: s, a, b, admin, store } = fixture(t);
  s.action(a, { type: 'take', item: 'snare' });
  admin.command({ type: 'set-xp', id: a.id, amount: 90 }); admin.command({ type: 'set-xp', id: b.id, amount: 40 });
  admin.command({ type: 'set-stock', item: 'gold', amount: 400 });
  const counter = store.load().camp.nextItemId, bag = structuredClone(a.bag), token = a.token;
  admin.command({ type: 'reset-lair' });
  assert.equal(s.snapshot(a).camp.counts.gold, 0); assert.equal(s.snapshot(a).camp.counts.snare, 1);
  assert.deepEqual(a.bag, bag); assert.equal(a.profile.xp, 90); assert.equal(b.profile.xp, 40);
  admin.command({ type: 'reset-goblin', id: a.id });
  assert.equal(a.token, token); assert.equal(a.connected, true); assert.deepEqual(a.bag, []); assert.equal(a.profile.xp, 0); assert.equal(b.profile.xp, 40);
  admin.command({ type: 'reset-all' });
  assert.equal(b.profile.xp, 0); assert.equal(store.load().camp.nextItemId, counter);
  s.disconnect(a); assert.equal(s.connect(token), a);
});

test('restore atomically recovers saved home and profiles while keeping connected/newer goblin identities usable', t => {
  const { session: s, a, b, admin, backups } = fixture(t);
  s.action(a, { type: 'take', item: 'snare' }); admin.command({ type: 'set-xp', id: a.id, amount: 55 });
  const point = admin.command({ type: 'backup' }).backupId;
  admin.command({ type: 'reset-all' });
  const c = s.connect(); admin.command({ type: 'set-xp', id: c.id, amount: 99 }); s.action(c, { type: 'take', item: 'snare' });
  const counter = s.adminState().camp.nextItemId;
  const restored = admin.command({ type: 'restore', backupId: point });
  assert.equal(backups.read(restored.backupId).state.players.find(p => p.id === c.id).profile.xp, 99);
  assert.equal(a.profile.xp, 55); assert.equal(a.bag[0].type, 'snare'); assert.equal(a.connected, true);
  assert.equal(s.snapshot(b).camp.counts.snare, 0);
  assert.equal(c.profile.xp, 0); assert.deepEqual(c.bag, []); assert.equal(c.connected, true);
  assert.equal(s.adminState().camp.nextItemId, counter);
  assert.equal(s.action(a, { type: 'return', id: a.bag[0].id }), true); // Original socket actor object remains valid.
  assert.equal(s.snapshot(b).camp.counts.snare, 1);
});

test('invalid edits and invalid backup paths change neither state nor backup count', t => {
  const { session: s, a, admin, backups, dir } = fixture(t), state = s.adminState();
  const invalid = [
    { type: 'set-stock', item: 'gold', amount: -1 }, { type: 'set-stock', item: 'gold', amount: 1.5 },
    { type: 'set-stock', item: 'ruby', amount: 20 }, { type: 'set-stock', item: '__proto__', amount: 1 },
    { type: 'set-xp', id: a.id, amount: '50' }, { type: 'set-xp', id: 'missing', amount: 50 },
    { type: 'restore', backupId: '../home.sqlite' }, { type: 'delete-save' }, { type: 'end-run' }
  ];
  for (const command of invalid) { assert.throws(() => admin.command(command)); assert.deepEqual(s.adminState(), state); }
  assert.equal(backups.list().length, 0);
  const id = admin.command({ type: 'backup' }).backupId;
  writeFileSync(join(dir, 'backups', id), '{broken');
  assert.equal(backups.list()[0].valid, false); assert.throws(() => admin.command({ type: 'restore', backupId: id })); assert.deepEqual(s.adminState(), state);
});

test('if automatic backup fails, edit/reset/abort do not alter the saved or live home', t => {
  const { session: s, a, b, store } = fixture(t);
  const broken = createAdminController(s, { create() { throw Error('Backup disk full'); }, list: () => [] });
  for (const command of [{ type: 'reset-all' }, { type: 'set-stock', item: 'gold', amount: 90 }]) {
    const before = s.adminState(); assert.throws(() => broken.command(command), /Backup disk full/); assert.deepEqual(s.adminState(), before); assert.deepEqual(store.load(), before);
  }
  launch(s, [a, b]); assert.throws(() => broken.command({ type: 'end-run' }), /Backup disk full/); assert.equal(s.adminInfo().runActive, true);
});

test('active runs block edits/restore; forced ending discards dungeon bags with zero rewards and preserves waiting sacks', t => {
  const { session: s, a, b, admin, store } = fixture(t);
  const point = admin.command({ type: 'backup' }).backupId;
  s.action(a, { type: 'take', item: 'snare' }); launch(s, [a, b]);
  const waiting = s.connect(); waiting.bag.push({ id: 'waiting', type: 'smoke', rotation: 0, x: 0, y: 0 });
  a.bag.push({ id: 'lost-ruby', type: 'ruby', rotation: 0, x: 1, y: 0 });
  for (const command of [{ type: 'reset-all' }, { type: 'set-xp', id: a.id, amount: 9 }, { type: 'restore', backupId: point }]) assert.throws(() => admin.command(command), /End the active run/);
  admin.command({ type: 'backup' });
  const result = admin.command({ type: 'end-run' });
  assert.ok(result.backupId); assert.equal(s.adminInfo().runActive, false);
  assert.equal(a.location, 'home'); assert.equal(a.health, 3); assert.deepEqual(a.bag, []);
  assert.equal(a.result.aborted, true); assert.equal(a.result.personalXp.earned, 0); assert.ok(a.result.lostItems.some(i => i.id === 'lost-ruby'));
  assert.equal(a.profile.xp, 0); assert.equal(b.profile.xp, 0); assert.equal(store.load().camp.counts.gold, 0);
  assert.equal(waiting.bag[0].id, 'waiting'); assert.equal(waiting.waiting, false);
  assert.throws(() => admin.command({ type: 'end-run' }), /no active run/);
});

test('HTTP admin requires the private key and local origin, never exposes keys or backups, and updates real players', async t => {
  let game, ws;
  t.after(async () => { ws?.terminate(); if (game) { game.wss.close(); await new Promise(resolve => game.server.close(resolve)); } });
  const { session, a, admin: controller } = fixture(t);
  session.disconnect(a);
  const admin = createAdminHttp(controller, 'test-private-admin-key');
  game = createGameServer({ session, admin }); game.server.listen(0, '127.0.0.1'); await once(game.server, 'listening');
  const origin = `http://127.0.0.1:${game.server.address().port}`;
  const headers = { 'x-green-team-admin': admin.token, 'Content-Type': 'application/json', Origin: origin };
  assert.equal((await fetch(origin + '/admin')).status, 200);
  assert.equal((await fetch(origin + '/admin/api')).status, 403);
  assert.equal((await fetch(origin + '/admin/api', { headers: { 'x-green-team-admin': 'wrong' } })).status, 403);
  assert.equal((await fetch(origin + '/admin/api', { headers: { ...headers, Origin: 'https://other.test' } })).status, 403);
  assert.equal((await fetch(origin + '/admin/api', { method: 'POST', headers: { ...headers, Origin: '' }, body: '{}' })).status, 403);
  assert.equal((await fetch(origin + '/admin/api', { method: 'POST', headers, body: 'x'.repeat(5000) })).status, 413);
  assert.equal((await fetch(origin + '/admin/api', { method: 'DELETE', headers })).status, 405);
  const info = await (await fetch(origin + '/admin/api', { headers })).json(); assert.ok(info.players.length); assert.ok(!JSON.stringify(info).includes(a.token));
  ws = new WebSocket(origin.replace('http:', 'ws:') + '/session', { origin });
  const messages = []; ws.on('message', bytes => messages.push(JSON.parse(bytes)));
  await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', token: a.token }));
  async function until(fn) { for (let i = 0; i < 200; i++) { if (fn()) return; await new Promise(resolve => setTimeout(resolve, 10)); } assert.fail('No admin-updated game snapshot'); }
  await until(() => messages.some(m => m.type === 'state'));
  ws.send(JSON.stringify({ type: 'reset-all' })); await until(() => messages.some(m => m.type === 'rejected'));
  const response = await fetch(origin + '/admin/api', { method: 'POST', headers, body: JSON.stringify({ type: 'set-xp', id: a.id, amount: 70 }) });
  assert.equal(response.status, 200); const edited = await response.json(); assert.ok(edited.backupId);
  await until(() => messages.findLast(m => m.type === 'state')?.profile.xp === 70);
  assert.equal((await fetch(origin + '/data/backups/' + edited.backupId)).status, 404);
  assert.equal((await fetch(origin + '/server/admin.js')).status, 404);
  const req = { headers: { host: 'evil.test' }, socket: { remoteAddress: '127.0.0.1' } };
  let status; await admin.handle(req, { writeHead(code) { status = code; return this; }, end() {} }, '/admin/api'); assert.equal(status, 403);
});

test('browser admin wires edits, backup/restore, confirmations, run locks and access failure to real admin actions', async t => {
  const { session, a, b, admin } = fixture(t);
  class Surface {
    constructor() { this.dataset = {}; this.value = ''; this.listeners = {}; this.disabled = false; }
    addEventListener(type, fn) { this.listeners[type] = fn; }
    replaceChildren(...nodes) { this.children = nodes; }
    appendChild(node) { (this.children ??= []).push(node); }
    send(type) { this.listeners[type]?.({ preventDefault() {} }); }
  }
  const elements = new Map();
  const element = id => { if (!elements.has(id)) elements.set(id, new Surface()); return elements.get(id); };
  const buttons = ['set-stock', 'reset-lair', 'set-xp', 'reset-goblin', 'make-backup', 'restore-backup', 'end-run', 'reset-all'];
  const edits = buttons.filter(id => !['make-backup', 'end-run'].includes(id));
  globalThis.document = { querySelector: selector => element(selector.slice(1)), createElement: () => new Surface(),
    querySelectorAll: selector => (selector === 'button' ? buttons : edits).map(element) };
  let confirm = false, forbidden = false; const prompts = [], commands = [], intervals = [];
  globalThis.window = { confirm(text) { prompts.push(text); return confirm; } };
  globalThis.location = { hash: '#browser-test-key' };
  const originalFetch = globalThis.fetch, originalInterval = globalThis.setInterval;
  t.after(() => { globalThis.fetch = originalFetch; globalThis.setInterval = originalInterval; });
  globalThis.setInterval = fn => intervals.push(fn);
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/admin/api'); assert.equal(options.headers['x-green-team-admin'], 'browser-test-key');
    if (forbidden) return { ok: false, status: 403, json: async () => ({ error: 'Use the new private link.' }) };
    if (options.method === 'GET') return { ok: true, json: async () => admin.summary() };
    const command = JSON.parse(options.body); commands.push(command);
    const result = admin.command(command); return { ok: true, json: async () => ({ ...result, state: admin.summary() }) };
  };
  await import('../src/admin-main.js');
  assert.equal(element('set-stock').disabled, false); assert.equal(element('end-run').disabled, true);
  element('stock-amount').value = '125'; element('stock-form').send('submit');
  await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(session.snapshot(a).camp.counts.gold, 125);
  element('admin-goblin').value = a.id; element('xp-amount').value = '70'; element('xp-form').send('submit');
  await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(a.profile.xp, 70);
  element('make-backup').send('click'); await new Promise(resolve => setTimeout(resolve, 0));
  const checkpoint = element('admin-backup').value;
  const before = commands.length; element('reset-goblin').send('click');
  assert.equal(commands.length, before); assert.match(prompts.at(-1), /XP and unlocks/);
  confirm = true; element('reset-goblin').send('click'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(a.profile.xp, 0); assert.equal(b.profile.xp, 0);
  element('admin-backup').value = checkpoint; element('restore-backup').send('click'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(a.profile.xp, 70); assert.match(element('admin-status').textContent, /backup was made/);
  element('xp-amount').value = '1234'; await intervals[0](); assert.equal(element('xp-amount').value, '1234');
  launch(session, [a, b]); await intervals[0]();
  assert.equal(element('set-xp').disabled, true); assert.equal(element('restore-backup').disabled, true); assert.equal(element('end-run').disabled, false);
  element('end-run').send('click'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(session.adminInfo().runActive, false); assert.equal(element('set-xp').disabled, false);
  forbidden = true; await intervals[0]();
  assert.equal(element('set-stock').disabled, true); assert.match(element('admin-status').textContent, /new private link/);
});

test('failed admin commit leaves its pre-change backup intact and blocks further admin mutations', t => {
  const { session, a, admin, store, backups } = fixture(t);
  const previous = store.load();
  store.save = () => { throw Error('Disk full'); };
  assert.throws(() => admin.command({ type: 'set-xp', id: a.id, amount: 100 }), /Disk full/);
  assert.equal(backups.list().length, 1); assert.deepEqual(backups.read(backups.list()[0].id).state, previous);
  assert.equal(session.adminInfo().saveFailed, true);
  assert.throws(() => admin.command({ type: 'backup' }), /Saving failed/);
  assert.throws(() => admin.command({ type: 'reset-all' }), /Saving failed/);
  assert.equal(backups.list().length, 1); assert.deepEqual(store.load(), previous);
});
