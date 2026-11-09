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
| Login sin validación de contraseña | Abierto | Implementar endpoint de login + hash. |
| Contraseñas en texto plano | Abierto | Migrar a `bcrypt`/`argon2`. |
| Tokens `dev-*` | Mitigado | Solo activos si `AUTH_DEV_MODE=true` o `NODE_ENV!=production`. |
| Fallback de admin anónimo | Corregido | `requireAuth` devuelve 401 sin credenciales. |
| Sin rate limiting | Abierto | Añadir `express-rate-limit` en login y escritura. |
| Sin cabeceras de seguridad | Abierto | Evaluar `helmet` con CSP compatible con Vite. |
| Sin CORS explícito | Abierto | Configurar al separar frontend/API. |
| Firebase API key pública | Aceptado | Restringir dominios y reglas en Firebase. |

## Antes de un despliegue público

- [ ] Autenticación real y sesiones firmadas (JWT o cookies `HttpOnly`).
- [ ] Hash de contraseñas y política mínima.
- [ ] HTTPS obligatorio.
- [ ] CORS restringido al dominio del frontend.
- [ ] Rate limiting y protección contra fuerza bruta.
- [ ] Backups cifrados y probados.
- [ ] Revisión de dependencias (`npm audit`).
- [ ] Variables de entorno configuradas en el proveedor (nunca en el repo).

## Respuesta ante incidentes

Si se filtra un secreto: **rotarlo de inmediato**, eliminarlo del historial de Git (`git filter-repo` o BFG) y notificar a los responsables. Cambiar el secreto no basta si sigue en el historial.
