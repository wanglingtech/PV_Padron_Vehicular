/**
 * Preparativo global de la base de datos de pruebas.
 *
 * Crea la base `padron_vehicular_test` (o la indicada en `TEST_SQL_DB_NAME`)
 * y aplica el esquema de `backend/db/schema.ts` con drizzle-kit.
 *
 * Los tests NUNCA tocan la base de desarrollo.
 */

import { spawnSync } from 'node:child_process';
import { Client } from 'pg';
import 'dotenv/config';

/** Nombre de la base de datos reservada para los tests. */
export const TEST_DB_NAME = process.env.TEST_SQL_DB_NAME || 'padron_vehicular_test';

export default async function setup(): Promise<void> {
  const host = process.env.SQL_HOST || 'localhost';
  const port = Number(process.env.SQL_PORT || 5432);
  const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
  const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

  if (!user || !password) {
    throw new Error(
      'Faltan credenciales de PostgreSQL (SQL_USER / SQL_PASSWORD) para preparar la base de pruebas.'
    );
  }

  // 1. Crear la base de pruebas si no existe (conectando a la base de mantenimiento).
  const admin = new Client({ host, port, user, password, database: 'postgres' });
  await admin.connect();
  try {
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      TEST_DB_NAME,
    ]);
    if (rows.length === 0) {
      await admin.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
      console.log(`[test] Base de datos creada: ${TEST_DB_NAME}`);
    }
  } finally {
    await admin.end();
  }

  // 2. Aplicar el esquema con drizzle-kit sobre la base de pruebas.
  const result = spawnSync(
    'npx drizzle-kit push --config=backend/db/drizzle.config.ts --force',
    {
      stdio: 'inherit',
      // `shell: true` evita el error EINVAL de spawn con los shims .cmd de Windows.
      shell: true,
      env: {
        ...process.env,
        SQL_DB_NAME: TEST_DB_NAME,
        SQL_ADMIN_USER: user,
        SQL_ADMIN_PASSWORD: password,
      },
    }
  );

  if (result.status !== 0) {
    throw new Error(
      `No se pudo aplicar el esquema en la base de pruebas (código ${result.status}).`
    );
  }

  console.log(`[test] Esquema aplicado en ${TEST_DB_NAME}`);
}
