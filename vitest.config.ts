/**
 * Configuración global de Vitest.
 *
 * - `globalSetup` crea la base de datos de pruebas y aplica el esquema.
 * - `setupFiles` prepara el entorno de cada archivo de test (variables de
 *   entorno apuntando a la base de pruebas) antes de importar la app.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['backend/__tests__/**/*.test.ts'],
    setupFiles: ['./backend/__tests__/setup.ts'],
    globalSetup: ['./backend/__tests__/global-setup.ts'],
    // Los tests comparten una base de datos: se ejecutan en serie y en un
    // solo hilo para evitar carreras al crear y borrar registros.
    fileParallelism: false,
    pool: 'forks',
    maxWorkers: 1,
    // Los módulos se evalúan una sola vez (el servidor Express es compartido).
    isolate: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    reporters: 'verbose',
    coverage: {
      provider: 'v8',
      // El objetivo de la Fase 1 es 60% de cobertura.
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
      reporter: ['text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'backend/__tests__/**',
        'backend/db/schema.ts',
        'backend/db/drizzle.config.ts',
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
      ],
      include: ['backend/**/*.ts', 'shared/**/*.ts'],
    },
  },
});
