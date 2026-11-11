# Indicadores de calidad

Marco de referencia para evaluar y mejorar el proyecto según estándares de ingeniería de software (ISO/IEC 25010).

---

## 1. Mantenibilidad

| Aspecto | Estado actual | Objetivo |
| :--- | :--- | :--- |
| Tipado estricto | TypeScript con `strict: true` en todo el proyecto | Mantener |
| Estructura | Monolito modular con routers por dominio | Extraer `shared/` como paquete publicable |
| Documentación | README + `docs/` + `.agents/` | Mantener actualizada |
| Complejidad | `backend/services/seed.service.ts` y algunas vistas son grandes | Dividir archivos > 500 líneas |
| Duplicación | Media en vistas y utilidades | Extraer componentes/hooks |

**Métricas sugeridas:** complejidad ciclomática < 15 por función, archivos < 500 líneas, cobertura ≥ 60%.

---

## 2. Escalabilidad

| Aspecto | Estado | Acción |
| :--- | :--- | :--- |
| Paginación | En padrón y listados principales | Revisar listados restantes |
| Índices | Básicos (`padron_number`, `plate`, `dni`) | Añadir índices por fecha de vencimiento |
| Conexiones | Pool `pg` con máximo 10 | Ajustar según proveedor |
| Estateless API | Sí (excepto pool) | Compatible con réplicas |
| Archivos | En base64/JSON | Migrar a almacenamiento de objetos |

**Objetivo:** soportar 10.000+ vehículos y 100 usuarios concurrentes sin degradación perceptible.

---

## 3. Seguridad

Ver [`SEGURIDAD.md`](SEGURIDAD.md). Resumen:

- ✅ Autenticación real con argon2id, JWT y cookie `HttpOnly`.
- ✅ Secretos fuera del repositorio.
- ✅ Validación Zod en el 100 % de las escrituras y consultas parametrizadas.
- ✅ `helmet`, CORS configurable y rate limit en login, escrituras, subidas y reset.
- ✅ Sanitización de archivos subidos y URLs de multimedia.
- ✅ `npm audit` en CI sin vulnerabilidades altas ni críticas.
- ✅ Pruebas automatizadas que cubren auth, RBAC, validación y restablecimiento.
- ⚠️ Pendiente: revocación inmediata de sesiones y bloqueo por usuario.

---

## 4. Usabilidad

- Interfaz en español, responsive (móvil/tablet/escritorio).
- Navegación lateral + barra inferior móvil.
- Feedback con toasts, modales y estados vacíos.
- Modo claro/oscuro.
- **Pendiente:** pruebas con usuarios reales, medición de tareas y satisfacción (SUS).

---

## 5. Confiabilidad

| Aspecto | Estado |
| :--- | :--- |
| Transacciones | SWAP de padrón y restauración |
| Validación al arrancar | Verifica PostgreSQL y falla con mensaje claro |
| Health check | `GET /api/health` con estado de BD |
| Backups | Exportación JSON/SQL manual |
| Recuperación | Restauración manual |
| **Pendiente** | Backups automáticos, monitoreo y alertas |

**Objetivo:** disponibilidad ≥ 99% en horario operativo, RPO ≤ 24 h, RTO ≤ 4 h.

---

## 6. Accesibilidad (WCAG 2.1 AA)

- [x] HTML semántico en la mayoría de vistas.
- [x] Navegación por teclado en componentes principales.
- [x] Contraste adecuado en modo claro/oscuro (15/15 módulos verificados).
- [x] Auditoría con axe-core (`@axe-core/playwright`, WCAG 2.1 A/AA).
- [x] `aria-label` en los controles icónicos principales.
- [ ] Foco visible homogéneo.
- [ ] Textos alternativos en todas las imágenes.
- [ ] Pruebas con lector de pantalla.

---

## 7. Rendimiento

- [ ] Medir Lighthouse (objetivo: Performance ≥ 90, Accessibility ≥ 90).
- [ ] Code splitting por vista.
- [ ] Lazy loading de mapas y librerías pesadas (`leaflet`, `exceljs`, `jspdf`).
- [ ] Compresión de imágenes antes de subir.
- [ ] Cache de catálogos y roles.

---

## 8. Portabilidad

- Código web reutilizable para Tauri/Electron/Capacitor.
- Dependencia de PostgreSQL en el servidor; SQLite previsto para local.
- Variables de entorno para todos los entornos.
- Build reproducible con lockfile.

---

## 9. Testabilidad

- [x] Unitarias (Vitest).
- [x] Integración (Supertest sobre `padron_vehicular_test`).
- [x] E2E (Playwright, 10 flujos en el puerto 3100).
- [x] Cobertura medida: 68 % líneas / 52 % ramas / 82 % funciones.
- [x] Pruebas manuales de API con Bruno.
- [x] Verificación de tipos (`tsc`).

---

## 10. Documentación y trazabilidad

- [x] README, `docs/`, `AGENTS.md`, `.agents/`.
- [x] Diagramas Mermaid.
- [x] Convención de commits.
- [ ] CHANGELOG automático.
- [ ] Versionado semántico y tags.

---

## Matriz resumen

| Indicador | Nivel actual | Meta |
| :--- | :---: | :---: |
| Mantenibilidad | 🟡 Medio | 🟢 Alto |
| Escalabilidad | 🟡 Medio | 🟢 Alto |
| Seguridad | 🟢 Alto | 🟢 Alto |
| Usabilidad | 🟢 Alto | 🟢 Alto |
| Confiabilidad | 🟡 Medio | 🟢 Alto |
| Accesibilidad | 🟢 Alto | 🟢 Alto |
| Rendimiento | 🟡 Sin medir | 🟢 Alto |
| Portabilidad | 🟢 Alto | 🟢 Alto |
| Testabilidad | 🟢 Alto | 🟢 Alto |

---

## Herramientas recomendadas

| Área | Herramienta |
| :--- | :--- |
| Tipos | `tsc --noEmit` |
| Lint | ESLint + Prettier (pendiente) |
| Unitarias | Vitest |
| API | Supertest + Bruno |
| E2E | Playwright |
| Accesibilidad | axe-core |
| Rendimiento | Lighthouse CI |
| Dependencias | `npm audit`, Dependabot |
| Cobertura | `c8` / Vitest coverage |
