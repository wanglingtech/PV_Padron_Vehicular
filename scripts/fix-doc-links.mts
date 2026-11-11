/**
 * Ajusta los enlaces tras mover `docs/*.md` a `docs/markdown/`.
 *
 * Reglas:
 *  1. Las referencias `docs/ARCHIVO.md` pasan a `docs/markdown/ARCHIVO.md`.
 *  2. Las referencias relativas que subían un nivel (`../x`) suben dos
 *     (`../../x`), porque el archivo está un nivel más profundo.
 *  3. Las referencias entre archivos de `docs/markdown/` no cambian.
 *  4. Las rutas `docs/prototipos/` y `docs/screenshots/` no cambian.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const RAIZ = process.cwd();

/** Archivos .md de todo el repositorio (excepto node_modules y dist). */
async function mds(dir: string, acc: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (['node_modules', 'dist', '.git', 'drizzle'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await mds(full, acc);
    else if (e.name.toLowerCase().endsWith('.md')) acc.push(full);
  }
  return acc;
}

const ARCHIVOS_MD = await mds(RAIZ);
const EN_MD_DIR = path.join(RAIZ, 'docs', 'markdown');

let cambios = 0;

for (const abs of ARCHIVOS_MD) {
  const original = await fs.readFile(abs, 'utf8');
  const enMarkdownDir = path.dirname(abs) === EN_MD_DIR;
  let texto = original;

  if (enMarkdownDir) {
    // 1) Enlaces que subían un nivel ahora suben dos.
    texto = texto.replace(/\]\(\.\.\//g, '](../..//');
    texto = texto.replace(/\]\(\.\.\/\.\.\//g, '](../../');
    // 2) Referencias `docs/ARCHIVO.md` → `docs/markdown/ARCHIVO.md`
    texto = texto.replace(/docs\/(?!markdown\/|prototipos\/|screenshots\/)([A-Z][A-Z_0-9]*\.md)/g, 'docs/markdown/$1');
  } else {
    // Desde fuera de docs/markdown: `docs/ARCHIVO.md` → `docs/markdown/ARCHIVO.md`
    texto = texto.replace(/docs\/(?!markdown\/|prototipos\/|screenshots\/)([A-Z][A-Z_0-9]*\.md)/g, 'docs/markdown/$1');
  }

  // 3) Imágenes PNG de docs/screenshots → WebP
  texto = texto.replace(/docs\/screenshots\/([a-z0-9-]+)\.png/g, 'docs/screenshots/$1.webp');
  // 4) Capturas de prototipos: PNG → WebP
  texto = texto.replace(/captura\.png/g, 'captura.webp');

  if (texto !== original) {
    await fs.writeFile(abs, texto, 'utf8');
    cambios++;
    console.log('actualizado:', path.relative(RAIZ, abs));
  }
}

console.log(`\n${cambios} archivos actualizados de ${ARCHIVOS_MD.length} revisados.`);
