/**
 * Aplicación Express del Padrón Vehicular.
 *
 * Solo configura seguridad, middlewares y monta los routers por dominio.
 * El arranque (Vite, estáticos y `listen`) vive en `server.ts`.
 *
 * Routers disponibles en `backend/routes/`:
 * - `auth.routes.ts`          → login, logout, sesión actual, cambio de contraseña
 * - `health.routes.ts`        → health check con conectividad real
 * - `vehicles.routes.ts`      → padrón vehicular
 * - `padron-requests.routes.ts` → solicitudes de cambio de padrón
 * - `persons.routes.ts`       → personas y directorio de contactos
 * - `dashboard.routes.ts`     → métricas, vencimientos y auditoría
 * - `courses.routes.ts`       → curso de educación vial
 * - `import-export.routes.ts` → importación y exportación
 * - `backup.routes.ts`        → respaldo y restauración
 * - `roles.routes.ts`         → roles y matriz de permisos
 * - `users.routes.ts`         → usuarios del sistema
 * - `portal.routes.ts`        → cartelera digital y agenda
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { getCorsOrigins, isDemoAccountsAllowed, isProduction } from './config/env.ts';
import { getDatabaseTarget, verifyDatabaseConnection } from './db/index.ts';
import { findDemoAccounts } from './services/admin.service.ts';
import { migratePlaintextPasswords } from './services/auth.service.ts';
import { seedDatabase } from './services/seed.service.ts';

import { registerAuthRoutes } from './routes/auth.routes.ts';
import { registerHealthRoutes } from './routes/health.routes.ts';
import { registerVehicleRoutes } from './routes/vehicles.routes.ts';
import { registerPadronRequestRoutes } from './routes/padron-requests.routes.ts';
import { registerPersonRoutes } from './routes/persons.routes.ts';
import { registerDashboardRoutes } from './routes/dashboard.routes.ts';
import { registerCourseRoutes } from './routes/courses.routes.ts';
import { registerImportExportRoutes } from './routes/import-export.routes.ts';
import { registerBackupRoutes } from './routes/backup.routes.ts';
import { registerRoleRoutes } from './routes/roles.routes.ts';
import { registerUserRoutes } from './routes/users.routes.ts';
import { registerPortalRoutes } from './routes/portal.routes.ts';

export async function createApp(): Promise<express.Express> {
  const app = express();
  app.set('trust proxy', 1);

  // Cabeceras de seguridad. La CSP se desactiva en desarrollo para no romper Vite.
  app.use(
    helmet({
      contentSecurityPolicy: isProduction()
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
              mediaSrc: ["'self'", 'https:'],
              frameSrc: ["'self'", 'https://www.youtube.com'],
              connectSrc: ["'self'", 'https:'],
              fontSrc: ["'self'", 'data:'],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  const corsOrigins = getCorsOrigins();
  if (corsOrigins.length > 0) {
    app.use(cors({ origin: corsOrigins, credentials: true }));
  }

  app.use(cookieParser());

  // Verificación temprana de conectividad con PostgreSQL (falla rápido y con un mensaje claro)
  try {
    await verifyDatabaseConnection();
    console.log(`Conexión a PostgreSQL verificada (${getDatabaseTarget()})`);
  } catch (dbErr) {
    console.error('\n❌ Error de conexión a la base de datos:');
    console.error(dbErr instanceof Error ? dbErr.message : dbErr);
    console.error('   Revisa .env y asegúrate de que el servicio de PostgreSQL esté iniciado.\n');
    process.exit(1);
  }

  // Middlewares para JSON grande (necesario para importaciones en base64)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Routers por dominio
  registerAuthRoutes(app);
  registerHealthRoutes(app);
  registerVehicleRoutes(app);
  registerPadronRequestRoutes(app);
  registerPersonRoutes(app);
  registerDashboardRoutes(app);
  registerCourseRoutes(app);
  registerImportExportRoutes(app);
  registerBackupRoutes(app);
  registerRoleRoutes(app);
  registerUserRoutes(app);
  registerPortalRoutes(app);

  // Seed inicial: los roles siempre; las cuentas y el contenido de ejemplo
  // solo en desarrollo (o con SEED_DEMO_DATA=true).
  await seedDatabase();

  // Migración transparente de contraseñas heredadas en texto plano.
  try {
    const migrated = await migratePlaintextPasswords();
    if (migrated > 0) {
      console.log(`Contraseñas migradas a argon2: ${migrated}`);
    }
  } catch (migrationError) {
    console.error('No se pudieron migrar las contraseñas heredadas:', migrationError);
  }

  // En producción no se puede arrancar con cuentas demo activas: sus
  // contraseñas son públicas y están documentadas en el repositorio.
  if (isProduction() && !isDemoAccountsAllowed()) {
    const demoAccounts = await findDemoAccounts();
    if (demoAccounts.length > 0) {
      console.error('\n❌ Se detectaron cuentas de demostración activas en producción:');
      for (const email of demoAccounts) {
        console.error(`   - ${email}`);
      }
      console.error('\n   Sus contraseñas son públicas (ver docs/markdown/AUTENTICACION.md).');
      console.error('   Elimínalas con:  npm run db:remove-demo-users');
      console.error('   Crea tu administrador real con:  npm run admin:create');
      console.error(
        '   Si de verdad necesitas una demo pública, define ALLOW_DEMO_ACCOUNTS=true.\n'
      );
      process.exit(1);
    }
  }

  return app;
}
