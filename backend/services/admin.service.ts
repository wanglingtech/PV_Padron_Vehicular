/**
 * Administración de cuentas de usuario desde la línea de comandos.
 *
 * - `createAdminUser()` crea el primer administrador real de una instalación
 *   (por ejemplo, en producción) sin exponerlo en el seed de demostración.
 * - `findDemoAccounts()` / `removeDemoAccounts()` permiten detectar y eliminar
 *   las cuentas de demostración antes de publicar el sistema.
 */

import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { hashPassword } from './password.service.ts';
import { DEFAULT_USER_ACCOUNTS } from '../../shared/roles.ts';

/** Correos de las cuentas de demostración definidas en `shared/roles.ts`. */
export const DEMO_ACCOUNT_EMAILS: string[] = DEFAULT_USER_ACCOUNTS.map((account) =>
  account.email.toLowerCase()
);

export interface CreateAdminInput {
  email: string;
  name: string;
  password: string;
}

export type CreateAdminResult =
  | { ok: true; id: number; email: string }
  | { ok: false; code: 'INVALID_EMAIL' | 'INVALID_PASSWORD' | 'EMAIL_TAKEN' };

/** Longitud mínima de la contraseña del administrador. */
export const MIN_ADMIN_PASSWORD_LENGTH = 12;

/** Valida el formato de un correo electrónico. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Crea un usuario con rol de administrador.
 *
 * La contraseña se guarda como hash argon2 y nunca se devuelve ni se registra.
 */
export async function createAdminUser(input: CreateAdminInput): Promise<CreateAdminResult> {
  const email = input.email.trim().toLowerCase();

  if (!isValidEmail(email)) {
    return { ok: false, code: 'INVALID_EMAIL' };
  }
  if (input.password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return { ok: false, code: 'INVALID_PASSWORD' };
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return { ok: false, code: 'EMAIL_TAKEN' };
  }

  const uid = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const passwordHash = await hashPassword(input.password);

  const [created] = await db
    .insert(users)
    .values({
      uid,
      email,
      name: input.name.trim() || email,
      password: passwordHash,
      role: 'admin',
      assignedPadron: null,
      isActive: true,
    })
    .returning({ id: users.id, email: users.email });

  return { ok: true, id: created.id, email: created.email };
}

/**
 * Lista los correos de las cuentas de demostración que siguen en la base.
 * Si una cuenta demo fue renombrada (correo distinto) no se detecta: se
 * asume que el administrador la eliminó o la desactivó.
 */
export async function findDemoAccounts(): Promise<string[]> {
  const rows = await db
    .select({ email: users.email, isActive: users.isActive })
    .from(users)
    .where(inArray(users.email, DEMO_ACCOUNT_EMAILS));

  return rows.map((row) => row.email);
}

/**
 * Elimina las cuentas de demostración de la base de datos.
 * Devuelve los correos eliminados.
 */
export async function removeDemoAccounts(): Promise<string[]> {
  const rows = await db
    .select({ email: users.email })
    .from(users)
    .where(inArray(users.email, DEMO_ACCOUNT_EMAILS));

  if (rows.length === 0) {
    return [];
  }

  await db.delete(users).where(inArray(users.email, DEMO_ACCOUNT_EMAILS));
  return rows.map((row) => row.email);
}
