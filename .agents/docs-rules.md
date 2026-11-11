# Reglas de documentación

## Dónde va cada cosa

| Tipo de contenido | Ubicación |
| :--- | :--- |
| Presentación, stack, instalación rápida | `README.md` |
| Instalación detallada y troubleshooting | `docs/markdown/INSTALACION.md` |
| Stack y decisiones técnicas | `docs/markdown/STACK.md` |
| Reglas de negocio y arquitectura | `docs/markdown/ARQUITECTURA_SISTEMA.md` |
| Migración a arquitectura separada (backend/frontend/shared) | `docs/markdown/MIGRACION_ARQUITECTURA.md` |
| Diagramas | `docs/markdown/DIAGRAMAS.md` |
| Endpoints | `docs/markdown/API.md` |
| Fases y pendientes | `docs/markdown/ROADMAP.md` |
| Despliegue | `docs/markdown/DESPLIEGUE.md` |
| Calidad e indicadores | `docs/markdown/CALIDAD.md` |
| Seguridad | `SECURITY.md` + `docs/markdown/SEGURIDAD.md` |
| Autenticación y sesiones | `docs/markdown/AUTENTICACION.md` |
| Pruebas | `docs/markdown/TESTING.md` |
| Convenciones de contribución | `CONTRIBUTING.md` + `docs/markdown/CONTRIBUCION.md` |
| Contexto para agentes IA | `AGENTS.md` + `.agents/` |
| Capturas | `docs/screenshots/` (WebP) |
| Prototipos de UI | `docs/prototipos/` |

## Estructura de `docs/`

| Carpeta | Contenido |
| :--- | :--- |
| `docs/markdown/` | Toda la documentación técnica en Markdown. |
| `docs/prototipos/` | Prototipos de UI por módulo (`prototipo.html`, `interactivo.html`, `.svg`, `captura.webp`). |
| `docs/screenshots/` | Capturas de pantalla de cada módulo. |

Los archivos `.md` viven en `docs/markdown/`. Si agregas uno nuevo, ponlo ahí y
enlázalo desde `README.md` en la tabla de documentación.

## Convenciones

- Markdown con títulos jerárquicos (`#`, `##`, `###`).
- Español claro, sin jerga innecesaria.
- Bloques de código con lenguaje (`bash`, `ts`, `json`, `sql`).
- Enlaces relativos dentro del repositorio.
- Diagramas en **Mermaid** (se renderizan en GitHub).
- No incluir credenciales, rutas absolutas personales ni datos reales.
- Al cambiar un comando o variable de entorno, actualizar README **y** docs.

## Capturas

- Formato **WebP** (no PNG: pesa entre un 45% y un 80% menos para la misma calidad visual).
- Ancho recomendado 1440 px.
- Nombres: `NN-modulo.webp` (ej. `04-padron.webp`).
- No mostrar datos personales reales; usar datos de demostración.
- Guardar en `docs/screenshots/`.
- Convertir con `npx tsx scripts/convert-images-webp.mts` (usa el codificador de Chrome, sin dependencias nuevas).
