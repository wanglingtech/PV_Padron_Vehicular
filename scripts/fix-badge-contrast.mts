/**
 * Corrige el contraste de los badges de color.
 *
 * Patrón problemático: `bg-<tono>-100` con `text-<tono>-600` da un contraste
 * de ~3.9:1, por debajo del 4.5:1 que exige WCAG AA. La solución es
 * oscurecer el texto a `<tono>-700` (fondo 100) o `<tono>-800` (fondo 50).
 *
 * Se procesa cada cadena de clases por separado para no mezclar tonos.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const RAIZ = path.resolve('frontend/src');

async function fuentes(dir: string, acc: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await fuentes(full, acc);
    else if (e.name.endsWith('.tsx')) acc.push(full);
  }
  return acc;
}

const TONOS = [
  'rose', 'emerald', 'amber', 'blue', 'indigo', 'purple', 'violet',
  'green', 'red', 'yellow', 'cyan', 'sky', 'orange', 'teal', 'fuchsia',
  'pink', 'lime', 'slate',
];

/** Una cadena de clases: `className="..."`, `className={...}` o `class="..."`. */
const CLASES = /((?:className|class)\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`))/g;

const archivos = await fuentes(RAIZ);
let archivosModificados = 0;
let correcciones = 0;

for (const archivo of archivos) {
  const original = await fs.readFile(archivo, 'utf8');

  const texto = original.replace(CLASES, (bloque) => {
    let cambios = 0;

    for (const tono of TONOS) {
      // Solo se toca si el MISMO bloque tiene el fondo y el texto del tono.
      const tieneFondo100 = new RegExp(`\\bbg-${tono}-100\\b`).test(bloque);
      const tieneFondo50 = new RegExp(`\\bbg-${tono}-50\\b`).test(bloque);
      if (!tieneFondo100 && !tieneFondo50) continue;

      const destino = tieneFondo100 ? '700' : '800';
      const re = new RegExp(`\\btext-${tono}-600\\b`, 'g');

      const nuevo = bloque.replace(re, (m) => {
        cambios++;
        return `text-${tono}-${destino}`;
      });

      if (cambios > 0) return nuevo;
    }

    return bloque;
  });

  if (texto !== original) {
    await fs.writeFile(archivo, texto, 'utf8');
    archivosModificados++;
    console.log(`  ${path.relative(RAIZ, archivo)}`);
  }
}

console.log(`\n${archivosModificados} archivos actualizados · ${correcciones} correcciones`);
