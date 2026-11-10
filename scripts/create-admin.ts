/**
 * Crea el primer administrador real del sistema.
 *
 * Uso:
 *   npm run admin:create
 *
 * El script pregunta por correo, nombre y contraseña de forma interactiva
 * (la contraseña no se muestra mientras se escribe). También acepta flags:
 *
 *   npm run admin:create -- --email admin@ejemplo.com --name "Nombre" --password "MiClaveFuerte123"
 *
 * La contraseña se guarda como hash argon2 y nunca se escribe en el código
 * ni en los logs. En producción es el mecanismo previsto para crear el
 * administrador sin depender del seed de demostración.
 */

import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { db, getDatabaseTarget, verifyDatabaseConnection } from '../backend/db/index.ts';
import {
  MIN_ADMIN_PASSWORD_LENGTH,
  createAdminUser,
  isValidEmail,
} from '../backend/services/admin.service.ts';

/** Lee un argumento de la línea de comandos (`--clave valor` o `--clave=valor`). */
function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) {
    const next = process.argv[index + 1];
    if (next && !next.startsWith('--')) return next.trim();
  }
  return undefined;
}

/** Pregunta visible por consola. */
async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
}

/** Pregunta ocultando lo que se escribe (para contraseñas). */
async function askSecret(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  try {
    // readline no tiene salida oculta: se silencia lo escrito tras la pregunta.
    const write = rl.write.bind(rl);
    let muted = false;
    (rl as unknown as { write: (chunk: string) => void }).write = (chunk: string) => {
      if (muted) return;
      write(chunk);
    };

    const promise = rl.question(question);
    muted = true;
    const answer = await promise;
    stdout.write('\n');
    return answer;
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  await verifyDatabaseConnection();
  console.log(`Base de datos: ${getDatabaseTarget()}`);

  const email =
    readArg('email') || (await ask('Correo electrónico del administrador: '));
  if (!isValidEmail(email)) {
    console.error('El correo electrónico no tiene un formato válido.');
    process.exit(1);
  }

  const name = readArg('name') || (await ask('Nombre para mostrar (opcional): ')) || email;

  let password = readArg('password') || '';
  if (!password) {
    password = await askSecret(`Contraseña (mínimo ${MIN_ADMIN_PASSWORD_LENGTH} caracteres): `);
  }

  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    console.error(
      `La contraseña debe tener al menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres. No se creó la cuenta.`
    );
    process.exit(1);
  }

  const result = await createAdminUser({ email, name, password });

  if (!result.ok) {
    if (result.code === 'EMAIL_TAKEN') {
      console.error(`Ya existe una cuenta con el correo ${email}. No se creó nada.`);
    } else if (result.code === 'INVALID_EMAIL') {
      console.error('El correo electrónico no tiene un formato válido.');
    } else {
      console.error(
        `La contraseña debe tener al menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres.`
      );
    }
    process.exit(1);
  }

  console.log(`\nAdministrador creado: ${result.email}`);
  console.log('Inicia sesión con ese correo y la contraseña que acabas de definir.');
}

main()
  .then(async () => {
    // Se cierra el pool para que el proceso termine limpiamente.
    await db.$client.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error al crear el administrador:', error);
    process.exit(1);
  });
