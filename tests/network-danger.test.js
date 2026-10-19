import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from 'ws';
import { createGameServer } from '../server/index.js';
import { createLairSession } from '../server/lair-session.js';

test('real sockets share guard danger, hiding occupancy, traps, smoke and preserved reconnect health', async t => {
  const session = createLairSession(), actors = [session.connect(), session.connect()];
  for (const p of actors) { session.disconnect(p); p.x = 9; p.y = 2.5; }
  const { server, wss } = createGameServer({ session });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`, clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); wss.close(); await new Promise(resolve => server.close(resolve)); });
  async function until(fn) {
    for (let i = 0; i < 200; i++) { const value = fn(); if (value) return value; await new Promise(resolve => setTimeout(resolve, 10)); }
    assert.fail('Danger state did not arrive');
  }
  async function connect(actor) {
    const ws = new WebSocket(origin.replace('http:', 'ws:') + '/session', { origin });
    const c = { ws, state: null }; clients.push(c);
    ws.on('message', bytes => { const m = JSON.parse(bytes); if (m.type === 'state') c.state = m; });
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', token: actor.token }));
    await until(() => c.state); return c;
  }
  const [a, b] = await Promise.all(actors.map(connect)), [pa, pb] = actors;
  const send = (c, message) => c.ws.send(JSON.stringify(message));
  send(a, { type: 'debug-pack', item: 'snare' }); send(b, { type: 'debug-pack', item: 'smoke' });
  await until(() => a.state.bag.length && b.state.bag.length);
  const trapId = a.state.bag[0].id, smokeId = b.state.bag[0].id;
  send(a, { type: 'board' }); send(b, { type: 'board' });
  await until(() => session.snapshot(pa).cart.aboard.length === 2);
  for (let i = 0; i < 31; i++) session.tick(.1);
  await until(() => a.state.dungeon && b.state.dungeon);
  assert.ok(a.state.dungeon.guards.length >= 4);
  assert.deepEqual(a.state.dungeon.guards.map(g => g.id), b.state.dungeon.guards.map(g => g.id));
  send(a, { type: 'equip', id: trapId });
  await until(() => a.state.placement?.itemId === trapId);
  send(a, { type: 'aim', x: pa.x, y: pa.y }); send(a, { type: 'cancel-search' });
  await until(() => pa.searchHeld === false); session.tick(.05);
  send(a, { type: 'move', x: 0, y: 0, searchHeld: true });
  await until(() => pa.searchHeld === true);
  for (let i = 0; i < 21; i++) { session.action(pa, { type: 'move', x: 0, y: 0, searchHeld: true }); session.tick(.05); }
  await until(() => a.state.dungeon.traps.length === 1 && b.state.dungeon.traps.length === 1);
  assert.equal(a.state.bag.length, 0); assert.equal(a.state.dungeon.traps[0].phase, 'arming');
  assert.deepEqual(a.state.dungeon.traps, b.state.dungeon.traps);
  pa.x += 1.2; pb.x += 2;
  for (let i = 0; i < 6; i++) session.tick(.05);
  await until(() => b.state.dungeon.traps[0].phase === 'armed');
  send(b, { type: 'equip', id: smokeId }); send(b, { type: 'smoke' });
  await until(() => a.state.dungeon.clouds.length === 1 && b.state.dungeon.clouds.length === 1);
  assert.equal(b.state.bag.length, 0);
  const spot = a.state.dungeon.hidingSpots[0];
  for (const p of actors) { Object.assign(p, spot.approach); }
  send(a, { type: 'hide', id: spot.id }); send(b, { type: 'hide', id: spot.id });
  await until(() => pa.enteringHide && pb.enteringHide);
  for (let i = 0; i < 10; i++) {
    for (const p of actors) session.action(p, { type: 'move', x: 0, y: 0, searchHeld: true });
    session.tick(.05);
  }
  await until(() => a.state.dungeon.hidingSpots[0].occupantId && b.state.dungeon.hidingSpots[0].occupantId);
  const occupant = pa.hiding ? a : b;
  assert.equal(a.state.dungeon.hidingSpots[0].occupantId, b.state.dungeon.hidingSpots[0].occupantId);
  assert.equal(actors.filter(p => p.hiding).length, 1);
  send(occupant, { type: 'hide' }); await until(() => !pa.hiding && !pb.hiding);
  // Test-only pose fixture puts A in a guard's sight. Browsers cannot send these coordinates.
  const guard = a.state.dungeon.guards[0]; pa.x = guard.x + .7; pa.y = guard.y;
  Object.assign(pb, a.state.dungeon.entrance);
  for (let i = 0; i < 24; i++) { session.action(pa, { type: 'move', x: 0, y: 0 }); session.tick(.05); }
  await until(() => b.state.dungeon.pressure.alerts >= 1 && a.state.players.find(p => p.id === pa.id).health < 3);
  const health = pa.health, alerts = b.state.dungeon.pressure.alerts;
  assert.ok(health > 0); a.ws.terminate();
  await until(() => !pa.connected && b.state.players.some(p => p.id === pa.id && p.ghost));
  for (let i = 0; i < 5; i++) session.tick(.05);
  assert.equal(pa.health, health);
  const returned = await connect(pa);
  assert.equal(returned.state.selfId, pa.id);
  assert.equal(returned.state.players.find(p => p.id === pa.id).health, health);
  assert.ok(returned.state.dungeon.pressure.alerts >= alerts);
  assert.equal(returned.state.dungeon.traps.length, 1);
});
