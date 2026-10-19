import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { AdminError } from './admin.js';

function localRequest(req) {
  const host = req.headers.host;
  try {
    const hostname = new URL(`http://${host}`).hostname;
    return ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
      && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  } catch { return false; }
}
async function readCommand(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new AdminError('Send JSON commands.', 415);
  const text = await new Promise((resolve, reject) => {
    let bytes = 0, chunks = [];
    req.on('data', chunk => { bytes += chunk.length; if (bytes <= 4096) chunks.push(chunk); else chunks = []; });
    req.on('end', () => bytes > 4096 ? reject(new AdminError('Admin request is too large.', 413)) : resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
  try { return JSON.parse(text); } catch { throw new AdminError('Invalid admin command JSON.'); }
}
export function createAdminHttp(controller, token = randomBytes(32).toString('hex')) {
  const expected = Buffer.from(token);
  function authorized(req) {
    const supplied = Buffer.from(typeof req.headers['x-green-team-admin'] === 'string' ? req.headers['x-green-team-admin'] : '');
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  }
  function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).end(JSON.stringify(value)); }
  return {
    token,
    async handle(req, res, path) {
      if (path !== '/admin' && path !== '/admin/api') return false;
      if (!localRequest(req)) { json(res, 403, { error: 'Admin is only available on the server computer.' }); return true; }
      const origin = `http://${req.headers.host}`;
      if (req.headers.origin && req.headers.origin !== origin) { json(res, 403, { error: 'Open the private admin link from Terminal.' }); return true; }
      if (path === '/admin') {
        if (req.method !== 'GET') { json(res, 405, { error: 'Method not allowed.' }); return true; }
        const html = await readFile(new URL('../admin.html', import.meta.url));
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
          'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'" }).end(html);
        return true;
      }
      if (!authorized(req)) { json(res, 403, { error: 'Use the private admin link printed in Terminal. It changes each restart.' }); return true; }
      try {
        if (req.method === 'GET') json(res, 200, controller.summary(new URL(req.url, 'http://localhost').searchParams.get('lair')));
        else if (req.method === 'POST') {
          if (req.headers.origin !== origin) throw new AdminError('Open the admin page on this server.', 403);
          const command = await readCommand(req);
          const result = controller.command(command);
          json(res, 200, { ...result, state: controller.summary(command.lairId) });
        } else json(res, 405, { error: 'Method not allowed.' });
      } catch (error) {
        if (!(error instanceof AdminError)) console.error('Admin action failed:', error.message);
        json(res, error instanceof AdminError ? error.status : 500, { error: error instanceof AdminError ? error.message : 'Admin action failed. Check Terminal. No success was recorded.' });
      }
      return true;
    }
  };
}
