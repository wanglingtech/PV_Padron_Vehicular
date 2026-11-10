import argon2, { type HashOptions } from 'argon2';
import { timingSafeEqual } from 'crypto';

/**
 * Parámetros de argon2id recomendados por OWASP para contraseñas.
 * Se mantienen conservadores para funcionar en servidores modestos.
 */
const ARGON2_OPTIONS: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

/** Indica si el valor almacenado ya es un hash argon2. */
export const isArgon2Hash = (value?: string | null): boolean =>
  typeof value === 'string' && value.startsWith('$argon2');

/** Genera un hash argon2id de la contraseña. */
export const hashPassword = (plain: string): Promise<string> =>
  argon2.hash(plain, ARGON2_OPTIONS);

export interface PasswordVerification {
  valid: boolean;
  /** El hash almacenado es texto plano y debe migrarse a argon2. */
  needsRehash: boolean;
}

/**
 * Verifica una contraseña contra el valor almacenado.
 *
 * Compatibilidad: las bases de datos antiguas guardaban la contraseña en texto
 * plano. Si se detecta ese caso, se compara en tiempo constante y se marca
 * `needsRehash` para que el llamador guarde el hash definitivo.
 */
export async function verifyPassword(
  stored: string | null | undefined,
  plain: string
): Promise<PasswordVerification> {
  if (!stored) return { valid: false, needsRehash: false };

  if (isArgon2Hash(stored)) {
    try {
      return { valid: await argon2.verify(stored, plain), needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // Comparación en tiempo constante para contraseñas heredadas en texto plano.
  const storedBuffer = Buffer.from(stored, 'utf8');
  const plainBuffer = Buffer.from(plain, 'utf8');
  const valid =
    storedBuffer.length === plainBuffer.length && timingSafeEqual(storedBuffer, plainBuffer);

  return { valid, needsRehash: valid };
}
