import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from 'ws';
import { createGameServer } from '../server/index.js';
import { createLairSession } from '../server/lair-session.js';

test('real sockets share interrupted/completed lunch revives and smoke-covered cage rescue', async t => {
  const session = createLairSession(), pa = session.connect(), pb = session.connect();
  for (const p of [pa, pb]) { session.disconnect(p); p.x = 9; p.y = 2.5; }
  const { server, wss } = createGameServer({ session }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`, clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); wss.close(); await new Promise(resolve => server.close(resolve)); });
  async function until(fn) {
    for (let i = 0; i < 200; i++) { const value = fn(); if (value) return value; await new Promise(resolve => setTimeout(resolve, 10)); }
    assert.fail('Rescue network state did not arrive');
  }
  async function client(p) {
    const ws = new WebSocket(origin.replace('http:', 'ws:') + '/session', { origin }), c = { ws, state: null }; clients.push(c);
    ws.on('message', data => { const m = JSON.parse(data); if (m.type === 'state') c.state = m; });
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', token: p.token })); await until(() => c.state); return c;
  }
  const [a, b] = await Promise.all([client(pa), client(pb)]);
  const send = (c, m) => c.ws.send(JSON.stringify(m));
  send(b, { type: 'debug-pack', item: 'lunch' }); send(b, { type: 'debug-pack', item: 'smoke' }); send(b, { type: 'debug-pack', item: 'smoke' });
  await until(() => b.state.bag.length === 3);
  send(a, { type: 'board' }); send(b, { type: 'board' }); await until(() => session.snapshot(pa).cart.aboard.length === 2);
  for (let i = 0; i < 31; i++) session.tick(.1); await until(() => a.state.dungeon && b.state.dungeon);
  const floorSmoke = pb.bag.find(i => i.type === 'smoke');
  send(b, { type: 'equip', id: floorSmoke.id }); send(b, { type: 'smoke' });
  await until(() => b.state.dungeon.clouds.some(c => c.id === floorSmoke.id));
  // Fixture puts a real actor down; no browser message can set health or coordinates.
  pa.state = 'down'; pa.health = 0; session.tick(.05);
  send(b, { type: 'rescue', id: pa.id }); await until(() => b.state.dungeon.rescues.length === 1);
  for (let i = 0; i < 10; i++) { session.action(pb, { type: 'move', x: 0, y: 0, searchHeld: true }); session.tick(.05); }
  send(b, { type: 'cancel-search' }); await until(() => b.state.dungeon.rescues.length === 0);
  assert.equal(pa.state, 'down'); assert.ok(b.state.bag.some(i => i.type === 'lunch'));
  send(b, { type: 'rescue', id: pa.id }); await until(() => b.state.dungeon.rescues.length === 1);
  for (let i = 0; i < 41; i++) { session.action(pb, { type: 'move', x: 0, y: 0, searchHeld: true }); session.tick(.05); }
  await until(() => a.state.players.find(p => p.id === pa.id).state === 'active' && !b.state.bag.some(i => i.type === 'lunch'));
  assert.equal(a.state.players.find(p => p.id === pa.id).health, 1);
  const cage = session.snapshot(pa).dungeon.cages[0];
  Object.assign(pa, { state: 'caged', health: 0, cageId: cage.id, downSpilled: true, x: cage.x, y: cage.y }); cage.prisoners.push(pa.id);
  pb.x = cage.entry.x; pb.y = cage.entry.y;
  const bomb = pb.bag.find(i => i.type === 'smoke');
  send(b, { type: 'equip', id: bomb.id }); send(b, { type: 'smoke' }); await until(() => b.state.dungeon.clouds.some(c => c.id === bomb.id));
  send(b, { type: 'rescue', id: pa.id }); await until(() => b.state.dungeon.rescues[0]?.kind === 'rescue');
  for (let i = 0; i < 61; i++) { session.action(pb, { type: 'move', x: 0, y: 0, searchHeld: true }); session.tick(.05); }
  await until(() => a.state.players.find(p => p.id === pa.id).state === 'active' && a.state.dungeon.cages[0].prisoners.length === 0 && b.state.dungeon.rescues.length === 0);
  assert.equal(pa.health, 1); assert.equal(pb.bag.length, 0); assert.equal(b.state.dungeon.rescues.length, 0);
  Object.assign(pa, a.state.dungeon.entrance); Object.assign(pb, a.state.dungeon.entrance);
  send(b, { type: 'extract' }); await until(() => a.state.result && b.state.result);
  assert.equal(a.state.result.outcome, 'escaped'); assert.equal(b.state.result.outcome, 'escaped');
});
