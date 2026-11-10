/**
 * Configuración de entorno del backend.
 *
 * Centraliza la lectura de variables sensibles y aplica valores por defecto
 * seguros. En producción, la ausencia de `JWT_SECRET` impide arrancar.
 */

const DEV_JWT_SECRET = 'dev-only-insecure-secret-change-me-32-chars';

export const isProduction = (): boolean => process.env.NODE_ENV === 'production';

/**
 * Secreto para firmar las sesiones JWT.
 * En producción es obligatorio y debe tener al menos 32 caracteres.
 */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim();

  if (secret) {
    if (isProduction() && secret.length < 32) {
      throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción.');
    }
    return secret;
  }

  if (isProduction()) {
    throw new Error('JWT_SECRET es obligatorio cuando NODE_ENV=production.');
  }

  console.warn(
    '[auth] JWT_SECRET no está definido; se usa un secreto de desarrollo. Configúralo en .env.'
  );
  return DEV_JWT_SECRET;
};

/** Duración de la sesión (por ejemplo `8h`, `30m`, `7d`). */
export const getJwtExpiresIn = (): string => process.env.JWT_EXPIRES_IN?.trim() || '8h';

/** Nombre de la cookie de sesión. */
export const getAuthCookieName = (): string =>
  process.env.AUTH_COOKIE_NAME?.trim() || 'padron_session';

/** `Secure` en producción o cuando se fuerza explícitamente. */
export const isCookieSecure = (): boolean =>
  process.env.AUTH_COOKIE_SECURE === 'true' || isProduction();

/**
 * SameSite de la cookie.
 * - `lax` para el monolito same-origin (recomendado).
 * - `none` + Secure cuando frontend y API vivan en dominios distintos.
 */
export const getCookieSameSite = (): 'lax' | 'strict' | 'none' => {
  const value = (process.env.AUTH_COOKIE_SAME_SITE || 'lax').toLowerCase();
  if (value === 'strict' || value === 'none') return value;
  return 'lax';
};

/** Convierte `8h`, `30m`, `7d` o segundos a milisegundos para `maxAge`. */
export const getSessionMaxAgeMs = (): number => {
  const raw = getJwtExpiresIn().trim();
  const match = /^(\d+)\s*([smhd])?$/i.exec(raw);
  if (!match) return 8 * 60 * 60 * 1000;

  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  const factor = unit === 'd' ? 86400000 : unit === 'h' ? 3600000 : unit === 'm' ? 60000 : 1000;
  return amount * factor;
};

/** Orígenes permitidos para CORS (separados por coma). Vacío = mismo origen. */
export const getCorsOrigins = (): string[] =>
  (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

/**
 * Los tokens `dev-*` solo se aceptan en local o con `AUTH_DEV_MODE=true`.
 * En producción quedan deshabilitados por defecto.
 */
export const isDevAuthEnabled = (): boolean =>
  process.env.AUTH_DEV_MODE === 'true' || !isProduction();
