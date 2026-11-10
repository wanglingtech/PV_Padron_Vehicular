import jwt from 'jsonwebtoken';
import { getJwtExpiresIn, getJwtSecret } from '../config/env.ts';

/** Datos mínimos que viajan dentro de la sesión firmada. */
export interface SessionPayload {
  /** uid del usuario en la base de datos. */
  sub: string;
  email: string;
  name: string;
  role: string;
}

const ISSUER = 'padron-vehicular';
const AUDIENCE = 'padron-web';

/** Firma un JWT de sesión con expiración configurable. */
export const signSessionToken = (payload: SessionPayload): string =>
  jwt.sign(payload, getJwtSecret(), {
    // `jsonwebtoken` tipa `expiresIn` de forma estricta; el valor proviene de env.
    expiresIn: getJwtExpiresIn() as jwt.SignOptions['expiresIn'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });

/**
 * Verifica y decodifica un JWT de sesión.
 * Lanza un error si el token es inválido, expiró o fue emitido por otro sistema.
 */
export const verifySessionToken = (token: string): SessionPayload => {
  const decoded = jwt.verify(token, getJwtSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('Token de sesión inválido.');
  }

  return {
    sub: String(decoded.sub),
    email: String((decoded as jwt.JwtPayload).email || ''),
    name: String((decoded as jwt.JwtPayload).name || ''),
    role: String((decoded as jwt.JwtPayload).role || ''),
  };
};
