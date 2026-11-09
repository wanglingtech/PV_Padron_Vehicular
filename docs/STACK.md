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
| Auth | Firebase Auth | 12 |
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
| `xlsx` | Excel (importación/exportación). |

---

## Backend

### Express 4

- API REST en `server.ts`.
- Middlewares de JSON (25 MB para importaciones en base64).
- En producción sirve `dist/` como estático.

### Drizzle ORM

- Esquema tipado en `frontend/src/db/schema.ts`.
- Migraciones reproducibles con `drizzle-kit`.
- Consultas composables y transacciones.

### PostgreSQL

- Integridad referencial, transacciones ACID y buen soporte para reportes.
- El intercambio de padrones usa transacción con valor temporal para evitar colisiones de unicidad.

### Zod

- Validación de payloads en el servidor (`frontend/src/utils/validation.ts`).

### dotenv

- Carga de `.env` al inicio (`import 'dotenv/config'`).

---

## Autenticación

- **Firebase Auth** para login con Google (opcional).
- **Sesión local** para el modo demo (rol en `localStorage`).
- **RBAC** en `frontend/src/middleware/auth.ts` y matriz de permisos en `AuthContext.tsx`.

> La autenticación real está pendiente. Ver [`SEGURIDAD.md`](SEGURIDAD.md).

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
