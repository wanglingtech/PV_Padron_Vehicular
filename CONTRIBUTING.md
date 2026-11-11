# Contribuir

¡Gracias por tu interés! Este repositorio acepta contribuciones de código, documentación, pruebas y reportes de bugs.

## Inicio rápido

```bash
git clone https://github.com/<tu-usuario>/padron-vehicular.git
cd padron-vehicular
npm install
cp .env.example .env   # Windows: copy .env.example .env
npm run db:push
npm run dev
```

## Antes de abrir un PR

```bash
npm run lint
npm run build
```

- Sigue la convención de commits ([Conventional Commits](https://www.conventionalcommits.org/)).
- Añade o actualiza documentación si cambia el comportamiento.
- No incluyas secretos, `.env`, `dist/`, `node_modules/` ni datos reales.
- Usa la plantilla de Pull Request.

## Documentación completa

- [`docs/markdown/CONTRIBUCION.md`](docs/markdown/CONTRIBUCION.md) — flujo, ramas, commits y revisión.
- [`AGENTS.md`](AGENTS.md) — reglas para agentes de IA.
- [`.agents/`](.agents/) — estándares de código, seguridad, BD y pruebas.
- [`SECURITY.md`](SECURITY.md) — cómo reportar vulnerabilidades.

## Código de conducta

Sé respetuoso, constructivo y profesional. No se tolera acoso ni discriminación.
