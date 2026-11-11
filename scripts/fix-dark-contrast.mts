/**
 * Añade la variante de modo oscuro a las clases `text-slate-500`.
 *
 * En modo oscuro, `text-slate-500` (#62748e) sobre el fondo de la app
 * (#0b0f19) da un contraste de 4.01:1, por debajo del 4.5:1 que exige
 * WCAG AA. `dark:text-slate-400` (#94a3b8) sí lo cumple.
 *
 * Solo se toca lo que falta: si la misma cadena de clases ya tiene una
 * variante `dark:text-slate-*`, se respeta.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const RAIZ = path.resolve('frontend/src');

async function tsx(dir: string, acc: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await tsx(full, acc);
    else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

const archivos = await tsx(RAIZ);
let totalModificados = 0;
let totalOcurrencias = 0;

// Una cadena de clases: содержит последовательность className="..." o className={...}
const CLASES = /((?:className|class)\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`))/g;

for (const archivo of archivos) {
  const original = await fs.readFile(archivo, 'utf8');

  const texto = original.replace(CLASES, (todo, bloque) => {
    let cambios = 0;

    // 1) `text-slate-500 dark:text-slate-500` → slate-500 también falla en oscuro.
    const nuevo1 = bloque.replace(
      /text-slate-500(\s+)dark:text-slate-500\b/g,
      (_m: string, sep: string) => {
        cambios++;
        return `text-slate-500${sep}dark:text-slate-400`;
      }
    );

    // 2) `text-slate-500` sin ninguna variante dark: en la misma cadena.
    const nuevo2 = nuevo1.replace(/text-slate-500\b/g, (m: string, offset: number) => {
      // ¿Hay ya un dark:text-slate-* más adelante en esta misma cadena?
      const resto = nuevo1.slice(offset);
      const fin = resto.search(/["'`]/);
      const tramo = fin === -1 ? resto : resto.slice(0, fin);
      if (/dark:text-slate-\d00/.test(tramo)) return m;

      cambios++;
      return 'text-slate-500 dark:text-slate-400';
    });

    if (cambios > 0) totalOcurrencias += cambios;
    return cambios > 0 ? nuevo2 : bloque;
  });

  if (texto !== original) {
    await fs.writeFile(archivo, texto, 'utf8');
    totalModificados++;
    console.log(`  ${path.relative(RAIZ, archivo)}`);
  }
}

console.log(
  `\n${totalModificados} archivos actualizados · ${totalOcurrencias} clases corregidas`
);
