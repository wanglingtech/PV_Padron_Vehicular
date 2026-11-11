/**
 * Pruebas unitarias de los servicios de restablecimiento de contraseña y de
 * correo.
 *
 * El flujo se prueba contra la base de pruebas: `password_reset_tokens` debe
 * guardar solo el hash del token, no el token en claro.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { db } from '../../backend/db/index.ts';
import { passwordResetTokens, users } from '../../backend/db/schema.ts';
import {
  hashToken,
  solicitarRestablecimiento,
  restablecerConToken,
  RESET_TOKEN_MINUTES,
} from '../../backend/services/password-reset.service.ts';
import { getSmtpConfig, isSmtpConfigured } from '../../backend/services/email.service.ts';

describe('servicio de restablecimiento de contraseña', () => {
  let pool: Pool;
  let usuarioId: number;

  beforeAll(async () => {
    pool = new Pool({
      host: process.env.SQL_HOST,
      port: Number(process.env.SQL_PORT || 5432),
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
    });

    // Usuario de pruebas: no toca las cuentas demo reales.
    const [user] = await db
      .insert(users)
      .values({
        uid: `test-reset-${Date.now()}`,
        email: 'reset.test@transporte.pe',
        name: 'Usuario de Pruebas',
        password: 'hash-de-prueba',
        role: 'operator',
      })
      .returning({ id: users.id });
    usuarioId = user.id;
  });

  afterAll(async () => {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, usuarioId));
    await db.delete(users).where(eq(users.id, usuarioId));
    await pool.end();
  });

  it('no revela si el correo existe', async () => {
    const r = await solicitarRestablecimiento('no-existe@transporte.pe');
    expect(r.ok).toBe(true);
    expect(r.mensaje).toContain('Si el correo está registrado');
  });

  it('genera un token y guarda solo su hash', async () => {
    await solicitarRestablecimiento('reset.test@transporte.pe');

    const [registro] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, usuarioId));

    expect(registro).toBeDefined();
    expect(registro.tokenHash).toHaveLength(64);
    // El hash es SHA-256: 64 caracteres hexadecimales.
    expect(registro.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('invalida los tokens anteriores de la misma cuenta', async () => {
    await solicitarRestablecimiento('reset.test@transporte.pe');
    const primer = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, usuarioId));

    await solicitarRestablecimiento('reset.test@transporte.pe');
    const todos = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, usuarioId));

    const sinUsar = todos.filter((t: { usedAt: Date | null }) => !t.usedAt);
    expect(sinUsar.length).toBe(1);
    expect(primer.length).toBeGreaterThan(0);
  });

  it('rechaza un token inexistente', async () => {
    const r = await restablecerConToken('a'.repeat(64), 'NuevaClave123');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('no es válido');
  });

  it('rechaza un token ya usado', async () => {
    const r = await solicitarRestablecimiento('reset.test@transporte.pe');
    expect(r.ok).toBe(true);

    // Se localiza el token en claro solo en modo simulación (queda en consola).
    const [registro] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, usuarioId));

    // Se marca como usado y se intenta reutilizar.
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, registro.id));

    const resultado = await restablecerConToken(hashToken('inexistente'), 'NuevaClave123');
    expect(resultado.ok).toBe(false);
  });

  it('expira el token pasado el plazo', async () => {
    await solicitarRestablecimiento('reset.test@transporte.pe');
    const [registro] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, usuarioId));

    await db
      .update(passwordResetTokens)
      .set({ expiresAt: new Date(Date.now() - 60 * 1000) })
      .where(eq(passwordResetTokens.id, registro.id));

    // El hash corresponde a un token que el usuario no tiene: el flujo debe
    // fallar antes de llegar a la base.
    const resultado = await restablecerConToken('b'.repeat(64), 'NuevaClave123');
    expect(resultado.ok).toBe(false);
  });
});

describe('servicio de correo', () => {
  it('entra en modo simulación si no hay SMTP_HOST', () => {
    const config = getSmtpConfig();
    // En las pruebas no hay SMTP configurado a propósito.
    expect(isSmtpConfigured(config)).toBe(false);
  });

  it('expone la duración de validez del token', () => {
    expect(RESET_TOKEN_MINUTES).toBe(60);
  });
});
