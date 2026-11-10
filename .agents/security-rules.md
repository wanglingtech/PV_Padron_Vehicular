# Reglas de seguridad

## Obligatorio

1. **Nunca** escribir credenciales, tokens, claves privadas o datos personales reales en el repositorio.
2. Los secretos viven en `.env` (ignorado). Los ejemplos usan placeholders en `.env.example`.
3. Validar toda entrada del usuario en el servidor con Zod, aunque el frontend ya valide.
4. Aplicar `requireAuth` / `requireAdmin` en cualquier ruta que modifique datos.
5. Usar consultas parametrizadas (Drizzle). Nunca concatenar SQL con input del usuario.
6. No devolver contraseñas ni tokens en respuestas de la API.
7. En producción, `AUTH_DEV_MODE` debe ser `false` y `NODE_ENV=production`.
8. Revisar que `git status` no incluya `.env`, dumps, backups ni bases SQLite antes de hacer commit.

## Deuda técnica conocida (no empeorarla)

| Riesgo | Estado | Acción pendiente |
| :--- | :--- | :--- |
| Login sin validación de contraseña | Corregido | `POST /api/auth/login` valida contra argon2id. |
| Contraseñas en texto plano | Corregido | Migración a argon2id al arrancar y en el primer login. |
| Tokens `dev-*` | Mitigado | Solo activos si `AUTH_DEV_MODE=true` o `NODE_ENV!=production`. |
| Fallback de admin anónimo | Corregido | `requireAuth` devuelve 401 sin credenciales. |
| Sin rate limiting | Mitigado | `express-rate-limit` en `/api/auth/login`; falta en escrituras. |
| Sin cabeceras de seguridad | Mitigado | `helmet` con CSP en producción; revisar al desplegar. |
| Sin CORS explícito | Mitigado | `CORS_ORIGIN` configurable; vacío = mismo origen. |
| Firebase API key pública | Aceptado | Restringir dominios y reglas en Firebase. |
| Tokens de sesión sin revocación | Abierto | Añadir denylist/refresh tokens si se requiere cierre inmediato. |

## Antes de un despliegue público

- [x] Autenticación real y sesiones firmadas (JWT + cookie `HttpOnly`).
- [x] Hash de contraseñas con argon2id y política mínima de 8 caracteres.
- [ ] HTTPS obligatorio.
- [x] CORS restringido al dominio del frontend (`CORS_ORIGIN`).
- [x] Rate limiting en login; falta protección contra fuerza bruta distribuida.
- [ ] Backups cifrados y probados.
- [ ] Revisión de dependencias (`npm audit`).
- [ ] Variables de entorno configuradas en el proveedor (nunca en el repo).

## Respuesta ante incidentes

Si se filtra un secreto: **rotarlo de inmediato**, eliminarlo del historial de Git (`git filter-repo` o BFG) y notificar a los responsables. Cambiar el secreto no basta si sigue en el historial.
