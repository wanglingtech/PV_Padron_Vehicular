# `.agents/` — Contexto operativo para agentes de IA

Esta carpeta contiene las reglas y el contexto que cualquier agente (OpenCode, Codex, Claude Code, Copilot, etc.) debe leer antes de trabajar en el proyecto.

## Índice

| Archivo | Propósito |
| :--- | :--- |
| [`project-context.md`](project-context.md) | Qué es el sistema, alcance, estado y decisiones clave. |
| [`coding-standards.md`](coding-standards.md) | Convenciones de código, nombres, estructura y estilo. |
| [`security-rules.md`](security-rules.md) | Reglas de seguridad obligatorias y deuda técnica conocida. |
| [`database-rules.md`](database-rules.md) | Esquema, migraciones, consultas y datos. |
| [`testing-rules.md`](testing-rules.md) | Qué probar y cómo validar antes de entregar. |
| [`docs-rules.md`](docs-rules.md) | Cómo y dónde documentar. |

## Principios

1. **Seguridad primero:** nunca introducir secretos, credenciales ni datos reales en el repositorio.
2. **Cambios pequeños y verificables:** una tarea, un cambio coherente, una validación.
3. **No romper el flujo actual:** la app debe seguir arrancando con `npm run dev`.
4. **La documentación es parte del código:** si cambia el comportamiento, cambia la doc.
5. **Trazabilidad:** explica qué se cambió, por qué y cómo se verificó.
