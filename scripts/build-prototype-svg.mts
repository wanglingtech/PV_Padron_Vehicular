/**
 * Convierte las primitivas extraídas del DOM en un SVG por módulo.
 *
 * Entrada: <tmp>/opencode/proto-capturas/<slug>.json
 * Salida:  docs/prototipos/<slug>/prototipo.svg
 *
 * El SVG resultante es importable en Figma por drag & drop: formas vectoriales
 * reales y texto editable (no curvas).
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const CAP = path.join(os.tmpdir(), 'opencode', 'proto-capturas');
const OUT = path.resolve('docs/prototipos');

type Rect = {
  t: 'rect'; x: number; y: number; w: number; h: number;
  fill: string | null; fillOpacity: number;
  stroke: string | null; strokeOpacity: number; strokeWidth: number; r: number;
};
type Text = {
  t: 'text'; x: number; y: number; text: string;
  size: number; weight: string; fill: string; fillOpacity: number;
  anchor: string; family: string; upper: boolean;
};
type Img = { t: 'img'; x: number; y: number; w: number; h: number; src: string };
type Svg = {
  t: 'svg'; x: number; y: number; w: number; h: number; vb: string | null;
  inner: string; scale: number; stroke: string; fill: string;
};
type Shape = Rect | Text | Img | Svg;

interface Datos {
  shapes: Shape[];
  width: number;
  height: number;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Normaliza el peso de fuente a los valores que Figma entiende. */
function peso(w: string): string {
  if (w === '700' || w === 'bold' || w === '800' || w === '900') return '700';
  if (w === '600' || w === 'bold') return '600';
  if (w === '500' || w === 'medium') return '500';
  return '400';
}

/** Extrae el color de trazo de un `stroke` computado (los lucide usan currentColor). */
function colorTrazo(v: string): string {
  if (!v || v === 'none') return 'currentColor';
  return v;
}

async function construir(datos: Datos, titulo: string): Promise<string> {
  const { shapes, width, height } = datos;

  // --- Imágenes incrustadas en base64 ---
  const embebidas = new Map<string, string>();
  for (const s of shapes) {
    if (s.t !== 'img') continue;
    if (!s.src || s.src.startsWith('data:')) {
      if (s.src?.startsWith('data:')) embebidas.set(s.src, s.src);
      continue;
    }
    try {
      const res = await fetch(s.src);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = res.headers.get('content-type') ?? 'image/png';
      embebidas.set(s.src, `data:${mime};base64,${buf.toString('base64')}`);
    } catch {
      /* imagen no accesible: se omite */
    }
  }

  const partes: string[] = [];

  for (const s of shapes) {
    if (s.t === 'rect') {
      const attrs = [
        `x="${s.x}"`, `y="${s.y}"`, `width="${s.w}"`, `height="${s.h}"`,
      ];
      if (s.r > 0) attrs.push(`rx="${s.r}"`);
      if (s.fill) {
        attrs.push(`fill="${s.fill}"`);
        if (s.fillOpacity < 1) attrs.push(`fill-opacity="${s.fillOpacity}"`);
      } else {
        attrs.push('fill="none"');
      }
      if (s.stroke) {
        attrs.push(`stroke="${s.stroke}"`);
        attrs.push(`stroke-width="${s.strokeWidth || 1}"`);
        if (s.strokeOpacity < 1) attrs.push(`stroke-opacity="${s.strokeOpacity}"`);
      }
      partes.push(`  <rect ${attrs.join(' ')}/>`);
      continue;
    }

    if (s.t === 'text') {
      if (!s.text.trim()) continue;
      const txt = s.upper ? s.text.toUpperCase() : s.text;
      partes.push(
        `  <text x="${s.x}" y="${s.y}" font-family="${esc(s.family)}, Inter, sans-serif" ` +
          `font-size="${s.size}" font-weight="${peso(s.weight)}" fill="${s.fill}" ` +
          `text-anchor="${s.anchor}"` +
          (s.fillOpacity < 1 ? ` fill-opacity="${s.fillOpacity}"` : '') +
          `>${esc(txt)}</text>`
      );
      continue;
    }

    if (s.t === 'img') {
      const data = embebidas.get(s.src);
      if (!data) continue;
      partes.push(
        `  <image x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" href="${data}" preserveAspectRatio="xMidYMid slice"/>`
      );
      continue;
    }

    if (s.t === 'svg') {
      // El contenido interno trae sus propios trazos y transforms. Se coloca
      // en su posición y se escala solo si el SVG declara viewBox.
      const scale = s.scale || 1;
      const inner = s.inner.replace(/\s+/g, ' ').trim();
      const attrs = [
        `translate(${s.x} ${s.y})`,
        scale !== 1 ? `scale(${scale})` : '',
      ]
        .filter(Boolean)
        .join(' ');
      partes.push(
        `  <g transform="${attrs}" stroke="${colorTrazo(s.stroke)}" fill="${s.fill === 'none' ? 'none' : s.fill}">${inner}</g>`
      );
      continue;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  ${titulo}
  Vector editable generado desde el DOM real del módulo.
  Importable en Figma por drag & drop: formas vectoriales y texto editable.
  Regenerar: npm run prototipos:svg
-->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>${esc(titulo)}</title>
${partes.join('\n')}
</svg>
`;
}

async function main() {
  const archivos = (await fs.readdir(CAP)).filter(
    (f) => f.endsWith('.json') && f !== 'shell.json'
  );

  for (const f of archivos) {
    const slug = f.replace(/\.json$/, '');
    const datos = JSON.parse(await fs.readFile(path.join(CAP, f), 'utf8')) as Datos;

    const dir = path.join(OUT, slug);
    await fs.mkdir(dir, { recursive: true });

    const svg = await construir(datos, `Prototipo ${slug} — Padrón Vehicular`);
    await fs.writeFile(path.join(dir, 'prototipo.svg'), svg, 'utf8');

    const kb = (Buffer.byteLength(svg) / 1024).toFixed(0);
    console.log(`OK  ${slug.padEnd(22)} ${kb.padStart(6)} KB  (${datos.shapes.length} primitivas)`);
  }
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
