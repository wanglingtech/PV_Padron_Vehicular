# Verificación de la Fase 0

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
| 5 | `GET /api/users` como admin | `200` |
| 6 | `GET /api/users` como gerente | `200` |
| 7 | `GET /api/users` como operario | `403` |
| 8 | `POST /api/vehicles` como operario | `403` |
| 9 | `POST /api/vehicles` como registrador | distinto de `403` |
| 10 | `POST /api/portal/posts` como operario | `403` |
| 11 | `POST /api/portal/posts` como secretaria | distinto de `403` |
| 12 | `GET /api/backup/stats` como operario | `403` |
| 13 | `GET /api/backup/stats` como tesorero | `200` |
| 14 | `GET /api/backup/export` como tesorero | `403` |
| 15 | `GET /api/dashboard/stats` como operario | `200` |
| 16 | `GET /api/expirations` como fiscalizador | `200` |
| 17 | `GET /api/contacts` como operario | `200` |
| 18 | `GET /api/audit-logs` como operario | `200` |

> El smoke test no crea registros: las escrituras usan `{}` para que el RBAC responda antes de la validación de datos.

---

## 3. Comprobaciones manuales en la interfaz

| Área | Pasos | Esperado |
| :--- | :--- | :--- |
| Login | Abrir `http://localhost:3000` y cerrar sesión | Se muestra el login con selector de rol |
| Roles | Entrar como `Operario` | Menú solo con Inicio, Dashboard, Padrón, Personas, Curso Vial, Vencimientos, Directorio y Portal del Operario |
| Roles | Entrar como `Fiscalizador` | Menú con Vencimientos en escritura y lecturas relacionadas |
| Roles | Entrar como `Registrador` | Menú con Registrar Unidad, Padrón y Personas |
| Roles | Entrar como `Secretaría` | Menú con Personas, Curso Vial, Directorio y Gestión del Portal |
| Roles | Entrar como `Admin`, `Programador` o `Gerente` | Todos los módulos visibles |
| Matriz | Admin → Cuentas y Accesos | Se ven los 8 roles institucionales y la matriz de 15 módulos |
| Protección | Intentar eliminar un rol institucional | La interfaz no muestra el botón y la API responde `400` |
| Backend | Operario intenta abrir `/api/users` | `403` |
| Datos | Crear/editar un vehículo como admin | Se guarda y aparece en el padrón |
| Auditoría | Revisar Historial | El cambio queda registrado |

---

## 4. Verificación de la base de datos

```bash
# Windows
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d padron_vehicular -c "SELECT id, name, is_system FROM system_roles ORDER BY id;"
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d padron_vehicular -c "SELECT uid, email, role FROM users ORDER BY id;"
```

Esperado:

- 8 roles institucionales (`admin`, `developer`, `gerente`, `operator`, `tesorero`, `fiscalizador`, `secretaria`, `registrador`).
- 8 usuarios demo (uno por rol).
- Los roles con `is_system = true` no se pueden eliminar.

---

## 5. Seguridad mínima antes de publicar

- [ ] `.env` no está versionado (`git check-ignore .env`).
- [ ] No hay contraseñas reales ni claves privadas en el repositorio.
- [ ] `AUTH_DEV_MODE=false` en producción.
- [ ] `GET /api/users` sin token responde `401`.
- [ ] `POST /api/vehicles` como operario responde `403`.
- [ ] `GET /api/backup/export` como tesorero responde `403`.
- [ ] `npm audit` revisado (deuda conocida documentada en [`SEGURIDAD.md`](SEGURIDAD.md)).

---

## 6. Criterio de salida de la Fase 0

La fase se considera terminada cuando:

1. `npm install` + `.env` + `npm run db:push` + `npm run dev` funciona desde cero.
2. `npm run lint` y `npm run build` pasan.
3. `npm run smoke` pasa completo.
4. El repositorio está limpio (`git status` sin cambios inesperados).
5. Existe el tag `v0.1.0`.
