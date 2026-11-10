# Contexto del proyecto

## Qué es

Sistema de gestión de **padrón vehicular** para asociaciones de transporte público. Cubre altas, bajas, reasignaciones de padrón, control documentario, fiscalización, portal institucional y auditoría.

## Alcance funcional actual

- Padrón de vehículos con número de padrón desacoplado del `id` interno.
- Propietarios y conductores (relaciones muchos-a-muchos con vigencia).
- SOAT/AFOCAT, CITV, licencia de conducir y curso vial anual.
- Intercambio transaccional de padrones (`SWAP`) con historial inmutable.
- Importación/exportación Excel y PDF.
- Portal institucional (publicaciones, eventos, carrusel).
- Portal del operario con captura de fotos.
- Auditoría de cambios y backups JSON/SQL.
- RBAC por módulo (roles y permisos).

## Estado real (importante)

- **Autenticación real:** `POST /api/auth/login` valida correo y contraseña contra PostgreSQL. La sesión se entrega en una cookie `HttpOnly` (`padron_session`) y también como JWT Bearer para API/pruebas.
- **Contraseñas con argon2id** en `users.password`. Las claves heredadas en texto plano se migran al arrancar y en el primer login exitoso.
- **RBAC en el servidor:** `requireAuth`, `requireAdmin` y `requireModule` validan rol y permisos en cada petición, refrescando el rol desde la base.
- **Backend separado:** la lógica de servidor vive en `backend/` (`app.ts`, `routes/`, `services/`, `middleware/`, `db/`, `utils/`). `server.ts` solo arranca Express, Vite o los estáticos.
- **Catálogo compartido:** roles, módulos y utilidades de fecha viven en `shared/` y los importan frontend y backend.
- **Sin pruebas automatizadas todavía** (solo `tsc`, build y el smoke test de API). Vitest/Supertest están planificados.
- **Sin offline ni SQLite** todavía; está planificado.

## Decisiones de arquitectura

| Decisión | Motivo |
| :--- | :--- |
| Drizzle ORM | Tipado extremo a extremo y migraciones reproducibles. |
| PostgreSQL | Integridad relacional, transacciones y consultas analíticas. |
| Express + Vite en un proceso | Simplicidad de desarrollo y despliegue inicial. |
| Un solo repositorio | Frontend, API, esquema y documentación versionados juntos. |
| Firebase Auth opcional | Login con Google sin gestionar contraseñas. |

## Visión multiplataforma

El plan es reutilizar el núcleo web y añadir:

- **Escritorio:** Tauri (preferido por tamaño y seguridad) o Electron.
- **Móvil:** PWA/Capacitor con cámara.
- **Offline:** SQLite local + cola de sincronización hacia PostgreSQL.

Ver `docs/ROADMAP.md`.
