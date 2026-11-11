import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de las pruebas E2E (Playwright).
 *
 * - `webServer` arranca la app real contra la base de pruebas en un puerto
 *   propio (3100) para no reutilizar el servidor de desarrollo, que trabaja
 *   sobre la base real.
 * - `baseURL` apunta a esa misma instancia.
 * - Los navegadores se reutilizan en local para no reiniciar Chrome en cada
 *   test; en CI se usa un solo hilo por trabajar sobre la misma base.
 */

/** Puerto dedicado al E2E; distinto del 3000 de desarrollo. */
const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
const E2E_BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: E2E_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'es-PE',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npx tsx server.ts',
        url: E2E_BASE_URL,
        // Nunca se reutiliza un servidor ajeno: podría apuntar a la base real.
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          NODE_ENV: 'development',
          SQL_DB_NAME: process.env.E2E_DB_NAME ?? 'padron_vehicular_test',
          PORT: String(E2E_PORT),
          SEED_DEMO_DATA: 'true',
          AUTH_DEV_MODE: 'true',
          JWT_SECRET: 'e2e-only-secret-at-least-32-characters-long',
          // Evita chocar con el WebSocket de HMR del `npm run dev` del puerto 3000.
          DISABLE_HMR: 'true',
        },
      },
});
