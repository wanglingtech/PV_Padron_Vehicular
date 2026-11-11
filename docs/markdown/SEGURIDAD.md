# Seguridad

Documento técnico del modelo de seguridad actual, riesgos conocidos y plan de endurecimiento.

> Para reportar una vulnerabilidad, sigue la política de [`../SECURITY.md`](../../SECURITY.md).

---

## 1. Modelo de amenazas (resumen)

| Activo | Amenaza | Impacto |
| :--- | :--- | :--- |
| Datos personales (DNI, teléfono) | Acceso no autorizado | Alto |
| Documentos y vencimientos | Alteración fraudulenta | Alto |
| Cuentas de usuario | Suplantación / fuerza bruta | Alto |
| Backups | Exfiltración | Alto |
| Disponibilidad | Caída o borrado | Medio |
| Integridad del padrón | Duplicados / swaps inconsistentes | Alto |

---

## 2. Controles implementados

- ✅ **Secretos fuera del repositorio:** `.env` ignorado; `.env.example` con placeholders.
- ✅ **Validación de entrada** con Zod en rutas de escritura.
- ✅ **Consultas parametrizadas** mediante Drizzle ORM.
- ✅ **RBAC en servidor** con `requireAuth` / `requireAdmin`.
- ✅ **Sin admin anónimo:** una petición sin credenciales recibe `401`.
- ✅ **Tokens de desarrollo deshabilitados en producción** (`NODE_ENV=production`), salvo `AUTH_DEV_MODE=true`.
- ✅ **Cuentas demo fuera de producción:** `SEED_DEMO_DATA=false` impide crearlas y el servidor **se niega a arrancar** si las detecta activas.
- ✅ **Administrador real creado bajo demanda** con `npm run admin:create` (argon2, mínimo 12 caracteres).
- ✅ **Verificación de conexión** a la base antes de arrancar.
- ✅ **Health check** con estado de la base.
- ✅ **Auditoría** de cambios en `audit_logs`.
- ✅ **Transacciones** en operaciones críticas (swap, restauración).
- ✅ **Suite automatizada** (Vitest + Supertest) que verifica auth, RBAC y no exposición de hashes.

---

## 3. Riesgos abiertos

| # | Riesgo | Severidad | Estado / mitigación |
| :---: | :--- | :---: | :--- |
| 1 | Login sin validación de contraseñas | 🔴 Crítica | ✅ Corregido: `POST /api/auth/login` + argon2id. |
| 2 | Contraseñas en texto plano (`users.password`) | 🔴 Crítica | ✅ Corregido: hash argon2id y migración al arrancar. |
| 3 | Tokens `dev-*` aceptados | 🟠 Alta | Mitigado: solo con `AUTH_DEV_MODE=true` o fuera de producción. |
| 4 | Sin rate limiting | 🟠 Alta | Mitigado en login; falta en escrituras. |
| 5 | Sin cabeceras de seguridad | 🟠 Media | ✅ `helmet` con CSP en producción. |
| 6 | Sin CORS explícito | 🟠 Media | ✅ `CORS_ORIGIN` configurable. |
| 7 | Datos sensibles en respuestas (password) | 🟠 Alta | ✅ Corregido: la API nunca devuelve contraseñas. |
| 8 | Sin cifrado de backups | 🟠 Media | Cifrar y restringir acceso. |
| 9 | Sin política de contraseñas | 🟡 Media | Mínimo 8 caracteres; falta complejidad y bloqueo por usuario. |
| 10 | Firebase API key pública | 🟡 Baja | ✅ Eliminado junto con la integración completa. |
| 11 | Tokens sin revocación inmediata | 🟠 Media | Añadir denylist o refresh tokens. |
| 12 | Cuentas demo con contraseñas públicas | 🔴 Crítica | ✅ Corregido: `SEED_DEMO_DATA=false` en producción y arranque bloqueado si se detectan. |
| 13 | API key de Firebase versionada | 🟡 Media | ✅ Eliminado: la integración con Firebase se retiró por completo. |

---

## 4. Integraciones con terceros

### Gemini (server-side)

La clave de Gemini vive **solo en el servidor** (`GEMINI_API_KEY` en `.env`, ignorado por git).
Nunca se envía al navegador.

### Firebase (eliminado)

El proyecto ya **no usa Firebase**: la autenticación es propia (JWT + cookie `HttpOnly` +
argon2) y la base de datos es PostgreSQL. Se eliminaron:

- `firebase-applet-config.json` (configuración del SDK web).
- `frontend/src/lib/firebase.ts` y `backend/lib/firebase-admin.ts`.
- La rama de verificación de tokens de Firebase en `backend/middleware/auth.ts`.
- Las dependencias `firebase` y `firebase-admin`.

> Motivo: la clave web de Firebase es pública por diseño y GitHub la reportaba como
> *secret filtrado*. Como la integración no se usaba, se eliminó por completo en lugar de
> restringarla.

**Nunca** subir una cuenta de servicio (`firebase-adminsdk*.json`) ni claves privadas.

---

## 5. Variables de entorno

| Variable | Producción |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `AUTH_DEV_MODE` | `false` |
| `SQL_SSL` | `true` si el proveedor lo exige |
| `GEMINI_API_KEY` | Secreto del proveedor |
| `SQL_PASSWORD` | Secreto del proveedor |

Nunca versionar `.env`, dumps, backups ni bases SQLite.

---

## 6. Checklist antes de producción

- [ ] Login real y hash de contraseñas.
- [ ] Tokens de desarrollo eliminados o deshabilitados.
- [ ] `401` sin credenciales y `403` sin permisos verificados.
- [ ] Rate limiting activo.
- [ ] CORS restringido.
- [ ] HTTPS obligatorio.
- [ ] Cabeceras de seguridad.
- [ ] `npm audit` sin vulnerabilidades críticas.
- [ ] Backups cifrados y restauración probada.
- [ ] Logs sin datos sensibles.
- [ ] Revisión de permisos de base de datos (usuario de app con privilegios mínimos).

---

## 7. Respuesta a incidentes

1. Contener: revocar tokens/claves y aislar el servicio.
2. Evaluar: alcance, datos afectados y causa raíz.
3. Erradicar: corregir la vulnerabilidad y rotar credenciales.
4. Recuperar: restaurar desde backup verificado.
5. Documentar: post-mortem sin culpables y acciones preventivas.
6. Comunicar: notificar a los afectados si corresponde legalmente.

> Si un secreto llegó a Git, **no basta con borrarlo del último commit**: hay que limpiar el historial (`git filter-repo` o BFG) y rotarlo.
