/**
 * Recuperación de contraseña por correo.
 *
 * Flujo:
 *   1. `solicitarRestablecimiento(email)` genera un token aleatorio, guarda
 *      **su hash** y envía el enlace por correo.
 *   2. `restablecerConToken(token, nuevaPassword)` valida el token, cambia
 *      la contraseña e invalida el token.
 *
 * Decisiones de seguridad:
 *   - Solo se guarda el hash SHA-256 del token: leer la tabla no permite
 *     restablecer la contraseña de nadie.
 *   - El token es de un solo uso y expira.
 *   - La respuesta es idéntica exista o no la cuenta: así el endpoint no
 *     revela qué correos están registrados.
 *   - Se invalida cualquier token anterior de la misma cuenta.
 */

import { createHash, randomBytes } from 'crypto';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { passwordResetTokens, users } from '../db/schema.ts';
import { hashPassword } from './password.service.ts';
import { sendPasswordResetEmail, isSmtpConfigured } from './email.service.ts';

/** Validez del enlace, en minutos. */
export const RESET_TOKEN_MINUTES = 60;

/** Longitud del token en bytes (32 bytes → 64 caracteres en hexadecimal). */
const TOKEN_BYTES = 32;

/** Genera un token aleatorio en hexadecimal. */
function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

/** Calcula el hash SHA-256 de un token (hexadecimal). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface RequestResetResult {
  /** Siempre `true` para no revelar si el correo existe. */
  ok: true;
  /** `true` si el correo se simuló (sin SMTP configurado). */
  simulado: boolean;
  /** Mensaje genérico para el cliente. */
  mensaje: string;
}

/**
 * Genera y envía el enlace de restablecimiento.
 *
 * No lanza excepciones por un correo inexistente: responde igual para que no
 * se pueda enumerar las cuentas registradas.
 */
export async function solicitarRestablecimiento(
  email: string
): Promise<RequestResetResult> {
  const mensaje =
    'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en unos minutos.';

  const correo = email.trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, correo)).limit(1);

  // Cuenta inexistente: se responde igual, sin enviar nada.
  if (!user || !user.isActive) {
    return { ok: true, simulado: false, mensaje };
  }

  // Se invalidan los tokens previos de la cuenta: solo uno debe ser válido.
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));

  const token = generateToken();
  const expira = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: expira,
  });

  const resultado = await sendPasswordResetEmail({
    to: user.email,
    nombre: user.name,
    token,
    minutosValidez: RESET_TOKEN_MINUTES,
  });

  if (!resultado.enviado && !resultado.simulado) {
    // El envío falló de verdad: se limpia el token para no dejar un enlace
    // válido que el usuario nunca recibió.
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, hashToken(token)));
    console.error('[auth] No se pudo enviar el correo de restablecimiento.');
  }

  return {
    ok: true,
    simulado: resultado.simulado,
    mensaje: isSmtpConfigured() ? mensaje : `${mensaje} (modo simulación: revisa la consola del servidor)`,
  };
}

export interface ResetPasswordResult {
  ok: boolean;
  error?: string;
}

/**
 * Cambia la contraseña usando un token de restablecimiento.
 *
 * @param token       Token recibido por correo.
 * @param nuevaPassword Contraseña nueva en texto plano.
 */
export async function restablecerConToken(
  token: string,
  nuevaPassword: string
): Promise<ResetPasswordResult> {
  if (!token || token.length < 20) {
    return { ok: false, error: 'El enlace de restablecimiento no es válido.' };
  }

  const hash = hashToken(token);
  const [registro] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, hash))
    .limit(1);

  if (!registro) {
    return { ok: false, error: 'El enlace de restablecimiento no es válido o ya fue usado.' };
  }

  if (registro.usedAt) {
    return { ok: false, error: 'El enlace de restablecimiento ya fue usado.' };
  }

  if (new Date(registro.expiresAt).getTime() < Date.now()) {
    // Token caducado: se limpia para no acumular basura.
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, registro.id));
    return { ok: false, error: 'El enlace de restablecimiento expiró. Solicita uno nuevo.' };
  }

  const [user] = await db.select().from(users).where(eq(users.id, registro.userId)).limit(1);
  if (!user || !user.isActive) {
    return { ok: false, error: 'La cuenta no está disponible para restablecerse.' };
  }

  await db
    .update(users)
    .set({ password: await hashPassword(nuevaPassword) })
    .where(eq(users.id, user.id));

  // El token se consume: no puede reutilizarse.
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, registro.id));

  // Se limpian los tokens caducados de todas las cuentas.
  await db
    .delete(passwordResetTokens)
    .where(lt(passwordResetTokens.expiresAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

  return { ok: true };
}
