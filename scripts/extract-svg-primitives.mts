/**
 * Genera un SVG vectorial por cada prototipo, importable en Figma.
 *
 * En lugar de escribir SVG a mano, se recorre el DOM renderizado del módulo y
 * se reconstruye con formas y texto reales (rectángulos, líneas y `<text>`
 * editable). Las imágenes incrustadas se incrustan en base64 para que el SVG
 * sea autónomo.
 *
 * La captura se hace sobre el build de producción (sin HMR de Vite).
 *
 * Requisitos:
 *   1. App de prototipos en producción (ver scripts/capture-prototypes.mts).
 *   2. Sumidero de capturas escuchando (scripts/capture-sink.mjs).
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

/** Módulos a convertir a SVG, en el orden del catálogo de `shared/roles.ts`. */
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

/**
 * Script que corre dentro de la página.
 *
 * Recorre el DOM y devuelve una lista de primitivas SVG:
 *   - rectángulos con fondo/borde reales (colores calculados)
 *   - líneas de texto con su tipografía exacta
 *   - imágenes incrustadas en base64
 */
const EXTRACTOR = `
(async () => {
  const round = (n) => Math.round(n * 100) / 100;

  const cv = document.createElement('canvas');
  cv.width = 1;
  cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const cache = new Map();

  /** Convierte un color CSS a #rrggbb (opacidad aparte). */
  const toHex = (color) => {
    if (!color || color === 'transparent' || color === 'none') return null;
    if (cache.has(color)) return cache.get(color);

    // Tailwind v4 usa oklch()/oklab()/color-mix(): en lugar de parsear el
    // color a mano se pinta en un canvas de 1x1 y se lee el píxel. Chrome
    // normaliza cualquier formato a RGBA exacto.
    let out = null;
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      const a = d[3] / 255;
      if (a > 0) {
        // Los canales llegan premultiplicados: se deshace.
        const un = (v) => Math.min(255, Math.round(v / a));
        const h = (v) => un(v).toString(16).padStart(2, '0');
        out = { hex: '#' + h(d[0]) + h(d[1]) + h(d[2]), alpha: Math.round(a * 1000) / 1000 };
      }
    } catch (e) {
      out = null;
    }
    cache.set(color, out);
    return out;
  };

  const root = document.querySelector('main') || document.body;
  const rootRect = root.getBoundingClientRect();
  const ox = rootRect.left;
  const oy = rootRect.top;

  const shapes = [];

  const walk = (el) => {
    if (!(el instanceof Element)) return;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return;

    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (Number(cs.opacity) === 0) return;

    // Los tooltips flotantes de recharts se superponen al gráfico y solo
    // existen en hover: no aportan al prototipo estático.
    const cls = el.getAttribute('class') || '';
    if (cls.includes('recharts-tooltip') || cls.includes('recharts-wrapper')) return;

    const r = el.getBoundingClientRect();
    const w = r.width;
    const h = r.height;
    if (w < 0.5 || h < 0.5) return;

    const x = round(r.left - ox);
    const y = round(r.top - oy);

    // ---- Imagen ----
    if (tag === 'IMG') {
      shapes.push({ t: 'img', x, y, w: round(w), h: round(h), src: el.currentSrc || el.src });
      return;
    }

    // ---- SVG embebido (iconos lucide) ----
    if (tag === 'svg') {
      const vbAttr = el.getAttribute('viewBox');
      const vb = vbAttr ? vbAttr.split(/[\\s,]+/).map(Number) : null;
      // Sin viewBox no se escala: los gráficos de recharts posicionan con
      // transforms internos y deben conservar su escala natural.
      const scale = vb && vb[2] ? round(w / vb[2]) : 1;
      shapes.push({
        t: 'svg', x, y, w: round(w), h: round(h),
        vb: vb ? vb.join(' ') : null,
        inner: el.innerHTML,
        scale,
        stroke: cs.stroke,
        fill: cs.fill
      });
      return;
    }

    // ---- Fondo y borde ----
    const bg = toHex(cs.backgroundColor);
    const borderW = parseFloat(cs.borderTopWidth) || 0;
    const borderC = toHex(cs.borderTopColor);
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;

    if (bg || (borderW > 0 && borderC)) {
      shapes.push({
        t: 'rect', x, y, w: round(w), h: round(h),
        fill: bg ? bg.hex : null,
        fillOpacity: bg ? round(bg.alpha) : 0,
        stroke: borderW > 0 && borderC ? borderC.hex : null,
        strokeOpacity: borderW > 0 && borderC ? round(borderC.alpha) : 0,
        strokeWidth: borderW > 0 ? round(borderW) : 0,
        r: radius ? round(Math.min(radius, Math.min(w, h) / 2)) : 0
      });
    }

    // ---- Texto ----
    for (const node of el.childNodes) {
      if (node.nodeType !== 3) continue;
      const raw = node.textContent;
      if (!raw || !raw.trim()) continue;

      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((r2) => r2.width > 0.5 && r2.height > 0.5);
      if (!rects.length) continue;

      const lines = raw.split(/\\n+/).map((s) => s.trim()).filter(Boolean);

      for (const rect of rects) {
        // Un rect por línea visual: se usa el primero con el texto
        const text = lines.shift() ?? raw.trim();
        const color = toHex(cs.color);
        const align = cs.textAlign;
        const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
        const tx =
          anchor === 'middle' ? round(rect.left - ox + rect.width / 2)
          : anchor === 'end' ? round(rect.right - ox)
          : round(rect.left - ox);
        const ty = round(rect.bottom - oy - rect.height * 0.22);

        shapes.push({
          t: 'text', x: tx, y: ty, text: text.slice(0, 300),
          size: round(parseFloat(cs.fontSize) || 12),
          weight: cs.fontWeight,
          fill: color ? color.hex : '#000',
          fillOpacity: color ? round(color.alpha) : 1,
          anchor,
          family: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
          upper: cs.textTransform === 'uppercase'
        });
      }
    }

    for (const child of el.children) walk(child);
  };

  walk(root);
  return { shapes, width: round(rootRect.width), height: round(rootRect.height) };
})()
`;

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  const userDataDir = path.join(os.tmpdir(), 'opencode', 'chrome-svg');
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--remote-debugging-port=9226',
      `--user-data-dir=${userDataDir}`,
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let target: any = null;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9226/json/list');
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
    throw new Error('Chrome no expuso el puerto de depuración 9226');
  }

  const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  // El perfil de Chrome persiste la cookie de sesión entre ejecuciones:
  // se limpia para empezar siempre desde el login.
  await cdp.send('Network.clearBrowserCookies');

  const goto = async (url: string) => {
    await cdp.send('Page.navigate', { url });
    await sleep(1500);
  };
  const waitFor = async (selector: string, timeoutMs = 25000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await cdp.eval<boolean>(`!!document.querySelector(${JSON.stringify(selector)})`)) return;
      await sleep(400);
    }
    throw new Error(`Timeout esperando ${selector}`);
  };
  const fill = async (selector: string, value: string) => {
    await waitFor(selector);
    await cdp.eval(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()
    `);
  };
  const clickNav = async (label: string) => {
    const ok = await cdp.eval<boolean>(`
      (() => {
        const b = Array.from(document.querySelectorAll('aside button'))
          .find(x => (x.innerText || '').includes(${JSON.stringify(label)}));
        if (!b) return false;
        b.click();
        return true;
      })()
    `);
    if (!ok) throw new Error(`No se encontró el botón "${label}"`);
  };
  const sink = async (name: string, body: string) => {
    const res = await fetch(`${SINK}/${name}`, { method: 'POST', body });
    if (!res.ok) throw new Error(`Sumidero rechazó ${name}: ${res.status}`);
  };

  try {
    // --- Login ---
    await goto(`${BASE}/`);
    await waitFor('input[type="email"]');
    const loginShapes = await cdp.eval<any>(EXTRACTOR);
    await sink('login.json', JSON.stringify(loginShapes));
    console.log(`OK  login (${loginShapes.shapes.length} primitivas)`);

    // --- Sesión + módulos ---
    await fill('input[type="email"]', EMAIL);
    await fill('input[type="password"]', PASSWORD);
    await cdp.eval(`document.querySelector('button[type="submit"]').click(); true`);
    await waitFor('main', 30000);
    await sleep(2500);
    console.log('login OK');

    for (const mod of MODULOS) {
      try {
        await clickNav(mod.nav);
        await sleep(3200);
        const data = await cdp.eval<any>(EXTRACTOR);
        await sink(`${mod.slug}.json`, JSON.stringify(data));
        console.log(`OK  ${mod.slug.padEnd(22)} ${String(data.shapes.length).padStart(6)} primitivas`);
      } catch (e) {
        console.log(`ERR ${mod.slug.padEnd(22)} ${String(e).slice(0, 100)}`);
      }
    }

    // --- Ficha de vehículo y edición (sub-vistas del padrón) ---
    await clickNav('Padrón Vehicular');
    await sleep(3200);

    await cdp.eval(`
      (() => {
        const b = document.querySelector('button[title="Ver ficha completa e historial"]');
        if (b) b.click();
        return true;
      })()
    `);
    await sleep(3200);
    const detalle = await cdp.eval<any>(EXTRACTOR);
    await sink('vehiculo-detalle.json', JSON.stringify(detalle));
    console.log(`OK  vehiculo-detalle        ${String(detalle.shapes.length).padStart(6)} primitivas`);

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
    const editar = await cdp.eval<any>(EXTRACTOR);
    await sink('vehiculo-editar.json', JSON.stringify(editar));
    console.log(`OK  vehiculo-editar         ${String(editar.shapes.length).padStart(6)} primitivas`);
  } finally {
    cdp.close();
    chrome.kill();
    console.log('\nPrimitivas en:', OUT);
  }
}

main().catch((e) => {
  console.error('FALLO:', e);
  process.exit(1);
});
