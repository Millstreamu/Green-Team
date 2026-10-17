import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { WebSocketServer } from 'ws';
import { createLairSession } from './lair-session.js';
import { openSaveStore } from './save-store.js';

const root = fileURLToPath(new URL('../', import.meta.url));
export function createGameServer({ session = createLairSession() } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      const relative = path === '/' ? 'index.html' : path.slice(1);
      if (!(relative === 'index.html' || relative.startsWith('src/') || relative === 'assets/goblin.png') || relative.includes('..')) { res.writeHead(404).end(); return; }
      let data = await readFile(resolve(root, relative));
      if (relative === 'index.html') data = Buffer.from(data.toString().replace('src/main.js', 'src/online-main.js').replace('Plan and board · V30', 'Saved lair test · V36'));
      res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' })[extname(relative)], 'Cache-Control': 'no-store' }); res.end(data);
    } catch { res.writeHead(404).end(); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/session' || req.headers.origin !== `http://${req.headers.host}`) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });
  let failed = false, timer;
  function pauseForSaveError(error) {
    if (failed) return;
    failed = true; clearInterval(timer);
    console.error('Save failed. Game paused; existing save retained. Restart after fixing disk access.', error);
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: 'save-error' }));
        client.close(1011, 'Save failed');
      }
    }
  }
  wss.on('connection', ws => {
    if (failed) { ws.close(1011, 'Save failed'); return; }
    let p, budget = 100;
    const timeout = setTimeout(() => { if (!p) ws.close(); }, 5000);
    ws.on('error', () => {});
    ws.on('message', bytes => {
      if (--budget < 0) { ws.close(1008, 'Too many messages'); return; }
      let m; try { m = JSON.parse(bytes.toString()); } catch { ws.close(1007, 'Invalid message'); return; }
      try {
        if (!p) {
          if (m?.type !== 'hello' || (m.token != null && (typeof m.token !== 'string' || m.token.length > 64))) { ws.close(1008); return; }
          p = session.connect(m.token);
          if (!p) { ws.close(1008, 'Session already open'); return; }
          clearTimeout(timeout); ws.send(JSON.stringify({ type: 'welcome', token: p.token }));
        } else if (!session.action(p, m)) ws.send(JSON.stringify({ type: 'rejected', message: 'That action is no longer available. Shared state refreshed.' }));
        if (p) ws.send(JSON.stringify(session.snapshot(p)));
      } catch (error) { pauseForSaveError(error); }
    });
    ws.on('close', () => { clearTimeout(timeout); if (p && !failed) { try { session.disconnect(p); } catch (error) { pauseForSaveError(error); } } });
    ws.sendState = () => {
      budget = Math.min(100, budget + 5);
      if (p && ws.readyState === 1) {
        if (ws.bufferedAmount > 262144) { ws.close(1008, 'Connection too slow'); return; }
        ws.send(JSON.stringify(session.snapshot(p)));
      }
    };
  });
  let previous = performance.now();
  timer = setInterval(() => {
    if (failed) return;
    try {
      const now = performance.now(); session.tick((now - previous) / 1000); previous = now;
      for (const ws of wss.clients) ws.sendState();
    } catch (error) { pauseForSaveError(error); }
  }, 50);
  server.on('close', () => clearInterval(timer));
  return { server, wss };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const filename = resolve(process.env.GREEN_TEAM_SAVE_FILE || resolve(root, 'data/home.sqlite'));
  const store = openSaveStore(filename);
  const { server, wss } = createGameServer({ session: createLairSession({ store }) });
  let stopping = false;
  function stop() {
    if (stopping) return;
    stopping = true;
    // Every action was already committed; shutdown needs no final flush.
    for (const ws of wss.clients) ws.terminate();
    wss.close(); server.close(() => { store.close(); process.exit(0); });
  }
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  console.log(`Shared lair save: ${filename}`);
  server.listen(Number(process.env.PORT || 8080), '127.0.0.1', () => console.log(`Green Team test: http://localhost:${server.address().port} — open in two tabs. Ctrl+C stops it.`));
}
