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
import { uploadLimiter } from '../middleware/rate-limit.ts';
import { validateBody } from '../middleware/validate.ts';
import { ImportConfirmSchema } from '../utils/validation.ts';
import { extractVehiclesFromPdf } from '../services/gemini.service.ts';
import { UploadValidationError, validateUpload } from '../services/upload.service.ts';

export function registerImportExportRoutes(app: Express): void {
  // Previsualizar archivo Excel antes de importar
  app.post(
    '/api/import/preview',
    requireAuth,
    requireModule('importar-exportar', 'write'),
    uploadLimiter,
    async (req: AuthRequest, res) => {
      try {
        const { fileBase64, fileName } = req.body;

        // Se valida tipo, tamaño y firma binaria antes de procesar nada.
        const upload = validateUpload(fileBase64, fileName ?? 'archivo.xlsx');

        const previewResult = await parseAndPreviewExcel(upload.buffer);
        res.json(previewResult);
      } catch (error: any) {
        if (error instanceof UploadValidationError) {
          return res.status(400).json({ error: error.message });
        }
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
    uploadLimiter,
    async (req: AuthRequest, res) => {
      try {
        const { fileBase64, fileName } = req.body;

        const upload = validateUpload(fileBase64, fileName ?? 'documento.pdf');
        if (upload.extension !== '.pdf') {
          return res.status(400).json({
            error: 'Este endpoint solo acepta documentos PDF.',
          });
        }

        // El servicio de IA espera el base64 original con su prefijo data URL.
        const extractedVehicles = await extractVehiclesFromPdf(
          `data:application/pdf;base64,${upload.buffer.toString('base64')}`
        );

        if (extractedVehicles.length === 0) {
          return res.status(400).json({
            error: 'No se detectaron filas de vehículos válidas en el documento PDF.',
          });
        }

        const stagingResult = await diagnoseAndStageExtractedRows(extractedVehicles);
        res.json(stagingResult);
      } catch (error: any) {
        if (error instanceof UploadValidationError) {
          return res.status(400).json({ error: error.message });
        }
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
    uploadLimiter,
    validateBody(ImportConfirmSchema),
    async (req: AuthRequest, res) => {
      try {
        const { rows } = req.body;
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
        const excelBuffer = await generateExcelExport(data.vehicles);

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
