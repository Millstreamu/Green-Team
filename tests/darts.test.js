import test from 'node:test';
import assert from 'node:assert/strict';
import { DART } from '../src/config.js';
import { equipDart, beginDartAim, fireDart, updateDarts, sleepGuard, boundDartAim } from '../src/darts.js';
import { createPlacement, cancelPlacement, equipSnare, moveTrapAim } from '../src/traps.js';
import { createGuard, createVitality, updateGuard, seesPlayer } from '../src/guard.js';
import { createCamp, craftForSack, bankEscape } from '../src/lair.js';
import { createProfile, buyPersonalUpgrade } from '../src/profile.js';
import { restoreSave } from '../server/save-store.js';
import { createDungeonSession } from '../server/dungeon-session.js';
import { selectJob } from '../src/jobs.js';
import { canStand } from '../src/world.js';

const dart = (id = 'dart') => ({ id, type: 'dart', rotation: 0, x: 0, y: 0 });
const arena = () => ({ width: 16, height: 12, seed: 42, spawn: { x: 2.5, y: 5.5 }, tiles: new Uint8Array(192).fill(1), rooms: [{ x: 1, y: 1, w: 6, h: 9, cx: 4, cy: 5 }] });
const aimDart = (aim, loot, player, id) => equipDart(aim, loot, player, id) && beginDartAim(aim, loot, player, id);
const actor = () => ({ ...createVitality(), x: 2.5, y: 5.5, facing: 1, id: 'a' });

test('aim reserves exact item; cancel preserves it; fire validates aim and spends one copy once', () => {
  const w = arena(), p = actor(), aim = createPlacement(), bag = [dart(), { ...dart('other'), x: 1 }], loot = { bag, held: null }, shots = [];
  assert.ok(equipDart(aim, loot, p, 'dart')); assert.equal(aim.itemId, null, 'equipping must not enter aim'); assert.equal(p.dartId, 'dart');
  assert.ok(beginDartAim(aim, loot, p)); assert.equal(bag.length, 2);
  moveTrapAim(aim, p, { x: 0, y: 1 }, .5); assert.equal(p.y, 5.5);
  boundDartAim(aim, p, { width: 192, height: 120 }); assert.ok(aim.aimPoint.y <= p.y + 1.85);
  cancelPlacement(aim); assert.equal(aim.kind, null); assert.equal(bag.length, 2);
  loot.bag.push({ id: 'snare', type: 'snare', x: 2, y: 0, rotation: 0 });
  assert.ok(equipSnare(aim, loot, 'snare')); assert.notEqual(aim.kind, 'dart'); cancelPlacement(aim); bag.pop();
  assert.ok(aimDart(aim, loot, p, 'dart'));
  for (const point of [{ x: NaN, y: 1 }, { x: 100, y: 5 }, { x: p.x, y: p.y }]) { aim.aimPoint = point; assert.equal(fireDart(w, p, loot, aim, shots, 'dart'), false); }
  aim.aimPoint = { x: 7.5, y: 5.5 };
  assert.equal(fireDart(w, p, loot, aim, shots, 'other'), false);
  assert.ok(fireDart(w, p, loot, aim, shots, 'dart')); assert.equal(loot.bag, bag); assert.equal(bag.length, 1); assert.equal(shots.length, 1);
  assert.equal(fireDart(w, p, loot, aim, shots, 'dart'), false); assert.equal(bag[0].id, 'other');
  updateDarts(w, shots, [], 1); assert.equal(shots.length, 0, 'miss expires at range and is not refunded');
});

test('swept projectile stops at walls, props, locked tiles or the first guard; sleep never extends', () => {
  for (const blocked of ['wall', 'prop', 'locked', 'guard']) {
    const w = arena(), p = actor(), loot = { bag: [dart()], held: null }, aim = createPlacement(), shots = [];
    const g = { id: 'first', x: 5.5, y: 5.5, windup: .1, swing: .1, state: 'chase' }, behind = { id: 'behind', x: 7, y: 5.5 };
    if (blocked === 'wall') w.tiles[5 * w.width + 4] = 0;
    if (blocked === 'prop') { w.solidTiles = new Uint8Array(w.tiles.length); w.solidTiles[5 * w.width + 4] = 1; }
    if (blocked === 'locked') { w.lockedTiles = new Uint8Array(w.tiles.length); w.lockedTiles[5 * w.width + 4] = 1; }
    aimDart(aim, loot, p, 'dart'); aim.aimPoint = { x: 8.5, y: 5.5 }; fireDart(w, p, loot, aim, shots, 'dart');
    updateDarts(w, shots, [g, behind], 1);
    assert.equal(!!g.sleepLeft, blocked === 'guard'); assert.equal(behind.sleepLeft, undefined); assert.equal(shots.length, 0);
    if (blocked === 'guard') { assert.equal(g.windup, 0); assert.equal(g.swing, 0); g.sleepLeft = 3; assert.equal(sleepGuard(g), false); assert.equal(g.sleepLeft, 3); }
  }
});

test('sleep blocks attacks, sight and hidden-trail learning, counts down with snare and wakes normally', () => {
  for (const behaviour of ['lookout', 'room', 'roamer']) {
    const w = arena(), p = actor(), g = createGuard(w, { roomIndex: 0, behaviour });
    Object.assign(g, { x: p.x + .5, y: p.y, state: 'chase', angle: Math.PI, windup: .1, snareLeft: 3, lastSeen: { ...p }, alertRecorded: true });
    sleepGuard(g); const pos = { x: g.x, y: g.y }, last = structuredClone(g.lastSeen);
    p.x += 1; assert.equal(seesPlayer(w, g, p, true), false);
    for (let i = 0; i < 79; i++) { assert.equal(updateGuard(w, g, p, .1).hit, false); assert.deepEqual({ x: g.x, y: g.y }, pos); }
    assert.equal(p.health, 3); assert.deepEqual(g.lastSeen, last); assert.equal(g.snareLeft, 0); assert.ok(g.sleepLeft > 0);
    updateGuard(w, g, p, .11); assert.equal(g.sleepLeft, 0); assert.equal(g.state, 'search');
    g.angle = Math.atan2(p.y - g.y, p.x - g.x); updateGuard(w, g, p, .05); assert.equal(g.state, 'chase');
  }
});

test('authoritative dart hits drop captives once, preserve spilled loot and reject repeat/foreign/downed actions', () => {
  const a = { id: 'a', connected: true, bag: [dart(), { ...dart('spare'), x: 1 }], profile: createProfile('a') }, b = { id: 'b', connected: true, bag: [], profile: createProfile('b') };
  const d = createDungeonSession({ id: 'dart-run', seed: 42, job: selectJob('manor', 'normal') }, [a, b], createCamp());
  const g = d.danger.guards.find(g => !g.jailer), w = d.world;
  const point = [[-.5, 0], [.5, 0], [0, -.5], [0, .5]].map(([x, y]) => ({ x: g.x + x, y: g.y + y })).find(p => canStand(w, p.x, p.y)); assert.ok(point);
  Object.assign(a, point); a.invulnerable = 1000;
  Object.assign(b, { state: 'carried', health: 0, carrierId: g.id, downSpilled: true, x: g.x, y: g.y });
  Object.assign(g, { captiveId: b.id, captureTargetId: b.id, state: 'carry' });
  d.ground.push({ id: 'spill', type: 'ruby', x: b.x, y: b.y, rotation: 0 });
  assert.equal(d.action(b, { type: 'equip', id: 'dart' }), false);
  assert.ok(d.action(a, { type: 'equip', id: 'dart' }));
  assert.equal(a.placement.itemId, null);
  assert.equal(d.danger.beforeMove(a, 0, { x: 1, y: 0 }), false, 'ready gear allows movement');
  assert.equal(d.action(a, { type: 'fire-dart', id: 'dart' }), false, 'equip alone never authorises a shot');
  assert.ok(d.action(a, { type: 'aim-dart', id: 'dart' }));
  assert.equal(d.danger.beforeMove(a, 0, { x: 1, y: 0 }), true, 'aiming holds position');
  assert.ok(d.action(a, { type: 'cancel-placement' }));
  assert.equal(a.dartId, 'dart');
  assert.equal(d.danger.beforeMove(a, 0, { x: 1, y: 0 }), false, 'cancel restores ready movement');
  assert.ok(d.action(a, { type: 'aim-dart', id: 'dart' }));
  assert.equal(d.action(a, { type: 'fire-dart', id: 'spare' }), false);
  assert.ok(d.action(a, { type: 'aim', x: g.x, y: g.y })); a.input = { x: 1, y: 0 };
  assert.ok(d.action(a, { type: 'fire-dart', id: 'dart', sleepSeconds: 999 })); assert.deepEqual(a.input, { x: 0, y: 0 }, 'aim input cannot turn into accidental walking after firing');
  assert.equal(d.action(a, { type: 'fire-dart', id: 'dart' }), false);
  d.tick(.05); assert.ok(g.sleepLeft > 7.9 && g.sleepLeft <= 8); assert.equal(b.state, 'down'); assert.equal(b.health, 0); assert.equal(g.captiveId, null); assert.equal(b.carrierId, null);
  d.tick(.1); assert.equal(d.ground.filter(i => i.id === 'spill').length, 1); assert.equal(b.state, 'down'); assert.equal(a.bag.length, 1);
  assert.equal(d.snapshot().guards.find(x => x.id === g.id).sleepOwnerId, 'a');
  a.state = 'down'; assert.equal(d.action(a, { type: 'equip', id: 'spare' }), false);
});

test('dart recipe uses personal unlock/shared materials; old saves add zero stock and debug darts cannot bank', () => {
  const camp = createCamp(), p = createProfile('a'), loot = { bag: [], held: null };
  camp.counts.scrap = 1; camp.counts.cloth = 2; p.xp = p.earnedXp = 75;
  assert.equal(craftForSack(camp, loot, 'dart', p), null); assert.ok(buyPersonalUpgrade(p, 'dart')); assert.equal(p.xp, 0);
  assert.ok(craftForSack(camp, loot, 'dart', p)); assert.equal(loot.bag[0].type, 'dart'); assert.equal(camp.counts.cloth, 0);
  const old = { version: 1, camp: createCamp(), players: [] }; delete old.camp.counts.dart;
  assert.equal(restoreSave(old).camp.counts.dart, 0); assert.equal(Object.hasOwn(old.camp.counts, 'dart'), false);
  const result = { outcome: 'escaped' }; bankEscape(camp, result, { bag: [{ ...dart('test'), debugSupply: true }] }); assert.equal(camp.counts.dart, 0);
});

test('two sockets share authoritative sleep and reject repeated shots without spending another dart', async t => {
  const { once } = await import('node:events'), { default: WebSocket } = await import('ws');
  const { createGameServer } = await import('../server/index.js'), { createLairSession } = await import('../server/lair-session.js');
  const { generateDungeon, setSolidObjects } = await import('../src/world.js');
  const { applyTreasureState } = await import('../src/treasure.js');
  const session = createLairSession(), actors = [session.connect(), session.connect()];
  for (const p of actors) { session.disconnect(p); p.x = 9; p.y = 2.5; }
  const { server, wss } = createGameServer({ session }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`, clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); wss.close(); await new Promise(resolve => server.close(resolve)); });
  async function until(fn) { for (let i = 0; i < 200; i++) { if (fn()) return; await new Promise(r => setTimeout(r, 10)); } assert.fail('Dart state did not arrive'); }
  for (const p of actors) {
    const ws = new WebSocket(origin.replace('http:', 'ws:') + '/session', { origin }), c = { ws, state: null, messages: [] }; clients.push(c);
    ws.on('message', bytes => { const m = JSON.parse(bytes); c.messages.push(m); if (m.type === 'state') c.state = m; });
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', token: p.token })); await until(() => c.state);
  }
  const [a, b] = clients, p = actors[0], send = m => a.ws.send(JSON.stringify(m));
  send({ type: 'debug-pack', item: 'dart' }); send({ type: 'debug-pack', item: 'dart' }); await until(() => a.state.bag.length === 2);
  const id = a.state.bag[0].id;
  for (const actor of actors) session.action(actor, { type: 'board' }); for (let i = 0; i < 31; i++) session.tick(.1);
  await until(() => a.state.dungeon && b.state.dungeon);
  const snap = a.state.dungeon, w = generateDungeon(snap.seed, snap.layout); setSolidObjects(w, [...snap.objects, ...snap.hidingSpots]); applyTreasureState(w, snap.treasure);
  const g = snap.guards.find(g => g.jailer); assert.ok(g);
  const point = [[-.5, 0], [.5, 0], [0, -.5], [0, .5]].map(([x, y]) => ({ x: g.x + x, y: g.y + y })).find(at => canStand(w, at.x, at.y)); assert.ok(point);
  Object.assign(p, point); p.invulnerable = 1000;
  send({ type: 'equip', id }); await until(() => a.state.dartId === id);
  assert.equal(a.state.placement.itemId, null);
  send({ type: 'aim-dart', id }); await until(() => a.state.placement?.kind === 'dart');
  send({ type: 'aim', x: g.x, y: g.y }); send({ type: 'fire-dart', id, feedbackId: 'shot' }); send({ type: 'fire-dart', id, feedbackId: 'repeat' });
  await until(() => clients.every(c => c.state.dungeon.guards.find(x => x.id === g.id).sleepLeft > 0));
  await until(() => a.messages.some(m => m.type === 'action-feedback' && m.feedbackId === 'repeat'));
  assert.equal(a.state.bag.length, 1); assert.equal(b.state.bag.length, 0);
  assert.equal(a.messages.find(m => m.feedbackId === 'shot').ok, true); assert.equal(a.messages.find(m => m.feedbackId === 'repeat').ok, false);
  for (const c of clients) { const state = c.state.dungeon.guards.find(x => x.id === g.id); assert.ok(state.sleepLeft > 0 && state.sleepLeft <= DART.sleepSeconds); assert.equal(state.state, 'sleep'); }
});
