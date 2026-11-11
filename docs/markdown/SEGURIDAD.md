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
- ✅ **Validación de entrada** con Zod en el **100 %** de las rutas de escritura (`validateBody`, `validateParam`), con mensajes en español.
- ✅ **Consultas parametrizadas** mediante Drizzle ORM.
- ✅ **RBAC en servidor** con `requireAuth` / `requireAdmin` / `requireModule`.
- ✅ **Sin admin anónimo:** una petición sin credenciales recibe `401`.
- ✅ **Tokens de desarrollo deshabilitados en producción** (`NODE_ENV=production`), salvo `AUTH_DEV_MODE=true`.
- ✅ **Cuentas demo fuera de producción:** `SEED_DEMO_DATA=false` impide crearlas y el servidor **se niega a arrancar** si las detecta activas.
- ✅ **Administrador real creado bajo demanda** con `npm run admin:create` (argon2, mínimo 12 caracteres).
- ✅ **Rate limiting en escrituras:** 60/min general, 30/15 min en operaciones sensibles, 10/15 min en subidas y 5/h en restablecimiento de contraseña.
- ✅ **Sanitización de archivos subidos:** extensión y MIME permitidos, tamaño máximo, nombre seguro y verificación de firma binaria (*magic number*).
- ✅ **URLs de multimedia restringidas** a `http`/`https` (bloquea `javascript:` y `data:`).
- ✅ **Restablecimiento de contraseña** con token aleatorio de 32 bytes, solo hash SHA-256 en base, un solo uso, 60 minutos de vigencia, invalidación de tokens previos y respuesta idéntica exista o no la cuenta.
- ✅ **Verificación de conexión** a la base antes de arrancar.
- ✅ **Health check** con estado de la base.
- ✅ **Auditoría** de cambios en `audit_logs`.
- ✅ **Transacciones** en operaciones críticas (swap, restauración).
- ✅ **Restauración con confirmación explícita** (`confirm: "RESTAURAR"`).
- ✅ **Suite automatizada** (Vitest + Supertest + Playwright) que verifica auth, RBAC, validación y no exposición de hashes.
- ✅ **`npm audit` en CI** con umbral de severidad alta.

---

## 3. Riesgos abiertos

| # | Riesgo | Severidad | Estado / mitigación |
| :---: | :--- | :---: | :--- |
| 1 | Login sin validación de contraseñas | 🔴 Crítica | ✅ Corregido: `POST /api/auth/login` + argon2id. |
| 2 | Contraseñas en texto plano (`users.password`) | 🔴 Crítica | ✅ Corregido: hash argon2id y migración al arrancar. |
| 3 | Tokens `dev-*` aceptados | 🟠 Alta | Mitigado: solo con `AUTH_DEV_MODE=true` o fuera de producción. |
| 4 | Sin rate limiting | 🟠 Alta | ✅ Corregido: límites en login, escrituras, subidas y restablecimiento. |
| 5 | Sin cabeceras de seguridad | 🟠 Media | ✅ `helmet` con CSP en producción. |
| 6 | Sin CORS explícito | 🟠 Media | ✅ `CORS_ORIGIN` configurable. |
| 7 | Datos sensibles en respuestas (password) | 🟠 Alta | ✅ Corregido: la API nunca devuelve contraseñas. |
| 8 | Sin cifrado de backups | 🟠 Media | Cifrar y restringir acceso (pendiente). |
| 9 | Sin política de contraseñas | 🟡 Media | Mínimo 8 caracteres; falta complejidad y bloqueo por usuario. |
| 10 | Firebase API key pública | 🟡 Baja | ✅ Eliminado junto con la integración completa. |
| 11 | Tokens sin revocación inmediata | 🟠 Media | Añadir denylist o refresh tokens (pendiente). |
| 12 | Cuentas demo con contraseñas públicas | 🔴 Crítica | ✅ Corregido: `SEED_DEMO_DATA=false` en producción y arranque bloqueado si se detectan. |
| 13 | API key de Firebase versionada | 🟡 Media | ✅ Eliminado: la integración con Firebase se retiró por completo. |
| 14 | Subida de archivos maliciosos | 🟠 Alta | ✅ Corregido: tipo, tamaño, nombre seguro y firma binaria. |
| 15 | XSS por URLs de multimedia | 🟠 Alta | ✅ Corregido: solo se aceptan `http`/`https`. |
| 16 | Fuerza bruta sobre restablecimiento | 🟠 Media | ✅ Corregido: 5 solicitudes/hora y respuesta genérica. |

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

- [x] Login real y hash de contraseñas.
- [x] Tokens de desarrollo eliminados o deshabilitados.
- [x] `401` sin credenciales y `403` sin permisos verificados.
- [x] Rate limiting activo (login, escrituras, subidas y reset).
- [x] Validación de entrada en el 100 % de las rutas de escritura.
- [x] Sanitización de archivos subidos.
- [x] Recuperación de contraseña con tokens de un solo uso.
- [x] CORS restringido.
- [ ] HTTPS obligatorio.
- [x] Cabeceras de seguridad.
- [x] `npm audit` sin vulnerabilidades altas ni críticas.
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
