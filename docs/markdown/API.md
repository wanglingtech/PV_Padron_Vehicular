# API REST

Base URL local: `http://localhost:3000`

- Todas las respuestas son JSON.
- Los errores usan `{ "error": "mensaje" }`.
- Los errores de validación añaden el detalle campo a campo:
  ```json
  { "error": "Datos inválidos.", "details": [{ "campo": "plate", "mensaje": "La placa es obligatoria." }] }
  ```
- Las rutas marcadas con 🔒 requieren `Authorization: Bearer <token>` o la cookie `padron_session`.
- Las rutas marcadas con 👑 requieren además un rol privilegiado (`admin`, `developer`, `gerente`).

---

## Salud

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :---: | :--- |
| GET | `/api/health` | — | Estado del servicio y de la base (`database: up/down`). |

```json
{ "status": "ok", "database": "up", "target": "localhost:5432/padron_vehicular" }
```

---

## Autenticación

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :---: | :--- |
| POST | `/api/auth/login` | — | Valida correo y contraseña. Devuelve `{ user, token }` y fija la cookie `HttpOnly`. |
| POST | `/api/auth/logout` | — | Limpia la cookie de sesión. |
| GET | `/api/auth/me` | 🔒 | Devuelve el usuario de la sesión actual. |
| POST | `/api/auth/change-password` | 🔒 | Cambia la contraseña del usuario autenticado. |
| POST | `/api/auth/forgot-password` | — | Envía por correo un enlace de restablecimiento. Respuesta idéntica exista o no la cuenta. Límite: 5/hora. |
| POST | `/api/auth/reset-password` | — | Cambia la contraseña con el token del correo (un solo uso, 60 min). |

> Ver [`AUTENTICACION.md`](AUTENTICACION.md) para el detalle del flujo y las variables de sesión.

---

## Vehículos / padrón

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :---: | :--- |
| GET | `/api/vehicles` | — | Lista paginada. Query: `search`, `status`, `lifeStatus`, `sortBy`, `sortOrder`, `page`, `limit`. |
| GET | `/api/vehicles/:id` | — | Ficha completa de una unidad. |
| POST | `/api/vehicles` | 🔒 | Crea una unidad. |
| PUT | `/api/vehicles/:id` | 🔒 | Actualiza una unidad. |
| DELETE | `/api/vehicles/:id` | 🔒 👑 | Elimina una unidad. |
| POST | `/api/vehicles/:id/retire` | 🔒 👑 | Retira una unidad con motivo. |
| POST | `/api/vehicles/:id/reactivate` | 🔒 👑 | Reactiva una unidad retirada. |
| POST | `/api/vehicles/:id/padron/change` | 🔒 👑 | Cambia el número de padrón. |
| POST | `/api/vehicles/padron/swap` | 🔒 👑 | Intercambia padrones entre dos unidades (transaccional). |
| GET | `/api/vehicles/:id/padron-history` | — | Historial de padrones de una unidad. |

### Ejemplo: crear vehículo

```bash
# 1. Inicia sesión y guarda el token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@transporte.pe","password":"admin123"}' | jq -r .token)

# 2. Crea el vehículo con el Bearer
curl -X POST http://localhost:3000/api/vehicles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "padronNumber": "P-001",
    "plate": "ABC-123",
    "brand": "Toyota",
    "modelYear": 2022,
    "driverId": null
  }'
```

---

## Solicitudes de cambio de padrón

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :---: | :--- |
| GET | `/api/padron-requests` | — | Lista solicitudes. |
| POST | `/api/padron-requests` | 🔒 | Crea una solicitud. |
| PUT | `/api/padron-requests/:id/review` | 🔒 👑 | Aprueba o rechaza. |

---

## Personas y contactos

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :---: | :--- |
| GET | `/api/persons` | — | Directorio de propietarios/conductores. |
| PUT | `/api/persons/:id` | 🔒 👑 | Actualiza una persona. |
| GET | `/api/contacts` | — | Contactos agrupados por rol (WhatsApp). |

---

## Dashboard, vencimientos y cursos

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :---: | :--- |
| GET | `/api/dashboard/stats` | — | Métricas y alertas del dashboard. |
| GET | `/api/expirations` | — | Documentos vencidos y por vencer. |
| GET | `/api/drivers/courses` | — | Conductores y estado del curso vial. |
| PUT | `/api/drivers/:id/course` | 🔒 👑 | Actualiza el curso de un conductor. |
| POST | `/api/drivers/courses/bulk-sync` | 🔒 👑 | Sincronización masiva por DNI. |
| POST | `/api/drivers/courses/process-ai-document` | 🔒 👑 | Extrae aprobados desde PDF/imagen con Gemini. |

---

## Auditoría

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :---: | :--- |
| GET | `/api/audit-logs` | — | Bitácora de cambios. |

---

## Importación / exportación

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :---: | :--- |
| POST | `/api/import/preview` | 🔒 | Previsualiza un Excel (validación de tipo, tamaño y firma binaria). |
| POST | `/api/import/preview-pdf` | 🔒 | Previsualiza un PDF. |
| POST | `/api/import/confirm` | 🔒 | Confirma e importa filas ya validadas con Zod (máximo 5000). |
| GET | `/api/export` | — | Exporta datos a Excel (ExcelJS) según filtros. |

---

## Backup y restauración

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :---: | :--- |
| GET | `/api/backup/export` | 🔒 👑 | Exporta backup JSON o SQL. |
| GET | `/api/backup/stats` | 🔒 | Estadísticas de la base. |
| POST | `/api/backup/restore` | 🔒 👑 | Restaura un backup. Exige `confirm: "RESTAURAR"` en el cuerpo. |

---

## Roles y usuarios

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :---: | :--- |
| GET | `/api/roles` | — | Lista roles y permisos. |
| POST | `/api/roles` | 🔒 👑 | Crea un rol. |
| PUT | `/api/roles/:id` | 🔒 👑 | Actualiza un rol. |
| DELETE | `/api/roles/:id` | 🔒 👑 | Elimina un rol no sistémico. |
| GET | `/api/users` | 🔒 | Lista usuarios. |
| POST | `/api/users` | 🔒 👑 | Crea usuario. |
| PUT | `/api/users/:id` | 🔒 👑 | Actualiza usuario. |
| DELETE | `/api/users/:id` | 🔒 👑 | Elimina usuario. |

---

## Portal institucional

| Método | Ruta | Auth | Descripción |
| :--- | :--- | :---: | :--- |
| GET | `/api/portal/posts` | — | Publicaciones activas. |
| POST | `/api/portal/posts` | 🔒 | Crea publicación. |
| PUT | `/api/portal/posts/:id` | 🔒 | Actualiza publicación. |
| DELETE | `/api/portal/posts/:id` | 🔒 | Elimina publicación. |
| PATCH | `/api/portal/posts/reorder` | 🔒 | Reordena el carrusel. |
| GET | `/api/portal/events` | — | Eventos y agenda. |
| POST | `/api/portal/events` | 🔒 | Crea evento. |
| PUT | `/api/portal/events/:id` | 🔒 | Actualiza evento. |
| DELETE | `/api/portal/events/:id` | 🔒 | Elimina evento. |

---

## Códigos de estado

| Código | Significado |
| :---: | :--- |
| 200 | OK |
| 201 | Creado |
| 400 | Datos inválidos |
| 401 | No autenticado |
| 403 | Sin permisos |
| 404 | No encontrado |
| 409 | Conflicto (duplicado) |
| 429 | Demasiadas peticiones (rate limit) |
| 500 | Error interno |

---

## Pruebas

La colección lista para ejecutar está en [`../api-tests/bruno/`](../../api-tests/bruno/).
