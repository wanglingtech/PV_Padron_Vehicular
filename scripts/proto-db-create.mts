/**
 * Crea la base de datos de prototipos `padron_vehicular_proto`.
 *
 * Es una base SEPARADA: los prototypes nunca tocan `padron_vehicular`.
 * Requiere permisos de creación de bases (SQL_ADMIN_USER / SQL_ADMIN_PASSWORD).
 */
import 'dotenv/config';
import { Pool } from 'pg';

const TARGET_DB = process.env.PROTO_DB_NAME ?? 'padron_vehicular_proto';

if (!TARGET_DB.endsWith('_proto')) {
  console.error(`ABORTA: "${TARGET_DB}" no termina en _proto.`);
  process.exit(1);
}

const admin = new Pool({
  host: process.env.SQL_HOST,
  port: Number(process.env.SQL_PORT || 5432),
  user: process.env.SQL_ADMIN_USER ?? process.env.SQL_USER,
  password: process.env.SQL_ADMIN_PASSWORD ?? process.env.SQL_PASSWORD,
  database: 'postgres',
});

const exists = await admin.query('select 1 from pg_database where datname = $1', [TARGET_DB]);

if (exists.rowCount === 0) {
  await admin.query(`CREATE DATABASE ${TARGET_DB}`);
  console.log(`Base creada: ${TARGET_DB}`);
  console.log('Ahora aplica el esquema:');
  console.log(`  $env:SQL_DB_NAME="${TARGET_DB}"; npm run db:push`);
} else {
  console.log(`La base ya existe: ${TARGET_DB}`);
}

await admin.end();
