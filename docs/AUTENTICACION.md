# Autenticación y sesiones

Documento de referencia del flujo de autenticación real implementado en la Fase 1.

---

## 1. Resumen

| Elemento | Implementación |
| :--- | :--- |
| Validación de credenciales | `POST /api/auth/login` contra PostgreSQL |
| Hash de contraseñas | `argon2id` (`backend/services/password.service.ts`) |
| Sesión web | Cookie `HttpOnly` `padron_session` (`SameSite=Lax`, `Secure` en producción) |
| Sesión API/pruebas | JWT Bearer devuelto en el login |
| Firma del token | `jsonwebtoken` con `JWT_SECRET` (`backend/services/token.service.ts`) |
| Autorización | `requireAuth`, `requireAdmin`, `requireModule` (`backend/middleware/auth.ts`) |
| Rate limit | 10 intentos fallidos cada 15 minutos por IP en el login |

---

## 2. Endpoints

### `POST /api/auth/login`

```json
{ "email": "admin@transporte.pe", "password": "admin123" }
```

Respuesta `200`:

```json
{
  "user": { "id": 1, "uid": "admin-01", "email": "admin@transporte.pe", "name": "...", "role": "admin", "isActive": true },
  "token": "<jwt>"
}
```

- `401` con mensaje genérico si el correo no existe, la contraseña es incorrecta o la cuenta está inactiva.
- `400` si el cuerpo no cumple el esquema Zod.
- `429` si se supera el límite de intentos.

### `GET /api/auth/me`

Devuelve `{ user }` a partir de la cookie o del Bearer. Limpia la cookie y responde `401` si la cuenta fue desactivada o eliminada.

### `POST /api/auth/logout`

Limpia la cookie de sesión. El token Bearer, si se guardó, debe descartarse en el cliente.

### `POST /api/auth/change-password`

```json
{ "currentPassword": "...", "newPassword": "mínimo 8 caracteres" }
```

Verifica la contraseña actual antes de guardar el nuevo hash.

---

## 3. Flujo del frontend

1. `AuthProvider` llama a `api.me()` al montar. Si hay cookie válida, restaura la sesión.
2. `LoginView` envía correo y contraseña a `api.login()`.
3. El token se guarda **en memoria** (`ApiService.setAuthToken`) y la cookie la maneja el navegador.
4. `logout()` llama a la API, limpia el token en memoria y el estado de sesión.
5. Las vistas usan `useAuth()` para permisos; el servidor vuelve a validarlos.

> La sesión web depende de la cookie `HttpOnly`; no se guarda el token en `localStorage` para reducir el impacto de un XSS.

---

## 4. Middleware del servidor

`requireAuth` acepta, en este orden:

1. Tokens `dev-*` (solo si `AUTH_DEV_MODE=true` o `NODE_ENV!=production`).
2. JWT propio (Bearer o cookie).
3. Token de Firebase (compatibilidad con Google).
4. Cabeceras de desarrollo `x-user-role` (solo en modo desarrollo).

En los casos 2 y 3 se consulta la fila del usuario para:

- Rechazar cuentas inactivas (`401`).
- Usar el rol actual de la base, no el del token.

---

## 5. Migración de contraseñas

Al arrancar, `migratePlaintextPasswords()` recorre `users` y convierte cualquier valor que no empiece por `$argon2` a un hash argon2id. Además, `authenticateUser()` rehashea en el primer login exitoso.

Si una base antigua conserva contraseñas demo distintas a las documentadas, se pueden restablecer con:

```bash
npm run db:reset-demo-passwords
```

> Este script solo afecta a los correos de `DEFAULT_USER_ACCOUNTS` y está pensado para desarrollo.

---

## 6. Variables de entorno

| Variable | Uso |
| :--- | :--- |
| `JWT_SECRET` | Firma del token. Obligatorio y ≥ 32 caracteres en producción. |
| `JWT_EXPIRES_IN` | Duración (`8h` por defecto). |
| `AUTH_COOKIE_NAME` | Nombre de la cookie (`padron_session`). |
| `AUTH_COOKIE_SECURE` | Fuerza `Secure`; en producción se activa solo. |
| `AUTH_COOKIE_SAME_SITE` | `lax` o `none` (este último requiere HTTPS). |
| `CORS_ORIGIN` | Orígenes permitidos separados por coma. |
| `AUTH_DEV_MODE` | Habilita tokens de desarrollo. Debe ser `false` en producción. |
| `SEED_DEMO_DATA` | Siembra las cuentas demo y el contenido de ejemplo. En producción debe ser `false`. |
| `ALLOW_DEMO_ACCOUNTS` | Permite arrancar en producción con cuentas demo activas. Solo para demos públicas. |

Genera un secreto con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 7. Cuentas demo

| Rol | Correo | Contraseña |
| :--- | :--- | :--- |
| Administrador | `admin@transporte.pe` | `admin123` |
| Programador | `soporte@transporte.pe` | `soporte123` |
| Gerente | `gerencia@transporte.pe` | `gerencia123` |
| Operario | `operador@transporte.pe` | `operador123` |
| Tesorero | `finanzas@transporte.pe` | `tesorero123` |
| Fiscalizador | `fiscalizacion@transporte.pe` | `fiscalizador123` |
| Secretaría | `secretaria@transporte.pe` | `secretaria123` |
| Registrador | `registro@transporte.pe` | `registro123` |

> Cambia estas claves antes de cualquier despliegue con datos reales.

### Por qué estas contraseñas son públicas (y está bien)

Las cuentas demo existen para que quien clone el repositorio pueda probar el sistema
en 2 minutos. **No son credenciales reales**: son cuentas de ejemplo con contraseñas
débiles a propósito, y el repositorio no contiene ningún dato ni clave verdadera.

Lo que **no** debe pasar es que esas mismas cuentas existan en una instalación
pública. Por eso el backend aplica estas reglas:

| Entorno | Comportamiento |
| :--- | :--- |
| Desarrollo | El seed crea las cuentas demo y el contenido de ejemplo. |
| Producción (`NODE_ENV=production`) | `SEED_DEMO_DATA` vale `false` → **no se crean** cuentas demo ni contenido de ejemplo. |
| Producción con cuentas demo heredadas | El servidor **se niega a arrancar** y muestra el procedimiento para resolverlo. |

### Puesta en marcha de una instalación real

```bash
# 1. Elimina las cuentas demo (si la base ya las tenía)
npm run db:remove-demo-users

# 2. Crea TU administrador real (te lo pregunta de forma interactiva)
npm run admin:create

# 3. Arranca con NODE_ENV=production
npm run build && npm start
```

`npm run admin:create` pide:

```
Correo electrónico del administrador: tu-correo@ejemplo.com
Nombre para mostrar (opcional): Tu Nombre
Contraseña (mínimo 12 caracteres): ********
```

La contraseña se guarda como hash argon2 y **no se escribe ni se registra en ningún
lugar**. También acepta flags si prefieres un proceso no interactivo:

```bash
npm run admin:create -- --email tu-correo@ejemplo.com --name "Tu Nombre" --password "TuClaveFuerte"
```

> Si de verdad necesitas una demo pública con esas cuentas, define
> `ALLOW_DEMO_ACCOUNTS=true` y `SEED_DEMO_DATA=true`. Assume el riesgo.

---

## 8. Pendientes

- Revocación inmediata de sesiones (denylist o refresh tokens).
- Recuperación de contraseña por correo.
- Rate limit en escrituras y bloqueo por usuario (no solo por IP).
- Segundo factor (TOTP) para roles privilegiados.
