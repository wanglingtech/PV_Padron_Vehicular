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

⚠️ **Este proyecto aún no debe usarse con datos personales reales en producción sin una revisión final.**

Riesgos abiertos:

1. Los tokens `dev-*` existen para desarrollo y deben deshabilitarse con `AUTH_DEV_MODE=false` en producción.
2. Faltan pruebas automatizadas de seguridad y revocación inmediata de sesiones.
3. El rate limit cubre el login, pero no todas las escrituras.
4. La recuperación de contraseña por correo aún no está implementada.
5. El despliegue requiere HTTPS, `JWT_SECRET` fuerte y cookies `Secure`.

Mitigado en la Fase 1:

- Login real con validación de contraseña contra PostgreSQL.
- Contraseñas cifradas con argon2id y migración de claves antiguas.
- Sesión con JWT firmado en cookie `HttpOnly` y Bearer para API.
- `helmet`, CORS configurable y rate limit en el login.

El detalle y el plan de mitigación están en [`docs/markdown/SEGURIDAD.md`](docs/markdown/SEGURIDAD.md) y [`docs/markdown/ROADMAP.md`](docs/markdown/ROADMAP.md).

## Buenas prácticas para contribuidores

- Nunca subas `.env`, claves privadas, dumps o bases SQLite.
- Valida toda entrada en el servidor.
- Usa consultas parametrizadas.
- No devuelvas contraseñas ni tokens en las respuestas.
- Ejecuta `npm audit` antes de un PR.
- Si detectas un secreto en el historial, avisa de inmediato.
