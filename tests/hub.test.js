import { GENERATOR_PRESETS } from '../src/generator-settings.js';
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
  assert.equal(ra.actor.bag[0].type, 'snare'); assert.equal(rb.actor.bag[0].type, 'cloth');
  assert.equal(restored.snapshot(ra).lair.code, lairA.code); assert.equal(restored.snapshot(rb).lair.code, lairB.code); validateSave(store.load());
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
  const tuningCommand = { type: 'set-tuning', lairId: a.state.lair.id, values: { ...summary.tuning, sight: 2 } };
  assert.equal((await fetch(origin + '/admin/api', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(tuningCommand) })).status, 403);
  const tuned = await fetch(origin + '/admin/api', { method: 'POST', headers, body: JSON.stringify(tuningCommand) });
  assert.equal(tuned.status, 200); assert.equal((await tuned.json()).state.tuning.sight, 2);
  assert.equal(controller.summary(lair.id).tuning.sight, 7);
  const rejections = a.messages.filter(m => m.type === 'rejected').length;
  a.ws.send(JSON.stringify(tuningCommand)); await until(() => a.messages.filter(m => m.type === 'rejected').length > rejections);
  assert.equal(controller.summary(a.state.lair.id).tuning.sight, 2);
  assert.equal((await fetch(origin + '/src/tuning-view.js')).status, 200);
  const layoutEdit = await fetch(origin + '/admin/api', { method: 'POST', headers, body: JSON.stringify({ type: 'set-generator', lairId: a.state.lair.id, jobId: 'sanctuary', values: { ...GENERATOR_PRESETS.sanctuary, rooms: 16 } }) });
  assert.equal(layoutEdit.status, 200); assert.equal((await layoutEdit.json()).state.generator.sanctuary.rooms, 16);
  assert.equal(controller.summary(lair.id).generator.sanctuary.rooms, 18);
  assert.equal((await fetch(origin + '/src/generator-view.js')).status, 200);
  assert.equal((await fetch(origin + '/src/dungeon-checks.js')).status, 200);


  const edited = await fetch(origin + '/admin/api', { method: 'POST', headers, body: JSON.stringify({ type: 'set-stock', lairId: a.state.lair.id, item: 'gold', amount: 77 }) });
  assert.equal(edited.status, 200); await until(() => a.state.camp.counts.gold === 77);
  assert.equal(b.state.camp.counts.gold, 0);
  assert.ok(!b.state.players.some(p => p.id === a.state.selfId)); assert.ok(!JSON.stringify(b.state).includes(a.state.lair.code));
  a.ws.send(JSON.stringify({ type: 'leave-lair' })); await until(() => a.state.screen === 'home');
  assert.equal(a.state.ownedLairs.length, 2);
  a.ws.send(JSON.stringify({ type: 'enter-owned-lair', id: lair.id })); await until(() => a.state.lair?.id === lair.id);
  assert.equal(a.state.bag.length, 1); // Own sack restored without submitting a code.

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
    appendChild(node) { (this.children ??= []).push(node); }
    getContext() { return { fillRect() {} }; }
    setAttribute(key, value) { this[key] = value; }
    click() { this.clicked = true; }
    remove() {}
    send(type) { this.listeners[type]?.({ preventDefault() {} }); }
  }
  const anchors = [];
  const nodes = new Map(), get = id => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
  const buttons = ['set-stock', 'reset-lair', 'set-xp', 'reset-goblin', 'make-backup', 'restore-backup', 'end-run', 'reset-all'];
  globalThis.document = { querySelector: s => get(s.slice(1)), createElement: tag => { const node = new Element(); if (tag === 'a') anchors.push(node); return node; }, body: { appendChild() {} }, querySelectorAll: s => buttons.filter(id => s === 'button' || !['make-backup', 'end-run'].includes(id)).map(get) };
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
  get('generator-seed').value = '42'; get('generator-grid').checked = true;
  await import('../src/admin-main.js'); assert.equal(get('admin-lair').value, lairA.id);
  get('admin-lair').value = lairB.id; get('admin-lair').send('change'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(get('admin-lair-code').textContent, lairB.code);
  get('admin-item').value = 'gold'; get('stock-amount').value = '777'; get('stock-form').send('submit'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(commands.at(-1).lairId, lairB.id); assert.equal(hub.snapshot(b).camp.counts.gold, 777); assert.equal(hub.snapshot(a).camp.counts.gold, 0);
  const input = id => get('tuning-fields').children.map(label => label.children[1]).find(node => node.id === 'tuning-' + id);
  assert.equal(input('sight').value, 7); assert.equal(input('nearEmptyChance').value, 45);
  input('sight').value = '3'; input('nearEmptyChance').value = '90'; input('nearMaterialChance').value = '65'; input('sight').send('input');
  // Polling the same saved state must not erase an unfinished edit.
  get('admin-lair').send('change'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(input('sight').value, '3'); assert.match(get('tuning-note').textContent, /Unsaved/);
  get('tuning-form').send('submit'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(commands.at(-1).type, 'set-tuning'); assert.equal(commands.at(-1).lairId, lairB.id);
  assert.equal(admin.summary(lairB.id).tuning.nearEmptyChance, .9);
  assert.equal(admin.summary(lairB.id).tuning.nearMaterialChance, .65);
  assert.equal(admin.summary(lairA.id).tuning.sight, 7);
  launch(hub, [b]); get('admin-lair').send('change'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(get('save-tuning').disabled, false); assert.equal(get('set-stock').disabled, true);
  get('reset-tuning').send('click'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(input('sight').value, 7); assert.equal(hub.snapshot(b).dungeon.tuning.combat.sight, 3);
  // Reset also clears an unsaved draft when the saved settings already equal defaults.
  input('sight').value = '4'; get('reset-tuning').send('click'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(input('sight').value, 7);
  assert.match(get('generator-summary').textContent, /rooms.*hiding spots/);
  get('generator-job').value = 'hold'; get('generator-job').send('change');
  const layoutInput = id => get('generator-fields').children.map(label => label.children[1]).find(node => node.id === 'generator-' + id);
  assert.equal(layoutInput('corridorWidth').value, 3);
  layoutInput('width').value = '80'; get('generator-preview').send('click');
  assert.equal(get('generator-seed').value, '42'); assert.equal(get('generator-map').width, 640);
  get('admin-lair').send('change'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(layoutInput('width').value, '80');
  get('generator-form').send('submit'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(commands.at(-1).type, 'set-generator'); assert.equal(commands.at(-1).jobId, 'hold');
  assert.equal(admin.summary(lairB.id).generator.hold.width, 80); assert.equal(admin.summary(lairA.id).generator.hold.width, 88);
  get('generator-reset').send('click'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(layoutInput('width').value, 88); assert.equal(get('generator-save').disabled, false);
  const previousCreate = URL.createObjectURL, blobs = [];
  URL.createObjectURL = blob => { blobs.push(blob); return previousCreate(blob); };
  t.after(() => { URL.createObjectURL = previousCreate; });
  input('sight').value = '2'; // Export saved values, not this unfinished edit.
  const commandCount = commands.length;
  get('export-settings').send('click'); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(commands.length, commandCount); assert.equal(blobs.length, 1);
  const exported = JSON.parse(await blobs[0].text());
  assert.equal(exported.lairName, 'Second'); assert.equal(exported.tuning.sight, 7);
  assert.equal(exported.generator.hold.width, 88); assert.equal(exported.generator.sanctuary.rooms, 18);
  assert.equal(anchors.at(-1).clicked, true); assert.equal(anchors.at(-1).download, 'green-team-settings-second.json');
  assert.match(get('admin-status').textContent, /Attach it/);


});

test('creator re-enters without a code after restart; friends and forged owners still need the join code', t => {
  const { hub: h, a, b, store, admin } = fixture(t), lair = create(h, a, 'My Home');
  h.action(a, { type: 'take', item: 'snare' }); leave(h, a);
  assert.deepEqual(h.snapshot(a).ownedLairs, [{ id: lair.id, name: lair.name }]); assert.deepEqual(h.snapshot(b).ownedLairs, []);
  assert.equal(h.action(b, { type: 'enter-owned-lair', id: lair.id, ownerId: b.id }), false);
  assert.equal(h.action(b, { type: 'join-lair', name: lair.name, ownerId: b.id }), false);
  enter(h, b, lair); leave(h, b); assert.equal(h.action(b, { type: 'enter-owned-lair', id: lair.id }), false);
  assert.equal(h.action(a, { type: 'enter-owned-lair', id: lair.id }), true); assert.equal(a.actor.bag.length, 1);
  leave(h, a); assert.equal(h.action(a, { type: 'join-lair', name: lair.name }), true); leave(h, a);
  const restored = createHubSession({ store }), ra = restored.connect(a.token), rb = restored.connect(b.token);
  assert.deepEqual(restored.snapshot(ra).ownedLairs, [{ id: lair.id, name: lair.name }]);
  assert.equal(restored.action(ra, { type: 'enter-owned-lair', id: lair.id }), true); assert.equal(ra.actor.bag.length, 1);
  assert.equal(restored.action(rb, { type: 'enter-owned-lair', id: lair.id }), false);
  const point = admin.command({ type: 'backup' }).backupId;
  admin.command({ type: 'reset-all' }); assert.equal(h.adminState().lairs[0].ownerId, a.id);
  admin.command({ type: 'restore', backupId: point }); assert.equal(h.adminState().lairs[0].ownerId, a.id);
  assert.equal(h.action(a, { type: 'enter-owned-lair', id: lair.id }), true); assert.equal(a.actor.bag.length, 1);
  const bad = h.adminState(); bad.lairs[0].ownerId = 'unknown-goblin'; assert.throws(() => validateSave(bad), /Invalid/);
});

test('V39 ownership backfill is backed up and durable, while ownerless lairs cannot be claimed by first visitors', t => {
  const { hub: h, a, b, backups, admin } = fixture(t), lair = create(h, a, 'Older'); enter(h, b, lair);
  const old = h.adminState(); delete old.lairs[0].ownerId; let saved = old, count = 0;
  const migrated = createHubSession({ store: { load: () => saved, save: state => { saved = structuredClone(state); } }, beforeMigration(state) { count++; backups.create(state, 'Before ownership update'); } });
  const ma = migrated.connect(a.token); assert.equal(count, 1); assert.equal(saved.lairs[0].ownerId, a.id);
  assert.equal(migrated.action(ma, { type: 'enter-owned-lair', id: lair.id }), true);
  const reordered = structuredClone(old); reordered.lairs[0].state.players.reverse();
  const oldPoint = backups.create(reordered, 'Old backup without ownership');
  admin.command({ type: 'restore', backupId: oldPoint }); assert.equal(h.adminState().lairs[0].ownerId, a.id);
  const none = structuredClone(saved); none.lairs[0].ownerId = null;
  const ownerless = createHubSession({ store: { load: () => none, save() {} } }), visitor = ownerless.connect(b.token);
  assert.deepEqual(ownerless.snapshot(visitor).ownedLairs, []); assert.equal(ownerless.action(visitor, { type: 'enter-owned-lair', id: lair.id }), false);
  enter(ownerless, visitor, lair);
  const restarted = createHubSession({ store: { load: () => ownerless.adminState(), save() {} } });
  assert.equal(restarted.adminState().lairs[0].ownerId, null);
});

test('run settings are lair scoped, survive restart/backup, and never alter an active dungeon', t => {
  const { hub: h, a, b, store, admin, backups } = fixture(t);
  const lairA = create(h, a, 'Tuned'), lairB = create(h, b, 'Default');
  const defaults = admin.summary(lairA.id).tuning;
  const values = { ...defaults, sight: 2, windup: .7, alertsPerGuard: 1, chestTime: 8, nearEmptyChance: 1, farEmptyChance: 1, nearMaterialChance: .9 };
  const result = admin.command({ type: 'set-tuning', lairId: lairA.id, values });
  assert.deepEqual(backups.read(result.backupId).state.lairs.find(l => l.id === lairA.id).tuning, defaults);
  assert.deepEqual(admin.summary(lairB.id).tuning, defaults);
  launch(h, [a]); launch(h, [b]);
  assert.equal(h.snapshot(a).dungeon.tuning.combat.sight, 2);
  assert.equal(h.snapshot(a).dungeon.pressure.alertsPerGuard, 1);
  assert.equal(h.snapshot(b).dungeon.tuning.combat.sight, defaults.sight);
  // Update during a live run; same actors/world/positions remain in play.
  const runId = h.snapshot(a).dungeon.id, actor = a.actor;
  admin.command({ type: 'reset-tuning', lairId: lairA.id });
  assert.equal(a.actor, actor); assert.equal(h.snapshot(a).dungeon.id, runId);
  assert.equal(h.snapshot(a).dungeon.tuning.combat.sight, 2);
  assert.equal(h.snapshot(a).dungeon.tuning.search.chestTime, 8);
  assert.equal(h.snapshot(a).dungeon.tuning.loot.nearEmptyChance, 1);
  assert.equal(h.snapshot(a).dungeon.tuning.loot.nearMaterialChance, .9);
  admin.command({ type: 'end-run', lairId: lairA.id });
  h.action(a, { type: 'dismiss-result' }); launch(h, [a]);
  assert.equal(h.snapshot(a).dungeon.tuning.combat.sight, defaults.sight);
  // Restart retains pending settings despite an interrupted run.
  admin.command({ type: 'set-tuning', lairId: lairA.id, values });
  const restored = createHubSession({ store });
  assert.deepEqual(restored.adminInfo(lairA.id).tuning, values);
  const saved = createHubAdminController(restored, backups).command({ type: 'backup' });
  const restoredAdmin = createHubAdminController(restored, backups);
  restoredAdmin.command({ type: 'reset-tuning', lairId: lairA.id });
  restoredAdmin.command({ type: 'restore', backupId: saved.backupId });
  assert.deepEqual(restored.adminInfo(lairA.id).tuning, values);
  restoredAdmin.command({ type: 'reset-all' });
  assert.deepEqual(restored.adminInfo(lairA.id).tuning, values);
});

test('invalid run settings and player commands cannot edit tuning; failed backups prevent changes', t => {
  const { hub: h, a, admin, backups } = fixture(t), lair = create(h, a, 'Validation');
  const defaults = admin.summary(lair.id).tuning, count = backups.list().length;
  for (const values of [null, [], {}, { ...defaults, sight: '8' }, { ...defaults, sight: Infinity }, { ...defaults, windup: 0 }, { ...defaults, alertsPerGuard: 1.5 }, { ...defaults, twoItemChance: 1.1 }, { ...defaults, extra: 1 }]) {
    assert.throws(() => admin.command({ type: 'set-tuning', lairId: lair.id, values }), /Invalid tuning/);
  }
  assert.throws(() => admin.command({ type: 'set-tuning', lairId: 'missing', values: defaults }), /Choose a lair/);
  assert.equal(backups.list().length, count);
  assert.equal(h.action(a, { type: 'set-tuning', lairId: lair.id, values: { ...defaults, sight: 2 } }), false);
  const blocked = createHubAdminController(h, { list: () => [], create() { throw Error('Backup blocked'); } });
  assert.throws(() => blocked.command({ type: 'reset-tuning', lairId: lair.id }), /Backup blocked/);
  assert.deepEqual(admin.summary(lair.id).tuning, defaults);
  const old = h.adminState(); delete old.lairs[0].tuning;
  validateSave(old);
  const upgraded = createHubSession({ store: { load: () => old, save() {} } });
  assert.deepEqual(upgraded.adminInfo(lair.id).tuning, defaults);
  old.lairs[0].tuning = { ...defaults, sight: 99 };
  assert.throws(() => validateSave(old), /Invalid tuning/);
});


test('failed tuning checkpoint keeps its before-change backup and blocks further edits', () => {
  let last = null, fail = false;
  const h = createHubSession({ store: { load: () => null, save(s) { if (fail) throw Error('Disk full'); last = structuredClone(s); } } });
  const a = h.connect(), lair = create(h, a, 'Disk test'), copies = [];
  const admin = createHubAdminController(h, { list: () => [], create(s) { copies.push(structuredClone(s)); return 'backup'; } });
  const defaults = h.adminInfo(lair.id).tuning; fail = true;
  assert.throws(() => admin.command({ type: 'set-tuning', lairId: lair.id, values: { ...defaults, sight: 2 } }), /Disk full/);
  assert.deepEqual(last.lairs[0].tuning, defaults); assert.deepEqual(copies[0].lairs[0].tuning, defaults);
  assert.equal(h.adminInfo().saveFailed, true);
  assert.throws(() => admin.command({ type: 'reset-tuning', lairId: lair.id }), /Saving failed/);
});


test('generator presets persist per lair/architecture and only apply at the next matching map departure', t => {
  const { hub: h, a, b, store, admin, backups } = fixture(t), lair = create(h, a, 'Architecture'), other = create(h, b, 'Other');
  const values = { ...GENERATOR_PRESETS.hold, width: 80, rooms: 10, searchablesPerRoom: 3 };
  const edit = admin.command({ type: 'set-generator', lairId: lair.id, jobId: 'hold', values });
  assert.deepEqual(backups.read(edit.backupId).state.lairs.find(l => l.id === lair.id).generator.hold, GENERATOR_PRESETS.hold);
  assert.deepEqual(admin.summary(other.id).generator, GENERATOR_PRESETS);
  a.actor.x = 5; a.actor.y = 2.5;
  assert.equal(h.action(a, { type: 'destination', job: 'hold', difficulty: 'hard' }), true);
  launch(h, [a]);
  const before = h.snapshot(a).dungeon; assert.equal(before.job.jobId, 'hold'); assert.equal(before.job.difficultyId, 'hard');
  assert.equal(before.layout.width, 80); assert.equal(before.layout.searchablesPerRoom, 3);
  admin.command({ type: 'reset-generator', lairId: lair.id, jobId: 'hold' });
  assert.equal(h.snapshot(a).dungeon.id, before.id); assert.equal(h.snapshot(a).dungeon.layout.width, 80);
  admin.command({ type: 'end-run', lairId: lair.id }); h.action(a, { type: 'dismiss-result' }); launch(h, [a]);
  assert.equal(h.snapshot(a).dungeon.layout.width, 88);
  admin.command({ type: 'set-generator', lairId: lair.id, jobId: 'hold', values });
  const restored = createHubSession({ store }); assert.deepEqual(restored.adminInfo(lair.id).generator.hold, values);
  const restoredAdmin = createHubAdminController(restored, backups), backup = restoredAdmin.command({ type: 'backup' });
  restoredAdmin.command({ type: 'reset-generator', lairId: lair.id, jobId: 'hold' });
  restoredAdmin.command({ type: 'restore', backupId: backup.backupId });
  assert.deepEqual(restored.adminInfo(lair.id).generator.hold, values);
});

test('generator edits validate before backup, reject player access and preserve legacy saves', t => {
  const { hub: h, a, admin, backups } = fixture(t), lair = create(h, a, 'Invalid layout');
  const count = backups.list().length;
  assert.throws(() => admin.command({ type: 'set-generator', lairId: lair.id, jobId: 'unknown', values: GENERATOR_PRESETS.manor }), /dungeon type/);
  assert.throws(() => admin.command({ type: 'set-generator', lairId: lair.id, jobId: 'manor', values: { ...GENERATOR_PRESETS.manor, rooms: 10000 } }), /Invalid dungeon/);
  assert.equal(backups.list().length, count);
  assert.equal(h.action(a, { type: 'set-generator', jobId: 'manor', values: GENERATOR_PRESETS.manor }), false);
  const saved = h.adminState(); delete saved.lairs[0].generator;
  const old = createHubSession({ store: { load: () => saved, save() {} } });
  assert.deepEqual(old.adminInfo(lair.id).generator, GENERATOR_PRESETS);
  saved.lairs[0].generator = { manor: GENERATOR_PRESETS.manor };
  assert.throws(() => validateSave(saved), /Invalid dungeon/);
  const blocked = createHubAdminController(h, { list: () => [], create() { throw Error('Backup blocked'); } });
  assert.throws(() => blocked.command({ type: 'reset-generator', lairId: lair.id, jobId: 'manor' }), /Backup blocked/);
  assert.deepEqual(h.adminInfo(lair.id).generator, GENERATOR_PRESETS);
});


test('V66 tuning upgrades preserve implicit material mix and chosen odds, back up before commit and survive restart', t => {
  const { hub, a, store, backups } = fixture(t), lair = create(hub, a, 'Legacy odds');
  const old = hub.adminState();
  old.lairs[0].tuning.nearEmptyChance = .8; old.lairs[0].tuning.farEmptyChance = .6;
  delete old.lairs[0].tuning.nearMaterialChance;
  const original = structuredClone(old); validateSave(old); assert.deepEqual(old, original);
  let saved, backedUp = 0;
  const upgraded = createHubSession({ store: { load: () => old, save(state) { assert.equal(backedUp, 1); saved = structuredClone(state); } },
    beforeMigration(state) { assert.deepEqual(state, original); backups.create(state, 'Before V67 tuning update'); backedUp++; } });
  const tuning = upgraded.adminInfo(lair.id).tuning;
  assert.equal(tuning.nearEmptyChance, .8); assert.equal(tuning.farEmptyChance, .6); assert.equal(tuning.nearMaterialChance, .75);
  assert.deepEqual(old, original, 'input and old backups stay untouched');
  assert.deepEqual(saved.lairs[0].state.camp, original.lairs[0].state.camp);
  assert.deepEqual(saved.profiles, original.profiles);
  const restarted = createHubSession({ store: { load: () => saved, save() {} }, beforeMigration() { assert.fail('Must not migrate twice'); } });
  assert.deepEqual(restarted.adminInfo(lair.id).tuning, tuning);
  store.save(original);
  const diskRestart = createHubSession({ store, beforeMigration(state) { assert.deepEqual(state, original); backups.create(state, 'Before disk upgrade'); } });
  assert.deepEqual(diskRestart.adminInfo(lair.id).tuning, tuning);
  assert.equal(store.load().lairs[0].tuning.nearMaterialChance, .75, 'expanded field is durable in SQLite');
  assert.deepEqual(store.load().profiles, original.profiles);
  // Strict writes do not accept a partial legacy payload as a new editor edit.
  const admin = createHubAdminController(restarted, backups);
  assert.throws(() => admin.command({ type: 'set-tuning', lairId: lair.id, values: original.lairs[0].tuning }), /Invalid tuning/);
  const applied = admin.command({ type: 'set-tuning', lairId: lair.id, values: { ...tuning, nearEmptyChance: .45, farEmptyChance: .35, nearMaterialChance: .55 } });
  assert.equal(backups.read(applied.backupId).state.lairs[0].tuning.nearMaterialChance, .75);
  assert.equal(restarted.adminInfo(lair.id).tuning.nearMaterialChance, .55);
  assert.throws(() => createHubSession({ store: { load: () => original, save() { assert.fail('No write before backup'); } }, beforeMigration() { throw Error('Backup failed'); } }), /Backup failed/);
});
