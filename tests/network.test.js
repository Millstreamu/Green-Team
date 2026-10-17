import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from 'ws';
import { createGameServer } from '../server/index.js';
import { createLairSession } from '../server/lair-session.js';

function walk(session, player, x, y, seconds) {
  session.action(player, { type: 'move', x, y });
  for (let t = 0; t < seconds; t += .05) { session.action(player, { type: 'move', x, y }); session.tick(.05); }
  session.action(player, { type: 'move', x: 0, y: 0 });
}
test('authoritative lair keeps distinct sacks, conserves contested stock and reuses crafting', () => {
  const s = createLairSession(), a = s.connect(), b = s.connect();
  assert.notEqual(a.id, b.id);
  assert.equal(s.action(a, { type: 'take', item: 'snare' }), true);
  assert.equal(s.action(b, { type: 'take', item: 'snare' }), false);
  assert.equal(a.bag.length, 1); assert.equal(b.bag.length, 0);
  const id = a.bag[0].id;
  assert.equal(s.action(b, { type: 'return', id }), false);
  assert.equal(s.action(a, { type: 'return', id }), true);
  assert.equal(s.action(a, { type: 'return', id }), false);
  assert.equal(s.action(a, { type: 'craft', item: 'snare' }), false);
  walk(s, a, 1, 0, .85); walk(s, a, 0, -1, .75);
  assert.equal(s.action(a, { type: 'craft', item: 'snare' }), true);
  assert.equal(s.action(b, { type: 'craft', item: 'snare' }), false);
  assert.equal(s.snapshot(a).camp.counts.scrap, 0);
  assert.equal(a.bag[0].type, 'snare');
  assert.equal(s.action(a, { type: 'take', item: 'unknown' }), false);
  assert.equal(s.action(a, { type: 'take', item: { toString: null } }), false);
  assert.equal(s.action(a, { type: 'buy', upgrade: {} }), false);
  assert.equal(s.action(a, { type: 'move', x: Infinity, y: 0 }), false);
  assert.equal(s.action(a, { type: 'move', x: 2, y: 0 }), false);
  assert.equal(s.snapshot(b).profile.id, b.id);
  assert.equal(s.snapshot(b).bag.length, 0);
});
test('server movement stops on stale input and walls; goblins pass through each other', () => {
  const s = createLairSession(), a = s.connect(), b = s.connect();
  walk(s, a, 0, -1, .4); walk(s, a, 0, 1, .4);
  assert.ok(Math.abs(a.y - b.y) < .3);
  walk(s, a, -1, 0, 10); assert.ok(a.x >= 1.25);
  s.action(a, { type: 'move', x: 1, y: 0 });
  for (let i = 0; i < 20; i++) s.tick(.05);
  const stopped = a.x;
  for (let i = 0; i < 20; i++) s.tick(.05);
  assert.equal(a.x, stopped);
});
test('server requires nearby boarding, all players, countdown and one shared launch', () => {
  const s = createLairSession(), a = s.connect(), b = s.connect();
  assert.equal(s.action(a, { type: 'board' }), false);
  walk(s, a, 0, -1, 1.4); walk(s, b, 0, -1, 1.4);
  assert.equal(s.action(a, { type: 'board' }), true);
  for (let i = 0; i < 80; i++) s.tick(.05);
  assert.equal(s.snapshot(a).launched, null);
  assert.equal(s.action(b, { type: 'board' }), true);
  for (let i = 0; i < 20; i++) s.tick(.05);
  assert.equal(s.action(b, { type: 'board' }), true);
  for (let i = 0; i < 80; i++) s.tick(.05);
  assert.equal(s.snapshot(a).launched, null);
  s.action(b, { type: 'board' });
  for (let i = 0; i < 61; i++) s.tick(.05);
  const launch = s.snapshot(a).launched;
  assert.deepEqual(launch, s.snapshot(b).launched);
  assert.equal(launch.participants.length, 2);
  assert.equal(s.action(a, { type: 'take', item: 'snare' }), false);
  const newcomer = s.connect(); assert.equal(newcomer.waiting, true);
  for (let i = 0; i < 80; i++) s.tick(.05);
  assert.equal(s.snapshot(a).launched.id, launch.id);
});
test('home reconnect preserves own bag and excludes offline goblins from readiness', () => {
  const s = createLairSession(), a = s.connect(), b = s.connect();
  s.action(a, { type: 'take', item: 'snare' });
  assert.equal(s.connect(a.token), null);
  s.disconnect(a); assert.deepEqual(s.snapshot(b).cart.participants, [b.id]);
  const returned = s.connect(a.token);
  assert.equal(returned.id, a.id); assert.equal(returned.bag.length, 1);
  assert.equal(s.snapshot(b).camp.counts.snare, 0);
});

test('two real WebSocket clients share stock and see server movement; static routes are limited', async t => {
  const { server, wss } = createGameServer({ session: createLairSession() });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = `http://127.0.0.1:${server.address().port}`;
  const clients = [];
  t.after(async () => { for (const ws of clients) ws.terminate(); wss.close(); await new Promise(resolve => server.close(resolve)); });
  async function client() {
    const ws = new WebSocket(address.replace('http:', 'ws:') + '/session', { origin: address });
    clients.push(ws); const messages = [];
    ws.on('message', data => messages.push(JSON.parse(data)));
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello' }));
    return { ws, messages };
  }
  async function until(fn) {
    for (let i = 0; i < 150; i++) { const result = fn(); if (result) return result; await new Promise(resolve => setTimeout(resolve, 10)); }
    assert.fail('Network state did not arrive');
  }
  const a = await client(), b = await client();
  const latest = c => c.messages.findLast(m => m.type === 'state');
  await until(() => latest(a)?.players.length === 2 && latest(b)?.players.length === 2);
  a.ws.send(JSON.stringify({ type: 'take', item: 'snare' })); b.ws.send(JSON.stringify({ type: 'take', item: 'snare' }));
  await until(() => latest(a)?.camp.counts.snare === 0 && latest(b)?.camp.counts.snare === 0);
  await until(() => a.messages.some(m => m.type === 'rejected') || b.messages.some(m => m.type === 'rejected'));
  assert.equal(latest(a).bag.length + latest(b).bag.length, 1);
  const id = latest(a).selfId;
  a.ws.send(JSON.stringify({ type: 'move', x: 1, y: 0 }));
  await until(() => latest(b)?.players.find(p => p.id === id)?.x > 9.2);
  const html = await (await fetch(address)).text(); assert.ok(html.includes('src/online-main.js'));
  assert.equal((await fetch(address + '/package.json')).status, 404);
  assert.equal((await fetch(address + '/src/online-main.js')).status, 200);
  const tiles = await fetch(address + '/assets/human/GreenTeam-tileset.json');
  assert.equal(tiles.status, 200); assert.match(tiles.headers.get('content-type'), /application[/]json/);
  assert.equal((await tiles.json()).tiles.wall_bottom_horz.index, 4);
  const sheet = await fetch(address + '/assets/human/GreenTeam-tileset.png');
  assert.equal(sheet.status, 200); assert.equal(sheet.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await sheet.arrayBuffer()), readFileSync(new URL('../assets/human/GreenTeam-tileset.png', import.meta.url)));

});

test('map edits are authoritative and preserve already boarded goblins; disconnect cancels countdown', () => {
  const s = createLairSession(), a = s.connect(), b = s.connect();
  walk(s, a, 0, -1, 1.4); s.action(a, { type: 'board' });
  assert.equal(s.action(b, { type: 'destination', job: 'manor', difficulty: 'hard' }), false);
  walk(s, b, -1, 0, .85); walk(s, b, 0, -1, 1.4);
  assert.equal(s.action(b, { type: 'destination', job: 'manor', difficulty: 'hard' }), true);
  assert.deepEqual(s.snapshot(a).cart.aboard, [a.id]);
  walk(s, b, 1, 0, .85); s.action(b, { type: 'board' });
  s.tick(.1); assert.ok(s.snapshot(a).cart.countdown > 0);
  s.disconnect(b); assert.equal(s.snapshot(a).cart.countdown, null);
  s.connect(b.token); assert.equal(s.snapshot(a).cart.countdown, null);
  s.action(b, { type: 'board' });
  for (let i = 0; i < 61; i++) s.tick(.05);
  assert.equal(s.snapshot(a).launched.job.difficultyId, 'hard');
  assert.equal(s.action(a, { type: 'extract' }), true);
  assert.equal(s.snapshot(b).launched, null);
  assert.equal(s.snapshot(b).cart.aboard.length, 0);
});

test('two socket clients share a dungeon search, race for its loot, and bank it once on extraction', async t => {
  const session = createLairSession(), actorA = session.connect(), actorB = session.connect();
  session.disconnect(actorA); session.disconnect(actorB);
  for (const p of [actorA, actorB]) { p.x = 9; p.y = 2.5; }
  const { server, wss } = createGameServer({ session });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`, clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); wss.close(); await new Promise(resolve => server.close(resolve)); });
  async function until(fn) {
    for (let i = 0; i < 200; i++) { const value = fn(); if (value) return value; await new Promise(resolve => setTimeout(resolve, 10)); }
    assert.fail('Network dungeon state did not arrive');
  }
  async function client(actor) {
    const ws = new WebSocket(origin.replace('http:', 'ws:') + '/session', { origin });
    const c = { ws, messages: [], state: null }; clients.push(c);
    ws.on('message', bytes => { const m = JSON.parse(bytes); c.messages.push(m); if (m.type === 'state') c.state = m; });
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', token: actor.token }));
    await until(() => c.state); return c;
  }
  const a = await client(actorA), b = await client(actorB);
  const send = (c, m) => c.ws.send(JSON.stringify(m));
  send(a, { type: 'board' }); send(b, { type: 'board' });
  await until(() => session.snapshot(actorA).cart.aboard.length === 2);
  for (let i = 0; i < 31; i++) session.tick(.1);
  await until(() => a.state.dungeon && b.state.dungeon);
  assert.equal(a.state.dungeon.seed, b.state.dungeon.seed);
  assert.deepEqual(a.state.dungeon.objects, b.state.dungeon.objects);
  assert.ok(a.state.dungeon.objects.every(o => !Object.hasOwn(o, 'contents')));
  // Select a deterministic searchable from this real generated map, with a test-fixture
  // position change on the server only. No browser protocol permits this teleport.
  const target = a.state.dungeon.objects[0];
  for (const p of [actorA, actorB]) { Object.assign(p, target.approach); }
  send(a, { type: 'search', id: target.id }); send(b, { type: 'search', id: target.id });
  await until(() => a.state.dungeon.objects[0].searcherId || b.state.dungeon.objects[0].searcherId);
  assert.ok([...a.messages, ...b.messages].some(m => m.type === 'rejected'));
  const owner = actorA.search.active ? actorA : actorB;
  // Use server steps to avoid making this automated transport test wait several seconds.
  for (let i = 0; i < 80; i++) { session.action(owner, { type: 'move', x: 0, y: 0, searchHeld: true }); session.tick(.05); }
  await until(() => a.state.dungeon.objects[0].searched && b.state.dungeon.objects[0].searched);
  // This container can be empty. Drop the actual packed starting snare through the
  // same network pipeline when no search loot was generated, so the race is always checked.
  let item = a.state.dungeon.ground[0];
  if (!item) {
    actorA.bag.push({ id: 'network-fixture-snare', type: 'snare', rotation: 0, x: 0, y: 0 });
    send(a, { type: 'lift', source: 'bag', id: 'network-fixture-snare' }); send(a, { type: 'drop' });
    item = await until(() => a.state.dungeon.ground[0]);
  }
  actorA.x = item.x; actorA.y = item.y; actorB.x = item.x; actorB.y = item.y;
  send(a, { type: 'pickup', id: item.id }); send(b, { type: 'pickup', id: item.id });
  await until(() => !a.state.dungeon.ground.some(i => i.id === item.id) && !b.state.dungeon.ground.some(i => i.id === item.id));
  assert.equal(a.state.bag.filter(i => i.id === item.id).length + b.state.bag.filter(i => i.id === item.id).length, 1);
  const entrance = a.state.dungeon.entrance;
  Object.assign(actorA, entrance); Object.assign(actorB, entrance);
  send(a, { type: 'extract' }); send(b, { type: 'extract' });
  await until(() => a.state.result && b.state.result);
  assert.equal(a.state.result.runId, b.state.result.runId);
  assert.equal(a.state.dungeon, null); assert.equal(b.state.dungeon, null);
  const counts = { ...a.state.camp.counts };
  send(a, { type: 'extract' });
  await until(() => a.messages.at(-1)?.type === 'state');
  assert.deepEqual(session.snapshot(actorA).camp.counts, counts);
});
