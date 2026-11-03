// Local preview of a static site in sites/. Usage: node sites/serve.mjs [folder] [port]
// Gzips text the way a static host would, so the page weights it shows are realistic.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, process.argv[2] || 'wrw-hospitality');
const port = Number(process.argv[3] || process.env.PORT || 4610);

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml'
};
const compressible = /^(text\/|application\/(json|xml)|image\/svg)/;

http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(root, rel);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
    const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Cache-Control': 'no-cache' };
    if (compressible.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      buf = zlib.gzipSync(buf, { level: 9 });
      headers['Content-Encoding'] = 'gzip';
    }
    headers['Content-Length'] = buf.length;
    res.writeHead(200, headers).end(buf);
  });
}).listen(port, '127.0.0.1', () => console.log(`Serving ${root} at http://localhost:${port}`));
