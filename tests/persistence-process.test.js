import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { once } from 'node:events';
import WebSocket from 'ws';

// Exercise the actual npm-start entry point with abrupt process death: no
// session injection, shutdown hook, or graceful final flush can save this test.
test('CLI survives hard termination: home sack restored, launched sack spent durably', { timeout: 15000 }, async t => {
  const base = join(process.cwd(), 'data'); mkdirSync(base, { recursive: true });
  const dir = mkdtempSync(join(base, 'process-test-'));
  let child; const clients = [], adminKeys = [];
  async function kill() {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
  }
  t.after(async () => { for (const ws of clients) ws.terminate(); await kill(); rmSync(dir, { recursive: true, force: true }); });
  async function start() {
    child = spawn(process.execPath, ['server/index.js'], { cwd: process.cwd(), env: { ...process.env, PORT: '0', GREEN_TEAM_SAVE_FILE: join(dir, 'home.sqlite') }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', error = '';
    child.stderr.on('data', data => { error += data; });
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error(`CLI did not start: ${error}`)), 4000);
      child.once('error', err => { clearTimeout(timeout); reject(err); });
      child.once('exit', () => { clearTimeout(timeout); reject(Error(`CLI exited: ${error}`)); });
      child.stdout.on('data', data => {
        output += data;
        const found = output.match(/http:\/\/localhost:(\d+)/);
        const admin = output.match(/\/admin#([a-f0-9]{64})/);
        if (found && admin) { adminKeys.push(admin[1]); clearTimeout(timeout); resolve(`http://127.0.0.1:${found[1]}`); }
      });
    });
  }
  async function client(origin, token) {
    const ws = new WebSocket(origin.replace('http:', 'ws:') + '/session', { origin }); clients.push(ws);
    let state, key;
    ws.on('message', bytes => { const m = JSON.parse(bytes); if (m.type === 'state') state = m; if (m.type === 'welcome') key = m.token; });
    async function until(fn) {
      for (let i = 0; i < 450; i++) { if (fn()) return; await new Promise(resolve => setTimeout(resolve, 10)); }
      assert.fail('CLI state did not arrive');
    }
    await once(ws, 'open'); ws.send(JSON.stringify({ type: 'hello', token })); await until(() => state);
    return { ws, until, state: () => state, token: key, send: m => ws.send(JSON.stringify(m)) };
  }
  const a = await client(await start()); a.send({ type: 'take', item: 'snare' }); await a.until(() => a.state().bag.length === 1);
  const id = a.state().selfId; await kill();
  const b = await client(await start(), a.token);
  assert.equal(b.state().selfId, id); assert.equal(b.state().bag[0].type, 'snare');
  const moving = setInterval(() => b.send({ type: 'move', x: 0, y: -1 }), 50);
  try { await b.until(() => b.state().players.find(p => p.id === id).y < 3.6); }
  finally { clearInterval(moving); }
  b.send({ type: 'move', x: 0, y: 0 }); b.send({ type: 'board' }); await b.until(() => b.state().dungeon);
  await kill();
  const c = await client(await start(), a.token);
  assert.equal(c.state().selfId, id); assert.deepEqual(c.state().bag, []);
  assert.equal(c.state().camp.counts.snare, 0); assert.equal(c.state().dungeon, null);
  assert.match(c.state().notice.text, /lost/);
  assert.equal(new Set(adminKeys).size, 3); // Private admin key rotates on every real restart.
});
