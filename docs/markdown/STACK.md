# Stack tecnológico

Documento de referencia de las tecnologías usadas, sus versiones y el motivo de cada elección.

---

## Resumen

| Capa | Tecnología | Versión |
| :--- | :--- | :--- |
| Lenguaje | TypeScript | 5.8 |
| UI | React | 19 |
| Build/dev | Vite | 6 |
| Estilos | Tailwind CSS | 4 |
| Servidor | Express | 4 |
| Runtime | Node.js | 20+ (probado 24) |
| ORM | Drizzle ORM | 0.45 |
| Driver | pg (node-postgres) | 8.23 |
| Validación | Zod | 4 |
| Base de datos | PostgreSQL | 17 |
| Auth | JWT propio + cookie `HttpOnly` + argon2id | — |
| IA | Google Gemini (`@google/genai`) | 2.4 |

---

## Frontend

### React 19 + TypeScript

- Componentes funcionales y hooks.
- Tipado compartido entre cliente y servidor (`frontend/src/types`).
- Motivo: ecosistema maduro, reusable para web, escritorio (Tauri/Electron) y móvil (Capacitor).

### Vite 6

- Dev server con HMR y build optimizado.
- En desarrollo, Express monta Vite como middleware (`middlewareMode`), por lo que un solo proceso sirve API y SPA.

### Tailwind CSS 4

- Utilidades, diseño responsive y modo oscuro.
- Configuración vía plugin de Vite (`@tailwindcss/vite`), sin `tailwind.config.js` obligatorio.

### Librerías de dominio

| Librería | Uso |
| :--- | :--- |
| `lucide-react` | Iconos. |
| `recharts` | Gráficos del dashboard. |
| `leaflet` / `@types/leaflet` | Mapas y rutas. |
| `motion` | Animaciones. |
| `sweetalert2` | Alertas y confirmaciones. |
| `jspdf` + `jspdf-autotable` | Reportes PDF. |
| `exceljs` | Excel (importación/exportación). |

---

## Backend

### Express 4

- La app se construye en `backend/app.ts`; `server.ts` solo arranca el proceso.
- Rutas por dominio en `backend/routes/` y servicios en `backend/services/`.
- Middlewares de JSON (25 MB para importaciones en base64).
- En producción sirve `dist/` como estático.

### Drizzle ORM

- Esquema tipado en `backend/db/schema.ts`.
- Migraciones reproducibles con `drizzle-kit`.
- Consultas composables y transacciones.

### PostgreSQL

- Integridad referencial, transacciones ACID y buen soporte para reportes.
- El intercambio de padrones usa transacción con valor temporal para evitar colisiones de unicidad.

### Zod

- Validación de payloads en el servidor (`backend/utils/validation.ts` y esquemas por ruta).

### dotenv

- Carga de `.env` al inicio (`import 'dotenv/config'`).

---

## Autenticación

- **Login real** con correo y contraseña contra PostgreSQL (`POST /api/auth/login`).
- **argon2id** para el hash de contraseñas, con migración transparente de claves antiguas.
- **JWT firmado** (`jsonwebtoken`) entregado en cookie `HttpOnly` (`padron_session`) y como Bearer para API/pruebas.
- **RBAC** en `backend/middleware/auth.ts`; el rol se refresca desde la base en cada petición.
- **Sin dependencias de identidad de terceros**: la sesión es 100 % propia (PostgreSQL + JWT + argon2id).

> Ver [`AUTENTICACION.md`](AUTENTICACION.md).

---

## Inteligencia artificial

- `@google/genai` procesa documentos PDF/imágenes para extraer datos de cursos viales.
- Requiere `GEMINI_API_KEY`.
- Si no hay clave, el resto del sistema funciona; solo fallan las funciones de IA.

---

## Herramientas de desarrollo

| Herramienta | Uso |
| :--- | :--- |
| `tsx` | Ejecutar TypeScript sin compilar en desarrollo. |
| `esbuild` | Empaquetar el servidor para producción. |
| `tsc --noEmit` | Verificación de tipos. |
| Drizzle Kit | `push`, `generate`, `studio`. |
| Bruno | Pruebas de API versionadas. |
| GitHub Actions | CI (lint + build). |

---

## Decisiones y alternativas

| Decisión | Alternativa descartada | Motivo |
| :--- | :--- | :--- |
| Drizzle | Prisma | Menos peso, SQL transparente y tipado directo. |
| PostgreSQL | MySQL | Mejor soporte transaccional y analítico. |
| Monolito Express | Microservicios | Simplicidad para el tamaño actual del equipo. |
| Tauri (futuro) | Electron | Menor consumo de RAM y binarios más pequeños. |
| SQLite (futuro) | Solo PostgreSQL | Operación offline en campo. |

---

## Compatibilidad multiplataforma (visión)

| Plataforma | Enfoque |
| :--- | :--- |
| Web | SPA React + API Express. |
| Escritorio | Tauri (Rust) envolviendo la SPA; SQLite local. |
| Móvil | PWA instalable o Capacitor; cámara y SQLite. |
| Offline | SQLite + cola de sincronización con PostgreSQL. |

Ver [`ROADMAP.md`](ROADMAP.md).
