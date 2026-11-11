/**
 * Servidor estático de los prototipos de UI.
 *
 *   npm run prototipos:servir
 *   → http://localhost:4321/
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname);
const port = Number(process.env.PROTO_PORT || 4321);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = url === '/' ? '/index.html' : url;
    const file = path.join(root, rel);

    // Evitar escapar del directorio de prototipos
    if (!file.startsWith(root)) {
      res.writeHead(403).end('Prohibido');
      return;
    }

    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end(
          '<h1>404</h1><p>No existe: ' + rel + '</p><p><a href="/">Ir al índice</a></p>'
        );
        return;
      }
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(data);
    });
  })
  .listen(port, '0.0.0.0', () => {
    console.log(`Prototipos de UI en http://localhost:${port}/`);
  });
