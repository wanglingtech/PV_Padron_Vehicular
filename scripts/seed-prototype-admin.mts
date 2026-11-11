/**
 * Crea el usuario administrador en la base de prototipos `padron_vehicular_proto`.
 * Reutiliza el mismo servicio de producción para no duplicar reglas de hash.
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { createAdminUser } from '../backend/services/admin.service.ts';

const TARGET_DB = process.env.PROTO_DB_NAME ?? 'padron_vehicular_proto';
if (!TARGET_DB.endsWith('_proto')) {
  console.error(`ABORTA: "${TARGET_DB}" no termina en _proto.`);
  process.exit(1);
}

process.env.SQL_DB_NAME = TARGET_DB;

const pool = new Pool({
  host: process.env.SQL_HOST,
  port: Number(process.env.SQL_PORT || 5432),
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: TARGET_DB,
});

const email = 'admin@transporte.pe';
const password = 'ProtoAdmin2026!';

await pool.query('DELETE FROM users WHERE email = $1', [email]);

const res = await createAdminUser({
  email,
  password,
  name: 'Carlos Mendoza (Administrador)',
});

console.log('admin creado:', JSON.stringify(res));
await pool.end();
