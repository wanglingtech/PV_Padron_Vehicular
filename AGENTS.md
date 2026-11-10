# AGENTS.md — Guía para agentes de IA

Este repositorio es un **monolito modular** (React + Express + PostgreSQL) para la gestión de un padrón vehicular. Antes de modificar código, lee los documentos de [`/.agents/`](.agents/):

| Documento | Cuándo leerlo |
| :--- | :--- |
| [`.agents/project-context.md`](.agents/project-context.md) | Siempre. Contexto, alcance y estado actual. |
| [`.agents/coding-standards.md`](.agents/coding-standards.md) | Antes de escribir o refactorizar código. |
| [`.agents/security-rules.md`](.agents/security-rules.md) | Antes de tocar auth, API, datos o configuración. |
| [`.agents/database-rules.md`](.agents/database-rules.md) | Antes de cambiar el esquema o consultas. |
| [`.agents/testing-rules.md`](.agents/testing-rules.md) | Antes de dar una tarea por terminada. |
| [`.agents/docs-rules.md`](.agents/docs-rules.md) | Antes de crear o mover documentación. |

## Reglas rápidas

1. **No inventes comandos.** Los scripts válidos están en `package.json`.
2. **No subas secretos.** `.env` está ignorado; usa `.env.example` con placeholders.
3. **No cambies el esquema a mano.** Edita `backend/db/schema.ts` y ejecuta `npm run db:generate`.
4. **No rompas la compatibilidad web.** Los cambios deben funcionar con `npm run dev` y `npm run build`.
5. **Valida antes de terminar:** `npm run lint` y, si tocaste la API o la BD, `npm run build`.
6. **Documenta los cambios relevantes** en `docs/` y actualiza el `ROADMAP.md` si aplica.
7. **Respeta el idioma:** interfaz, comentarios y documentación en **español**; nombres de código en inglés.
8. **No elimines archivos del usuario** sin confirmarlo.

## Comandos de referencia

```bash
npm install          # dependencias
npm run dev          # desarrollo (API + Vite) en http://localhost:3000
npm run lint         # TypeScript
npm run build        # build de producción
npm run db:push      # aplicar esquema Drizzle
npm run db:generate  # generar migración
npm run db:studio    # explorar la base
```

## Mapa mental del código

- `server.ts` — solo arranque: dotenv, Vite/estáticos y `listen`.
- `backend/app.ts` — app Express: seguridad, rutas de la API y seed.
- `backend/routes/` — rutas por dominio (auth y futuros routers).
- `backend/services/` — lógica de autenticación, tokens y contraseñas.
- `backend/db/schema.ts` — modelo de datos (fuente de verdad).
- `backend/db/vehicles.ts` y `padron-changes.ts` — lógica de negocio de datos.
- `frontend/src/api/client.ts` — cliente HTTP tipado del frontend.
- `frontend/src/context/AuthContext.tsx` — sesión, roles y permisos (cliente).
- `backend/middleware/auth.ts` — autenticación y RBAC (servidor).
- `shared/roles.ts` — catálogo compartido de roles y módulos.
- `frontend/src/views/` — una vista por módulo.
- `frontend/src/utils/` — PDF, alertas y rutas del cliente.

> Si una tarea afecta a más de un área, primero propone un plan y confirma con el usuario.
