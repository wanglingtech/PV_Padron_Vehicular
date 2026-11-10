# Pruebas de API

Colección [Bruno](https://www.usebruno.com/) para probar la API REST del Sistema de Padrón Vehicular.

## Requisitos

- [Bruno](https://www.usebruno.com/downloads) instalado.
- API en ejecución (`npm run dev`).
- Base de datos con el esquema aplicado (`npm run db:push`).

## Uso

1. Abre Bruno → **Open Collection**.
2. Selecciona la carpeta `api-tests/bruno`.
3. Elige el entorno **local**.
4. Ejecuta las carpetas en orden:
   - `01-salud`
   - `02-auth`
   - `03-vehiculos`
   - `04-personas`
   - `05-dashboard`
   - `06-portal`
   - `07-auditoria`

## Entornos

| Entorno | Base URL | Autenticación |
| :--- | :--- | :--- |
| `local` | `http://localhost:3000` | Login real (`admin@transporte.pe` / `admin123`) o tokens `dev-*` |
| `production` | Tu API | `POST /api/auth/login` y Bearer devuelto |

> Los tokens `dev-*` solo funcionan con `AUTH_DEV_MODE=true` o `NODE_ENV!=production`. En cualquier otro caso usa el Bearer de `/api/auth/login`.

## Notas

- `create.bru` usa `TEST-001` / `TST-001`; cámbialos si ya existen.
- `swap.bru` requiere al menos 2 vehículos con IDs válidos.
- Los tests son tolerantes a estados esperados (`200/400/404/409`) para poder ejecutarse sobre una base vacía.
- No incluyas datos reales en las peticiones.

## Postman

Si prefieres Postman, puedes importar los archivos `.bru` manualmente o crear una colección equivalente con las mismas rutas documentadas en [`../docs/API.md`](../docs/API.md).
