# Estrategia de pruebas

El proyecto cuenta con **pruebas automatizadas** (Vitest + Supertest) sobre una base de datos PostgreSQL **independiente** de la de desarrollo.

```bash
npm test        # ejecuta la suite completa
npm run test:watch   # modo interactivo
```

Estado actual: **48 pruebas en 6 archivos**, todas en verde.

---

## 1. Pirámide de pruebas

```text
        /\
       /E2E\        Playwright (flujos críticos, pocos)   → pendiente
      /------\
     /Integra-\     Supertest + PostgreSQL de prueba      ✅ implementado
    /----------\
   / Unitarias  \   Vitest (config, validaciones, entorno) ✅ implementado
  /--------------\
```

---

## 2. Infraestructura

| Pieza | Ubicación | Responsabilidad |
| :--- | :--- | :--- |
| Configuración | `vitest.config.ts` | Incluye `backend/__tests__/**/*.test.ts`, un solo worker y `isolate: false`. |
| Preparación global | `backend/__tests__/global-setup.ts` | Crea la base `padron_vehicular_test` (si no existe) y aplica el esquema con `drizzle-kit push`. |
| Entorno por archivo | `backend/__tests__/setup.ts` | Apunta `SQL_DB_NAME` a la base de pruebas y define un `JWT_SECRET` propio. |
| Utilidades | `backend/__tests__/helpers.ts` | `getApp()`, `login()` y `readCookie()`. |

### Base de datos de pruebas

- Nombre: `padron_vehicular_test` (configurable con `TEST_SQL_DB_NAME`).
- **Nunca** se toca la base de desarrollo: `setup.ts` fuerza `SQL_DB_NAME` antes de importar la app.
- La app se crea con `createApp()`, que además ejecuta el seed: las cuentas demo quedan disponibles para los tests.
- Los tests que escriben datos (usuarios, publicaciones, vehículos) **limpian al terminar** (`afterEach` / `afterAll`).

### Comandos

```bash
npm test                       # suite completa (crea la BD de pruebas si hace falta)
npx vitest run auth.test.ts    # un solo archivo
npx vitest                     # modo watch
```

---

## 3. Cobertura actual

| Archivo | Qué verifica |
| :--- | :--- |
| `health.test.ts` | Health check con base conectada y marca de tiempo ISO. |
| `auth.test.ts` | Login correcto/incorrecto, cookie `HttpOnly`, token Bearer, `401` sin credenciales, token manipulado, logout, cambio de contraseña. |
| `users.test.ts` | RBAC (`403` al operario), validación de contraseña (mínimo 8 caracteres), **nunca se expone el hash**, CRUD completo. |
| `vehicles.test.ts` | Listado, filtros, `404` inexistente, `400` id inválido, validación Zod en el alta, permisos de escritura. |
| `portal.test.ts` | Publicaciones y eventos públicos, permisos de escritura, publicación y eliminación. |
| `env.test.ts` | Reglas de seguridad: `JWT_SECRET` obligatorio en producción, cookies seguras, tokens `dev-*` deshabilitados en producción. |

Total: **48 pruebas**.

---

## 4. Qué falta

### Pruebas unitarias

- `shared/date-utils.ts` (semáforo de vencimientos).
- `backend/utils/validation.ts` (esquemas Zod).
- `frontend/src/utils/vehicle-routes.ts` (cálculo de rutas).

### Pruebas de integración adicionales

- `POST /api/vehicles/padron/swap` (transaccionalidad).
- `POST /api/import/preview` + `/api/import/confirm`.
- `POST /api/backup/export` y `/api/backup/restore`.
- `POST /api/drivers/courses/bulk-sync`.

### Pruebas E2E (Playwright)

- Login y cierre de sesión.
- Alta de vehículo y visualización en padrón.
- Edición y retiro de unidad.
- Intercambio de padrones y verificación del historial.
- Importación de un Excel de prueba.
- Creación de publicación y visualización en el portal.
- Navegación responsive (móvil/escritorio) y modo claro/oscuro.

```bash
npm install -D @playwright/test
npx playwright install
npx playwright test
```

---

## 5. Pruebas de API manuales (Bruno)

Carpeta: [`../api-tests/bruno/`](../../api-tests/bruno/)

| Request | Verifica |
| :--- | :--- |
| `health.bru` | API y base arriba. |
| `vehicles-list.bru` | Listado y paginación. |
| `vehicle-create.bru` | Alta y validación. |
| `vehicle-swap.bru` | Swap transaccional. |
| `persons-list.bru` | Directorio. |
| `dashboard-stats.bru` | Métricas. |
| `portal-posts.bru` | Portal público. |
| `audit-logs.bru` | Auditoría. |
| `auth-401.bru` | Rechazo sin credenciales. |

---

## 6. Accesibilidad

- `axe-core` en Playwright.
- Revisión manual con teclado (Tab/Shift+Tab/Enter/Esc).
- Contraste en modo claro y oscuro.
- Lectores de pantalla (NVDA/VoiceOver).

---

## 7. Rendimiento

- Lighthouse en build de producción.
- k6/Artillery para `GET /api/vehicles` con 10k registros.
- Medir tiempos de exportación Excel/PDF.

---

## 8. Matriz de pruebas manuales

| Área | Caso | Esperado |
| :--- | :--- | :--- |
| Arranque | `npm run dev` sin BD | Error claro y salida con código 1 |
| Arranque | `npm run dev` con BD | Health `database: up` |
| Padrón | Crear con placa duplicada | `409` |
| Padrón | Retirar sin motivo | `400` |
| Swap | Intercambiar padrones | Historial con 2 registros |
| Personas | DNI duplicado | `409` |
| Vencimientos | Documento vencido | Semáforo rojo |
| Importación | Excel con errores | Vista previa con detalle |
| Auth | Request sin token | `401` |
| Auth | Operario intenta borrar | `403` |
| Portal | Publicación inactiva | No visible públicamente |
| Backup | Exportar y restaurar | Datos consistentes |

---

## 9. Smoke test

El smoke test (`npm run smoke`) sigue siendo útil para validar una instancia **real** en ejecución (verifica cookie, Bearer, RBAC por rol y logout). Es complementario a la suite de Vitest:

```bash
npm run dev                       # en otra terminal
npm run smoke                     # apunta a http://localhost:3000
SMOKE_BASE_URL=http://localhost:3001 npm run smoke   # otra instancia
```

---

## 10. CI

El workflow [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) ejecuta:

1. `npm ci`
2. `npm run lint`
3. `npm run build`

Pendiente: añadir `npm test` con PostgreSQL como servicio y Playwright.

---

## 11. Criterio de "terminado"

- [x] `npm run lint` sin errores.
- [x] `npm run build` correcto.
- [x] Pruebas nuevas pasan (`npm test`).
- [ ] Caso manual verificado.
- [x] Documentación actualizada.
