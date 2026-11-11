# Estrategia de pruebas

El proyecto cuenta con **pruebas automatizadas** (Vitest + Supertest) sobre una base de datos PostgreSQL **independiente** de la de desarrollo.

```bash
npm test              # suite completa
npm run test:watch    # modo interactivo
npm run test:coverage # suite con informe de cobertura
npm run test:e2e      # flujos E2E con Playwright
```

Estado actual: **277 pruebas en 18 archivos** (Vitest + Supertest) y **10 flujos E2E** (Playwright), todo en verde.

---

## 1. Pirámide de pruebas

```text
        /\
       /E2E\        Playwright (flujos críticos)            ✅ 10 pruebas
      /------\
     /Integra-\     Supertest + PostgreSQL de prueba        ✅ implementado
    /----------\
   / Unitarias  \   Vitest (fechas, validación, Excel, etc.)✅ implementado
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
| E2E | `playwright.config.ts` + `e2e/flujos.spec.ts` | Arranca la app real en el puerto **3100** contra `padron_vehicular_test`. |

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
npm run test:e2e               # E2E en el puerto 3100 (no toca la base real)
```

---

## 3. Cobertura actual

| Archivo | Qué verifica |
| :--- | :--- |
| `health.test.ts` | Health check con base conectada y marca de tiempo ISO. |
| `auth.test.ts` | Login correcto/incorrecto, cookie `HttpOnly`, token Bearer, `401` sin credenciales, token manipulado, logout, cambio de contraseña. |
| `password-reset.test.ts` | Solicitud de enlace, token de un solo uso, expiración, invalidación de tokens previos y respuesta idéntica exista o no la cuenta. |
| `users.test.ts` | RBAC (`403` al operario), validación de contraseña (mínimo 8 caracteres), **nunca se expone el hash**, CRUD completo. |
| `admin.test.ts` | Alta de administrador real y reglas de producción. |
| `vehicles.test.ts` | Listado, filtros, `404` inexistente, `400` id inválido, validación Zod en el alta, permisos de escritura. |
| `vehicles-queries.test.ts` | Consultas y paginación del padrón. |
| `padron-changes.test.ts` | Reasignación, intercambio y trazabilidad de padrones. |
| `write-routes.validation.test.ts` | Zod en todas las rutas de escritura: cuerpos incompletos, tipos erróneos y campos desconocidos. |
| `write-routes.happy-path.test.ts` | Camino feliz de las rutas de escritura principales. |
| `validation.test.ts` | Esquemas Zod y mensajes de error en español. |
| `date-utils.test.ts` | Semáforo de vencimientos y estado documental del vehículo. |
| `excel-handler.test.ts` | Previsualización, clasificación, conflictos y exportación Excel con ExcelJS. |
| `upload.service.test.ts` | Tipo, tamaño, nombre seguro y firma binaria de los archivos subidos. |
| `ai-document.test.ts` | Validación de documentos para IA y diagnóstico de filas extraídas de PDF. |
| `backup-service.test.ts` | Exportación y restauración de la base. |
| `portal.test.ts` | Publicaciones y eventos públicos, permisos de escritura, publicación y eliminación. |
| `env.test.ts` | Reglas de seguridad: `JWT_SECRET` obligatorio en producción, cookies seguras, tokens `dev-*` deshabilitados en producción. |

Total: **277 pruebas**.

---

## 4. Qué sigue faltando

### Pruebas unitarias

- `frontend/src/utils/vehicle-routes.ts` (cálculo de rutas).
- Utilidades de PDF (`frontend/src/utils/pdf-export.ts`).

### Pruebas de integración adicionales

- `POST /api/drivers/courses/bulk-sync`.
- Casos de error de restauración de backups con archivo corrupto.

### Pruebas E2E (Playwright) — implementadas

`e2e/flujos.spec.ts` cubre, contra la aplicación real:

- Login correcto, contraseña incorrecta y cierre de sesión.
- Accesibilidad del login y del padrón con `axe-core`.
- Alta de vehículo desde el formulario y visualización en el padrón.
- Intercambio de padrón entre dos unidades.
- Importación de un Excel por la interfaz.
- Control de acceso por rol y rechazo de escrituras sin sesión o con cuerpo inválido.

```bash
npx playwright install          # una sola vez
npm run test:e2e                # puerto 3100, base padron_vehicular_test
```

El `webServer` de Playwright **nunca** reutiliza un servidor existente: así el E2E
no puede escribir en la base real del puerto 3000. Usa `DISABLE_HMR=true` para no
chocar con el WebSocket de HMR del `npm run dev`.

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

- `axe-core` en Playwright (`@axe-core/playwright`).
- Etiquetas WCAG 2.1 A/AA; el test falla ante violaciones `critical` o `serious`.
- Revisión manual con teclado (Tab/Shift+Tab/Enter/Esc).
- Contraste en modo claro y oscuro (15/15 módulos sin incidencias de `color-contrast`).
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

El workflow [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) tiene tres jobs:

| Job | Pasos |
| :--- | :--- |
| `quality` | `npm ci` → `npm run lint` → `npm run build` |
| `audit` | `npm ci` → `npm audit --audit-level=high` (falla con altas o críticas) |
| `test` | PostgreSQL 16 como servicio → `drizzle-kit push` → `npm test` |

El E2E con Playwright se ejecuta en local sobre el puerto dedicado. Para llevarlo a
CI haría falta instalar Chromium (`npx playwright install --with-deps chromium`) y un
servicio PostgreSQL; queda como mejora pendiente.

---

## 11. Criterio de "terminado"

- [x] `npm run lint` sin errores.
- [x] `npm run build` correcto.
- [x] Pruebas nuevas pasan (`npm test`).
- [ ] Caso manual verificado.
- [x] Documentación actualizada.
