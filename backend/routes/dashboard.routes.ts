/**
 * Dashboard, vencimientos y auditoría.
 */

import type { Express } from 'express';
import { getAuditLogs, getDashboardStats, getExpirationsList } from '../db/vehicles.ts';
import { requireAuth, requireModule, type AuthRequest } from '../middleware/auth.ts';

export function registerDashboardRoutes(app: Express): void {
  // Estadísticas para el dashboard
  app.get(
    '/api/dashboard/stats',
    requireAuth,
    requireModule('dashboard', 'read'),
    async (_req: AuthRequest, res) => {
      try {
        const stats = await getDashboardStats();
        res.json(stats);
      } catch (error: any) {
        console.error('Error in GET /api/dashboard/stats:', error);
        res.status(500).json({ error: error.message || 'Error al obtener métricas del dashboard' });
      }
    }
  );

  // Pantalla de vencimientos
  app.get(
    '/api/expirations',
    requireAuth,
    requireModule('vencimientos', 'read'),
    async (req: AuthRequest, res) => {
      try {
        const timeframe = (req.query.timeframe as any) || 'all';
        const docType = (req.query.docType as string) || 'all';
        const search = (req.query.search as string) || '';

        const expirations = await getExpirationsList({ timeframe, docType, search });
        res.json(expirations);
      } catch (error: any) {
        console.error('Error in GET /api/expirations:', error);
        res.status(500).json({ error: error.message || 'Error al obtener vencimientos' });
      }
    }
  );

  // Historial de auditoría
  app.get('/api/audit-logs', requireAuth, async (req: AuthRequest, res) => {
    try {
      const padron = req.query.padron as string;
      const entity = req.query.entity as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const logs = await getAuditLogs({ padron, entity, limit, offset });
      res.json(logs);
    } catch (error: any) {
      console.error('Error in GET /api/audit-logs:', error);
      res.status(500).json({ error: error.message || 'Error al obtener auditoría' });
    }
  });
}
