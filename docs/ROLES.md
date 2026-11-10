# Roles, módulos y permisos (RBAC)

Documento de referencia de la distribución de módulos por rol. La fuente de verdad del código es [`frontend/src/config/roles.ts`](../frontend/src/config/roles.ts); la del servidor es [`frontend/src/middleware/auth.ts`](../frontend/src/middleware/auth.ts).

---

## 1. Principios

1. **Tres roles privilegiados** tienen acceso total: `admin`, `developer` (programador/soporte) y `gerente`.
2. **El resto de roles** solo accede a su **módulo propio en escritura** y a un conjunto acotado de **lecturas relacionadas**.
3. La matriz se guarda en PostgreSQL (`system_roles.permissions`) y puede ajustarse desde **Cuentas y Accesos**.
4. El **frontend oculta** los módulos sin permiso; el **backend valida** las escrituras y endpoints sensibles con `requireModule`.
5. Los roles institucionales (`isSystem: true`) **no se pueden eliminar**; sus permisos sí se pueden editar.

Leyenda: **W** = escritura · **R** = lectura · **—** = sin acceso.

---

## 2. Matriz rol → módulo

| Módulo | admin | developer | gerente | operator | tesorero | fiscalizador | secretaria | registrador |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Portal de Inicio | W | W | W | R | R | R | R | R |
| Dashboard | W | W | W | R | R | R | R | R |
| Padrón Vehicular | W | W | W | R | R | R | R | **W** |
| Registrar Unidad | W | W | W | — | — | — | — | **W** |
| Directorio de Personas | W | W | W | R | R | R | **W** | **W** |
| Conductores & Curso Vial | W | W | W | R | R | R | **W** | R |
| Directorio WhatsApp | W | W | W | R | R | R | **W** | R |
| Alertas de Vencimiento | W | W | W | R | R | **W** | R | R |
| Importar / Exportar | W | W | W | — | **W** | — | — | — |
| Portal del Operario | W | W | W | **W** | — | — | — | — |
| Historial de Auditoría | W | W | W | — | R | R | R | — |
| Cuentas y Accesos | W | W | W | — | — | — | — | — |
| Configuración & Empresa | W | W | W | — | R | — | — | — |
| Gestión de Cartelera | W | W | W | — | — | — | **W** | — |
| Backup & Migración | W | W | W | — | R | — | — | — |

> **Módulo propio** de cada rol no privilegiado:
> - `operator` → Portal del Operario.
> - `tesorero` → Importar / Exportar (reportes y conciliación).
> - `fiscalizador` → Alertas de Vencimiento.
> - `secretaria` → Personas, Curso Vial, Directorio WhatsApp y Gestión del Portal.
> - `registrador` → Registrar Unidad, Padrón y Personas.

---

## 3. Roles institucionales

| ID | Nombre | `isSystem` | Propósito |
| :--- | :--- | :---: | :--- |
| `admin` | Administrador General | Sí | Control total, usuarios, configuración y auditoría. |
| `developer` | Programador / Soporte Técnico | Sí | Mantenimiento, diagnóstico, migraciones y soporte. |
| `gerente` | Gerente General | Sí | Supervisión integral y reportes estratégicos. |
| `operator` | Operario de Turno | Sí | Operación en campo y portal de su unidad. |
| `tesorero` | Tesorero / Finanzas | Sí | Reportes, importación/exportación y conciliación. |
| `fiscalizador` | Fiscalizador de Flota | Sí | Control documentario y vencimientos. |
| `secretaria` | Secretaría General | Sí | Socios, conductores, cursos, comunicados y agenda. |
| `registrador` | Registrador de Unidades | Sí | Alta y actualización de unidades y propietarios. |

Los roles creados desde la interfaz se guardan con `isSystem: false` y **sí pueden eliminarse**; sus usuarios se reasignan automáticamente a `operator`.

---

## 4. Aplicación en el backend

El middleware `requireModule(moduleId, mode)` consulta la matriz del rol en PostgreSQL:

- `mode = 'write'` exige permiso `write`.
- `mode = 'read'` acepta `read` o `write`.
- `admin`, `developer` y `gerente` siempre pasan.
- Un rol inexistente o sin la clave del módulo recibe `403`.

Rutas protegidas (resumen):

| Módulo | Rutas |
| :--- | :--- |
| `nuevo` | `POST /api/vehicles` |
| `padron` | `PUT /api/vehicles/:id` |
| `personas` | `PUT /api/persons/:id` |
| `curso-vial` | `GET /api/drivers/courses`, `PUT /api/drivers/:id/course`, `POST /api/drivers/courses/bulk-sync`, `POST /api/drivers/courses/process-ai-document` |
| `vencimientos` | `GET /api/expirations` |
| `dashboard` | `GET /api/dashboard/stats` |
| `importar-exportar` | `GET /api/export`, `POST /api/import/preview`, `POST /api/import/preview-pdf`, `POST /api/import/confirm` |
| `gestion-portal` | `POST/PUT/DELETE/PATCH /api/portal/posts*`, `POST/PUT/DELETE /api/portal/events*` |
| `usuarios` | `GET /api/users` |
| `directorio-contacto` | `GET /api/contacts` |
| `backup-migracion` | `GET /api/backup/export`, `GET /api/backup/stats`, `POST /api/backup/restore` |

Las operaciones de máxima criticidad (retirar/reactivar unidad, cambiar o intercambiar padrón, revisar solicitudes, gestionar roles y usuarios) siguen exigiendo `requireAdmin`, que ahora acepta a `admin`, `developer` y `gerente`.

---

## 5. Cómo probar la distribución

### 5.1 Desde la interfaz

1. Arranca con `npm run dev`.
2. En el login elige un rol (o usa los botones de acceso demo).
3. Verifica que el menú lateral solo muestre los módulos permitidos.
4. Abre **Cuentas y Accesos** con un rol privilegiado para editar la matriz.

### 5.2 Con tokens de desarrollo

Con `AUTH_DEV_MODE=true` (o `NODE_ENV!=production`) el servidor acepta:

```text
Authorization: Bearer dev-admin-token
Authorization: Bearer dev-operator-token
Authorization: Bearer dev-gerente-token
Authorization: Bearer dev-fiscalizador-token
Authorization: Bearer dev-secretaria-token
Authorization: Bearer dev-registrador-token
Authorization: Bearer dev-developer-token
Authorization: Bearer dev-tesorero-token
```

Ejemplos:

```bash
# Operario: no puede listar usuarios (403)
curl -s -o NUL -w "%{http_code}\n" \
  -H "Authorization: Bearer dev-operator-token" \
  http://localhost:3000/api/users

# Gerente: sí puede (200)
curl -s -o NUL -w "%{http_code}\n" \
  -H "Authorization: Bearer dev-gerente-token" \
  http://localhost:3000/api/users

# Operario: no puede registrar unidades (403)
curl -s -o NUL -w "%{http_code}\n" \
  -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-operator-token" \
  -d "{}" http://localhost:3000/api/vehicles
```

### 5.3 Smoke test automatizado

```bash
npm run dev      # terminal 1
npm run smoke    # terminal 2
```

El script [`scripts/smoke.mjs`](../scripts/smoke.mjs) verifica salud, autenticación, RBAC de escritura, backup y lecturas permitidas. No crea datos: usa cuerpos inválidos para comprobar que el RBAC responde antes de la validación.

---

## 6. Cambiar la matriz

1. Entra como `admin`, `developer` o `gerente`.
2. Ve a **Cuentas y Accesos → Roles**.
3. Pulsa **Configurar permisos** en el rol.
4. Ajusta cada módulo a `Sin acceso`, `Lectura` o `Escritura`.
5. Guarda. El cambio se persiste en `system_roles.permissions` y se aplica en la siguiente petición.

> Si agregas un módulo nuevo, actualiza `SystemModuleId`, `SYSTEM_MODULES_CONFIG` y la matriz de cada rol en `frontend/src/config/roles.ts`. El seed agregará la clave faltante sin sobrescribir los permisos ya personalizados.

---

## 7. Deuda pendiente (Fase 1)

- Autenticación real con contraseña hasheada y sesiones firmadas.
- Validar el rol contra la base de datos también en el login.
- Pruebas automatizadas de RBAC con Supertest.
- Registrar en auditoría los cambios de permisos.
