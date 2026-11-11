# Guía de instalación y arranque

Esta guía cubre la instalación desde cero en **Windows**, **Linux** y **macOS**, además de los problemas más frecuentes.

---

## 1. Requisitos

| Herramienta | Versión | Verificación |
| :--- | :--- | :--- |
| Node.js | 20 LTS o superior | `node -v` |
| npm | 10 o superior | `npm -v` |
| PostgreSQL | 15 o superior | `psql --version` |
| Git | 2.40 o superior | `git --version` |

---

## 2. Instalar PostgreSQL

### Windows

1. Descarga el instalador desde <https://www.postgresql.org/download/windows/> o usa:

   ```powershell
   winget install -e --id PostgreSQL.PostgreSQL.17
   ```

2. Durante el asistente:
   - Directorio: `C:\Program Files\PostgreSQL\17`
   - Puerto: `5432`
   - Superusuario: `postgres`
   - Contraseña: elige una segura y **anótala**
   - Stack Builder: omitir
3. Verifica el servicio:

   ```powershell
   Get-Service postgresql-x64-17
   ```

   Debe aparecer `Running`.

> El instalador no siempre agrega `bin` al `PATH`. Usa la ruta completa o añádela manualmente:
> `C:\Program Files\PostgreSQL\17\bin`.

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

### macOS (Homebrew)

```bash
brew install postgresql@17
brew services start postgresql@17
```

---

## 3. Crear la base de datos

```bash
# Windows
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE padron_vehicular;"

# Linux / macOS
createdb -U postgres padron_vehicular
```

Comprueba la conexión:

```bash
psql -U postgres -h localhost -d padron_vehicular -c "SELECT current_database();"
```

---

## 4. Clonar e instalar dependencias

```bash
git clone https://github.com/<tu-usuario>/padron-vehicular.git
cd padron-vehicular
npm install
```

---

## 5. Configurar `.env`

```bash
# Windows
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

Contenido mínimo:

```env
APP_URL="http://localhost:3000"
GEMINI_API_KEY=""

SQL_HOST="localhost"
SQL_PORT="5432"
SQL_USER="postgres"
SQL_PASSWORD="TU_PASSWORD"
SQL_DB_NAME="padron_vehicular"
SQL_SSL="false"

SQL_ADMIN_USER="postgres"
SQL_ADMIN_PASSWORD="TU_PASSWORD"

AUTH_DEV_MODE="true"
```

> `SQL_ADMIN_*` solo lo usa `drizzle-kit`. Si los omites, se reutilizan `SQL_USER` / `SQL_PASSWORD`.

---

## 6. Crear el esquema

```bash
npm run db:push
```

Debe terminar con `[✓] Changes applied`. Verifica las tablas:

```bash
psql -U postgres -d padron_vehicular -c "\dt"
```

Se esperan **15 tablas**.

---

## 7. Arrancar

```bash
npm run dev
```

Abre <http://localhost:3000>. En la primera ejecución se insertan roles, usuarios y contenido base.

Comprueba el estado:

```bash
curl http://localhost:3000/api/health
```

```json
{ "status": "ok", "database": "up", "target": "localhost:5432/padron_vehicular" }
```

---

## 8. Build de producción

```bash
npm run build
npm start
```

El build genera:

- `dist/` → SPA compilada.
- `dist/server.cjs` → servidor Express empaquetado.

---

## 9. Solución de problemas

### `ECONNREFUSED 127.0.0.1:5432`

No hay PostgreSQL escuchando. Verifica:

```powershell
Get-Service postgresql-x64-17
Test-NetConnection 127.0.0.1 -Port 5432
```

Si el servicio no existe, instálalo. Si está detenido:

```powershell
Start-Service postgresql-x64-17
```

### `password authentication failed for user "postgres"`

La contraseña de `.env` no coincide. Puedes resetearla:

1. Edita `C:\Program Files\PostgreSQL\17\data\pg_hba.conf` y cambia temporalmente `scram-sha-256` por `trust` en las líneas locales.
2. Reinicia el servicio: `Restart-Service postgresql-x64-17`.
3. Entra sin contraseña y ejecuta:

   ```sql
   ALTER USER postgres PASSWORD 'NuevaPassword';
   ```

4. Revierte `pg_hba.conf` y reinicia de nuevo.

### `database "padron_vehicular" does not exist`

Crea la base (paso 3) o corrige `SQL_DB_NAME`.

### `Faltan las variables: SQL_HOST, ...`

No existe `.env` o está incompleto. Copia `.env.example` y completa los valores.

### `drizzle-kit` no encuentra el esquema

Ejecuta los scripts desde la **raíz del proyecto** (los scripts npm ya lo hacen). No cambies `schema`/`out` a rutas absolutas.

### El puerto 3000 está ocupado

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
Stop-Process -Id <PID> -Force
```

### La app arranca pero las tablas no existen

Ejecuta `npm run db:push`. El servidor verifica la conexión, pero no crea tablas automáticamente.

### Errores de SSL con una base remota

Activa `SQL_SSL="true"`. En Supabase/Neon suele ser obligatorio.

---

## 10. Siguiente paso

- Lee [`STACK.md`](STACK.md) para entender las tecnologías.
- Lee [`ROADMAP.md`](ROADMAP.md) para conocer las fases pendientes.
- Configura la colección Bruno en [`api-tests/bruno`](../../api-tests/bruno).
