/**
 * Elimina las cuentas de demostración de la base de datos.
 *
 * Uso:
 *   npm run db:remove-demo-users
 *
 * Úsilo antes de publicar el sistema en producción: las cuentas demo tienen
 * contraseñas conocidas y documentadas, por lo que no deben existir en una
 * instalación real.
 */

import 'dotenv/config';
import { db, getDatabaseTarget, verifyDatabaseConnection } from '../backend/db/index.ts';
import { findDemoAccounts, removeDemoAccounts } from '../backend/services/admin.service.ts';

async function main() {
  await verifyDatabaseConnection();
  console.log(`Base de datos: ${getDatabaseTarget()}`);

  const found = await findDemoAccounts();

  if (found.length === 0) {
    console.log('No hay cuentas de demostración en la base de datos. Nada que hacer.');
    return;
  }

  console.log(`\nCuentas de demostración encontradas (${found.length}):`);
  for (const email of found) {
    console.log(`  - ${email}`);
  }

  const removed = await removeDemoAccounts();

  console.log(`\nCuentas eliminadas (${removed.length}):`);
  for (const email of removed) {
    console.log(`  - ${email}`);
  }
  console.log('\nRecuerda crear el administrador real con: npm run admin:create');
}

main()
  .then(async () => {
    await db.$client.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error al eliminar las cuentas de demostración:', error);
    process.exit(1);
  });
