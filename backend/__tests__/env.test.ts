/**
 * Configuración de entorno: reglas de seguridad para producción.
 */

import { afterEach, describe, expect, it } from 'vitest';

describe('Configuración de entorno', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it('en producción exige JWT_SECRET', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    const { getJwtSecret } = await import('../config/env.ts');
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('en producción exige un secreto de al menos 32 caracteres', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'corto';

    const { getJwtSecret } = await import('../config/env.ts');
    expect(() => getJwtSecret()).toThrow(/32 caracteres/);
  });

  it('en producción las cookies de sesión son seguras', async () => {
    process.env.NODE_ENV = 'production';

    const { isCookieSecure } = await import('../config/env.ts');
    expect(isCookieSecure()).toBe(true);
  });

  it('los tokens de desarrollo quedan deshabilitados en producción', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AUTH_DEV_MODE;

    const { isDevAuthEnabled } = await import('../config/env.ts');
    expect(isDevAuthEnabled()).toBe(false);
  });

  it('convierte la duración de sesión en milisegundos', async () => {
    process.env.JWT_EXPIRES_IN = '2h';

    const { getSessionMaxAgeMs } = await import('../config/env.ts');
    expect(getSessionMaxAgeMs()).toBe(2 * 60 * 60 * 1000);
  });

  it('en producción no siembra datos de demostración', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SEED_DEMO_DATA;

    const { shouldSeedDemoData } = await import('../config/env.ts');
    expect(shouldSeedDemoData()).toBe(false);
  });

  it('en desarrollo siembra datos de demostración', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.SEED_DEMO_DATA;

    const { shouldSeedDemoData } = await import('../config/env.ts');
    expect(shouldSeedDemoData()).toBe(true);
  });

  it('SEED_DEMO_DATA=true fuerza el seed incluso en producción', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SEED_DEMO_DATA = 'true';

    const { shouldSeedDemoData } = await import('../config/env.ts');
    expect(shouldSeedDemoData()).toBe(true);

    delete process.env.SEED_DEMO_DATA;
  });

  it('las cuentas demo están bloqueadas en producción por defecto', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_DEMO_ACCOUNTS;

    const { isDemoAccountsAllowed } = await import('../config/env.ts');
    expect(isDemoAccountsAllowed()).toBe(false);
  });
});
