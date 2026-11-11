/**
 * Verifica que cada captura HTML corresponde a la pantalla correcta.
 * Extrae los títulos (h1-h3) y una muestra de texto de cada archivo.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const DIR = path.join(os.tmpdir(), 'opencode', 'proto-capturas');

const ESPERADO: Record<string, string[]> = {
  login: ['Iniciar sesión'],
  'portal-inicio': ['Cartelera', 'Evento', 'Anuncio', 'Agenda', 'Comuni'],
  dashboard: ['Dashboard', 'Estadístico', 'Padrón', 'Total', 'Alerta'],
  padron: ['Padrón', 'Placa', 'Vehículo', 'Propietario', 'Registrar'],
  nuevo: ['Registrar', 'Nueva', 'Unidad', 'Vehículo'],
  'vehiculo-detalle': ['Propietario', 'Conductor', 'Historial', 'Padrón'],
  'vehiculo-editar': ['Editar', 'Registro', 'Padrón'],
  personas: ['Personas', 'DNI', 'Propietario', 'Conductor', 'Directorio'],
  'curso-vial': ['Curso', 'Vial', 'Conductor', 'Acta', 'Certificate'],
  'directorio-contacto': ['WhatsApp', 'Directorio', 'Contacto', 'Teléfono'],
  vencimientos: ['Vencimiento', 'SOAT', 'CITV', 'Control'],
  'importar-exportar': ['Importar', 'Exportar', 'Excel', 'PDF', 'Diagnóstico'],
  'operario-portal': ['Mi Unidad', 'Operario', 'Fotos', 'Unidad'],
  historial: ['Auditoría', 'Historial', 'Registro', 'Modificación'],
  usuarios: ['Usuarios', 'Cuentas', 'Rol', 'Permiso', 'Acceso'],
  configuracion: ['Configuración', 'Empresa', 'Membrete', 'Parámetros'],
  'gestion-portal': ['Cartelera', 'Portal', 'Carrusel', 'Multimedia'],
  'backup-migracion': ['Backup', 'Migración', 'JSON', 'SQL', 'Restaurar'],
};

const strip = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const files = (await fs.readdir(DIR)).filter((f) => f.endsWith('.html')).sort();

let fallos = 0;
for (const f of files) {
  const slug = f.replace(/\.html$/, '');
  const html = await fs.readFile(path.join(DIR, f), 'utf8');

  const titulos = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g)]
    .map((m: RegExpMatchArray) => strip(m[1]))
    .filter(Boolean)
    .slice(0, 6);

  const texto = strip(html);
  const esperados = ESPERADO[slug] ?? [];
  const faltan = esperados.filter((e: string) => !texto.toLowerCase().includes(e.toLowerCase()));

  const ok = faltan.length === 0;
  if (!ok) fallos++;

  console.log(`${ok ? 'OK  ' : 'AVISO'} ${slug.padEnd(22)} ${String(html.length).padStart(7)}b`);
  if (titulos.length) console.log(`        titulos: ${titulos.join(' | ').slice(0, 120)}`);
  if (!ok) console.log(`        no encontro: ${faltan.join(', ')}`);
}

console.log(`\n${files.length} capturas · ${fallos} con palabras faltantes`);
