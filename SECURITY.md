# Política de seguridad

## Versiones soportadas

| Versión | Soporte |
| :--- | :--- |
| `main` | ✅ Activa |
| Releases anteriores | ⚠️ Solo correcciones críticas |

## Reportar una vulnerabilidad

**No abras un issue público.** Envía un correo a:

```text
seguridad@<tu-dominio>.com
```

Incluye:

- Descripción del problema y su impacto.
- Pasos para reproducirlo.
- Versión/commit afectado.
- Prueba de concepto (sin datos reales).
- Sugerencia de mitigación, si la tienes.

### Compromiso

- Confirmación de recepción: **48 h**.
- Evaluación inicial: **5 días hábiles**.
- Corrección según severidad:
  - Crítica: **72 h**
  - Alta: **7 días**
  - Media/Baja: **30 días**

No se tomarán represalias contra investigadores que actúen de buena fe.

## Alcance

Incluye:

- API Express y lógica de negocio.
- Autenticación y RBAC.
- Esquema y consultas a PostgreSQL.
- Importación/exportación de archivos.
- Manejo de backups y datos personales.

Fuera de alcance:

- Ingeniería social.
- Ataques de denegación de servicio voluntarios.
- Vulnerabilidades en dependencias sin impacto demostrable.
- Entornos de demostración sin datos reales.

## Estado de seguridad conocido

⚠️ **Este proyecto aún no debe usarse con datos personales reales en producción.**

Riesgos abiertos:

1. El login del frontend **no valida contraseñas**.
2. Las contraseñas se guardan en **texto plano**.
3. Los tokens `dev-*` existen para desarrollo (deshabilitados con `NODE_ENV=production`).
4. Faltan rate limiting, CORS explícito y cabeceras de seguridad.
5. No hay pruebas automatizadas de seguridad.

El detalle y el plan de mitigación están en [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) y [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Buenas prácticas para contribuidores

- Nunca subas `.env`, claves privadas, dumps o bases SQLite.
- Valida toda entrada en el servidor.
- Usa consultas parametrizadas.
- No devuelvas contraseñas ni tokens en las respuestas.
- Ejecuta `npm audit` antes de un PR.
- Si detectas un secreto en el historial, avisa de inmediato.
