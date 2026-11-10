# Despliegue

Guía para publicar el sistema con presupuesto bajo, priorizando **Vercel** para el frontend y opciones gratuitas para API y base de datos.

---

## Arquitectura actual

Hoy es un **monolito**: `server.ts` arranca Express (`backend/app.ts`) y, en producción, sirve los archivos estáticos de `dist/`.

```bash
npm run build   # genera dist/ (SPA) y dist/server.cjs (API)
npm start       # ejecuta dist/server.cjs en el puerto 3000
```

Variables requeridas en el servidor:

```env
NODE_ENV=production
SQL_HOST=...
SQL_PORT=5432
SQL_USER=...
SQL_PASSWORD=...
SQL_DB_NAME=...
SQL_SSL=true
AUTH_DEV_MODE=false
SEED_DEMO_DATA=false
ALLOW_DEMO_ACCOUNTS=false
JWT_SECRET=<64 caracteres aleatorios>
GEMINI_API_KEY=...
APP_URL=https://tu-dominio.com
```

> `SEED_DEMO_DATA=false` evita que se creen las cuentas de demostración (sus
> contraseñas son públicas). El servidor además **se niega a arrancar** si
> detecta cuentas demo activas en producción.

### Primer arranque en una instalación real

```bash
# 1. Aplicar el esquema
npm run db:push

# 2. Crear tu administrador real (interactivo)
npm run admin:create

# 3. Arrancar
npm run build && npm start
```

Si la base ya tenía cuentas demo, elimínalas antes:

```bash
npm run db:remove-demo-users
```

---

## Opción A — Vercel (frontend) + Railway/Render (API) + Supabase/Neon (BD)

Recomendada para empezar gratis.

### 1. Base de datos en Supabase o Neon

1. Crea un proyecto y una base PostgreSQL.
2. Copia host, puerto, usuario, contraseña y nombre de la base.
3. Activa SSL (`SQL_SSL=true`).
4. Aplica el esquema desde tu máquina apuntando a la base remota:

   ```bash
   # .env apuntando a la BD remota
   npm run db:push
   ```

   > Los free tiers pueden pausar la base por inactividad. Para producción, considera un plan mínimo.

### 2. API en Railway o Render

1. Conecta el repositorio de GitHub.
2. Build: `npm install && npm run build`
3. Start: `npm start`
4. Configura las variables de entorno del servidor.
5. Verifica `GET https://<api>/api/health` → `database: up`.

### 3. Frontend en Vercel

1. Importa el repositorio en Vercel.
2. Framework: **Vite**.
3. Build: `npm run build`
4. Output: `dist`
5. Define `VITE_API_URL=https://<api>`.

**Cambio de código necesario:** hoy el cliente llama a `/api/*` en el mismo origen. Para separar dominios hay que:

```ts
// frontend/src/api/client.ts
const API_BASE = import.meta.env.VITE_API_URL ?? '';
fetch(`${API_BASE}/api/vehicles`, ...)
```

Y en el servidor habilitar CORS para el dominio de Vercel.

---

## Opción B — Todo en Railway

1. Crea un proyecto y añade PostgreSQL.
2. Despliega el repositorio como servicio Node.
3. Build: `npm run build` · Start: `npm start`.
4. Usa `DATABASE_URL` o las variables `SQL_*` del addon.
5. Railway inyecta `PORT`; el código actual usa `3000` fijo. **Ajuste pendiente:**

   ```ts
   const PORT = Number(process.env.PORT) || 3000;
   ```

---

## Opción C — Vercel serverless

Vercel no ejecuta un servidor Express persistente tal cual. Requiere:

- Separar la API en funciones (`api/*.ts`) o adaptar Express con un handler serverless.
- Reutilizar `backend/app.ts` como handler serverless (la lógica ya está fuera de `server.ts`).
- Configurar `CORS_ORIGIN` y cookies `SameSite=None; Secure` si frontend y API quedan en dominios distintos.
- Usar una base gestionada con pool compatible con serverless (Neon/Supabase con pooler).

Es la opción más limpia a largo plazo, pero implica refactor. Está en el roadmap.

---

## Dominio, HTTPS y seguridad

- Vercel y Railway proveen HTTPS automático.
- Configura `APP_URL` con el dominio final.
- Restringe CORS al dominio del frontend.
- Nunca subas `.env`; usa el panel de variables del proveedor.
- Activa backups automáticos de la base.
- Monitorea `/api/health` con un servicio externo (UptimeRobot, Better Stack).

---

## Checklist de despliegue

- [ ] Base creada y esquema aplicado.
- [ ] Variables de entorno cargadas en el proveedor.
- [ ] `AUTH_DEV_MODE=false` y `NODE_ENV=production`.
- [ ] `SEED_DEMO_DATA=false` y `ALLOW_DEMO_ACCOUNTS=false`.
- [ ] Administrador real creado con `npm run admin:create` (contraseña de 12+ caracteres).
- [ ] Cuentas demo eliminadas (`npm run db:remove-demo-users`).
- [ ] `JWT_SECRET` generado y único (no el de `.env.example`).
- [ ] `/api/health` responde `database: up`.
- [ ] Frontend apunta a la API correcta (`VITE_API_URL`).
- [ ] CORS configurado.
- [ ] Backup inicial descargado.
- [ ] Dominio y HTTPS verificados.
- [ ] Pruebas manuales de los módulos críticos.

---

## Costos estimados (referencia)

| Servicio | Free tier | Notas |
| :--- | :--- | :--- |
| Vercel | Sí | Suficiente para SPA. |
| Railway | Trial/crédito | Luego ~$5/mes. |
| Render | Free con suspensión | No ideal para producción. |
| Supabase | 500 MB | Pausa por inactividad. |
| Neon | 0.5 GB | Pausa por inactividad. |

> Verifica siempre los límites vigentes de cada proveedor.
