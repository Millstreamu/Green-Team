import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { once } from 'node:events';
import WebSocket from 'ws';
import { createHubSession, migrateHubSave } from '../server/hub-session.js';
import { createLairSession } from '../server/lair-session.js';
import { openSaveStore, validateSave } from '../server/save-store.js';
import { createBackupStore } from '../server/admin.js';
import { createHubAdminController } from '../server/hub-admin.js';
import { createGameServer } from '../server/index.js';
import { createAdminHttp } from '../server/admin-http.js';
import { profileLevel } from '../src/profile.js';

function fixture(t) {
  const base = join(process.cwd(), 'data'); mkdirSync(base, { recursive: true });
  const dir = mkdtempSync(join(base, 'hub-test-')), store = openSaveStore(join(dir, 'home.sqlite'));
  t.after(() => { try { store.close(); } catch {} rmSync(dir, { recursive: true, force: true }); });
  const hub = createHubSession({ store }), a = hub.connect(), b = hub.connect();
  const backups = createBackupStore(join(dir, 'backups')), admin = createHubAdminController(hub, backups);
  return { dir, store, hub, a, b, backups, admin };
}
function create(h, p, name) { assert.equal(h.action(p, { type: 'create-lair', name }), true); return h.snapshot(p).lair; }
function enter(h, p, lair) { assert.equal(h.action(p, { type: 'join-lair', name: lair.name, code: lair.code }), true); }
function leave(h, p) { assert.equal(h.action(p, { type: 'leave-lair' }), true); }
function launch(h, players) {
  for (const p of players) { p.actor.x = 9; p.actor.y = 2.5; assert.ok(h.action(p, { type: 'board' })); }
  for (let i = 0; i < 61; i++) h.tick(.05);
  for (const p of players) p.actor.invulnerable = 1000;
  assert.ok(h.snapshot(players[0]).dungeon);
}
const ruby = id => ({ id, type: 'ruby', rotation: 0, x: 0, y: 0 });

test('home screen is the initial state; create/join validates names and private codes without listing other lairs', t => {
  const { hub: h, a, b } = fixture(t);
  assert.equal(h.snapshot(a).screen, 'home'); assert.equal(h.snapshot(a).level, 1);
  assert.deepEqual(h.snapshot(a).recentLairs, []); assert.equal(h.snapshot(a).camp, undefined);
  assert.equal(h.action(a, { type: 'take', item: 'snare' }), false);
  const lair = create(h, a, 'Moss Hollow'); assert.match(lair.code, /^[A-Z2-9]{6}$/);
  assert.deepEqual(h.snapshot(b).recentLairs, []); assert.ok(!JSON.stringify(h.snapshot(b)).includes(lair.code));
  assert.equal(h.action(b, { type: 'create-lair', name: ' moss hollow ' }), false);
  for (const code of ['wrong!', 'éééééé', 'AAAAAA']) assert.equal(h.action(b, { type: 'join-lair', name: lair.name, code }), false);
  assert.equal(h.adminInfo().saveFailed, false); enter(h, b, { ...lair, name: ' moss hollow ', code: lair.code.toLowerCase() });
  assert.equal(h.snapshot(b).lair.id, lair.id); assert.equal(h.snapshot(b).players.length, 2);
  leave(h, b); assert.deepEqual(h.snapshot(b).recentLairs, [{ id: lair.id, name: lair.name }]);
});

test('wrong code attempts are cooled down; bad names and forged lobby commands cannot create data', t => {
  const { hub: h, a, b } = fixture(t), lair = create(h, a, 'Locked');
  for (let i = 0; i < 5; i++) assert.equal(h.action(b, { type: 'join-lair', name: lair.name, code: '!!!!!!' }), false);
  assert.equal(h.action(b, { type: 'join-lair', name: lair.name, code: lair.code }), false);
  h.tick(10); enter(h, b, lair); leave(h, b);
  for (const name of ['', '\n', 'a'.repeat(33), 'A\nB']) assert.equal(h.action(b, { type: 'create-lair', name }), false);
  assert.equal(h.action(b, { type: 'buy', upgrade: 'smoke', xp: 999 }), false);
  assert.equal(h.adminState().lairs.length, 1);
});

test('lair stock, destination and sacks are isolated; personal XP, unlocks and displayed level follow the goblin', t => {
  const { hub: h, a, b, admin } = fixture(t), lairA = create(h, a, 'A'), lairB = create(h, b, 'B');
  h.action(a, { type: 'take', item: 'snare' });
  admin.command({ type: 'set-xp', id: a.id, amount: 150 });
  assert.equal(h.snapshot(a).level, 2); a.actor.x = 9; a.actor.y = 11.5;
  assert.equal(h.action(a, { type: 'buy', upgrade: 'quickSearch' }), true); assert.equal(a.profile.xp, 120);
  assert.equal(profileLevel(a.profile), 2); leave(h, a); enter(h, a, lairB);
  assert.equal(h.snapshot(a).bag.length, 0); assert.equal(h.snapshot(a).camp.counts.snare, 1);
  assert.deepEqual(a.profile.purchases, ['quickSearch']); assert.equal(b.profile.xp, 0);
  h.action(a, { type: 'take', item: 'snare' }); leave(h, a); enter(h, a, lairA);
  assert.equal(h.snapshot(a).bag.length, 1); assert.equal(h.snapshot(a).camp.counts.snare, 0);
  assert.equal(h.snapshot(b).camp.counts.snare, 0);
  assert.ok(!h.snapshot(a).players.some(p => p.id === b.id));
});

test('two lairs run independently; late arrivals wait, active participants cannot switch, and rewards stay in the proper lair', t => {
  const { hub: h, a, b } = fixture(t), lairA = create(h, a, 'A'), lairB = create(h, b, 'B');
  launch(h, [a]); launch(h, [b]); assert.notEqual(h.snapshot(a).dungeon.id, h.snapshot(b).dungeon.id);
  a.actor.bag.push(ruby('a-haul')); b.actor.bag.push(ruby('b-haul'));
  const late = h.connect(); enter(h, late, lairA); assert.equal(late.actor.waiting, true);
  assert.equal(h.action(a, { type: 'leave-lair' }), false); assert.equal(h.action(late, { type: 'take', item: 'snare' }), false);
  Object.assign(a.actor, h.snapshot(a).dungeon.entrance); assert.equal(h.action(a, { type: 'extract' }), true);
  assert.equal(h.snapshot(a).camp.counts.gold, 25); assert.equal(a.profile.xp, 25); assert.equal(late.profile.xp, 0);
  assert.ok(h.snapshot(b).dungeon); assert.equal(h.snapshot(b).camp.counts.gold, 0);
  Object.assign(b.actor, h.snapshot(b).dungeon.entrance); h.action(b, { type: 'extract' });
  assert.equal(h.snapshot(b).camp.counts.gold, 25); assert.equal(b.profile.xp, 25);
});

test('in-run disconnect resumes the same ghost, while ordinary reconnect/restart returns to home screen', t => {
  const { hub: h, a } = fixture(t), lair = create(h, a, 'Home');
  h.action(a, { type: 'take', item: 'snare' }); launch(h, [a]); const actor = a.actor;
  h.disconnect(a); assert.equal(h.connect(a.token), a); assert.equal(a.actor, actor); assert.equal(a.actor.bag.length, 1);
  Object.assign(a.actor, h.snapshot(a).dungeon.entrance); h.action(a, { type: 'extract' });
  h.disconnect(a); h.connect(a.token); assert.equal(h.snapshot(a).screen, 'home');
  enter(h, a, lair); assert.equal(h.snapshot(a).location, 'home');
});

test('expired participant can visit another lair and still earn its old team XP without losing new progress', t => {
  const { hub: h, a, b, admin } = fixture(t), lair = create(h, a, 'First'); enter(h, b, lair);
  admin.command({ type: 'set-xp', id: a.id, amount: 60 }); launch(h, [a, b]);
  h.disconnect(a); h.tick(60); h.connect(a.token); assert.equal(h.snapshot(a).screen, 'home');
  create(h, a, 'Second'); a.actor.x = 9; a.actor.y = 11.5; assert.ok(h.action(a, { type: 'buy', upgrade: 'quickSearch' })); a.actor.bag.push({ id: 'second-home', type: 'cloth', rotation: 0, x: 0, y: 0 });
  b.actor.bag.push(ruby('old-team')); Object.assign(b.actor, h.snapshot(b).dungeon.entrance); h.action(b, { type: 'extract' });
  assert.equal(a.profile.xp, 55); assert.equal(a.profile.earnedXp, 85); assert.deepEqual(a.profile.purchases, ['quickSearch']); assert.equal(h.snapshot(a).lair.name, 'Second'); assert.equal(a.actor.bag[0].id, 'second-home');
});

test('whole-server save restores lair codes/sacks/profiles, and old single-lair migration is backed up before commit', t => {
  const { store, hub: h, a, b, backups } = fixture(t), lairA = create(h, a, 'A'), lairB = create(h, b, 'B');
  h.action(a, { type: 'take', item: 'snare' }); h.action(b, { type: 'take', item: 'cloth' });
  const restored = createHubSession({ store }), ra = restored.connect(a.token), rb = restored.connect(b.token);
  assert.equal(restored.snapshot(ra).screen, 'home'); enter(restored, ra, lairA); enter(restored, rb, lairB);
  assert.equal(ra.actor.bag[0].type, 'snare'); assert.equal(rb.actor.bag[0].type, 'cloth'); validateSave(store.load());
  const old = createLairSession(), p = old.connect(); old.action(p, { type: 'take', item: 'snare' });
  let saved = old.adminState(), calls = 0;
  const migrated = createHubSession({ store: { load: () => saved, save: v => { saved = structuredClone(v); } }, beforeMigration(state) { backups.create(state, 'Before migration'); calls++; } });
  assert.equal(calls, 1); assert.equal(saved.version, 2);
  const mp = migrated.connect(p.token), ml = migrated.adminInfo().lairs[0]; assert.equal(ml.name, 'Original Lair'); enter(migrated, mp, ml);
  assert.equal(mp.actor.bag[0].type, 'snare'); assert.equal(mp.id, p.id);
  const legacy = old.adminState(); assert.throws(() => createHubSession({ store: { load: () => legacy, save() { assert.fail('Must not save before backup succeeds'); } }, beforeMigration() { throw Error('Backup failed'); } }), /Backup failed/);
});

test('admin targets selected stock/run while backing up and restoring the entire server and global profiles', t => {
  const { hub: h, a, b, admin, backups } = fixture(t), lairA = create(h, a, 'A'), lairB = create(h, b, 'B');
  admin.command({ type: 'set-stock', lairId: lairA.id, item: 'gold', amount: 60 });
  admin.command({ type: 'set-xp', id: a.id, amount: 100 });
  assert.equal(h.snapshot(a).camp.counts.gold, 60); assert.equal(h.snapshot(b).camp.counts.gold, 0);
  const point = admin.command({ type: 'backup' }).backupId; assert.equal(backups.read(point).state.lairs.length, 2);
  const newer = h.connect(); const third = create(h, newer, 'Newer');
  admin.command({ type: 'set-stock', lairId: third.id, item: 'gold', amount: 999 });
  admin.command({ type: 'reset-goblin', id: a.id }); assert.equal(a.profile.xp, 0);
  admin.command({ type: 'restore', backupId: point }); assert.equal(a.profile.xp, 100); assert.equal(h.snapshot(a).lair.id, lairA.id);
  assert.equal(h.snapshot(newer).lair.id, third.id); assert.equal(h.snapshot(newer).camp.counts.gold, 0);
  launch(h, [b]); assert.throws(() => admin.command({ type: 'reset-lair', lairId: lairA.id }), /End all active runs/);
  assert.throws(() => admin.command({ type: 'end-run', lairId: lairA.id }), /no active run/);
  launch(h, [a]);
  admin.command({ type: 'end-run', lairId: lairB.id }); assert.equal(h.snapshot(b).result.aborted, true);
  assert.ok(h.snapshot(a).dungeon); // The other group's run continues.
  assert.equal(h.snapshot(a).camp.counts.gold, 60); assert.equal(h.adminInfo(lairB.id).selectedLairId, lairB.id);
});

test('invalid world profiles, duplicate lairs and a failed world commit cannot silently corrupt the server save', t => {
  const { hub: h, a } = fixture(t); create(h, a, 'Saved');
  const saved = h.adminState();
  for (const edit of [s => s.lairs.push(structuredClone(s.lairs[0])), s => s.lairs[0].state.players[0].profile.xp = 999]) {
    const bad = structuredClone(saved); edit(bad); assert.throws(() => validateSave(bad), /Invalid/);
  }
  let last = null, fail = false;
  const atomic = createHubSession({ store: { load: () => null, save(s) { if (fail) throw Error('Disk full'); last = structuredClone(s); } } });
  const p = atomic.connect(); fail = true;
  assert.throws(() => atomic.action(p, { type: 'create-lair', name: 'Uncommitted' }), /Disk full/);
  assert.equal(last.lairs.length, 0); assert.equal(atomic.adminInfo().saveFailed, true); assert.throws(() => atomic.tick(.05), /Disk full/);
});

test('real socket clients start at menu, create/join by code, isolate lairs and switch without moving supplies', async t => {
  let game; const sockets = [];
  t.after(async () => { for (const ws of sockets) ws.terminate(); if (game) { game.wss.close(); await new Promise(resolve => game.server.close(resolve)); } });
  const { hub, admin: controller } = fixture(t);
  const admin = createAdminHttp(controller, 'hub-http-test-key');
  game = createGameServer({ session: hub, admin });
  game.server.listen(0, '127.0.0.1'); await once(game.server, 'listening'); const origin = `http://127.0.0.1:${game.server.address().port}`;
  async function until(fn) { for (let i = 0; i < 200; i++) { if (fn()) return; await new Promise(resolve => setTimeout(resolve, 10)); } assert.fail('Missing lobby socket state'); }
  async function client() {
    const ws = new WebSocket(origin.replace('http:', 'ws:') + '/session', { origin }); sockets.push(ws); const c = { ws, messages: [] };
    ws.on('message', bytes => { const m = JSON.parse(bytes); c.messages.push(m); if (m.type === 'state') c.state = m; });
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello' })); await until(() => c.state); return c;
  }
  const a = await client(), b = await client(); assert.equal(a.state.screen, 'home');
  a.ws.send(JSON.stringify({ type: 'create-lair', name: 'Network' })); await until(() => a.state.lair);
  const lair = a.state.lair; b.ws.send(JSON.stringify({ type: 'join-lair', name: lair.name, code: '!!!!!!' }));
  await until(() => b.messages.some(m => m.type === 'rejected')); assert.equal(b.state.screen, 'home');
  b.ws.send(JSON.stringify({ type: 'join-lair', name: lair.name, code: lair.code })); await until(() => b.state.lair);
  a.ws.send(JSON.stringify({ type: 'take', item: 'snare' })); await until(() => a.state.bag.length === 1);
  a.ws.send(JSON.stringify({ type: 'leave-lair' })); await until(() => a.state.screen === 'home');
  a.ws.send(JSON.stringify({ type: 'create-lair', name: 'Other' })); await until(() => a.state.lair?.name === 'Other');
  await until(() => b.state.camp.counts.snare === 0 && !b.state.players.some(p => p.id === a.state.selfId));
  assert.equal(a.state.bag.length, 0); assert.equal(a.state.camp.counts.snare, 1); assert.equal(b.state.camp.counts.snare, 0);
  const headers = { 'x-green-team-admin': admin.token, 'Content-Type': 'application/json', Origin: origin };
  const summary = await (await fetch(origin + '/admin/api?lair=' + a.state.lair.id, { headers })).json();
  assert.equal(summary.selectedLairId, a.state.lair.id); assert.equal(summary.lairs.length, 2);
  const edited = await fetch(origin + '/admin/api', { method: 'POST', headers, body: JSON.stringify({ type: 'set-stock', lairId: a.state.lair.id, item: 'gold', amount: 77 }) });
  assert.equal(edited.status, 200); await until(() => a.state.camp.counts.gold === 77);
  assert.equal(b.state.camp.counts.gold, 0);
  assert.ok(!b.state.players.some(p => p.id === a.state.selfId)); assert.ok(!JSON.stringify(b.state).includes(a.state.lair.code));
});

test('old single-lair backups restore into Original Lair without changing its join code or losing newer identities', t => {
  const { hub: h, a, b, admin, backups } = fixture(t), original = create(h, a, 'Original Lair'); create(h, b, 'New Lair');
  const old = createLairSession(), p = old.connect(); old.action(p, { type: 'take', item: 'snare' });
  p.profile.xp = p.profile.earnedXp = 60; old.snapshot(p).camp.counts.gold = 99;
  const id = backups.create(old.adminState(), 'Old V38 backup');
  admin.command({ type: 'restore', backupId: id });
  const target = h.adminInfo().lairs.find(l => l.name === 'Original Lair');
  assert.equal(target.id, original.id); assert.equal(target.code, original.code);
  assert.equal(h.snapshot(a).camp.counts.gold, 99); assert.equal(h.snapshot(b).lair.name, 'New Lair');
  const restored = h.connect(p.token); enter(h, restored, target);
  assert.equal(restored.profile.xp, 60); assert.equal(restored.actor.bag[0].type, 'snare'); validateSave(h.adminState());
});

test('browser admin lair selector sends scoped requests and shows the selected join code', async t => {
  const { hub, a, b, admin } = fixture(t), lairA = create(hub, a, 'First'), lairB = create(hub, b, 'Second');
  class Element {
    constructor() { this.dataset = {}; this.value = ''; this.listeners = {}; }
    addEventListener(type, fn) { this.listeners[type] = fn; }
    replaceChildren(...nodes) { this.children = nodes; }
    send(type) { this.listeners[type]?.({ preventDefault() {} }); }
  }
  const nodes = new Map(), get = id => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
  const buttons = ['set-stock', 'reset-lair', 'set-xp', 'reset-goblin', 'make-backup', 'restore-backup', 'end-run', 'reset-all'];
  globalThis.document = { querySelector: s => get(s.slice(1)), createElement: () => new Element(), querySelectorAll: s => buttons.filter(id => s === 'button' || !['make-backup', 'end-run'].includes(id)).map(get) };
  globalThis.window = { confirm: () => true }; globalThis.location = { hash: '#private-test' };
  const priorFetch = globalThis.fetch, priorInterval = globalThis.setInterval;
  t.after(() => { globalThis.fetch = priorFetch; globalThis.setInterval = priorInterval; });
  globalThis.setInterval = () => {};
  const commands = [];
  globalThis.fetch = async (url, options) => {
    let result;
    if (options.method === 'GET') result = admin.summary(new URL(url, 'http://localhost').searchParams.get('lair'));
    else { const command = JSON.parse(options.body); commands.push(command); result = { ...admin.command(command), state: admin.summary(command.lairId) }; }
    return { ok: true, json: async () => result };
  };
  await import('../src/admin-main.js'); assert.equal(get('admin-lair').value, lairA.id);
  get('admin-lair').value = lairB.id; get('admin-lair').send('change'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(get('admin-lair-code').textContent, lairB.code);
  get('admin-item').value = 'gold'; get('stock-amount').value = '777'; get('stock-form').send('submit'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(commands.at(-1).lairId, lairB.id); assert.equal(hub.snapshot(b).camp.counts.gold, 777); assert.equal(hub.snapshot(a).camp.counts.gold, 0);
});
