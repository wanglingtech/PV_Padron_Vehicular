/**
 * Restablece las contraseñas de las cuentas demo al valor definido en el seed.
 *
 * Uso (solo desarrollo):
 *   npm run db:reset-demo-passwords
 *
 * Solo afecta a los correos de `DEFAULT_USER_ACCOUNTS`. No crea usuarios ni
 * toca cuentas reales. Sirve para bases creadas antes de la autenticación real,
 * donde los usuarios demo conservaban contraseñas antiguas (por ejemplo 123456).
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, getDatabaseTarget, verifyDatabaseConnection } from '../backend/db/index.ts';
import { users } from '../backend/db/schema.ts';
import { hashPassword } from '../backend/services/password.service.ts';
import { DEFAULT_USER_ACCOUNTS } from '../shared/roles.ts';

async function main() {
  await verifyDatabaseConnection();
  console.log(`Base de datos: ${getDatabaseTarget()}`);

  let updated = 0;

  for (const account of DEFAULT_USER_ACCOUNTS) {
    if (!account.password) continue;

    const hash = await hashPassword(account.password);
    const result = await db
      .update(users)
      .set({ password: hash })
      .where(eq(users.email, account.email.toLowerCase()))
      .returning({ id: users.id, email: users.email });

    for (const row of result) {
      console.log(`Contraseña restablecida: ${row.email}`);
      updated += 1;
    }
  }

  console.log(`\nCuentas actualizadas: ${updated}`);
  if (updated === 0) {
    console.log('No se encontraron cuentas demo. Ejecuta la app una vez para sembrarlas.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error al restablecer contraseñas demo:', error);
    process.exit(1);
  });
