# Verificación de la Fase 0 y de la Fase 1 (1.1 + 1.2)

Lista de comprobaciones para confirmar que el proyecto está listo para publicarse y que el backend, el frontend y la base de datos funcionan juntos.

---

## 1. Requisitos previos

- PostgreSQL en ejecución.
- `.env` configurado (nunca versionado).
- Dependencias instaladas: `npm install`.
- Esquema aplicado: `npm run db:push`.

---

## 2. Comprobaciones automáticas

```bash
npm run lint     # TypeScript sin errores
npm run build    # SPA + servidor compilados en dist/
```

Resultado esperado: ambos comandos terminan con código `0`.

### Smoke test de API

En dos terminales:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run smoke
```

El smoke test verifica:

| # | Verificación | Esperado |
| :---: | :--- | :---: |
| 1 | `GET /api/health` | `200` y `database: up` |
| 2 | `GET /api/vehicles` | `200` |
| 3 | `GET /api/portal/posts` | `200` |
| 4 | `GET /api/users` sin credenciales | `401` |
| 5 | `POST /api/auth/login` con contraseña incorrecta | `401` |
| 6 | `POST /api/auth/login` con correo inexistente | `401` |
| 7 | Login real de administrador | `200` con `user` y `token` |
| 8 | `GET /api/auth/me` con cookie `HttpOnly` | `200` |
| 9 | `GET /api/auth/me` con Bearer | `200` |
| 10 | `GET /api/auth/me` con token inválido | `401` |
| 11 | `GET /api/users` como admin | `200` y sin campo `password` |
| 12 | `GET /api/users` como gerente | `200` |
| 13 | `GET /api/users` como operario | `403` |
| 14 | `POST /api/vehicles` como operario | `403` |
| 15 | `POST /api/vehicles` como registrador | distinto de `403` |
| 16 | `POST /api/portal/posts` como operario | `403` |
| 17 | `POST /api/portal/posts` como secretaria | distinto de `403` |
| 18 | `GET /api/backup/stats` como operario | `403` |
| 19 | `GET /api/backup/stats` como tesorero | `200` |
| 20 | `GET /api/backup/export` como tesorero | `403` |
| 21 | `GET /api/dashboard/stats` como operario | `200` |
| 22 | `GET /api/expirations` como fiscalizador | `200` |
| 23 | `GET /api/contacts` como operario | `200` |
| 24 | `GET /api/audit-logs` como operario | `200` |
| 25 | `POST /api/auth/logout` | `200` |

> El smoke test usa el login real con las cuentas demo. No crea registros: las escrituras usan `{}` para que el RBAC responda antes de la validación de datos.

---

## 3. Comprobaciones manuales en la interfaz

| Área | Pasos | Esperado |
| :--- | :--- | :--- |
| Login | Abrir `http://localhost:3000` y entrar con `admin@transporte.pe` / `admin123` | Se muestra el panel con el nombre del usuario |
| Sesión | Recargar la página tras el login | La cookie `HttpOnly` restaura la sesión sin volver al login |
| Logout | Pulsar “Cerrar sesión” | Vuelve al login y la sesión se limpia |
| Login inválido | Intentar con una contraseña incorrecta | Mensaje de error y `401` en la API |
| Roles | Entrar como `operador@transporte.pe` / `operador123` | Menú en solo lectura, sin Registrar Unidad, Cuentas ni Backup |
| Roles | Entrar como `fiscalizacion@transporte.pe` / `fiscalizador123` | Menú con Vencimientos en escritura y lecturas relacionadas |
| Roles | Entrar como `registro@transporte.pe` / `registro123` | Menú con Registrar Unidad, Padrón y Personas |
| Roles | Entrar como `secretaria@transporte.pe` / `secretaria123` | Menú con Personas, Curso Vial, Directorio y Gestión del Portal |
| Roles | Entrar como `admin`, `soporte` o `gerencia` | Todos los módulos visibles |
| Matriz | Admin → Cuentas y Accesos | Se ven los 8 roles institucionales y la matriz de 15 módulos |
| Contraseñas | Admin → Cuentas y Accesos | La tabla no muestra contraseñas ni hashes; el modal solo permite escribir una nueva |
| Protección | Intentar eliminar un rol institucional | La interfaz no muestra el botón y la API responde `400` |
| Backend | Operario intenta abrir `/api/users` | `403` |
| Datos | Crear/editar un vehículo como admin | Se guarda y aparece en el padrón |
| Auditoría | Revisar Historial | El cambio queda registrado |

---

## 4. Verificación de la base de datos

```bash
# Windows
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d padron_vehicular -c "SELECT id, name, is_system FROM system_roles ORDER BY id;"
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d padron_vehicular -c "SELECT uid, email, role, left(password, 12) AS hash_prefix FROM users ORDER BY id;"
```

Esperado:

- 8 roles institucionales (`admin`, `developer`, `gerente`, `operator`, `tesorero`, `fiscalizador`, `secretaria`, `registrador`).
- 8 usuarios demo (uno por rol).
- Todos los `password` empiezan con `$argon2id$` (nunca texto plano).
- Los roles con `is_system = true` no se pueden eliminar.

---

## 5. Seguridad mínima antes de publicar

- [x] `.env` no está versionado (`git check-ignore .env`).
- [x] No hay contraseñas reales ni claves privadas en el repositorio.
- [x] `AUTH_DEV_MODE=false` en producción.
- [x] `JWT_SECRET` definido con al menos 32 caracteres y distinto del valor de ejemplo.
- [x] `AUTH_COOKIE_SECURE=true` y HTTPS en producción.
- [x] `GET /api/users` sin token responde `401`.
- [x] `GET /api/users` no devuelve `password` ni hashes.
- [x] `POST /api/vehicles` como operario responde `403`.
- [x] `GET /api/backup/export` como tesorero responde `403`.
- [x] `npm audit` sin vulnerabilidades altas ni críticas (CI con `--audit-level=high`).
- [x] Validación Zod en el 100 % de las escrituras (`npm test` lo verifica).
- [x] Sanitización de uploads verificada (`backend/__tests__/upload.service.test.ts`).
- [x] Recuperación de contraseña probada (`backend/__tests__/password-reset.test.ts`).
- [x] 277 pruebas automatizadas en verde (`npm test`).
- [x] 10 flujos E2E en verde (`npm run test:e2e`).
- [x] Accesibilidad verificada con axe-core (sin violaciones graves en módulos principales).

---

## 6. Criterio de salida de la Fase 0

La fase se considera terminada cuando:

1. `npm install` + `.env` + `npm run db:push` + `npm run dev` funciona desde cero.
2. `npm run lint` y `npm run build` pasan.
3. `npm run smoke` pasa completo.
4. El repositorio está limpio (`git status` sin cambios inesperados).
5. Existe el tag `v0.1.0`.
