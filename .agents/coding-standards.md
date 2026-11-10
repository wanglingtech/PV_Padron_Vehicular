# Estándares de código

## Lenguaje y estilo

- **TypeScript estricto** en todo el código nuevo.
- **Interfaz y documentación en español**; identificadores (variables, funciones, tablas) en inglés.
- 2 espacios de indentación, comillas simples, punto y coma al final.
- Componentes React en `PascalCase`; funciones y variables en `camelCase`; constantes en `UPPER_SNAKE_CASE`.
- Archivos de componentes/vistas en `PascalCase.tsx`; utilidades en `kebab-case.ts`.

## Frontend

- Vistas en `frontend/src/views/`, componentes reutilizables en `frontend/src/components/`.
- No duplicar lógica de negocio en componentes: extraer a `frontend/src/utils/` o al backend.
- Usar el cliente tipado `frontend/src/api/client.ts`; no llamar `fetch` directo en las vistas.
- Mantener accesibilidad: `aria-label`, foco visible, contraste y navegación por teclado.
- Evitar `any`; si es inevitable, justificar con un comentario.
- Respetar el modo claro/oscuro (`dark:`) y el diseño responsive existente.

## Backend

- `server.ts` es solo el arranque (dotenv, Vite/estáticos, `listen`). La app Express se crea en `backend/app.ts`.
- Rutas agrupadas por dominio en `backend/routes/` y validadas con Zod.
- Lógica reutilizable en `backend/services/`; acceso a datos en `backend/db/`; utilidades de servidor en `backend/utils/`.
- Errores al cliente con `{ error: string }` y código HTTP correcto (`400`, `401`, `403`, `404`, `409`, `500`).
- No exponer stack traces ni detalles internos en producción.
- Registrar errores con `console.error` y contexto suficiente (sin datos sensibles).
- No devolver contraseñas, hashes ni tokens de sesión en respuestas de usuario.

## Comentarios

- Comentar el **por qué**, no el **qué**.
- Documentar funciones públicas con JSDoc breve.
- Evitar comentarios obsoletos: si cambia el código, actualiza el comentario.

## Dependencias

- No añadir dependencias sin justificar tamaño, mantenimiento y licencia.
- Preferir lo ya instalado antes de sumar una librería nueva.
- Actualizar `package.json` y el lockfile en el mismo commit.
