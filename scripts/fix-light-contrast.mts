/**
 * Corrige el contraste de `text-slate-400` en modo claro.
 *
 * `text-slate-400` (#90a1b9) sobre un panel blanco da 2.63:1, por debajo del
 * 4.5:1 de WCAG AA. En modo oscuro sí funciona (7.8:1 sobre #0b0f19).
 *
 * La combinación correcta es `text-slate-500 dark:text-slate-400`:
 *   - claro:  #62748e sobre blanco  -> 4.64:1  (cumple)
 *   - oscuro: #94a3b8 sobre #0b0f19 -> 7.80:1  (cumple)
 *
 * Se Exceptúan las clases que viven sobre un fondo permanentemente oscuro
 * (por ejemplo `bg-slate-900`), donde `slate-400` ya cumple y oscurecerlo
 * empeoraría el contraste.
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

/** Fondos que son oscuros en ambos temas. */
const FONDO_OSCURO =
  /\bbg-(?:slate|gray|zinc|neutral|stone|black|blue|indigo|emerald|rose|red)-(?:800|900|950)\b/;

const CLASES = /((?:className|class)\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`))/g;

const archivos = await fuentes(RAIZ);
let modificados = 0;
let correcciones = 0;

for (const archivo of archivos) {
  const original = await fs.readFile(archivo, 'utf8');

  const texto = original.replace(CLASES, (bloque) => {
    // Si el bloque ya tiene una variante dark:, no se toca.
    if (/dark:text-slate-\d00/.test(bloque)) return bloque;
    // Si vive sobre un fondo permanentemente oscuro, slate-400 ya cumple.
    if (FONDO_OSCURO.test(bloque)) return bloque;

    const nuevo = bloque.replace(/\btext-slate-400\b/g, () => {
      correcciones++;
      return 'text-slate-500 dark:text-slate-400';
    });
    return nuevo;
  });

  if (texto !== original) {
    await fs.writeFile(archivo, texto, 'utf8');
    modificados++;
    console.log(`  ${path.relative(RAIZ, archivo)}`);
  }
}

console.log(`\n${modificados} archivos actualizados · ${correcciones} clases corregidas`);
