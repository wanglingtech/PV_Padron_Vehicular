# Reglas de documentación

## Dónde va cada cosa

| Tipo de contenido | Ubicación |
| :--- | :--- |
| Presentación, stack, instalación rápida | `README.md` |
| Instalación detallada y troubleshooting | `docs/INSTALACION.md` |
| Stack y decisiones técnicas | `docs/STACK.md` |
| Reglas de negocio y arquitectura | `docs/ARQUITECTURA_SISTEMA.md` |
| Diagramas | `docs/DIAGRAMAS.md` |
| Endpoints | `docs/API.md` |
| Fases y pendientes | `docs/ROADMAP.md` |
| Despliegue | `docs/DESPLIEGUE.md` |
| Calidad e indicadores | `docs/CALIDAD.md` |
| Seguridad | `SECURITY.md` + `docs/SEGURIDAD.md` |
| Pruebas | `docs/TESTING.md` |
| Convenciones de contribución | `CONTRIBUTING.md` + `docs/CONTRIBUCION.md` |
| Contexto para agentes IA | `AGENTS.md` + `.agents/` |
| Capturas | `docs/screenshots/` |

## Convenciones

- Markdown con títulos jerárquicos (`#`, `##`, `###`).
- Español claro, sin jerga innecesaria.
- Bloques de código con lenguaje (`bash`, `ts`, `json`, `sql`).
- Enlaces relativos dentro del repositorio.
- Diagramas en **Mermaid** (se renderizan en GitHub).
- No incluir credenciales, rutas absolutas personales ni datos reales.
- Al cambiar un comando o variable de entorno, actualizar README **y** docs.

## Capturas

- Formato PNG, ancho recomendado 1440 px.
- Nombres: `NN-modulo.png` (ej. `04-padron.png`).
- No mostrar datos personales reales; usar datos de demostración.
- Guardar en `docs/screenshots/`.
