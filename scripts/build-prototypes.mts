/**
 * Genera los prototipos de UI del sistema en `docs/prototipos/`.
 *
 * Entrada:
 *   docs/prototipos/_capturas/<slug>.html   (HTML real capturado del <main>)
 *   docs/prototipos/_capturas/shell.json     (sidebar + navbar reales)
 *   dist/assets/index-*.css                  (Tailwind v4 compilado)
 *
 * Salida:
 *   docs/prototipos/<slug>/prototipo.html    (standalone, navegable)
 *   docs/prototipos/<slug>/captura.png       (si existe)
 *   docs/prototipos/index.html               (índice con todos los módulos)
 *   docs/prototipos/assets/app.css           (CSS compilado)
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve('docs/prototipos');
// Las capturas crudas son intermedias: viven fuera del repositorio.
const CAP = path.join(os.tmpdir(), 'opencode', 'proto-capturas');

/** Catálogo de módulos: el orden y los nombres vienen de `shared/roles.ts`. */
const MODULOS = [
  { slug: 'login', carpeta: 'login', titulo: 'Inicio de sesión', grupo: 'Acceso', descripcion: 'Autenticación institucional del sistema.' },
  { slug: 'portal-inicio', carpeta: 'portal-inicio', titulo: 'Portal de Inicio y Cartelera', grupo: 'Portal', descripcion: 'Cartelera digital institucional, carrusel de eventos, comunicados y agenda.' },
  { slug: 'dashboard', carpeta: 'dashboard', titulo: 'Dashboard Operativo & Flota', grupo: 'Operaciones', descripcion: 'Métricas clave de flota, resumen del estado operativo y alertas rápidas.' },
  { slug: 'padron', carpeta: 'padron', titulo: 'Padrón Vehicular', grupo: 'Operaciones', descripcion: 'Padrón maestro, búsqueda avanzada, filtros e historial.' },
  { slug: 'nuevo', carpeta: 'nuevo', titulo: 'Registrar Nueva Unidad', grupo: 'Operaciones', descripcion: 'Alta de vehículos con placa, motor y documentación inicial.' },
  { slug: 'vehiculo-detalle', carpeta: 'vehiculo-detalle', titulo: 'Ficha de Vehículo', grupo: 'Operaciones', descripcion: 'Detalle de una unidad: propietario, conductor, documentos e historial.' },
  { slug: 'vehiculo-editar', carpeta: 'vehiculo-editar', titulo: 'Editar Vehículo', grupo: 'Operaciones', descripcion: 'Formulario de edición de un registro del padrón.' },
  { slug: 'personas', carpeta: 'personas', titulo: 'Directorio de Personas', grupo: 'Personal', descripcion: 'Padrón de propietarios y conductores con DNI, contacto y ficha técnica.' },
  { slug: 'curso-vial', carpeta: 'curso-vial', titulo: 'Conductores & Curso Vial', grupo: 'Personal', descripcion: 'Gestión del curso de educación vial anual y actas presenciales.' },
  { slug: 'directorio-contacto', carpeta: 'directorio-contacto', titulo: 'Directorio WhatsApp por Roles', grupo: 'Personal', descripcion: 'Directorio de contacto y comunicación vía WhatsApp según rol.' },
  { slug: 'vencimientos', carpeta: 'vencimientos', titulo: 'Alertas de Vencimiento', grupo: 'Control', descripcion: 'Monitoreo de SOAT/AFOCAT, CITV, licencias y cursos con semaforización.' },
  { slug: 'importar-exportar', carpeta: 'importar-exportar', titulo: 'Importar / Exportar', grupo: 'Control', descripcion: 'Carga masiva con diagnóstico y descarga de la base de datos.' },
  { slug: 'operario-portal', carpeta: 'operario-portal', titulo: 'Portal del Operario', grupo: 'Operario', descripcion: 'Ficha individual del operador, cámara fotográfica y reportes de unidad.' },
  { slug: 'historial', carpeta: 'historial', titulo: 'Historial de Auditoría', grupo: 'Administración', descripcion: 'Bitácora inmutable de modificaciones y trazabilidad.' },
  { slug: 'usuarios', carpeta: 'usuarios', titulo: 'Cuentas y Accesos', grupo: 'Administración', descripcion: 'Cuentas, asignación de roles y matriz de permisos.' },
  { slug: 'configuracion', carpeta: 'configuracion', titulo: 'Configuración & Empresa', grupo: 'Administración', descripcion: 'Personalización institucional, umbrales y almacenamiento.' },
  { slug: 'gestion-portal', carpeta: 'gestion-portal', titulo: 'Gestión de Cartelera & Portal', grupo: 'Administración', descripcion: 'Configuración de carrusel, multimedia, vigencia y agenda.' },
  { slug: 'backup-migracion', carpeta: 'backup-migracion', titulo: 'Backup & Migración Multi-BD', grupo: 'Administración', descripcion: 'Copias de seguridad en JSON y SQL para migración a cualquier base.' },
];

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Marca como activo el botón de navegación del módulo actual.
 *
 * El sidebar capturado llega con "Inicio & Cartelera" resaltado (porque así
 * estaba el sistema al capturarlo). Se quita ese resalte y se aplica al
 * botón que corresponde a cada prototipo.
 */
const NAV_LABEL: Record<string, string> = {
  'portal-inicio': 'Inicio &amp; Cartelera',
  dashboard: 'Dashboard Estadístico',
  padron: 'Padrón Vehicular',
  nuevo: 'Registrar Unidad',
  // La ficha y la edición son sub-vistas del padrón: resaltan su entrada.
  'vehiculo-detalle': 'Padrón Vehicular',
  'vehiculo-editar': 'Padrón Vehicular',
  personas: 'Directorio de Personas',
  'curso-vial': 'Conductores &amp; Curso Vial',
  'directorio-contacto': 'Directorio WhatsApp',
  vencimientos: 'Alertas de Vencimiento',
  'importar-exportar': 'Importar (PDF/Excel) &amp; Exportar',
  'operario-portal': 'Mi Unidad &amp; Fotos en Vivo',
  historial: 'Historial de Auditoría',
  usuarios: 'Cuentas y Accesos',
  configuracion: 'Configuración &amp; Empresa',
  'gestion-portal': 'Gestión de Cartelera &amp; Portal',
  'backup-migracion': 'Backup &amp; Migración BD',
};

/** Clases del botón de navegación activo en el sistema real. */
const ACTIVE_CLS = 'bg-blue-600 text-white shadow-xs font-bold dark:bg-blue-600';
/** Clases del botón de navegación inactivo en el sistema real. */
const IDLE_CLS =
  'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white';

function setActiveNav(aside: string, slug: string): string {
  const target = NAV_LABEL[slug];
  if (!target) return aside;

  return aside.replace(
    /<button class="(group flex w-full min-h-\[40px\][^"]*)"([^>]*)>([\s\S]*?)<\/button>/g,
    (full, cls: string, attrs: string, inner: string) => {
      const label = [...inner.matchAll(/<span[^>]*>([^<]{2,45})<\/span>/g)]
        .map((x) => x[1])
        .join(' ')
        .trim();

      // El objetivo se identifica por el prefijo del texto (evita depender del badge numérico)
      const isTarget = label.replace(/&amp;/g, '&').startsWith(target.replace(/&amp;/g, '&').split(' ').slice(0, 2).join(' '));
      const isActive = cls.includes('bg-blue-600');

      if (isTarget && !isActive) {
        const newCls = cls.replace(IDLE_CLS, ACTIVE_CLS);
        // El icono del item activo se pinta de blanco
        const newInner = inner.replace(
          /(<svg[^>]*class="lucide[^"]*")/g,
          '$1'
        ).replace(/text-slate-400 dark:text-slate-400/g, 'text-white');
        return `<button class="${newCls}"${attrs}>${newInner}</button>`;
      }
      if (!isTarget && isActive) {
        const newCls = cls.replace(ACTIVE_CLS, IDLE_CLS);
        const newInner = inner.replace(
          /class="(lucide[^"]*)"/g,
          'class="$1 text-slate-600 dark:text-slate-300"'
        );
        return `<button class="${newCls}"${attrs}>${newInner}</button>`;
      }
      return full;
    }
  );
}

async function main() {
  // ---------- CSS compilado ----------
  const assets = await fs.readdir(path.resolve('dist/assets'));
  const cssFile = assets.find((f) => f.endsWith('.css'));
  if (!cssFile) throw new Error('No se encontró el CSS compilado en dist/assets');
  const css = await fs.readFile(path.resolve('dist/assets', cssFile), 'utf8');

  await fs.mkdir(path.join(ROOT, 'assets'), { recursive: true });
  await fs.writeFile(path.join(ROOT, 'assets/app.css'), css, 'utf8');

  // ---------- Shell ----------
  const shell = JSON.parse(await fs.readFile(path.join(CAP, 'shell.json'), 'utf8'));

  // ---------- Prototipos por módulo ----------
  const generados: Array<{ slug: string; ok: boolean; bytes: number }> = [];

  for (const mod of MODULOS) {
    const src = path.join(CAP, `${mod.slug}.html`);
    let body = '';
    try {
      body = await fs.readFile(src, 'utf8');
    } catch {
      console.log(`AVISO  ${mod.slug}: sin captura`);
      continue;
    }

    const dir = path.join(ROOT, mod.carpeta);
    await fs.mkdir(dir, { recursive: true });

    // Es el login: página completa sin shell de aplicación.
    if (mod.slug === 'login') {
      const html = `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Prototipo · ${mod.titulo} · Padrón Vehicular</title>
<link rel="stylesheet" href="../assets/app.css" />
</head>
<body class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
${body}
</body>
</html>`;
      await fs.writeFile(path.join(dir, 'prototipo.html'), html, 'utf8');
    } else {
      const aside = setActiveNav(shell.aside, mod.slug);
      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Prototipo · ${mod.titulo} · Padrón Vehicular</title>
<link rel="stylesheet" href="../assets/app.css" />
</head>
<body class="h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
<div class="flex h-screen w-full overflow-hidden">
${aside}
<div class="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
${shell.header}
<main class="flex-1 overflow-y-auto px-3.5 pt-3.5 pb-28 sm:px-6 sm:pt-6 sm:pb-32 lg:px-8 lg:pt-8 lg:pb-8 max-w-full">
<div class="mx-auto max-w-7xl w-full min-w-0">
${body}
</div>
</main>
${shell.bottom}
</div>
</body>
</html>`;
      await fs.writeFile(path.join(dir, 'prototipo.html'), html, 'utf8');
    }

    // Copiar captura PNG si existe
    const png = path.join(CAP, `${mod.slug}.png`);
    try {
      await fs.copyFile(png, path.join(dir, 'captura.png'));
    } catch {
      /* sin png */
    }

    const size = (await fs.stat(path.join(dir, 'prototipo.html'))).size;
    generados.push({ slug: mod.slug, ok: true, bytes: size });
    console.log(`OK     ${mod.slug.padEnd(22)} ${String(size).padStart(8)}b`);
  }

  // ---------- Índice ----------
  const grupos = [...new Set(MODULOS.map((m) => m.grupo))];
  const tarjetas = grupos
    .map((g) => {
      const items = MODULOS.filter((m) => m.grupo === g)
        .map(
          (m) => `      <a class="card" href="./${m.carpeta}/prototipo.html">
        <div class="card-head">
          <span class="pill">${escapeHtml(m.grupo)}</span>
        </div>
        <h3>${escapeHtml(m.titulo)}</h3>
        <p>${escapeHtml(m.descripcion)}</p>
        <div class="links">
          <span class="go">Abrir →</span>
          <span class="l">HTML</span>
          <span class="l">Interactivo</span>
          <span class="l">SVG</span>
          <span class="l">WebP</span>
        </div>
      </a>`
        )
        .join('\n');
      return `    <section>
      <h2>${escapeHtml(g)}</h2>
      <div class="grid">
${items}
      </div>
    </section>`;
    })
    .join('\n');

  const indice = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Prototipos de UI · Padrón Vehicular</title>
<link rel="stylesheet" href="./assets/app.css" />
<style>
  body { background: #020617; color: #e2e8f0; }
  .wrap { max-width: 1180px; margin: 0 auto; padding: 40px 24px 80px; }
  header.top { display: flex; align-items: center; gap: 14px; margin-bottom: 8px; }
  .dot { width: 11px; height: 11px; border-radius: 50%; background: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,.2); }
  h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -.4px; color: #fff; }
  .sub { color: #64748b; font-size: 13px; margin: 6px 0 36px; }
  section { margin-bottom: 34px; }
  section h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.1px; color: #94a3b8; font-weight: 700; margin: 0 0 12px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(272px, 1fr)); gap: 14px; }
  .card {
    display: block; text-decoration: none; padding: 16px 18px 18px;
    background: rgba(30,41,59,.55); border: 1px solid rgba(51,65,85,.75);
    border-radius: 14px; transition: border-color .15s, transform .15s, background .15s;
  }
  .card:hover { border-color: #3b82f6; transform: translateY(-2px); background: rgba(30,41,59,.75); }
  .card-head { margin-bottom: 9px; }
  .pill { font-size: 9.5px; font-weight: 800; letter-spacing: .6px; text-transform: uppercase; color: #60a5fa; background: rgba(37,99,235,.14); border: 1px solid rgba(37,99,235,.3); padding: 3px 9px; border-radius: 999px; }
  .card h3 { margin: 0 0 6px; font-size: 14.5px; font-weight: 700; color: #fff; }
  .card p { margin: 0 0 12px; font-size: 12px; line-height: 17px; color: #94a3b8; }
  .go { font-size: 11.5px; font-weight: 700; color: #3b82f6; }
  .links { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .links .l {
    font-size: 9.5px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase;
    color: #64748b; background: #0f172a; border: 1px solid #1e293b;
    padding: 2px 7px; border-radius: 6px;
  }
  .links .go { margin-right: 4px; }
  footer { margin-top: 46px; padding-top: 22px; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; line-height: 19px; }
  footer a { color: #60a5fa; }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <span class="dot"></span>
    <h1>Prototipos de UI · Padrón Vehicular</h1>
  </header>
  <p class="sub">
    ${MODULOS.length} pantallas capturadas del sistema real · Asociación Central de Transportes en Mototaxis
  </p>
${tarjetas}
  <footer>
    <p style="margin:0 0 8px">
      Cada prototipo reproduce la <strong>UI real</strong> del módulo, capturada del sistema en ejecución
      con datos de demostración. Ábrelos como HTML autónomo en cualquier navegador.
    </p>
    <p style="margin:0">
      El código de cada vista está en <code>frontend/src/views/</code>. Para regenerar las capturas:
      <code>npm run prototipos:capturar</code> · Documentación en <code>docs/prototipos/README.md</code>.
    </p>
  </footer>
</div>
</body>
</html>`;

  await fs.writeFile(path.join(ROOT, 'index.html'), indice, 'utf8');
  console.log(`\nÍndice generado con ${MODULOS.length} prototipos.`);
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
