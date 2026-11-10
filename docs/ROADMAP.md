# Roadmap del proyecto

Plan de evolución desde el estado actual (web funcional con auth demo) hasta una plataforma **web + escritorio + móvil**, con **operación offline** y despliegue de bajo costo.

Leyenda: `[x]` hecho · `[ ]` pendiente · `[~]` en progreso

---

## Fase 0 — Base para publicar (actual)

**Objetivo:** repositorio limpio, documentado y reproducible.

- [x] `.gitignore` completo y comentado.
- [x] README con stack, instalación, módulos y capturas.
- [x] Documentación en `docs/`.
- [x] Instrucciones para agentes en `AGENTS.md` y `.agents/`.
- [x] Colección de pruebas de API (Bruno).
- [x] CI básico (lint + build).
- [x] Validación de conexión a PostgreSQL al arrancar.
- [x] Health check con estado real de la base.
- [x] Matriz de roles y módulos (`admin`, `developer`, `gerente` con acceso total; el resto con su módulo propio y lecturas relacionadas).
- [x] RBAC por módulo en el backend (`requireModule`) y protección de roles institucionales.
- [x] Smoke test de API (`npm run smoke`) y guía de verificación.
- [x] `package-lock.json` versionado (npm como gestor oficial).
- [x] Licencia definida como propietaria (`UNLICENSED`) a la espera de la definitiva.
- [ ] Primer release/tag `v0.1.0`.

**Criterio de salida:** `git clone` + `npm install` + `.env` + `npm run db:push` + `npm run dev` funciona sin pasos ocultos.

---

## Fase 1 — Web estable y segura

**Objetivo:** apto para uso real con datos de la asociación.

### Autenticación y autorización
- [ ] Endpoint `POST /api/auth/login` con validación de contraseña.
- [ ] Hash de contraseñas con `argon2` o `bcrypt`.
- [ ] Sesiones con JWT firmado o cookie `HttpOnly` + `SameSite`.
- [ ] Eliminar el login “fake” del frontend.
- [ ] RBAC validado **siempre** en el servidor (no solo en el cliente).
- [ ] `AUTH_DEV_MODE=false` en producción.
- [ ] Recuperación/cambio de contraseña.

### Endurecimiento
- [ ] `helmet` con CSP compatible con Vite.
- [ ] `express-rate-limit` en login y escrituras.
- [ ] CORS restringido.
- [ ] Validación Zod en el 100% de las rutas de escritura.
- [ ] Sanitización de archivos subidos (tipo, tamaño, nombre).
- [ ] `npm audit` en CI.

### Calidad
- [ ] Vitest para `utils/` y `db/`.
- [ ] Supertest para rutas críticas.
- [ ] Playwright para flujos E2E (login, alta, swap, importación).
- [ ] axe-core para accesibilidad.
- [ ] Cobertura mínima objetivo: 60%.

### Producto
- [ ] Notificaciones de vencimiento (email/WhatsApp).
- [ ] Reportes programados.
- [ ] Multi-asociación (tenant) si aplica.

**Criterio de salida:** ningún dato sensible en texto plano; pruebas automatizadas en CI; deploy web con HTTPS.

---

## Fase 2 — Offline y SQLite

**Objetivo:** operar en campo sin internet y sincronizar después.

- [ ] Definir estrategia: **SQLite local** (Tauri/Capacitor) o **IndexedDB** (PWA).
- [ ] Capa de repositorio abstracta (`LocalRepository` / `RemoteRepository`).
- [ ] Esquema SQLite espejo del modelo principal.
- [ ] Cola de operaciones pendientes (`outbox`) con idempotencia.
- [ ] Resolución de conflictos (last-write-wins con auditoría o merge por campo).
- [ ] Sincronización bidireccional al recuperar conexión.
- [ ] Indicador de estado offline/sincronizando en la UI.
- [ ] Pruebas de corte de red y reconexión.

**Decisión pendiente:** usar SQLite embebido en escritorio/móvil y mantener PostgreSQL como fuente de verdad central.

---

## Fase 3 — Escritorio

**Objetivo:** aplicación instalable para oficina con acceso local.

- [ ] Elegir **Tauri** (recomendado) o **Electron**.
  - Tauri: binarios pequeños, menor RAM, Rust + WebView.
  - Electron: ecosistema más amplio, mayor consumo.
- [ ] Reutilizar la SPA y el cliente API.
- [ ] SQLite local + sincronización.
- [ ] Impresión directa de reportes.
- [ ] Actualizaciones automáticas.
- [ ] Firma de código (Windows/macOS) si se distribuye.
- [ ] Empaquetado en CI (MSI/DMG/AppImage).

---

## Fase 4 — Móvil

**Objetivo:** captura en campo con cámara y modo offline.

- [ ] PWA instalable (manifest + service worker) como primer paso.
- [ ] Evaluar **Capacitor** para acceso nativo.
- [ ] Cámara para DNI, licencia, SOAT y unidad.
- [ ] Compresión y almacenamiento local de imágenes.
- [ ] SQLite/almacenamiento local y sincronización.
- [ ] Notificaciones push.
- [ ] Diseño mobile-first y accesibilidad táctil.

---

## Fase 5 — Escala y operación

- [ ] Observabilidad (logs estructurados, métricas, alertas).
- [ ] Backups automáticos y restauración probada.
- [ ] Migraciones con ventana de mantenimiento.
- [ ] Pruebas de carga (k6/Artillery).
- [ ] Documentación de runbook e incidentes.
- [ ] Auditoría de seguridad externa.

---

## Infraestructura y despliegue

| Necesidad | Opción gratuita | Opción de pago |
| :--- | :--- | :--- |
| Frontend | **Vercel Hobby** | Vercel Pro |
| API | **Railway trial / Render free** | Railway Pro |
| PostgreSQL | **Supabase / Neon free** | Supabase Pro |
| Auth | **Firebase Auth** | Firebase Blaze |
| Archivos | Supabase Storage | S3/R2 |

### Restricciones a tener en cuenta
- Los free tiers **duermen** o limitan horas: no usar para producción crítica.
- Supabase/Neon pueden pausar bases inactivas.
- Vercel es ideal para el frontend; el Express actual necesita adaptación para serverless.
- Definir `VITE_API_URL` y CORS al separar frontend y API.

Ver [`DESPLIEGUE.md`](DESPLIEGUE.md).

---

## Deuda técnica priorizada

| Prioridad | Deuda | Impacto |
| :---: | :--- | :--- |
| 🔴 Alta | Auth demo sin validación de contraseña | Crítico |
| 🔴 Alta | Contraseñas en texto plano | Crítico |
| 🟠 Media | Sin pruebas automatizadas | Regresiones |
| 🟠 Media | `server.ts` monolítico (~1.700 líneas) | Mantenibilidad |
| 🟠 Media | Sin separación frontend/API | Despliegue |
| 🟡 Baja | Sin paginación en algunos listados | Rendimiento |
| 🟡 Baja | Sin i18n | Alcance |

---

## Próximos 5 pasos concretos

1. Implementar login real + hash de contraseñas.
2. Añadir Vitest + Supertest y un primer E2E con Playwright.
3. Configurar CI con lint, build y tests.
4. Desplegar frontend en Vercel y API + BD en Railway/Supabase.
5. Prototipo Tauri con SQLite local.
