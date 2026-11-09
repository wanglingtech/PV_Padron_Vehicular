# Diagramas del sistema

Todos los diagramas usan **Mermaid** y se renderizan directamente en GitHub.

---

## 1. Arquitectura general

```mermaid
flowchart TB
    subgraph Cliente["Cliente (navegador / escritorio / móvil)"]
        UI[React 19 SPA]
        Ctx[AuthContext + ThemeContext]
        ApiClient[api/client.ts]
    end

    subgraph Servidor["Servidor Node.js"]
        Express[Express 4]
        Auth[requireAuth / requireAdmin]
        Routes[Rutas /api/*]
        Services[Excel · PDF · Backup · IA]
    end

    subgraph Datos["Persistencia y servicios"]
        PG[(PostgreSQL 17)]
        FB[Firebase Auth]
        Gemini[Google Gemini]
    end

    UI --> Ctx --> ApiClient
    ApiClient -->|HTTP JSON| Express
    Express --> Auth --> Routes
    Routes --> Services
    Routes --> PG
    Auth -.->|verifyIdToken| FB
    Services -.->|opcional| Gemini
```

---

## 2. Modelo entidad-relación

```mermaid
erDiagram
    SYSTEM_ROLES {
        text id PK
        text name
        text permissions
        boolean is_system
    }
    USERS {
        serial id PK
        text uid UK
        text email
        text role FK
        text password
        boolean is_active
    }
    PERSONS {
        serial id PK
        text dni UK
        text full_name
        text phone
        text status
    }
    VEHICLES {
        serial id PK
        text padron_number UK
        text plate UK
        text brand
        int model_year
        text status
        int driver_id FK
    }
    VEHICLE_OWNERS {
        serial id PK
        int vehicle_id FK
        int person_id FK
        boolean is_primary
        boolean is_current
    }
    VEHICLE_DRIVERS {
        serial id PK
        int vehicle_id FK
        int person_id FK
        boolean is_current
    }
    INSURANCES {
        serial id PK
        int vehicle_id FK
        text entity_name
        text expiration_date
    }
    TECHNICAL_INSPECTIONS {
        serial id PK
        int vehicle_id FK
        text expiration_date
    }
    ROAD_SAFETY_COURSES {
        serial id PK
        int vehicle_id FK
        int person_id FK
        text expiration_date
    }
    DRIVER_LICENSES {
        serial id PK
        int vehicle_id FK
        int person_id FK
        text expiration_date
    }
    VEHICLE_PADRON_HISTORY {
        serial id PK
        int vehicle_id FK
        text previous_padron
        text new_padron
        text change_type
    }
    PADRON_CHANGE_REQUESTS {
        serial id PK
        int source_vehicle_id FK
        int target_vehicle_id FK
        text status
    }
    AUDIT_LOGS {
        serial id PK
        text entity
        text action
        text field_name
        text user_email
    }
    PORTAL_POSTS {
        serial id PK
        text title
        text content
        boolean is_active
    }
    PORTAL_EVENTS {
        serial id PK
        text title
        text event_date
        text status
    }

    SYSTEM_ROLES ||--o{ USERS : asigna
    PERSONS ||--o{ VEHICLE_OWNERS : posee
    PERSONS ||--o{ VEHICLE_DRIVERS : conduce
    VEHICLES ||--o{ VEHICLE_OWNERS : tiene
    VEHICLES ||--o{ VEHICLE_DRIVERS : tiene
    VEHICLES ||--o{ INSURANCES : asegura
    VEHICLES ||--o{ TECHNICAL_INSPECTIONS : inspecciona
    VEHICLES ||--o{ ROAD_SAFETY_COURSES : capacita
    VEHICLES ||--o{ DRIVER_LICENSES : licencia
    VEHICLES ||--o{ VEHICLE_PADRON_HISTORY : historial
    VEHICLES ||--o{ PADRON_CHANGE_REQUESTS : solicita
```

---

## 3. Flujo de autenticación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant SPA as React SPA
    participant API as Express
    participant FB as Firebase

    U->>SPA: Ingresa credenciales / Google
    SPA->>SPA: Guarda sesión (localStorage o Firebase)
    SPA->>API: Request + Authorization Bearer
    API->>API: requireAuth
    alt Token de desarrollo (AUTH_DEV_MODE)
        API-->>SPA: Acceso concedido (rol dev)
    else Token Firebase
        API->>FB: verifyIdToken(token)
        FB-->>API: uid, email, name
        API-->>SPA: Acceso concedido
    else Sin token
        API-->>SPA: 401 No autenticado
    end
    API->>API: requireAdmin (si aplica)
    API-->>SPA: 200 / 403
```

---

## 4. Intercambio transaccional de padrones (SWAP)

```mermaid
sequenceDiagram
    participant UI as SPA
    participant API as Express
    participant DB as PostgreSQL

    UI->>API: POST /api/vehicles/padron/swap
    API->>DB: BEGIN
    API->>DB: A.padron = SWAP_TEMP_<timestamp>
    API->>DB: B.padron = padron(A)
    API->>DB: A.padron = padron(B)
    API->>DB: INSERT vehicle_padron_history (A y B)
    alt Todo correcto
        API->>DB: COMMIT
        API-->>UI: 200 OK
    else Error
        API->>DB: ROLLBACK
        API-->>UI: 400/500 con motivo
    end
```

---

## 5. Importación de Excel/PDF

```mermaid
flowchart LR
    A[Usuario sube archivo] --> B[POST /api/import/preview]
    B --> C{¿PDF?}
    C -- Sí --> D[Gemini extrae filas]
    C -- No --> E[SheetJS lee Excel]
    D --> F[Diagnóstico y staging]
    E --> F
    F --> G[Vista previa con errores/duplicados]
    G --> H{Usuario confirma}
    H -- Sí --> I[POST /api/import/confirm]
    I --> J[Transacción idempotente]
    J --> K[Padrón actualizado + auditoría]
    H -- No --> L[Cancelar]
```

---

## 6. Despliegue sugerido

```mermaid
flowchart LR
    subgraph Vercel
        FE[SPA React build]
    end
    subgraph Railway["Railway / Render"]
        BE[Express API]
    end
    subgraph Datos
        DB[(Supabase / Neon PostgreSQL)]
        FB[Firebase Auth]
        AI[Gemini API]
    end

    Usuario --> FE
    FE -->|HTTPS /api| BE
    BE --> DB
    BE -.-> FB
    BE -.-> AI
```

> La separación frontend/API requiere `VITE_API_URL` y CORS. Ver [`DESPLIEGUE.md`](DESPLIEGUE.md).
