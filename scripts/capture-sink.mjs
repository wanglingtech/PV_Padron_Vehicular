/**
 * Servidor "sumidero" de capturas.
 *
 * El navegador (Playwright vía MCP) no puede escribir archivos en disco, así que
 * hace POST del HTML capturado a este servidor, que lo guarda en
 * `docs/prototipos/_capturas/`.
 *
 * Solo escucha en localhost y solo acepta rutas internas de captura.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Las capturas crudas son intermedias: viven fuera del repositorio.
const OUT = path.join(os.tmpdir(), 'opencode', 'proto-capturas');
const PORT = Number(process.argv[2] || 4399);

const ALLOWED = /^[a-z0-9-]+\.(html|png|json)$/;

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  http
    .createServer((req, res) => {
      const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      if (req.method === 'OPTIONS') {
        res.writeHead(204, cors).end();
        return;
      }

      const name = decodeURIComponent((req.url || '').replace(/^\/+/, ''));
      if (req.method !== 'POST' || !ALLOWED.test(name)) {
        res.writeHead(400, { ...cors, 'Content-Type': 'text/plain' }).end('Ruta no permitida');
        return;
      }

      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', async () => {
        try {
          const file = path.join(OUT, name);
          if (!file.startsWith(OUT)) throw new Error('fuera de rango');
          await fs.writeFile(file, Buffer.concat(chunks));
          console.log(`guardado ${name} (${Buffer.concat(chunks).length} bytes)`);
          res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end('{"ok":true}');
        } catch (e) {
          res.writeHead(500, { ...cors, 'Content-Type': 'text/plain' }).end(String(e));
        }
      });
    })
    .listen(PORT, '127.0.0.1', () => {
      console.log(`Sumidero de capturas escuchando en http://127.0.0.1:${PORT}`);
    });
}

main();
