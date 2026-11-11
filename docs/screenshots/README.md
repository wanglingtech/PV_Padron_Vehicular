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

1. Arranca la app con datos de demostración:

   ```bash
   npm run dev
   ```

2. Abre <http://localhost:3000> en un navegador a 1440 px de ancho.
3. Captura cada módulo desde el menú lateral.
4. Guarda con el nombre indicado en esta carpeta.
5. Convierte a WebP:

   ```bash
   npx tsx scripts/convert-images-webp.mts
   ```

   El script usa el codificador nativo de Chrome (sin dependencias nuevas) y
   elimina el PNG original al terminar.

> Las capturas de los prototipos de UI viven junto a cada módulo en
> `docs/prototipos/<modulo>/captura.webp` y se regeneran con
> `npm run prototipos:capturar`.
