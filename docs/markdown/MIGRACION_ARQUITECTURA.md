# Guía de migración a arquitectura separada (Backend + Frontend + Shared)

> Documento de referencia para cuando el proyecto alcance los **triggers reales** que justifiquen separar el monolito modular actual en repositorios y deploys independientes.

---

## 1. Cuándo migrar (checklist obligatorio)

No migrar por "futuro hipotético". Migrar solo cuando **se cumplan ≥ 2 de estos**:

- [ ] **Frontend en edge/CDN global** (Vercel, Netlify, Cloudflare Pages) — el monolito no corre ahí.
- [ ] **Equipo frontend ≥ 2** y **equipo backend ≥ 2** con **roadmap y releases independientes**.
- [ ] **Tráfico frontend ≫ API** (ej. 10k usuarios leyendo dashboard, 100 escribiendo) → escalar CDN barato, backend caro.
- [ ] **App móvil nativa / terceros** consumiendo la misma API.
- [ ] **Regulación / compliance** exige aislamiento de infra (auditoría, pen-test por capa).

> **Estado actual (nov 2026): 0/5**. No migrar.

---

## 2. Arquitectura objetivo: Opción B — Repos separados + paquete compartido

```
padron-api/          → Express + Drizzle + Auth (Node largo)
│   ├── src/
│   │   ├── routes/         (vehicles, persons, portal, backup, auth)
│   │   ├── services/       (password, token, auth, gemini)
│   │   ├── middleware/     (auth, rate-limit, validation)
│   │   ├── db/             (schema, index, vehicles, padron-changes)
│   │   ├── utils/          (excel, pdf, backup, validation)
│   │   ├── config/         (env)
│   │   └── app.ts
│   ├── package.json
│   └── Dockerfile / railway.toml / render.yaml

padron-web/          → Vite/React o Next.js (estático/SSR edge)
│   ├── src/
│   │   ├── api/client.ts   (fetch tipado a https://api.tudominio.com)
│   │   ├── context/        (AuthContext, etc.)
│   │   ├── views/          (Dashboard, Vehicles, Users, etc.)
│   │   └── components/
│   ├── package.json        (dependencia: @padron/shared)
│   └── vercel.json / netlify.toml

padron-shared/       → Paquete npm privado (@padron/shared)
│   ├── src/
│   │   ├── roles.ts        (ROLE_DEFINITIONS, DEFAULT_USER_ACCOUNTS, permisos)
│   │   ├── date-utils.ts   (evaluateDocumentDate, evaluateVehicleOverallStatus)
│   │   ├── schemas/        (Zod schemas para request/response)
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
```

---

## 3. Qué ya está listo en el código actual (costo de migración ≈ 0 reescritura)

| Actual | En arquitectura B |
|--------|-------------------|
| `shared/roles.ts`, `shared/date-utils.ts` | `@padron/shared` (publicar en GitHub Packages / npm privado) |
| `backend/app.ts`, `backend/routes/*`, `backend/services/*`, `backend/middleware/*`, `backend/db/*`, `backend/utils/*`, `backend/config/*` | `padron-api/src/` (quitar integración Vite, ya es Express puro) |
| `frontend/src/api/client.ts` | `padron-web/src/api/client.ts` (cambiar `baseURL` a `https://api.tudominio.com`) |
| `frontend/src/context/AuthContext.tsx` | Funciona igual (lee cookie HttpOnly cross-site) |
| `backend/middleware/auth.ts` | Ya emite `SameSite=none; Secure` + Bearer; solo configurar `CORS_ORIGIN=https://app.tudominio.com` |

---

## 4. Pasos de migración (cuando toque)

### 4.1 Crear `padron-shared`
```bash
mkdir padron-shared && cd padron-shared
# Copiar shared/roles.ts, shared/date-utils.ts
# Añadir Zod schemas compartidos (users, vehicles, persons, portal, auth)
# package.json: "name": "@padron/shared", "main": "dist/index.js", "types": "dist/index.d.ts"
# npm publish --registry=https://npm.pkg.github.com  (GitHub Packages privado)
```

### 4.2 Crear `padron-api`
```bash
mkdir padron-api && cd padron-api
# Copiar backend/ completo
# Quitar de server.ts la integración Vite (ya está en backend/app.ts)
# package.json: dependencias de backend + "@padron/shared": "^1.0.0"
# Configurar variables de producción:
#   AUTH_DEV_MODE=false
#   AUTH_COOKIE_SECURE=true
#   AUTH_COOKIE_SAME_SITE=none
#   CORS_ORIGIN=https://app.tudominio.com
#   JWT_SECRET=<64 chars aleatorios>
# Deploy: Railway / Render / Fly.io / VPS + Docker
```

### 4.3 Crear `padron-web`
```bash
mkdir padron-web && cd padron-web
# Copiar frontend/src/ (api, context, views, components, hooks, utils, types)
# package.json: dependencias de frontend + "@padron/shared": "^1.0.0"
# vite.config.ts: proxy solo para dev local; en prod build estático
#   server: { proxy: { '/api': 'http://localhost:3000' } }
# Cambiar en client.ts: baseURL = import.meta.env.VITE_API_URL || 'https://api.tudominio.com'
# Deploy: Vercel / Netlify / Cloudflare Pages
#   Variables: VITE_API_URL=https://api.tudominio.com
```

### 4.4 Configurar DNS y TLS
```
api.tudominio.com    → CNAME → railway.app / render.com / fly.dev
app.tudominio.com    → CNAME → vercel.app / netlify.app / pages.dev
```
- TLS automático en ambas plataformas.
- Cookies cross-site funcionan: `SameSite=none; Secure` + `CORS_ORIGIN=https://app.tudominio.com`.

### 4.5 CI/CD (GitHub Actions)
```yaml
# .github/workflows/shared.yml
on: push: paths: ['padron-shared/**']
jobs: publish: npm publish

# .github/workflows/api.yml
on: push: paths: ['padron-api/**']
needs: [shared]
jobs: test-build-deploy

# .github/workflows/web.yml
on: push: paths: ['padron-web/**']
needs: [shared]
jobs: test-build-deploy
```

---

## 5. Qué NO hacer (errores comunes)

| Error | Por qué duele |
|-------|---------------|
| Migrar "por si acaso" | Meses de infra sin valor de negocio; 3× complejidad operativa. |
| Usar serverless (Vercel API routes, Lambda) para el backend actual | `argon2`, `pdf`, `excel`, `gemini` exceden límites de CPU/tiempo/memoria. |
| GraphQL / tRPC sin necesidad | REST + Zod + `@padron/shared` ya da type-safety end-to-end. |
| Monorepo Nx/Turbo sin equipos distintos | Herramienta pesada que resuelve problema que no tienes. |
| Separar sin `@padron/shared` | Duplicación de tipos/roles/esquemas → drift inevitable. |

---

## 6. Estimación de esfuerzo real

| Fase | Tiempo | Quién |
|------|--------|-------|
| Crear `padron-shared` + publicar | 2–4 h | 1 dev |
| Mover `backend/` → `padron-api` + deploy | 4–8 h | 1 dev backend |
| Mover `frontend/src/` → `padron-web` + deploy | 4–8 h | 1 dev frontend |
| DNS, TLS, CORS, cookies cross-site | 2–4 h | 1 dev + infra |
| CI/CD 3 pipelines | 4–8 h | 1 dev |
| **Total** | **~2–3 días** | 2 devs |

> **Clave**: 0 días de reescritura de lógica de negocio. Solo movimiento de archivos y configuración de infra.

---

## 7. Referencias en el repo actual

- `backend/config/env.ts` → variables de producción documentadas.
- `backend/middleware/auth.ts` → cookie `SameSite=none; Secure` + Bearer listo.
- `shared/roles.ts` → catálogo único de roles, módulos, permisos, cuentas demo.
- `frontend/src/api/client.ts` → cliente HTTP tipado, solo cambiar `baseURL`.
- `docs/markdown/AUTENTICACION.md` → flujo de sesión, cookies, headers, refresh.
- `docs/markdown/DESPLIEGUE.md` → variables de entorno por entorno.

---

## 8. Decisión registrada

> **Fecha**: 2026-11-10  
> **Decisión**: Mantener monolito modular (`npm run dev`, una terminal, puerto 3000).  
> **Próxima revisión**: Cuando se cumplan ≥ 2 triggers de la sección 1.  
> **Arquitectura objetivo confirmada**: Opción B (repos separados + `@padron/shared`).
