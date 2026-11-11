# Prototipos de UI · Padrón Vehicular

Prototipos de todas las pantallas del **Sistema de Padrón Vehicular**.

Cada prototipo reproduce la **UI real** del módulo: no son rediseños inventados, sino
el HTML que el sistema genera, capturado de la aplicación en ejecución con datos de
demostración.

## Ver los prototipos

```bash
npm run prototipos:servir
```

Abre <http://localhost:4321/> (índice con todos los módulos agrupados por categoría).

## Archivos de cada módulo

Cada carpeta contiene cuatro piezas:

| Archivo | Qué es |
| :--- | :--- |
| `prototipo.html` | Captura estática y fiel, con el shell real (sidebar, navbar). Se abre con doble clic. |
| `interactivo.html` | Versión navegable: tema claro/oscuro, vista escritorio/móvil, ficha del módulo y navegación entre los 18 módulos. |
| `prototipo.svg` | Vector editable con formas y texto reales. Se arrastra a Figma y entra como capas. |
| `captura.webp` | La pantalla completa como imagen (formato WebP, lightweight). |

## Estructura

```
docs/prototipos/
├── index.html                    Índice visual de todos los módulos
├── serve.mjs                     Servidor estático
├── assets/app.css                Tailwind v4 compilado (del build real)
├── login/                        + interactivo.html y prototipo.svg
├── portal-inicio/     dashboard/      padron/         nuevo/
├── vehiculo-detalle/  vehiculo-editar/ personas/      curso-vial/
├── directorio-contacto/ vencimientos/ importar-exportar/ operario-portal/
└── historial/          usuarios/      configuracion/  gestion-portal/
                         backup-migracion/
```

## Cómo se generaron

Los prototipos se **capturan del sistema real**, no se escriben a mano:

1. **Base de datos separada** — `padron_vehicular_proto`. Tus datos en
   `padron_vehicular` nunca se tocan. Contiene 20 personas, 24 vehículos con
   propietarios, conductores, SOAT, CITV, cursos, licencias, historial de padrón,
   solicitudes de cambio, auditoría, cartelera y agenda.

2. **Captura por CDP** — `scripts/capture-prototypes.mts` conduce Chrome por el
   Chrome DevTools Protocol (sin dependencias nuevas), recorre el sidebar, y guarda
   el HTML de cada `<main>` más el shell (sidebar + navbar).

3. **Construcción** — `scripts/build-prototypes.mts` ensambla cada módulo con su
   shell, marca la entrada correcta del sidebar como activa y genera el índice.

### Regenerar

```bash
# 1. Base de prototipos (solo la primera vez)
npm run prototipos:db:crear
$env:SQL_DB_NAME="padron_vehicular_proto"; npm run db:push
npm run prototipos:db:semear

# 2. Build de producción (la captura usa el build, no el dev server:
#    el HMR de Vite reinicia la página y corta la captura)
npm run build

# 3. App de prototipos en otra base y otro puerto
$env:NODE_ENV="production"; $env:SQL_DB_NAME="padron_vehicular_proto"; $env:PORT="3200"
$env:ALLOW_DEMO_ACCOUNTS="true"; $env:JWT_SECRET="proto-secret-only-for-captures-32chars"
node dist/server.cjs

# 4. Capturar y construir (en otra terminal)
node scripts/capture-sink.mjs 4399
npm run prototipos:capturar     # HTML + capturas PNG
npm run prototipos:construir    # prototipo.html + índice
npm run prototipos:svg          # prototipo.svg por módulo
npm run prototipos:interactivo  # interactivo.html por módulo
npm run imagenes:webp           # convierte las capturas a WebP
```

Las capturas crudas quedan en `%TEMP%/opencode/proto-capturas/` (fuera del repo).

### Verificar

```bash
npx tsx scripts/verify-captures.mts
```

Confirma que cada captura corresponde a la pantalla correcta (extrae los `h1`–`h3`).

## Sobre el SVG

El SVG se genera recorriendo el DOM renderizado y reconstruyendo cada elemento con
sus colores y tipografías reales. Por eso:

- Los colores son exactos (se leen del canvas, no se parsean a mano: Tailwind v4 usa
  `oklch()`, que no es trivial de convertir).
- El texto llega como **texto editable**, no como curvas.
- Los iconos y gráficos de recharts se conservan como vectores.

Los gráficos con tooltip flotante (recharts) se capturan sin el tooltip, que solo
existe en hover.

## Importar en Figma

La API REST de Figma **no permite crear archivos ni nodos de diseño**: no existe
`POST /v1/files` ni ningún endpoint de escritura de frames (verificado contra el
OpenAPI oficial `figma/rest-api-spec`). Figma solo crea contenido de diseño desde su
Plugin API o su UI.

Opciones:

- **`prototipo.svg`** de cada módulo → arrastrar a Figma como vector editable.
- **`captura.webp`** → arrastrar como referencia visual.
- Con un `file_key` de un archivo Figma tuyo, la API sí permite escribir **variables**
  (tokens de diseño), **comentarios** y **dev resources**:
  `POST /v1/files/{key}/variables`, `POST /v1/files/{key}/comments`, `POST /v1/dev_resources`.
  El scope OAuth actual (`file_content:read`) limita la escritura a esos recursos.
