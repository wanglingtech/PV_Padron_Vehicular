# Capturas de pantalla

Esta carpeta almacera las capturas usadas en el README y en la documentación.

## Convención

- Formato **WebP** (no PNG: pesa entre un 45% y un 80% menos para la misma calidad visual).
- Ancho recomendado: **1440 px** (escritorio) y **390 px** (móvil).
- Nombres: `NN-modulo.webp`.
- No mostrar datos personales reales.

## Lista esperada

| Archivo | Módulo |
| :--- | :--- |
| `01-login.webp` | Inicio de sesión |
| `02-portal-inicio.webp` | Portal institucional |
| `03-dashboard.webp` | Dashboard estadístico |
| `04-padron.webp` | Padrón vehicular |
| `05-personas.webp` | Directorio de personas |
| `06-curso-vial.webp` | Conductores y curso vial |
| `07-vencimientos.webp` | Alertas de vencimiento |
| `08-importar-exportar.webp` | Importar / Exportar |
| `09-operario-portal.webp` | Portal del operario |
| `10-historial.webp` | Historial de auditoría |
| `11-usuarios.webp` | Cuentas y accesos |
| `12-configuracion.webp` | Configuración |
| `13-gestion-portal.webp` | Gestión del portal |
| `14-backup-migracion.webp` | Backup y migración |
| `15-directorio-whatsapp.webp` | Directorio WhatsApp |

## Cómo regenerarlas

### Opción A: duplicar los prototipos (recomendado para portafolio)

Las capturas finales ya existen en `docs/prototipos/<modulo>/captura.webp` con
datos simulados realistas. Solo cópialas a esta carpeta con el nombre indicado,
sin modificar ni borrar los archivos de origen:

```powershell
# Ejemplo: duplicar el prototipo del padrón
Copy-Item docs/prototipos/padron/captura.webp docs/screenshots/04-padron.webp
```

Haz lo mismo para los 15 módulos usando los nombres de la tabla de arriba. Los
prototipos se conservan intactos.

### Opción B: regenerar con Playwright

1. Arranca la app apuntando a la base de prototipos (puerto 3200):

   ```bash
   NODE_ENV=development SQL_DB_NAME=padron_vehicular_proto PORT=3200 \
     SEED_DEMO_DATA=true AUTH_DEV_MODE=true DISABLE_HMR=true npm run dev
   ```

2. Ejecuta la captura automatizada:

   ```bash
   npm run imagenes:capturar
   ```

   Esto genera PNGs temporales en `docs/screenshots/`, los convierte a WebP
   con `scripts/convert-images-webp.mts` y elimina los PNG.

> Las capturas de los prototipos de UI viven junto a cada módulo en
> `docs/prototipos/<modulo>/captura.webp` y se regeneran con
> `npm run prototipos:capturar`.
