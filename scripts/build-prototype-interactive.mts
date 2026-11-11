/**
 * Genera la versión interactiva de cada prototipo.
 *
 * A diferencia de `prototipo.html` (captura estática fiel), el interactivo
 * permite:
 *   - Cambiar entre tema claro y oscuro.
 *   - Cambiar entre vista de escritorio y móvil.
 *   - Recorrer las secciones del módulo.
 *   - Consultar la ficha del módulo (rol, descripción, componentes).
 *
 * Se construye sobre el mismo HTML capturado, así que el resultado es
 * visualmente idéntico al sistema real.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const CAP = path.join(os.tmpdir(), 'opencode', 'proto-capturas');
const OUT = path.resolve('docs/prototipos');

/** Catálogo de módulos: el orden y los nombres vienen de `shared/roles.ts`. */
const MODULOS = [
  { slug: 'login', carpeta: 'login', titulo: 'Inicio de sesión', grupo: 'Acceso', descripcion: 'Autenticación institucional del sistema.', roles: 'Todos', nav: null },
  { slug: 'portal-inicio', carpeta: 'portal-inicio', titulo: 'Portal de Inicio y Cartelera', grupo: 'Portal', descripcion: 'Cartelera digital institucional, carrusel de eventos, comunicados oficiales y agenda.', roles: 'Todos', nav: 'Inicio & Cartelera' },
  { slug: 'dashboard', carpeta: 'dashboard', titulo: 'Dashboard Operativo & Flota', grupo: 'Operaciones', descripcion: 'Métricas clave de flota, resumen de estado operativo y alertas rápidas.', roles: 'Todos', nav: 'Dashboard Estadístico' },
  { slug: 'padron', carpeta: 'padron', titulo: 'Padrón Vehicular', grupo: 'Operaciones', descripcion: 'Padrón maestro, búsqueda avanzada, filtros, exportaciones e historial.', roles: 'Todos', nav: 'Padrón Vehicular' },
  { slug: 'nuevo', carpeta: 'nuevo', titulo: 'Registrar Nueva Unidad', grupo: 'Operaciones', descripcion: 'Alta de vehículos en padrón, registro de placa, motor y documentación inicial.', roles: 'Registrador', nav: 'Registrar Unidad' },
  { slug: 'vehiculo-detalle', carpeta: 'vehiculo-detalle', titulo: 'Ficha de Vehículo', grupo: 'Operaciones', descripcion: 'Detalle de una unidad: propietario, conductor, documentos e historial.', roles: 'Todos', nav: 'Padrón Vehicular' },
  { slug: 'vehiculo-editar', carpeta: 'vehiculo-editar', titulo: 'Editar Vehículo', grupo: 'Operaciones', descripcion: 'Formulario de edición de un registro del padrón.', roles: 'Registrador', nav: 'Padrón Vehicular' },
  { slug: 'personas', carpeta: 'personas', titulo: 'Directorio de Personas', grupo: 'Personal', descripcion: 'Padrón de propietarios y conductores con DNI, contacto y ficha técnica.', roles: 'Todos', nav: 'Directorio de Personas' },
  { slug: 'curso-vial', carpeta: 'curso-vial', titulo: 'Conductores & Curso Vial', grupo: 'Personal', descripcion: 'Gestión del curso de educación vial anual, actas presenciales y sincronización.', roles: 'Todos', nav: 'Conductores & Curso Vial' },
  { slug: 'directorio-contacto', carpeta: 'directorio-contacto', titulo: 'Directorio WhatsApp por Roles', grupo: 'Personal', descripcion: 'Directorio de contacto telefónico y comunicación directa vía WhatsApp entre conductores, administradores y asociados según rol.', roles: 'Todos', nav: 'Directorio WhatsApp' },
  { slug: 'vencimientos', carpeta: 'vencimientos', titulo: 'Alertas de Vencimiento', grupo: 'Control', descripcion: 'Monitoreo de SOAT/AFOCAT, CITV, Licencias y Cursos con semaforización.', roles: 'Fiscalizador', nav: 'Alertas de Vencimiento' },
  { slug: 'importar-exportar', carpeta: 'importar-exportar', titulo: 'Importar / Exportar', grupo: 'Control', descripcion: 'Carga masiva diagnóstica de archivos Excel y descarga de base de datos.', roles: 'Tesorero', nav: 'Importar (PDF/Excel) & Exportar' },
  { slug: 'operario-portal', carpeta: 'operario-portal', titulo: 'Portal del Operario', grupo: 'Operario', descripcion: 'Ficha individual del operador/conductor, cámara fotográfica y reportes de unidad.', roles: 'Operario', nav: 'Mi Unidad & Fotos en Vivo' },
  { slug: 'historial', carpeta: 'historial', titulo: 'Historial de Auditoría', grupo: 'Administración', descripcion: 'Bitácora inmutable de modificaciones, canjes de padrón y trazabilidad.', roles: 'Todos', nav: 'Historial de Auditoría' },
  { slug: 'usuarios', carpeta: 'usuarios', titulo: 'Cuentas y Accesos', grupo: 'Administración', descripcion: 'Creación de cuentas, asignación de roles y configuración de matriz de permisos.', roles: 'Administrador', nav: 'Cuentas y Accesos' },
  { slug: 'configuracion', carpeta: 'configuracion', titulo: 'Configuración & Empresa', grupo: 'Administración', descripcion: 'Personalización institucional de membrete, base de datos y parámetros del sistema.', roles: 'Administrador', nav: 'Configuración & Empresa' },
  { slug: 'gestion-portal', carpeta: 'gestion-portal', titulo: 'Gestión de Cartelera & Portal', grupo: 'Administración', descripcion: 'Configuración de carrusel, multimedia, estados de vigencia, orden y agenda de eventos.', roles: 'Secretaría', nav: 'Gestión de Cartelera & Portal' },
  { slug: 'backup-migracion', carpeta: 'backup-migracion', titulo: 'Backup & Migración Multi-BD', grupo: 'Administración', descripcion: 'Copias de seguridad completas en JSON y SQL para migración a cualquier base de datos o plataforma.', roles: 'Administrador', nav: 'Backup & Migración BD' },
];

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** CSS compartido por todos los interactivos. */
const CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #020617;
    color: #e2e8f0;
    -webkit-font-smoothing: antialiased;
  }

  /* ---------- Barra de control ---------- */
  .ctl {
    position: sticky; top: 0; z-index: 60;
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
    padding: 10px 16px;
    background: rgba(2,6,23,.94);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #1e293b;
  }
  .ctl-title { display: flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 700; color: #fff; }
  .ctl-title .dot { width: 9px; height: 9px; border-radius: 50%; background: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.2); }
  .ctl-group { display: flex; align-items: center; gap: 7px; }
  .ctl-label { font-size: 9.5px; text-transform: uppercase; letter-spacing: .9px; color: #64748b; font-weight: 700; }
  .seg { display: inline-flex; background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 2px; gap: 2px; }
  .seg button {
    appearance: none; border: 0; background: transparent; color: #94a3b8;
    font: inherit; font-size: 11px; font-weight: 600;
    padding: 5px 10px; border-radius: 8px; cursor: pointer; transition: background .14s, color .14s;
    white-space: nowrap;
  }
  .seg button:hover { color: #f1f5f9; }
  .seg button[aria-pressed="true"] { background: #2563eb; color: #fff; }
  .ctl-spacer { flex: 1; }
  .ctl select {
    background: #0f172a; color: #e2e8f0; border: 1px solid #334155;
    border-radius: 10px; padding: 6px 10px; font: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer;
  }

  /* ---------- Layout ---------- */
  .layout { display: grid; grid-template-columns: minmax(0,1fr) 290px; align-items: start; }
  @media (max-width: 1080px) { .layout { grid-template-columns: 1fr; } .side { border-left: 0 !important; border-top: 1px solid #1e293b; } }

  .stage { padding: 22px; overflow: auto; }
  .frame-wrap {
    margin: 0 auto;
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #334155;
    box-shadow: 0 30px 80px -20px rgba(0,0,0,.75);
    overflow: hidden;
    transition: width .25s ease, max-width .25s ease;
  }
  body.dark .frame-wrap { background: #0f172a; }
  .frame-wrap.movil { width: 390px; max-width: 100%; }
  .frame-inner { height: 860px; overflow: hidden; position: relative; }
  .frame-inner > * { height: 100%; }

  /* Botón de vuelta al índice */
  .ctl-back {
    display: inline-flex; align-items: center; gap: 6px;
    background: #0f172a; border: 1px solid #334155; color: #e2e8f0;
    font: inherit; font-size: 11px; font-weight: 600;
    padding: 6px 12px; border-radius: 10px; cursor: pointer; text-decoration: none;
  }
  .ctl-back:hover { border-color: #3b82f6; color: #fff; }

  /* ---------- Panel lateral ---------- */
  .side {
    position: sticky; top: 52px; max-height: calc(100vh - 52px); overflow-y: auto;
    border-left: 1px solid #1e293b; background: #020617; padding: 20px 18px 48px;
  }
  .side h2 { margin: 0 0 3px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; }
  .side .sub { margin: 0 0 18px; font-size: 11.5px; color: #64748b; }
  .side section { margin-bottom: 22px; }
  .side h3 { margin: 0 0 9px; font-size: 10.5px; font-weight: 700; color: #cbd5e1; display: flex; align-items: center; gap: 7px; }
  .side h3::after { content: ""; flex: 1; height: 1px; background: #1e293b; }
  .side table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  .side td { padding: 5px 0; vertical-align: top; color: #94a3b8; }
  .side td:first-child { color: #cbd5e1; font-weight: 600; width: 44%; }
  .pill { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 9px; border-radius: 999px;
    background: rgba(37,99,235,.15); color: #60a5fa; border: 1px solid rgba(37,99,235,.3); }
  .mod-list { list-style: none; margin: 0; padding: 0; }
  .mod-list a {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 9px; border-radius: 8px; text-decoration: none;
    color: #94a3b8; font-size: 11.5px; font-weight: 600; transition: background .14s, color .14s;
  }
  .mod-list a:hover { background: #1e293b; color: #fff; }
  .mod-list a.active { background: #2563eb; color: #fff; }
  .mod-list .g { font-size: 9px; text-transform: uppercase; letter-spacing: .5px; color: #475569; }
  .mod-list a.active .g { color: rgba(255,255,255,.7); }
  .mod-list .dot { width: 5px; height: 5px; border-radius: 50%; background: #334155; flex: none; }
  .mod-list a.active .dot { background: #fff; }
  .hint { font-size: 11px; line-height: 16px; color: #64748b; }
  .hint code { font-family: ui-monospace, Menlo, monospace; font-size: 10.5px; color: #60a5fa; background: rgba(37,99,235,.1); padding: 1px 5px; border-radius: 4px; }
`;

async function main() {
  const shell = JSON.parse(await fs.readFile(path.join(CAP, 'shell.json'), 'utf8'));

  for (const mod of MODULOS) {
    let body = '';
    try {
      body = await fs.readFile(path.join(CAP, `${mod.slug}.html`), 'utf8');
    } catch {
      console.log(`AVISO  ${mod.slug}: sin captura`);
      continue;
    }

    const esLogin = mod.slug === 'login';

    const listaConActivo = MODULOS.map((m) => {
      const activo = m.slug === mod.slug ? ' active' : '';
      return `          <li><a href="../${m.carpeta}/interactivo.html" class="${activo.trim()}"><span class="dot"></span><span>${esc(m.titulo)}</span></a></li>`;
    }).join('\n');

    // El HTML capturado viene del interior de <main>: se reenvuelve con las
    // mismas clases de layout que usa el sistema real.
    const contenido = esLogin
      ? `<div class="frame-inner p-0">${body}</div>`
      : `<div class="frame-inner"><main class="h-full overflow-y-auto px-3.5 pt-3.5 pb-28 sm:px-6 sm:pt-6 sm:pb-32 lg:px-8 lg:pt-8 lg:pb-8 max-w-full"><div class="mx-auto max-w-7xl w-full min-w-0">${body}</div></main></div>`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Interactivo · ${esc(mod.titulo)} · Padrón Vehicular</title>
<link rel="stylesheet" href="../assets/app.css" />
<style>${CSS}</style>
</head>
<body class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

<div class="ctl">
  <div class="ctl-title"><span class="dot"></span>${esc(mod.titulo)}</div>
  <span class="pill">${esc(mod.grupo)}</span>

  <div class="ctl-group">
    <span class="ctl-label">Tema</span>
    <div class="seg" id="segTema">
      <button data-tema="light" aria-pressed="true">Claro</button>
      <button data-tema="dark" aria-pressed="false">Oscuro</button>
    </div>
  </div>

  <div class="ctl-group">
    <span class="ctl-label">Vista</span>
    <div class="seg" id="segVista">
      <button data-vista="desktop" aria-pressed="true">Escritorio</button>
      <button data-vista="movil" aria-pressed="false">Móvil</button>
    </div>
  </div>

  <div class="ctl-spacer"></div>

  <div class="ctl-group">
    <span class="ctl-label">Ir a</span>
    <select id="selModulo">
${MODULOS.map((m) => `      <option value="../${m.carpeta}/interactivo.html"${m.slug === mod.slug ? ' selected' : ''}>${esc(m.titulo)}</option>`).join('\n')}
    </select>
  </div>
  <a class="ctl-back" href="../index.html">← Índice</a>
</div>

<div class="layout">
  <div class="stage">
    <div class="frame-wrap" id="frameWrap">
      ${contenido}
    </div>
  </div>

  <aside class="side">
    <h2>Ficha del módulo</h2>
    <p class="sub">${esc(mod.descripcion)}</p>

    <section>
      <h3>Acceso</h3>
      <table>
        <tr><td>Categoría</td><td>${esc(mod.grupo)}</td></tr>
        <tr><td>Roles con acceso</td><td>${esc(mod.roles)}</td></tr>
        <tr><td>Módulo en el menú</td><td>${mod.nav ? esc(mod.nav) : '—'}</td></tr>
        <tr><td>Vista</td><td>${mod.nav ? 'Tab del sidebar' : 'Pantalla de acceso'}</td></tr>
      </table>
    </section>

    <section>
      <h3>Interacciones</h3>
      <p class="hint">
        Usa <code>Tab</code> para recorrer los controles, <code>Enter</code> para activar.
        El prototipo refleja la UI real: los botones que en el sistema disparan
        acciones siguen siendo inertes aquí.
      </p>
    </section>

    <section>
      <h3>Archivos</h3>
      <table>
        <tr><td>Captura estática</td><td><a href="prototipo.html" style="color:#60a5fa">prototipo.html</a></td></tr>
        <tr><td>Vector Figma</td><td><a href="prototipo.svg" style="color:#60a5fa">prototipo.svg</a></td></tr>
        <tr><td>Imagen</td><td><a href="captura.webp" style="color:#60a5fa">captura.webp</a></td></tr>
      </table>
    </section>

    <section>
      <h3>Todos los módulos</h3>
      <ul class="mod-list">
${listaConActivo}
      </ul>
    </section>
  </aside>
</div>

<script>
  // Tema
  const segTema = document.getElementById('segTema');
  segTema.querySelectorAll('button').forEach(b => {
    b.onclick = () => {
      segTema.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      const oscuro = b.dataset.tema === 'dark';
      document.documentElement.classList.toggle('dark', oscuro);
      document.body.classList.toggle('dark', oscuro);
    };
  });

  // Vista
  const wrap = document.getElementById('frameWrap');
  const segVista = document.getElementById('segVista');
  segVista.querySelectorAll('button').forEach(b => {
    b.onclick = () => {
      segVista.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      wrap.classList.toggle('movil', b.dataset.vista === 'movil');
    };
  });

  // Navegación
  document.getElementById('selModulo').onchange = (e) => { location.href = e.target.value; };
</script>
</body>
</html>
`;

    const dir = path.join(OUT, mod.carpeta);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'interactivo.html'), html, 'utf8');

    const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
    console.log(`OK  ${mod.slug.padEnd(22)} ${kb.padStart(6)} KB`);
  }
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
