/**
 * Pase final de contraste en modo claro.
 *
 * 1. `text-<tono>-600` sobre fondos claros: emerald-600 (#00a76f) da 3.5:1 sobre
 *    blanco. Se oscurece a `-700`, que sí cumple, y se fija la variante
 *    oscura explícita para no perder el diseño original.
 * 2. `text-slate-400 dark:text-slate-400`: la variante oscura repetida no
 *    cambiaba nada y el valor claro seguía fallando.
 *
 * Se Exceptúan los elementos sobre fondos permanentemente oscuros.
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

const FONDO_OSCURO =
  /\bbg-(?:slate|gray|zinc|neutral|stone|black|blue|indigo|emerald|rose|red)-(?:800|900|950)\b/;

const TONOS = [
  'emerald', 'rose', 'amber', 'blue', 'indigo', 'purple', 'violet',
  'green', 'red', 'cyan', 'sky', 'orange', 'teal', 'fuchsia', 'pink', 'lime',
];

const CLASES = /((?:className|class)\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`))/g;

const archivos = await fuentes(RAIZ);
let modificados = 0;
let correcciones = 0;

for (const archivo of archivos) {
  const original = await fs.readFile(archivo, 'utf8');

  const texto = original.replace(CLASES, (bloque) => {
    if (FONDO_OSCURO.test(bloque)) return bloque;
    let salida = bloque;

    // 1) `text-slate-400 dark:text-slate-400` → la base debe ser slate-500.
    salida = salida.replace(
      /\btext-slate-400\b(?=[^"'`]*\bdark:text-slate-400\b)/g,
      () => {
        correcciones++;
        return 'text-slate-500';
      }
    );

    // 2) `text-<tono>-600` con variante oscura explícita: se oscurece la base.
    for (const tono of TONOS) {
      const re = new RegExp(
        `\\btext-${tono}-600\\b(?![\\d])(?=[^"'\`]*\\bdark:text-${tono}-400\\b)`,
        'g'
      );
      salida = salida.replace(re, () => {
        correcciones++;
        return `text-${tono}-700`;
      });
    }

    return salida;
  });

  if (texto !== original) {
    await fs.writeFile(archivo, texto, 'utf8');
    modificados++;
    console.log(`  ${path.relative(RAIZ, archivo)}`);
  }
}

console.log(`\n${modificados} archivos actualizados · ${correcciones} clases corregidas`);
