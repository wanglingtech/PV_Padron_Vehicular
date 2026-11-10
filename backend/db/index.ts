import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

const REQUIRED_ENV_VARS = ['SQL_HOST', 'SQL_USER', 'SQL_PASSWORD', 'SQL_DB_NAME'] as const;

export function assertDatabaseConfig(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Configuración de base de datos incompleta. Faltan las variables: ${missing.join(', ')}. ` +
        'Copia .env.example a .env y define las credenciales de PostgreSQL.'
    );
  }
}

export const getDatabaseTarget = (): string => {
  const host = process.env.SQL_HOST ?? 'localhost';
  const port = process.env.SQL_PORT ?? '5432';
  const database = process.env.SQL_DB_NAME ?? '(sin definir)';
  return `${host}:${port}/${database}`;
};

export const createPool = () => {
  if (!global._postgresPool) {
    assertDatabaseConfig();

    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
      ssl: process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });

/**
 * Comprueba la conectividad real con PostgreSQL antes de inicializar el servidor.
 * Lanza un error con un mensaje accionable si la base de datos no responde.
 */
export async function verifyDatabaseConnection(): Promise<void> {
  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `No se pudo conectar a PostgreSQL en ${getDatabaseTarget()}. ` +
        'Verifica que el servicio de PostgreSQL esté iniciado y que las credenciales de .env sean correctas. ' +
        `Detalle: ${detail}`
    );
  }
}
