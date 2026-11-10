/**
 * Curso de educación vial anual: consulta, actualización, sincronización masiva
 * y procesamiento de planillas escaneadas con IA.
 */

import type { Express } from 'express';
import {
  getDriversWithCoursesList,
  syncRoadSafetyCoursesBulk,
  updateDriverRoadSafetyCourse,
} from '../db/vehicles.ts';
import { requireAuth, requireModule, type AuthRequest } from '../middleware/auth.ts';
import { extractCourseDriversFromDocument } from '../services/gemini.service.ts';

export function registerCourseRoutes(app: Express): void {
  // Listar conductores con su estado de curso vial
  app.get(
    '/api/drivers/courses',
    requireAuth,
    requireModule('curso-vial', 'read'),
    async (req: AuthRequest, res) => {
      try {
        const search = req.query.search as string;
        const courseStatus = req.query.courseStatus as string;
        const list = await getDriversWithCoursesList({ search, courseStatus });
        res.json(list);
      } catch (error: any) {
        console.error('Error in GET /api/drivers/courses:', error);
        res.status(500).json({
          error: error.message || 'Error al obtener lista de curso vial',
        });
      }
    }
  );

  // Actualizar el curso vial de un conductor
  app.put(
    '/api/drivers/:id/course',
    requireAuth,
    requireModule('curso-vial', 'write'),
    async (req: AuthRequest, res) => {
      try {
        const driverId = parseInt(req.params.id);
        if (isNaN(driverId)) {
          return res.status(400).json({ error: 'ID de conductor inválido' });
        }

        const user = {
          email: req.user?.email || 'admin@transporte.pe',
          name: req.user?.name || 'Administrador',
        };

        const result = await updateDriverRoadSafetyCourse(driverId, req.body, user);
        res.json(result);
      } catch (error: any) {
        console.error('Error in PUT /api/drivers/:id/course:', error);
        res.status(400).json({ error: error.message || 'Error al actualizar curso vial' });
      }
    }
  );

  // Sincronización masiva de evaluaciones
  app.post(
    '/api/drivers/courses/bulk-sync',
    requireAuth,
    requireModule('curso-vial', 'write'),
    async (req: AuthRequest, res) => {
      try {
        const { approvedIdentifiers, evaluations, year } = req.body;
        const hasIdentifiers = Array.isArray(approvedIdentifiers) && approvedIdentifiers.length > 0;
        const hasEvaluations = Array.isArray(evaluations) && evaluations.length > 0;

        if (!hasIdentifiers && !hasEvaluations) {
          return res
            .status(400)
            .json({ error: 'Debe proporcionar una lista de evaluaciones o identificadores.' });
        }

        const user = {
          email: req.user?.email || 'admin@transporte.pe',
          name: req.user?.name || 'Administrador',
        };

        const result = await syncRoadSafetyCoursesBulk(
          {
            approvedIdentifiers,
            evaluations,
            courseYear: year || new Date().getFullYear(),
          },
          year || new Date().getFullYear(),
          user
        );
        res.json(result);
      } catch (error: any) {
        console.error('Error in POST /api/drivers/courses/bulk-sync:', error);
        res.status(400).json({
          error: error.message || 'Error en sincronización masiva de curso vial',
        });
      }
    }
  );

  // Procesamiento con IA de planilla o documento escaneado
  app.post(
    '/api/drivers/courses/process-ai-document',
    requireAuth,
    requireModule('curso-vial', 'write'),
    async (req: AuthRequest, res) => {
      try {
        const { fileBase64, mimeType = 'application/pdf', courseYear = new Date().getFullYear() } =
          req.body;
        if (!fileBase64) {
          return res.status(400).json({ error: 'No se envió el archivo para procesar con IA.' });
        }

        const extractedDrivers = await extractCourseDriversFromDocument({
          fileBase64,
          mimeType,
          courseYear,
        });

        res.json({
          success: true,
          extractedDrivers,
          count: extractedDrivers.length,
          courseYear,
        });
      } catch (error: any) {
        console.error('Error in POST /api/drivers/courses/process-ai-document:', error);
        res.status(500).json({ error: error.message || 'Error al procesar documento con IA' });
      }
    }
  );
}
