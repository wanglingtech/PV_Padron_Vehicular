# Reglas de pruebas y validación

## Antes de entregar cualquier cambio

```bash
npm run lint     # obligatorio
npm run build    # obligatorio si se tocó server.ts, backend/, vite o configuración
npm run smoke    # recomendado si se tocó la API o auth (requiere npm run dev)
```

Si el cambio afecta a la base de datos:

```bash
npm run db:push
npm run dev
curl http://localhost:3000/api/health
# esperado: {"status":"ok","database":"up",...}
```

## Pruebas manuales mínimas

| Área | Verificación |
| :--- | :--- |
| Arranque | `npm run dev` sin errores; health con `database: up`. |
| Padrón | Listar, crear, editar, ver ficha y retirar una unidad. |
| Padrón (swap) | Intercambiar dos números y comprobar historial. |
| Personas | Crear/editar persona y asociarla a un vehículo. |
| Vencimientos | Ver semaforización y filtros. |
| Importación | Previsualizar y confirmar un Excel de prueba. |
| Portal | Crear publicación/evento y verlo en el portal. |
| Auditoría | Verificar que los cambios quedan registrados. |
| Responsive | Probar 360 px, 768 px y 1440 px. |
| Tema | Modo claro y oscuro. |

## Pruebas de API

- Usar la colección `api-tests/bruno/`.
- Verificar códigos `200/201`, `400` (validación), `401` (sin auth) y `403` (rol insuficiente).

## Pruebas futuras (roadmap)

- Unitarias: Vitest para `utils/` y `db/`.
- Integración: Supertest contra una base de prueba.
- E2E: Playwright para flujos críticos.
- Accesibilidad: axe-core.
- Carga: k6 o Artillery para listados y exportaciones.

## Criterio de aceptación

Un cambio está listo cuando:

1. Compila (`npm run lint` y `npm run build`).
2. No rompe el arranque ni la conexión a la base.
3. Fue probado manualmente en el área afectada.
4. La documentación refleja el nuevo comportamiento.
