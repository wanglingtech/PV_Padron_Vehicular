# Reglas de base de datos

## Fuente de verdad

- El esquema se define **solo** en `frontend/src/db/schema.ts`.
- `database/schema.sql` y `drizzle/*.sql` son **generados**. No editarlos a mano.
- Flujo ante un cambio de modelo:

```bash
# 1. Editar frontend/src/db/schema.ts
npm run db:generate   # genera drizzle/000X_*.sql
npm run db:push       # aplica a la base local
# 2. Regenerar database/schema.sql a partir de la migración
```

## Convenciones

- Tablas y columnas en `snake_case`; propiedades TypeScript en `camelCase`.
- Toda tabla nueva debe tener `id` (serial o text), `created_at` y, si aplica, `updated_at`.
- Claves foráneas con `ON DELETE` explícito (`cascade` o `set null`).
- Fechas de negocio (emisión/vencimiento) se guardan como `text` ISO `YYYY-MM-DD` por compatibilidad con la UI actual.
- Evitar borrar columnas con datos sin migración y backup previo.

## Consultas

- Usar el query builder de Drizzle; no SQL crudo salvo casos justificados.
- Para operaciones multi-paso críticas (swap de padrón, restauración) usar transacciones.
- Paginar listados grandes; no cargar tablas completas en memoria.
- Índices: evaluar `padron_number`, `plate`, `dni` y fechas de vencimiento.

## Datos y privacidad

- No incluir datos reales de personas en el repositorio ni en capturas.
- Los backups locales (`backups/`, `*.dump`) están ignorados por Git.
- En producción, cifrar backups y restringir acceso.

## Conexión

- La configuración se lee de `SQL_*` (ver `.env.example`).
- `frontend/src/db/index.ts` valida variables, soporta `SQL_SSL` y expone `verifyDatabaseConnection()`.
- El servidor **no arranca** si la conexión falla; muestra host/puerto/base y un mensaje accionable.
