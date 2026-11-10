# Sistema Integral de Gestión de Padrón Vehicular (Trans-Padrón Pro)

## 1. Visión General del Sistema
El **Sistema de Gestión de Padrón Vehicular** es una plataforma integral desarrollada para la administración, supervisión, formalización y fiscalización de flotas de transporte público menor (mototaxis, motofurgones y vehículos autorizados).

Permite a la asociación de transportistas y a las autoridades municipales:
- Mantener un padrón vehicular depurado, libre de duplicados y con historial inmutable.
- Administrar el directorio de propietarios y conductores, reconociendo múltiples titulares o choferes con fechas de vigencia.
- Fiscalizar los vencimientos críticos de documentación obligatoria (AFOCAT/SOAT, CITV - Inspección Técnica, Licencia de Conducir Clase B-II-C, y Curso Anual de Educación Vial).
- Gestionar reasignaciones e intercambios transaccionales seguros de números de padrón entre unidades sin alterar los identificadores internos (`vehicle.id`).
- Permitir a los operarios/conductores capturar fotografías en vivo con su cámara móvil (DNI, Licencia, AFOCAT y moto) y controlar sus fechas de renovación.

### Arquitectura de despliegue actual

El sistema es un **monolito modular**: un único proceso Node (`server.ts` + `backend/app.ts`) sirve la API Express y el frontend compilado por Vite, sobre la misma base PostgreSQL. El código está organizado en `backend/` (servidor), `frontend/src/` (cliente) y `shared/` (catálogo compartido de roles, módulos y fechas).

La decisión de mantener esta arquitectura y los pasos para migrar a repositorios separados (`padron-api`, `padron-web`, `@padron/shared`) están documentados en [`MIGRACION_ARQUITECTURA.md`](MIGRACION_ARQUITECTURA.md).

---

## 2. Roles del Sistema y Matriz de Permisos

| Módulo / Funcionalidad | Rol Administrador | Rol Operario / Chofer |
| :--- | :---: | :---: |
| **Dashboard y Estadísticas** | Acceso Total | Acceso Lectura |
| **Padrón Vehicular (Altas / Bajas)** | Crear, Editar, Retirar, Reactivar | Visualización de Flota |
| **Intercambio / Reasignación de Padrón** | Aprobación y Ejecución Transaccional | Solicitud de Reasignación |
| **Directorio de Personas** | Crear, Editar, Consultar | Consulta Básica |
| **Conductores & Curso Vial Anual** | Carga de Actas, Cruce Automático, Edición | Ver su Estado de Aprobación |
| **Alertas de Vencimiento** | Control General y Exportación | Ver sus Plazos de Renovación |
| **Portal del Operario (Cámara en Vivo)** | Supervisión de Fotos | Captura en Vivo y Registro |
| **Importación / Exportación Excel** | Diagnóstico y Ejecución Idempotente | No Permitido |
| **Historial de Auditoría Inmutable** | Auditoría Completa | No Permitido |
| **Configuración Institucional** | Configuración de Empresa y Logo | No Permitido |

---

## 3. Reglas de Negocio Esenciales

### A. Desacoplamiento entre `id` y `padronNumber`
- Cada vehículo posee un identificador numérico interno único e inmutable (`vehicle.id`).
- El número de padrón (`padron_number`) es un atributo asignado dinámicamente que puede reasignarse o intercambiarse sin romper el histórico, propietarios o pólizas.

### B. Intercambio Transaccional de Padrones (Atomic Swap)
- Cuando la unidad A (Padrón 6) y la unidad B (Padrón 42) intercambian padrones, la operación se ejecuta en una única transacción PostgreSQL:
  1. La unidad A recibe un valor temporal (`SWAP_TEMP_<timestamp>`).
  2. La unidad B recibe el Padrón 6.
  3. La unidad A recibe el Padrón 42.
  4. Se registra en `vehicle_padron_history` el motivo, referencia de autorización y usuario auditor.
- Si cualquier paso falla, se ejecuta `ROLLBACK` total.

### C. Cruce Automático de Curso Vial Anual
- El módulo de Conductores permite subir actas oficiales en PDF/Excel o texto plano con los DNI de los aprobados.
- El sistema cruza automáticamente los números de DNI contra la base de datos y reporta quiénes pasaron y a quiénes les falta capacitarse.
