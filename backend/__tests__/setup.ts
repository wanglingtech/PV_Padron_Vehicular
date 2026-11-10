/**
 * Variables de entorno para los tests.
 *
 * Se ejecuta antes de cada archivo de test (y antes de importar la app) para
 * apuntar la aplicación a la base de pruebas y a un secreto propio.
 */

import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.SQL_DB_NAME = process.env.TEST_SQL_DB_NAME || 'padron_vehicular_test';
process.env.JWT_SECRET = 'secreto-de-pruebas-vitest-32-caracteres-minimo';
process.env.JWT_EXPIRES_IN = '1h';
process.env.AUTH_COOKIE_NAME = 'padron_session';
process.env.AUTH_COOKIE_SECURE = 'false';
process.env.AUTH_COOKIE_SAME_SITE = 'lax';
process.env.CORS_ORIGIN = '';
