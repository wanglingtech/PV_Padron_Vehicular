# Estrategia de pruebas

El proyecto aún no tiene pruebas automatizadas. Este documento define la estrategia para incorporarlas de forma incremental.

---

## Pirámide de pruebas propuesta

```text
        /\
       /E2E\        Playwright (flujos críticos, pocos)
      /------\
     /Integra-\     Supertest + PostgreSQL de prueba
    /----------\
   / Unitarias  \   Vitest (utils, validaciones, db)
  /--------------\
```

---

## 1. Pruebas unitarias (Vitest)

**Objetivo:** lógica pura y utilidades.

Candidatos:

- `backend/utils/validation.ts` — esquemas Zod.
- `shared/date-utils.ts` — vencimientos y semaforización.
- `frontend/src/utils/vehicle-routes.ts` — cálculo de rutas.
- `backend/utils/excel-handler.ts` — parseo y normalización.
- `backend/services/password.service.ts` — hash y verificación argon2.
- Funciones puras de `backend/db/vehicles.ts` (sin conexión real).

```bash
npm install -D vitest
npx vitest
```

---

## 2. Pruebas de integración (Supertest)

**Objetivo:** rutas HTTP contra una base de prueba.

Recomendaciones:

- Base separada `padron_vehicular_test`.
- Ejecutar migraciones antes de la suite.
- Limpiar datos entre pruebas.
- Probar `401`, `403`, `400`, `404`, `409` y caminos felices.

Rutas prioritarias:

1. `POST /api/vehicles` + `GET /api/vehicles/:id`.
2. `POST /api/vehicles/padron/swap` (transaccionalidad).
3. `POST /api/import/preview` + `confirm`.
4. `POST /api/auth/login`, `GET /api/auth/me` y `POST /api/auth/change-password`.
5. `GET /api/health`.

---

## 3. Pruebas E2E (Playwright)

**Objetivo:** flujos de usuario completos.

Escenarios mínimos:

- Login y cierre de sesión.
- Alta de vehículo y visualización en padrón.
- Edición y retiro de unidad.
- Intercambio de padrones y verificación del historial.
- Importación de un Excel de prueba.
- Creación de publicación y visualización en el portal.
- Navegación responsive (móvil/escritorio).
- Modo claro/oscuro.

```bash
npm install -D @playwright/test
npx playwright install
npx playwright test
```

---

## 4. Pruebas de API manuales (Bruno)

Carpeta: [`../api-tests/bruno/`](../api-tests/bruno/)

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

## 5. Accesibilidad

- `axe-core` en Playwright.
- Revisión manual con teclado (Tab/Shift+Tab/Enter/Esc).
- Contraste en modo claro y oscuro.
- Lectores de pantalla (NVDA/VoiceOver).

---

## 6. Rendimiento

- Lighthouse en build de producción.
- k6/Artillery para `GET /api/vehicles` con 10k registros.
- Medir tiempos de exportación Excel/PDF.

---

## 7. Matriz de pruebas manuales

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

## 8. CI

El workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) ejecuta:

1. `npm ci`
2. `npm run lint`
3. `npm run build`

Cuando existan pruebas, añadir `npm test` y Playwright con PostgreSQL como servicio.

---

## 9. Criterio de “terminado”

- [ ] `npm run lint` sin errores.
- [ ] `npm run build` correcto.
- [ ] Pruebas nuevas pasan.
- [ ] Caso manual verificado.
- [ ] Documentación actualizada.
