import test from 'node:test';
import assert from 'node:assert/strict';
import { BELL } from '../src/config.js';
import { equipBell, beginBellAim, throwBell, validBellPosition, updateBells } from '../src/bells.js';
import { createPlacement, cancelPlacement, moveTrapAim } from '../src/traps.js';
import { createGuard, createVitality, updateGuard } from '../src/guard.js';
import { updateTeamGuard } from '../server/team-guards.js';
import { createCamp, craftForSack, bankEscape } from '../src/lair.js';
import { createProfile, buyPersonalUpgrade } from '../src/profile.js';
import { restoreSave } from '../server/save-store.js';
import { createDungeonSession } from '../server/dungeon-session.js';
import { selectJob } from '../src/jobs.js';
import { canStand } from '../src/world.js';
const item = (id = 'bell') => ({ id, type: 'bell', rotation: 0, x: 0, y: 0 });
const arena = () => ({ width: 16, height: 12, seed: 42, spawn: { x: 2.5, y: 5.5 }, tiles: new Uint8Array(192).fill(1), rooms: [{ x: 1, y: 1, w: 12, h: 9, cx: 6, cy: 5 }] });
const actor = () => ({ ...createVitality(), x: 2.5, y: 5.5, facing: 1, id: 'a', connected: true, inRun: true });
const bell = (id = 'ring', x = 5.5, y = 5.5) => ({ id, ownerId: 'a', x, y, fromX: 2.5, fromY: 5.5, flightLeft: BELL.flightSeconds, left: BELL.investigateSeconds, rung: false });
const guard = (w, extras = {}) => Object.assign(createGuard(w, { roomIndex: 0 }), { x: 7.5, y: 5.5, angle: 0 }, extras);
const hidden = () => ({ ...actor(), hiding: { spot: { id: 'barrel' } } });

test('bell equip allows walking, fresh aim/cancel preserves exact copy and valid throw spends once', () => {
  const w = arena(), p = actor(), loot = { bag: [item(), { ...item('spare'), x: 1 }], held: null }, aim = createPlacement(), bells = [];
  assert.ok(equipBell(aim, loot, p, 'bell')); assert.equal(aim.itemId, null); assert.equal(p.bellId, 'bell');
  assert.equal(throwBell(w, p, loot, aim, bells, 'bell'), false);
  assert.ok(beginBellAim(aim, loot, p)); moveTrapAim(aim, p, { x: 0, y: 1 }, .1); assert.equal(p.y, 5.5);
  cancelPlacement(aim); assert.equal(loot.bag.length, 2); assert.equal(p.bellId, 'bell'); assert.ok(beginBellAim(aim, loot, p));
  for (const point of [{ x: NaN, y: 1 }, { x: 100, y: 5 }, { x: p.x, y: p.y }]) { aim.aimPoint = point; assert.equal(throwBell(w, p, loot, aim, bells, 'bell'), false); }
  aim.aimPoint = { x: 5.5, y: 5.5 }; assert.equal(throwBell(w, p, loot, aim, bells, 'spare'), false);
  assert.ok(throwBell(w, p, loot, aim, bells, 'bell')); assert.equal(p.bellId, null); assert.equal(loot.bag.length, 1);
  assert.equal(throwBell(w, p, loot, aim, bells, 'bell'), false); assert.equal(bells.length, 1);
  assert.equal(updateBells(w, bells, [], [], .1).length, 0, 'rings only on landing');
  assert.equal(updateBells(w, bells, [], [], .3).length, 1); assert.equal(updateBells(w, bells, [], [], .1).length, 0);
  updateBells(w, bells, [], [], 9); assert.equal(bells.length, 0, 'thrown bells expire, including unheard ones');
});

test('bell rejects blocked lines and floor, solid props, locks, out of range and unsafe edge landings', () => {
  for (const type of ['wall', 'prop', 'lock']) {
    const w = arena(), p = actor();
    if (type === 'wall') w.tiles[5 * 16 + 4] = 0;
    if (type === 'prop') { w.solidTiles = new Uint8Array(192); w.solidTiles[5 * 16 + 4] = 1; }
    if (type === 'lock') { w.lockedTiles = new Uint8Array(192); w.lockedTiles[5 * 16 + 4] = 1; }
    assert.equal(validBellPosition(w, p, { x: 6.5, y: 5.5 }), false, type);
    assert.equal(validBellPosition(w, p, { x: 4.5, y: 5.5 }), false);
  }
  const w = arena(); w.tiles[5 * 16 + 5] = 0;
  assert.equal(validBellPosition(w, actor(), { x: 4.9, y: 5.5 }), false);
});

test('hearing follows walkable path around corners and cannot cross sealed or distant routes', () => {
  const w = arena(); for (let y = 0; y < 12; y++) w.tiles[y * 16 + 6] = 0; w.tiles[4 * 16 + 6] = 1;
  const g = guard(w), bells = [bell()]; updateBells(w, bells, [g], [hidden()], .4); assert.equal(g.state, 'investigate');
  const start = { x: g.x, y: g.y }; updateGuard(w, g, hidden(), .1); assert.ok(Math.hypot(g.x - start.x, g.y - start.y) > 0);
  w.tiles[4 * 16 + 6] = 0; const sealed = guard(w); updateBells(w, [bell('sealed')], [sealed], [hidden()], .4); assert.equal(sealed.bellTarget, undefined);
  w.tiles[1 * 16 + 6] = 1; const far = guard(w); updateBells(w, [bell('long')], [far], [hidden()], .4); assert.equal(far.bellTarget, undefined, 'Euclidean-near but long route ignores ring');
  const locked = arena(); locked.lockedTiles = new Uint8Array(192); for (let y = 0; y < 12; y++) locked.lockedTiles[y * 16 + 6] = 1;
  const gateGuard = guard(locked); updateBells(locked, [bell('gate')], [gateGuard], [hidden()], .4); assert.equal(gateGuard.bellTarget, undefined);
});

test('visible goblins, swings, sleep, snares and carriers take priority; investigation times out or returns after inspection', () => {
  const w = arena();
  for (const extras of [{ sleepLeft: 2 }, { snareLeft: 2 }, { windup: .1 }, { swing: .1 }, { captiveId: 'b' }, { captureTargetId: 'b' }, { stationary: true }, { jailer: true }]) {
    const g = guard(w, extras); updateBells(w, [bell()], [g], [hidden()], .4); assert.equal(g.bellTarget, undefined);
  }
  const p = actor(), seeing = guard(w, { angle: Math.PI, state: 'chase' }); p.x = 7;
  updateBells(w, [bell()], [seeing], [p], .4); assert.equal(seeing.state, 'chase');
  const g = guard(w); updateBells(w, [bell()], [g], [hidden()], .4); assert.ok(g.bellTarget);
  const beforeAlert = g.alertRecorded; updateTeamGuard(w, g, [p], .1, [], 0); assert.equal(g.bellTarget, null); assert.notEqual(g.state, 'investigate'); assert.equal(g.alertRecorded, beforeAlert);
  const inspecting = guard(w, { x: 5.5 }); updateBells(w, [bell()], [inspecting], [hidden()], .4);
  for (let i = 0; i < 21; i++) updateGuard(w, inspecting, hidden(), .1);
  assert.equal(inspecting.bellTarget, null); assert.equal(inspecting.state, 'return');
  const timed = guard(w); updateBells(w, [bell()], [timed], [hidden()], .4); updateGuard(w, timed, hidden(), 8.1); assert.equal(timed.bellTarget, null);
  const blocked = guard(w); updateBells(w, [bell()], [blocked], [hidden()], .4); w.solidTiles = new Uint8Array(192); w.solidTiles[5 * 16 + 6] = 1;
  updateGuard(w, blocked, hidden(), 1); assert.equal(blocked.bellTarget, null, 'newly blocked route abandons investigation');
});

test('later bells replace destinations without queues; authoritative actions reject foreign, replay and downed throws', () => {
  const w = arena(), g = guard(w); updateBells(w, [bell()], [g], [hidden()], .4); updateGuard(w, g, hidden(), .2);
  updateBells(w, [bell('second', 4.5, 5.5)], [g], [hidden()], .4); assert.equal(g.bellTarget.x, 4.5); assert.ok(g.bellLeft <= 8);
  const p = { id: 'a', connected: true, bag: [item(), { ...item('spare'), x: 1 }], profile: createProfile('a') };
  const d = createDungeonSession({ id: 'bell-run', seed: 42, job: selectJob('manor', 'normal') }, [p], createCamp());
  const from = d.world.spawn; const point = [[.5, 0], [0, .5], [-.5, 0], [0, -.5]].map(([x,y]) => ({x:from.x+x,y:from.y+y})).find(at => validBellPosition(d.world, p, at)); assert.ok(point);
  assert.ok(d.action(p, { type: 'equip', id: 'bell' })); assert.equal(d.danger.beforeMove(p, 0, {x:1,y:0}), false);
  assert.equal(d.action(p, { type: 'throw-bell', id: 'bell' }), false); assert.ok(d.action(p, { type: 'aim-bell', id: 'bell' }));
  assert.ok(d.action(p, { type: 'aim', ...point })); assert.equal(d.action(p, { type: 'throw-bell', id: 'spare' }), false);
  assert.ok(d.action(p, { type: 'throw-bell', id: 'bell', hearingRange: 999 })); assert.equal(d.action(p, { type: 'throw-bell', id: 'bell' }), false);
  assert.equal(d.snapshot().bells.length, 1); assert.equal(p.bag.length, 1);
  const sharedGuard=d.danger.guards.find(g=>!g.stationary&&!g.jailer); assert.ok(sharedGuard);
  Object.assign(sharedGuard,{...point,state:'patrol',sleepLeft:0,snareLeft:0,windup:0,swing:0,captiveId:null,captureTargetId:null,knownHiding:null});
  p.hiding={spot:{id:'test-hide'}}; const alerts=d.danger.pressure.alerts; for(let i=0;i<4;i++) d.tick(.1);
  assert.equal(d.snapshot().guards.find(g=>g.id===sharedGuard.id).state,'investigate');
  assert.equal(d.danger.pressure.alerts,alerts,'bell itself adds no alert');
  p.state = 'down'; assert.equal(d.action(p, { type: 'equip', id: 'spare' }), false);
});

test('bell personal recipe, shared crafting, legacy zero stock and tagged test copy conservation', () => {
  const camp = createCamp(), p = createProfile(), loot = { bag: [], held: null }; camp.counts.scrap = 1; camp.counts.cloth = 1; p.xp = p.earnedXp = 25;
  assert.equal(craftForSack(camp, loot, 'bell', p), null); assert.ok(buyPersonalUpgrade(p, 'bell')); assert.ok(craftForSack(camp, loot, 'bell', p));
  assert.equal(camp.counts.scrap, 0); assert.equal(camp.counts.cloth, 0); assert.equal(loot.bag[0].type, 'bell'); assert.equal(p.xp, 0);
  const old = { version: 1, camp: createCamp(), players: [] }; delete old.camp.counts.bell; assert.equal(restoreSave(old).camp.counts.bell, 0); assert.equal(Object.hasOwn(old.camp.counts, 'bell'), false);
  bankEscape(camp, { outcome: 'escaped' }, { bag: [{ ...item('test'), debugSupply: true }] }); assert.equal(camp.counts.bell, 0);
});

test('two sockets share one landed bell and reject replay without consuming another copy', async t => {
  const { once } = await import('node:events'), { default: WebSocket } = await import('ws');
  const { createGameServer } = await import('../server/index.js'), { createLairSession } = await import('../server/lair-session.js');
  const { generateDungeon, setSolidObjects } = await import('../src/world.js');
  const { applyTreasureState } = await import('../src/treasure.js');
  const session = createLairSession(), actors = [session.connect(), session.connect()];
  for (const p of actors) { session.disconnect(p); p.x = 9; p.y = 2.5; }
  const { server, wss } = createGameServer({ session }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`, clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); wss.close(); await new Promise(resolve => server.close(resolve)); });
  async function until(fn) { for (let i = 0; i < 200; i++) { if (fn()) return; await new Promise(r => setTimeout(r, 10)); } assert.fail('Bell state did not arrive'); }
  for (const p of actors) {
    const ws = new WebSocket(origin.replace('http:', 'ws:') + '/session', { origin }), c = { ws, state: null, messages: [] }; clients.push(c);
    ws.on('message', bytes => { const m = JSON.parse(bytes); c.messages.push(m); if (m.type === 'state') c.state = m; });
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', token: p.token })); await until(() => c.state);
  }
  const [a, b] = clients, p = actors[0], send = m => a.ws.send(JSON.stringify(m));
  send({ type: 'debug-pack', item: 'bell' }); send({ type: 'debug-pack', item: 'bell' }); await until(() => a.state.bag.length === 2);
  const id = a.state.bag[0].id;
  for (const actor of actors) session.action(actor, { type: 'board' }); for (let i = 0; i < 31; i++) session.tick(.1);
  await until(() => a.state.dungeon && b.state.dungeon);
  const snap = a.state.dungeon, w = generateDungeon(snap.seed, snap.layout); setSolidObjects(w, [...snap.objects, ...snap.hidingSpots]); applyTreasureState(w, snap.treasure);
  const point = [[.5,0],[0,.5],[-.5,0],[0,-.5]].map(([x,y])=>({x:p.x+x,y:p.y+y})).find(at=>validBellPosition(w,p,at)); assert.ok(point);
  p.invulnerable=1000;
  send({ type: 'equip', id }); await until(() => a.state.bellId === id);
  assert.equal(a.state.placement.itemId, null);
  send({ type: 'aim-bell', id }); await until(() => a.state.placement?.kind === 'bell');
  send({ type: 'aim', x: point.x, y: point.y }); send({ type: 'throw-bell', id, feedbackId: 'shot' }); send({ type: 'throw-bell', id, feedbackId: 'repeat' });
  await until(() => clients.every(c => c.state.dungeon.bells.some(b => b.id===id && b.rung)));
  await until(() => a.messages.some(m => m.type === 'action-feedback' && m.feedbackId === 'repeat'));
  assert.equal(a.state.bag.length, 1); assert.equal(b.state.bag.length, 0);
  assert.equal(a.messages.find(m => m.feedbackId === 'shot').ok, true); assert.equal(a.messages.find(m => m.feedbackId === 'repeat').ok, false);
  for (const c of clients) { const state=c.state.dungeon.bells.find(b=>b.id===id); assert.ok(state.rung); assert.ok(state.left>0 && state.left<=BELL.investigateSeconds); }
});
