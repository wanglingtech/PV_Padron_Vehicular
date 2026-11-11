# Guía de contribución

Gracias por contribuir al Sistema de Padrón Vehicular.

---

## 1. Flujo de trabajo

```bash
# 1. Actualiza main
git checkout main
git pull origin main

# 2. Crea una rama descriptiva
git checkout -b feat/login-real
# prefijos: feat, fix, docs, refactor, test, chore, perf, ci

# 3. Desarrolla y valida
npm run lint
npm run build

# 4. Commit
git add .
git commit -m "feat(auth): agregar login con hash de contraseña"

# 5. Push y Pull Request
git push origin feat/login-real
```

---

## 2. Convención de commits

Formato [Conventional Commits](https://www.conventionalcommits.org/):

```text
<tipo>(<alcance>): <descripción corta en imperativo>

[cuerpo opcional]

[footer opcional]
```

Ejemplos:

- `feat(padron): permitir intercambio transaccional de padrones`
- `fix(auth): rechazar peticiones sin token`
- `docs(readme): documentar variables de entorno`
- `refactor(db): extraer consultas de vehículos`

---

## 3. Estándares de código

- TypeScript estricto, sin `any` injustificado.
- 2 espacios, comillas simples, punto y coma.
- Nombres de código en inglés; UI y comentarios en español.
- Componentes en `PascalCase`; utilidades en `kebab-case`.
- No duplicar lógica: extraer a `utils/` o `db/`.

Ver [`.agents/coding-standards.md`](../../.agents/coding-standards.md).

---

## 4. Pull Requests

Un PR debe incluir:

- Descripción del problema y solución.
- Capturas si cambia la UI.
- Pasos para probar.
- Checklist de validación.
- Issues relacionadas (`Closes #123`).

Plantilla: [`.github/pull_request_template.md`](../../.github/pull_request_template.md).

### Revisión

- Al menos 1 aprobación.
- CI en verde.
- Sin conflictos con `main`.
- Sin secretos ni archivos generados.

---

## 5. Reportar bugs

Usa la plantilla de issue correspondiente en `.github/ISSUE_TEMPLATE/`. Incluye:

- Pasos para reproducir.
- Resultado esperado vs. actual.
- Entorno (SO, Node, PostgreSQL, navegador).
- Logs relevantes **sin datos sensibles**.

---

## 6. Seguridad

No abras issues públicos para vulnerabilidades. Sigue [`../SECURITY.md`](../../SECURITY.md).

---

## 7. Documentación

Si tu cambio afecta comandos, variables, endpoints o arquitectura, actualiza:

- `README.md`
- `docs/` correspondiente
- `docs/markdown/ROADMAP.md` si cambia el alcance
