/**
 * Captura la UI real de cada módulo del sistema para generar los prototipos.
 *
 * No requiere dependencias nuevas: conduce Chrome por el Chrome DevTools
 * Protocol (CDP) usando solo el módulo `node:http` y WebSocket nativo de Node.
 *
 * Requisitos:
 *   1. Build de producción servido contra la base de prototipos (sin HMR de
 *      Vite, que en modo dev interrumpe la captura):
 *        npm run build
 *        NODE_ENV=production SQL_DB_NAME=padron_vehicular_proto PORT=3200 \
 *          ALLOW_DEMO_ACCOUNTS=true JWT_SECRET=proto-secret-only-for-captures-32chars \
 *          node dist/server.cjs
 *   2. Sumidero de capturas escuchando (scripts/capture-sink.mjs).
 *
 * Salida: <tmp>/opencode/proto-capturas/<slug>.html, <slug>.png y shell.json
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.PROTO_APP_URL ?? 'http://localhost:3200';
const EMAIL = 'admin@transporte.pe';
const PASSWORD = 'ProtoAdmin2026!';
const SINK = process.env.PROTO_SINK_URL ?? 'http://127.0.0.1:4399';
const OUT = path.join(os.tmpdir(), 'opencode', 'proto-capturas');
const CHROME =
  process.env.CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const VIEWPORT = { width: 1440, height: 900 };

/** Módulos del sistema, en el orden del catálogo `shared/roles.ts`. */
const MODULOS = [
  { slug: 'portal-inicio', nav: 'Inicio & Cartelera' },
  { slug: 'dashboard', nav: 'Dashboard Estadístico' },
  { slug: 'padron', nav: 'Padrón Vehicular' },
  { slug: 'nuevo', nav: 'Registrar Unidad' },
  { slug: 'personas', nav: 'Directorio de Personas' },
  { slug: 'curso-vial', nav: 'Conductores & Curso Vial' },
  { slug: 'directorio-contacto', nav: 'Directorio WhatsApp' },
  { slug: 'vencimientos', nav: 'Alertas de Vencimiento' },
  { slug: 'importar-exportar', nav: 'Importar (PDF/Excel) & Exportar' },
  { slug: 'operario-portal', nav: 'Mi Unidad & Fotos en Vivo' },
  { slug: 'historial', nav: 'Historial de Auditoría' },
  { slug: 'usuarios', nav: 'Cuentas y Accesos' },
  { slug: 'configuracion', nav: 'Configuración & Empresa' },
  { slug: 'gestion-portal', nav: 'Gestión de Cartelera & Portal' },
  { slug: 'backup-migracion', nav: 'Backup & Migración BD' },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Promesa pendiente de una respuesta del CDP. */
type Pending = { resolve: (v: any) => void; reject: (e: Error) => void };

/** Cliente mínimo del Chrome DevTools Protocol sobre WebSocket nativo. */
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
      }, 60000);
    });
  }

  /** Evalúa una expresión en la página y devuelve su valor. */
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

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  // --- Lanzar Chrome con depuración remota ---
  const userDataDir = path.join(os.tmpdir(), 'opencode', 'chrome-proto');
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      `--user-data-dir=${userDataDir}`,
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  // Esperar a que el puerto de depuración responda
  let target: any = null;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/list');
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
    throw new Error('Chrome no expuso el puerto de depuración 9222');
  }

  const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const goto = async (url: string) => {
    await cdp.send('Page.navigate', { url });
    await sleep(1200);
  };

  /** Espera a que un selector exista en el DOM (o lanza tras el timeout). */
  const waitFor = async (selector: string, timeoutMs = 25000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const ok = await cdp.eval<boolean>(
        `!!document.querySelector(${JSON.stringify(selector)})`
      );
      if (ok) return true;
      await sleep(400);
    }
    throw new Error(`Timeout esperando el selector ${selector}`);
  };

  /** Escribe en un input de React disparando el evento input nativo. */
  const fill = async (selector: string, value: string) => {
    await waitFor(selector);
    await cdp.eval(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set;
        setter.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()
    `);
  };

  /** Hace clic en un botón del sidebar por su texto. */
  const clickNav = async (label: string) => {
    const clicked = await cdp.eval<boolean>(`
      (() => {
        const target = ${JSON.stringify(label)};
        const btns = Array.from(document.querySelectorAll('aside button'));
        const b = btns.find(x => (x.innerText || '').includes(target));
        if (!b) return false;
        b.click();
        return true;
      })()
    `);
    if (!clicked) throw new Error(`No se encontró el botón "${label}"`);
  };

  /** Envía un archivo al sumidero de capturas. */
  const sink = async (name: string, body: string | Buffer) => {
    const res = await fetch(`${SINK}/${name}`, { method: 'POST', body: body as any });
    if (!res.ok) throw new Error(`Sumidero rechazó ${name}: ${res.status}`);
  };

  try {
    // --- Login (sin sesión) ---
    // Se captura PRIMERO: después de iniciar sesión la cookie persiste y
    // la app ya no muestra esta pantalla.
    await goto(`${BASE}/`);
    await waitFor('input[type="email"]');
    const loginHtml = await cdp.eval<string>('document.body.innerHTML');
    await sink('login.html', loginHtml);
    const loginShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile(path.join(OUT, 'login.png'), Buffer.from(loginShot.data, 'base64'));
    console.log(`OK  login (${loginHtml.length} chars)`);

    // --- Iniciar sesión ---
    await fill('input[type="email"]', EMAIL);
    await fill('input[type="password"]', PASSWORD);
    await cdp.eval(`document.querySelector('button[type="submit"]').click(); true`);
    await waitFor('main', 30000);
    await sleep(2500);
    const logueado = await cdp.eval<boolean>(`!!document.querySelector('main')`);
    if (!logueado) throw new Error('No se pudo iniciar sesión en la app de prototipos');
    console.log('login OK');

    // --- Capturar cada módulo ---
    for (const mod of MODULOS) {
      try {
        await clickNav(mod.nav);
        await sleep(3200);

        const html = await cdp.eval<string>(
          `document.querySelector('main') ? document.querySelector('main').innerHTML : ''`
        );
        await sink(`${mod.slug}.html`, html);

        const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        await fs.writeFile(path.join(OUT, `${mod.slug}.png`), Buffer.from(shot.data, 'base64'));

        console.log(`OK  ${mod.slug.padEnd(22)} ${String(html.length).padStart(7)} chars`);
      } catch (e) {
        console.log(`ERR ${mod.slug.padEnd(22)} ${String(e).slice(0, 100)}`);
      }
    }

    // --- Shell (sidebar + navbar) ---
    const shell = await cdp.eval<{ aside: string; header: string; bottom: string }>(`
      (() => ({
        aside: document.querySelector('aside')?.outerHTML || '',
        header: document.querySelector('header')?.outerHTML || '',
        bottom: document.querySelector('nav')?.outerHTML || ''
      }))()
    `);
    await sink('shell.json', JSON.stringify(shell));
    console.log(`OK  shell (aside ${shell.aside.length}b)`);

    // --- Ficha de vehículo y edición ---
    await clickNav('Padrón Vehicular');
    await sleep(3200);

    // Ficha completa
    await cdp.eval(`
      (() => {
        const b = document.querySelector('button[title="Ver ficha completa e historial"]');
        if (b) b.click();
        return true;
      })()
    `);
    await sleep(3200);
    const detalle = await cdp.eval<string>('document.querySelector("main").innerHTML');
    await sink('vehiculo-detalle.html', detalle);
    const s1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile(path.join(OUT, 'vehiculo-detalle.png'), Buffer.from(s1.data, 'base64'));
    console.log(`OK  vehiculo-detalle (${detalle.length} chars)`);

    // Formulario de edición
    await clickNav('Padrón Vehicular');
    await sleep(3000);
    await cdp.eval(`
      (() => {
        const b = document.querySelector('button[title="Editar registro"]');
        if (b) b.click();
        return true;
      })()
    `);
    await sleep(3200);
    const editar = await cdp.eval<string>('document.querySelector("main").innerHTML');
    await sink('vehiculo-editar.html', editar);
    const s2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile(path.join(OUT, 'vehiculo-editar.png'), Buffer.from(s2.data, 'base64'));
    console.log(`OK  vehiculo-editar (${editar.length} chars)`);
  } finally {
    cdp.close();
    chrome.kill();
    console.log('\nCapturas en:', OUT);
  }
}

main().catch((e) => {
  console.error('FALLO:', e);
  process.exit(1);
});
