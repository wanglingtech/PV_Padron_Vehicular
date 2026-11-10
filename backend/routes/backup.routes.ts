/**
 * Respaldo y migración integral de la base de datos.
 */

import type { Express } from 'express';
import {
  executeDatabaseRestore,
  generateFullJsonBackup,
  generateUniversalSqlBackup,
  getDatabaseBackupStats,
} from '../utils/backup-service.ts';
import { requireAuth, requireModule, type AuthRequest } from '../middleware/auth.ts';

export function registerBackupRoutes(app: Express): void {
  // Exportar respaldo completo (JSON o SQL)
  app.get(
    '/api/backup/export',
    requireAuth,
    requireModule('backup-migracion', 'write'),
    async (req: AuthRequest, res) => {
      try {
        const format = (req.query.format as string) === 'sql' ? 'sql' : 'json';
        const userEmail = req.user?.email || 'admin@transporte.pe';
        const dateStr = new Date().toISOString().slice(0, 10);

        if (format === 'sql') {
          const sqlContent = await generateUniversalSqlBackup(userEmail);
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="backup_migracion_padron_${dateStr}.sql"`
          );
          res.setHeader('Content-Type', 'application/sql; charset=utf-8');
          return res.send(sqlContent);
        } else {
          const jsonPayload = await generateFullJsonBackup(userEmail);
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="backup_padron_completo_${dateStr}.json"`
          );
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          return res.json(jsonPayload);
        }
      } catch (error: any) {
        console.error('Error in GET /api/backup/export:', error);
        res.status(500).json({ error: error.message || 'Error al exportar respaldo del sistema' });
      }
    }
  );

  // Métricas del respaldo
  app.get(
    '/api/backup/stats',
    requireAuth,
    requireModule('backup-migracion', 'read'),
    async (_req: AuthRequest, res) => {
      try {
        const stats = await getDatabaseBackupStats();
        res.json(stats);
      } catch (error: any) {
        console.error('Error in GET /api/backup/stats:', error);
        res.status(500).json({ error: error.message || 'Error al consultar métricas de respaldo' });
      }
    }
  );

  // Restaurar respaldo
  app.post(
    '/api/backup/restore',
    requireAuth,
    requireModule('backup-migracion', 'write'),
    async (req: AuthRequest, res) => {
      try {
        const { backupData, mode = 'merge' } = req.body;
        if (!backupData || !backupData.data) {
          return res.status(400).json({ error: 'Formato de respaldo no válido o archivo vacío' });
        }

        const userEmail = req.user?.email || 'admin@transporte.pe';
        const result = await executeDatabaseRestore(backupData, mode as any, userEmail);
        res.json(result);
      } catch (error: any) {
        console.error('Error in POST /api/backup/restore:', error);
        res.status(500).json({
          error: error.message || 'Error al restaurar respaldo en la base de datos',
        });
      }
    }
  );
}
