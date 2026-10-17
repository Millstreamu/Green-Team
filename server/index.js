import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { WebSocketServer } from 'ws';
import { createLairSession } from './lair-session.js';

const root = fileURLToPath(new URL('../', import.meta.url));
export function createGameServer() {
  const session = createLairSession();
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      const relative = path === '/' ? 'index.html' : path.slice(1);
      if (!(relative === 'index.html' || relative.startsWith('src/') || relative === 'assets/goblin.png') || relative.includes('..')) { res.writeHead(404).end(); return; }
      let data = await readFile(resolve(root, relative));
      if (relative === 'index.html') data = Buffer.from(data.toString().replace('src/main.js', 'src/online-main.js').replace('Plan and board · V30', 'Two-player lair test · V31'));
      res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' })[extname(relative)], 'Cache-Control': 'no-store' }); res.end(data);
    } catch { res.writeHead(404).end(); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/session' || req.headers.origin !== `http://${req.headers.host}`) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });
  wss.on('connection', ws => {
    let p, budget = 100;
    const timeout = setTimeout(() => { if (!p) ws.close(); }, 5000);
    ws.on('error', () => {});
    ws.on('message', bytes => {
      if (--budget < 0) { ws.close(1008, 'Too many messages'); return; }
      let m; try { m = JSON.parse(bytes.toString()); } catch { ws.close(1007, 'Invalid message'); return; }
      if (!p) {
        if (m?.type !== 'hello' || (m.token != null && (typeof m.token !== 'string' || m.token.length > 64))) { ws.close(1008); return; }
        p = session.connect(m.token);
        if (!p) { ws.close(1008, 'Session already open'); return; }
        clearTimeout(timeout); ws.send(JSON.stringify({ type: 'welcome', token: p.token }));
      } else if (!session.action(p, m)) ws.send(JSON.stringify({ type: 'rejected', message: 'That action is no longer available. Shared state refreshed.' }));
      if (p) ws.send(JSON.stringify(session.snapshot(p)));
    });
    ws.on('close', () => { clearTimeout(timeout); if (p) session.disconnect(p); });
    ws.sendState = () => {
      budget = Math.min(100, budget + 5);
      if (p && ws.readyState === 1) {
        if (ws.bufferedAmount > 262144) { ws.close(1008, 'Connection too slow'); return; }
        ws.send(JSON.stringify(session.snapshot(p)));
      }
    };
  });
  let previous = performance.now();
  const timer = setInterval(() => {
    const now = performance.now(); session.tick((now - previous) / 1000); previous = now;
    for (const ws of wss.clients) ws.sendState();
  }, 50);
  server.on('close', () => clearInterval(timer));
  return { server, wss };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { server } = createGameServer();
  server.listen(Number(process.env.PORT || 8080), '127.0.0.1', () => console.log(`Green Team test: http://localhost:${server.address().port} — open in two tabs. Ctrl+C stops it.`));
}
