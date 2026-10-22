import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import WebSocket from 'ws';
import { createLairSession } from '../server/lair-session.js';
import { createGameServer } from '../server/index.js';
import { personalSearchRate } from '../src/profile.js';

function fixture(count = 2) {
  const s = createLairSession(), players = Array.from({ length: count }, () => s.connect());
  for (const p of players) { p.x = 9; p.y = 2.5; s.action(p, { type: 'board' }); }
  for (let i = 0; i < 61; i++) s.tick(.05);
  for (const p of players) p.invulnerable = 1000;
  return { s, players, a: players[0], b: players[1] };
}
const ruby = (id, x = 0) => ({ id, type: 'ruby', rotation: 0, x, y: 0 });
function escape(s, a) { Object.assign(a, s.snapshot(a).dungeon.entrance); return s.action(a, { type: 'extract' }); }

test('all departed goblins earn the same haul XP, including downed/caged/expired offline; waiting arrivals earn none', () => {
  const { s, players, a, b } = fixture(4), [, , c, d] = players;
  b.bag.push(ruby('lost-ruby')); b.state = 'down'; b.health = 0;
  c.state = 'caged'; c.health = 0; c.downSpilled = true;
  s.disconnect(d); s.tick(60); assert.equal(d.waiting, true);
  const waiting = s.connect();
  a.bag.push(ruby('haul-a'), ruby('haul-b', 1));
  assert.equal(escape(s, a), true);
  for (const p of players) { assert.equal(p.profile.xp, 50); assert.equal(p.profile.earnedXp, 50); }
  assert.equal(waiting.profile.xp, 0);
  assert.equal(s.snapshot(a).camp.counts.gold, 50);
  assert.deepEqual(a.result.personalXp, { earned: 50, total: 50 });
  assert.equal(b.result.outcome, 'down'); assert.equal(b.result.personalXp.earned, 50);
  assert.equal(c.result.personalXp.earned, 50); assert.equal(d.result, null); assert.match(d.notice.text, /\+50 XP/);
  assert.equal(Object.hasOwn(a.result, 'xpAwards'), false); assert.equal(a.result.networkXpPending, undefined);
  assert.equal(s.action(a, { type: 'extract' }), false);
  s.action(a, { type: 'dismiss-result' }); s.disconnect(a); s.connect(a.token);
  assert.equal(a.profile.xp, 50);
});

test('failure, empty escapes, materials, gear and debug valuables yield no XP', () => {
  for (const kind of ['failed', 'empty', 'materials-and-gear', 'debug']) {
    const { s, a } = fixture(1);
    if (kind === 'failed') { a.bag.push(ruby('lost')); a.state = 'down'; a.health = 0; s.tick(.05); }
    else {
      if (kind === 'materials-and-gear') a.bag.push({ id: 'metal', type: 'scrap', x: 0, y: 0, rotation: 0 }, { id: 'snare', type: 'snare', x: 1, y: 0, rotation: 0 });
      if (kind === 'debug') a.bag.push({ ...ruby('debug'), debugSupply: true });
      assert.equal(escape(s, a), true);
    }
    assert.equal(a.profile.xp, 0, kind); assert.equal(a.result.personalXp.earned, 0, kind);
    assert.equal(s.snapshot(a).camp.counts.gold, 0, kind);
  }
});

test('actual sale multiplier drives XP, while browser-claimed rewards and upgrade ownership are ignored', () => {
  const { s, a } = fixture(1);
  a.bag.push({ ...ruby('hard-value'), saleMultiplier: 1.5 });
  for (const command of [{ type: 'award-xp', amount: 999 }, { type: 'buy', upgrade: 'smoke', xp: 999 }, { type: 'profile', purchases: ['quickSearch'], xp: 999 }]) assert.equal(s.action(a, command), false);
  assert.equal(a.profile.xp, 0); assert.equal(escape(s, a), true);
  assert.equal(a.profile.xp, 38); assert.equal(s.snapshot(a).camp.counts.gold, 38);
});

test('earned XP funds station-checked personal purchases without upgrading a teammate', () => {
  const { s, a, b } = fixture(); a.bag.push(ruby('a'), ruby('b', 1)); Object.assign(b, s.snapshot(b).dungeon.entrance);
  escape(s, a); s.action(a, { type: 'dismiss-result' }); s.action(b, { type: 'dismiss-result' });
  assert.equal(s.action(a, { type: 'buy', upgrade: 'quickSearch' }), false);
  a.x = 9; a.y = 11.5;
  assert.equal(s.action(a, { type: 'buy', upgrade: 'quickSearch' }), true); assert.equal(a.profile.xp, 20);
  assert.equal(s.action(a, { type: 'buy', upgrade: 'quickSearch' }), false);
  assert.equal(personalSearchRate(a.profile),1);assert.equal(s.action(a,{type:'set-passive',upgrade:'quickSearch',active:true}),true);
  assert.equal(personalSearchRate(a.profile), 1.1); assert.equal(personalSearchRate(b.profile), 1);
  b.x = 13; b.y = 6; assert.equal(s.action(b, { type: 'buy', upgrade: 'smoke' }), true); assert.equal(b.profile.xp, 0);
  const counts = s.snapshot(a).camp.counts; counts.scrap = 1; counts.cloth = 2;
  assert.equal(s.action(b, { type: 'craft', item: 'smoke' }), true); assert.equal(b.bag[0].type, 'smoke');
  a.x = 13; a.y = 6; assert.equal(s.action(a, { type: 'craft', item: 'smoke' }), false);
  assert.equal(a.profile.xp, 20);
  for (const p of [a, b]) { p.x = 9; p.y = 2.5; s.action(p, { type: 'board' }); }
  for (let i = 0; i < 61; i++) s.tick(.05);
  assert.equal(a.searchRate, 1.1); assert.equal(b.searchRate, 1);
});

test('two real socket clients receive earned XP and can spend it through the existing station commands', async t => {
  const { s, a, b } = fixture(); a.bag.push(ruby('real-socket-a'), ruby('real-socket-b', 1));
  for (const p of [a, b]) { Object.assign(p, s.snapshot(p).dungeon.entrance); s.disconnect(p); }
  const { server, wss } = createGameServer({ session: s });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`, clients = [];
  t.after(async () => { for (const c of clients) c.ws.terminate(); wss.close(); await new Promise(resolve => server.close(resolve)); });
  async function until(fn) {
    for (let i = 0; i < 200; i++) { if (fn()) return; await new Promise(resolve => setTimeout(resolve, 10)); }
    assert.fail('Reward network state did not arrive');
  }
  async function client(p) {
    const ws = new WebSocket(origin.replace('http:', 'ws:') + '/session', { origin }), c = { ws };
    clients.push(c); ws.on('message', bytes => { const m = JSON.parse(bytes); if (m.type === 'state') c.state = m; });
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', token: p.token })); await until(() => c.state); return c;
  }
  const ca = await client(a), cb = await client(b);
  ca.ws.send(JSON.stringify({ type: 'extract', xp: 10000 }));
  await until(() => ca.state.result && cb.state.result);
  for (const c of [ca, cb]) { assert.equal(c.state.profile.xp, 50); assert.equal(c.state.result.personalXp.earned, 50); assert.equal(c.state.result.networkXpPending, undefined); }
  ca.ws.send(JSON.stringify({ type: 'dismiss-result' }));
  a.x = 9; a.y = 11.5;
  ca.ws.send(JSON.stringify({ type: 'buy', upgrade: 'quickSearch' }));
  await until(() => ca.state.profile.xp === 20);
  assert.equal(cb.state.profile.xp, 50); assert.deepEqual(cb.state.profile.purchases, []);
});
