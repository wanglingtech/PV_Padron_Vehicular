/**
 * Convierte imágenes PNG a WebP usando el codificador nativo de Chrome.
 *
 * No requiere dependencias nuevas: conduce Chrome por el Chrome DevTools
 * Protocol y usa `canvas.toDataURL('image/webp')`.
 *
 *   npx tsx scripts/convert-images-webp.mts            # docs/screenshots + docs/prototipos
 *   npx tsx scripts/convert-images-webp.mts --dry      # solo informa, no escribe
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const CHROME =
  process.env.CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const QUALITY = 0.85;
const DRY = process.argv.includes('--dry');

/** Carpetas a convertir (recursivo). */
const RAICES = ['docs/screenshots', 'docs/prototipos'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Pending = { resolve: (v: any) => void; reject: (e: Error) => void };

class Cdp {
  private ws!: WebSocket;
  private id = 0;
  private pending = new Map<number, Pending>();

  static async connect(wsUrl: string): Promise<Cdp> {
    const cdp = new Cdp();
    cdp.ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      cdp.ws.addEventListener('open', () => resolve());
      cdp.ws.addEventListener('error', () => reject(new Error('No se pudo abrir el WebSocket de CDP')));
    });
    cdp.ws.addEventListener('message', (ev: MessageEvent) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && cdp.pending.has(msg.id)) {
        const { resolve: rs, reject: rj } = cdp.pending.get(msg.id)!;
        cdp.pending.delete(msg.id);
        msg.error ? rj(new Error(msg.error.message)) : rs(msg.result);
      }
    });
    return cdp;
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout en ${method}`));
        }
      }, 120000);
    });
  }

  async eval<T>(expression: string): Promise<T> {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description ?? 'Error de evaluación');
    }
    return res.result.value as T;
  }

  close() {
    this.ws.close();
  }
}

/** Lista recursivamente los PNG de un directorio. */
async function pngsEn(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await pngsEn(full)));
    else if (e.name.toLowerCase().endsWith('.png')) out.push(full);
  }
  return out;
}

async function main() {
  const archivos: string[] = [];
  for (const r of RAICES) archivos.push(...(await pngsEn(r)));

  if (archivos.length === 0) {
    console.log('No hay PNG que convertir.');
    return;
  }

  // --- Lanzar Chrome ---
  const userDataDir = path.join(process.env.TEMP ?? '.', 'opencode', 'chrome-webp');
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--remote-debugging-port=9225',
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let target: any = null;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9225/json/list');
      const list = (await res.json()) as any[];
      target = list.find((t) => t.type === 'page');
      if (target) break;
    } catch {
      /* aún no responde */
    }
    await sleep(500);
  }
  if (!target) {
    chrome.kill();
    throw new Error('Chrome no expuso el puerto de depuración 9225');
  }

  const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: 'about:blank' });
  await sleep(800);

  let antes = 0;
  let despues = 0;

  try {
    for (const abs of archivos) {
      const rel = path.relative(process.cwd(), abs);
      const bytes = await fs.readFile(abs);
      antes += bytes.length;

      const b64 = bytes.toString('base64');

      const dataUrl = await cdp.eval<string>(`
        (async () => {
          const img = new Image();
          img.src = 'data:image/png;base64,${b64}';
          await img.decode();
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          return c.toDataURL('image/webp', ${QUALITY});
        })()
      `);

      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      const webp = Buffer.from(base64, 'base64');
      const destino = abs.replace(/\.png$/i, '.webp');

      despues += webp.length;
      const ratio = ((webp.length / bytes.length) * 100).toFixed(0);
      const kb = (n: number) => (n / 1024).toFixed(0).padStart(5) + ' KB';

      if (!DRY) {
        await fs.writeFile(destino, webp);
        await fs.unlink(abs);
      }
      console.log(
        `${DRY ? 'would convert' : 'convertido'}  ${rel.padEnd(46)} ${kb(bytes.length)} -> ${kb(webp.length)}  (${ratio}%)`
      );
    }
  } finally {
    cdp.close();
    chrome.kill();
  }

  const pct = ((1 - despues / antes) * 100).toFixed(1);
  console.log(
    `\n${DRY ? 'Se habrían convertido' : 'Convertidos'} ${archivos.length} archivos: ` +
      `${(antes / 1024 / 1024).toFixed(2)} MB -> ${(despues / 1024 / 1024).toFixed(2)} MB (ahorro ${pct}%)`
  );
}

main().catch((e) => {
  console.error('FALLO:', e);
  process.exit(1);
});
