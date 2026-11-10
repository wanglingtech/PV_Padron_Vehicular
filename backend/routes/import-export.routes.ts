/**
 * Importación y exportación del padrón (Excel, PDF con IA) y exportación a Excel/CSV.
 */

import type { Express } from 'express';
import { getVehicles } from '../db/vehicles.ts';
import {
  executeImportBatch,
  generateExcelExport,
  parseAndPreviewExcel,
} from '../utils/excel-handler.ts';
import { diagnoseAndStageExtractedRows } from '../utils/pdf-import-handler.ts';
import { requireAuth, requireModule, type AuthRequest } from '../middleware/auth.ts';
import { extractVehiclesFromPdf } from '../services/gemini.service.ts';

export function registerImportExportRoutes(app: Express): void {
  // Previsualizar archivo Excel antes de importar
  app.post(
    '/api/import/preview',
    requireAuth,
    requireModule('importar-exportar', 'write'),
    async (req: AuthRequest, res) => {
      try {
        const { fileBase64 } = req.body;
        if (!fileBase64) {
          return res.status(400).json({ error: 'No se envió el archivo para previsualización' });
        }

        const buffer = Buffer.from(fileBase64.split(',')[1] || fileBase64, 'base64');
        const previewResult = await parseAndPreviewExcel(buffer);
        res.json(previewResult);
      } catch (error: any) {
        console.error('Error in POST /api/import/preview:', error);
        res.status(400).json({ error: error.message || 'Error al procesar archivo Excel' });
      }
    }
  );

  // Previsualizar documento PDF oficial antes de importar (procesamiento con IA)
  app.post(
    '/api/import/preview-pdf',
    requireAuth,
    requireModule('importar-exportar', 'write'),
    async (req: AuthRequest, res) => {
      try {
        const { fileBase64 } = req.body;
        if (!fileBase64) {
          return res.status(400).json({ error: 'No se envió el archivo PDF para previsualización' });
        }

        const extractedVehicles = await extractVehiclesFromPdf(fileBase64);

        if (extractedVehicles.length === 0) {
          return res.status(400).json({
            error: 'No se detectaron filas de vehículos válidas en el documento PDF.',
          });
        }

        const stagingResult = await diagnoseAndStageExtractedRows(extractedVehicles);
        res.json(stagingResult);
      } catch (error: any) {
        console.error('Error in POST /api/import/preview-pdf:', error);
        res.status(500).json({ error: error.message || 'Error al procesar documento PDF' });
      }
    }
  );

  // Confirmar importación
  app.post(
    '/api/import/confirm',
    requireAuth,
    requireModule('importar-exportar', 'write'),
    async (req: AuthRequest, res) => {
      try {
        const { rows } = req.body;
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
          return res.status(400).json({ error: 'No hay filas válidas para importar' });
        }

        const user = {
          email: req.user?.email || 'admin@transporte.pe',
          name: req.user?.name || 'Administrador',
        };

        const result = await executeImportBatch(rows, user);
        res.json({
          success: true,
          ...result,
        });
      } catch (error: any) {
        console.error('Error in POST /api/import/confirm:', error);
        res.status(500).json({ error: error.message || 'Error al confirmar la importación' });
      }
    }
  );

  // Exportar padrón a Excel o CSV
  app.get(
    '/api/export',
    requireAuth,
    requireModule('importar-exportar', 'read'),
    async (req: AuthRequest, res) => {
      try {
        const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
        const search = req.query.search as string;
        const status = req.query.status as string;

        const data = await getVehicles({ search, status, limit: 5000 });
        const excelBuffer = generateExcelExport(data.vehicles);

        res.setHeader(
          'Content-Disposition',
          `attachment; filename="padron_vehicular_${new Date().toISOString().slice(0, 10)}.${format}"`
        );
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.send(excelBuffer);
      } catch (error: any) {
        console.error('Error in GET /api/export:', error);
        res.status(500).json({ error: error.message || 'Error al exportar padrón' });
      }
    }
  );
}
