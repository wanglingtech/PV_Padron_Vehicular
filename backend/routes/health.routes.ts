/**
 * Health check del servicio.
 *
 * Comprueba la conectividad real con PostgreSQL para saber si la API
 * responde con datos o solo está viva.
 */

import type { Express } from 'express';
import { sql } from 'drizzle-orm';
import { db, getDatabaseTarget } from '../db/index.ts';

export function registerHealthRoutes(app: Express): void {
  app.get('/api/health', async (_req, res) => {
    try {
      await db.execute(sql`select 1`);
      res.json({
        status: 'ok',
        database: 'up',
        target: getDatabaseTarget(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'degraded',
        database: 'down',
        target: getDatabaseTarget(),
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });
}
