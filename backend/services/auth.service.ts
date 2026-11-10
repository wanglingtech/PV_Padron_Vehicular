import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { hashPassword, isArgon2Hash, verifyPassword } from './password.service.ts';

export type UserRow = typeof users.$inferSelect;

/** Usuario seguro para devolver al cliente (sin contraseña). */
export interface PublicUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: string;
  assignedPadron: string | null;
  isActive: boolean;
  createdAt: string | null;
}

/** Elimina campos sensibles antes de serializar un usuario. */
export const toPublicUser = (row: UserRow): PublicUser => ({
  id: row.id,
  uid: row.uid,
  email: row.email,
  name: row.name,
  role: row.role,
  assignedPadron: row.assignedPadron ?? null,
  isActive: Boolean(row.isActive),
  createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
});

/** Busca un usuario por correo (sin distinguir mayúsculas). */
export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const normalized = email.trim().toLowerCase();
  const [row] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  return row ?? null;
}

/** Busca un usuario por su uid. */
export async function findUserByUid(uid: string): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
  return row ?? null;
}

/**
 * Valida correo + contraseña.
 *
 * - Rechaza usuarios inexistentes o inactivos.
 * - Migra transparentemente contraseñas heredadas en texto plano.
 * - Devuelve la fila completa solo si las credenciales son correctas.
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<UserRow | null> {
  const user = await findUserByEmail(email);
  if (!user || !user.isActive) return null;

  const { valid, needsRehash } = await verifyPassword(user.password, password);
  if (!valid) return null;

  if (needsRehash) {
    const hash = await hashPassword(password);
    await db.update(users).set({ password: hash }).where(eq(users.id, user.id));
    user.password = hash;
  }

  return user;
}

export interface ChangePasswordResult {
  ok: boolean;
  code?: 'NOT_FOUND' | 'INVALID_CURRENT' | 'SAME_PASSWORD';
}

/** Cambia la contraseña de un usuario autenticado verificando la actual. */
export async function changeUserPasswordByUid(
  uid: string,
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  const user = await findUserByUid(uid);
  if (!user) return { ok: false, code: 'NOT_FOUND' };

  const { valid } = await verifyPassword(user.password, currentPassword);
  if (!valid) return { ok: false, code: 'INVALID_CURRENT' };

  if (currentPassword === newPassword) {
    return { ok: false, code: 'SAME_PASSWORD' };
  }

  const hash = await hashPassword(newPassword);
  await db.update(users).set({ password: hash }).where(eq(users.id, user.id));
  return { ok: true };
}

/**
 * Migra a argon2 todas las contraseñas que aún estén en texto plano.
 * Se ejecuta al arrancar para no dejar credenciales legibles en la base.
 */
export async function migratePlaintextPasswords(): Promise<number> {
  const rows = await db.select().from(users);
  let migrated = 0;

  for (const row of rows) {
    if (!row.password || isArgon2Hash(row.password)) continue;
    const hash = await hashPassword(row.password);
    await db.update(users).set({ password: hash }).where(eq(users.id, row.id));
    migrated += 1;
  }

  return migrated;
}
