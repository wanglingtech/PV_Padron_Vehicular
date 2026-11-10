/**
 * Hardening de producción: seed de demostración, cuentas demo y alta de
 * administrador real.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import {
  MIN_ADMIN_PASSWORD_LENGTH,
  createAdminUser,
  findDemoAccounts,
  isValidEmail,
  removeDemoAccounts,
} from '../services/admin.service.ts';
import { seedDemoUsers } from '../services/seed.service.ts';

/** Correo del administrador temporal que crea cada test. */
const TEMP_ADMIN_EMAIL = 'admin.temporal@transporte.pe';

describe('Administración de cuentas', () => {
  beforeAll(async () => {
    // El seed de la app deja las cuentas demo disponibles en la base de pruebas.
    await findDemoAccounts();
  });

  afterAll(async () => {
    // Este archivo elimina las cuentas demo: se restauran para que los
    // siguientes archivos de test puedan iniciar sesión con ellas.
    await seedDemoUsers();
  });

  afterEach(async () => {
    await db.delete(users).where(eq(users.email, TEMP_ADMIN_EMAIL));
  });

  describe('createAdminUser', () => {
    it('crea el administrador con hash argon2 y rol admin', async () => {
      const result = await createAdminUser({
        email: TEMP_ADMIN_EMAIL,
        name: 'Administrador Temporal',
        password: 'ClaveDePruebaSegura123',
      });

      expect(result.ok).toBe(true);

      const [row] = await db.select().from(users).where(eq(users.email, TEMP_ADMIN_EMAIL));
      expect(row.role).toBe('admin');
      expect(row.isActive).toBe(true);
      expect(row.password ?? '').toMatch(/^\$argon2/);
      expect(row.password).not.toContain('ClaveDePruebaSegura123');
    });

    it('rechaza un correo inválido', async () => {
      const result = await createAdminUser({
        email: 'correo-invalido',
        name: 'X',
        password: 'ClaveDePruebaSegura123',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('INVALID_EMAIL');
    });

    it('rechaza una contraseña demasiado corta', async () => {
      const result = await createAdminUser({
        email: TEMP_ADMIN_EMAIL,
        name: 'X',
        password: 'corta',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('INVALID_PASSWORD');
      expect(MIN_ADMIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(12);
    });

    it('no permite duplicar el correo de una cuenta existente', async () => {
      const result = await createAdminUser({
        email: 'admin@transporte.pe',
        name: 'Duplicado',
        password: 'ClaveDePruebaSegura123',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('EMAIL_TAKEN');
    });
  });

  describe('findDemoAccounts / removeDemoAccounts', () => {
    it('detecta las cuentas demo sembradas', async () => {
      const found = await findDemoAccounts();

      expect(found).toContain('admin@transporte.pe');
      expect(found).toContain('operador@transporte.pe');
      expect(found.length).toBeGreaterThanOrEqual(8);
    });

    it('elimina las cuentas demo y deja el resto intacto', async () => {
      const removed = await removeDemoAccounts();

      expect(removed.length).toBeGreaterThanOrEqual(8);
      expect(await findDemoAccounts()).toHaveLength(0);

      // El administrador temporal no se ve afectado.
      const [row] = await db.select().from(users).where(eq(users.email, TEMP_ADMIN_EMAIL));
      expect(row).toBeUndefined();
    });

    it('es idempotente: la segunda llamada no encuentra nada', async () => {
      await removeDemoAccounts();
      const removed = await removeDemoAccounts();

      expect(removed).toHaveLength(0);
    });
  });

  describe('isValidEmail', () => {
    it('acepta correos válidos y rechaza los inválidos', () => {
      expect(isValidEmail('admin@transporte.pe')).toBe(true);
      expect(isValidEmail('con espacio@transporte.pe')).toBe(false);
      expect(isValidEmail('sin-arroba')).toBe(false);
      expect(isValidEmail('sin-dominio@')).toBe(false);
    });
  });
});
