/**
 * Solicitudes de cambio de padrón.
 *
 * El operador solicita y el administrador revisa (aprueba o rechaza).
 */

import type { Express } from 'express';
import {
  createPadronChangeRequest,
  listPadronChangeRequests,
  reviewPadronChangeRequest,
} from '../db/padron-changes.ts';
import { requireAdmin, requireAuth, type AuthRequest } from '../middleware/auth.ts';

export function registerPadronRequestRoutes(app: Express): void {
  // Listar solicitudes
  app.get('/api/padron-requests', async (_req, res) => {
    try {
      const requests = await listPadronChangeRequests();
      res.json(requests);
    } catch (error: any) {
      console.error('Error in GET /api/padron-requests:', error);
      res.status(500).json({ error: error.message || 'Error al listar solicitudes' });
    }
  });

  // Crear solicitud (operador)
  app.post('/api/padron-requests', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { sourceVehicleId, targetVehicleId, requestedPadron, requestType, reason } = req.body;
      if (!sourceVehicleId || !requestedPadron || !reason) {
        return res.status(400).json({ error: 'Faltan campos obligatorios para la solicitud.' });
      }

      const user = {
        email: req.user?.email || 'operador@transporte.pe',
        name: req.user?.name || 'Operador',
        role: req.user?.role || 'operator',
      };

      const result = await createPadronChangeRequest({
        sourceVehicleId: Number(sourceVehicleId),
        targetVehicleId: targetVehicleId ? Number(targetVehicleId) : null,
        requestedPadron: String(requestedPadron),
        requestType: requestType || 'CHANGE',
        reason: String(reason),
        user,
      });

      res.status(201).json(result);
    } catch (error: any) {
      console.error('Error in POST /api/padron-requests:', error);
      res.status(400).json({ error: error.message || 'Error al crear solicitud' });
    }
  });

  // Resolver solicitud (solo administrador)
  app.put(
    '/api/padron-requests/:id/review',
    requireAuth,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ error: 'ID de solicitud inválido' });
        }

        const { approved, rejectionReason } = req.body;

        const user = {
          email: req.user?.email || 'admin@transporte.pe',
          name: req.user?.name || 'Administrador',
          role: req.user?.role || 'admin',
        };

        const result = await reviewPadronChangeRequest({
          requestId: id,
          approved: Boolean(approved),
          rejectionReason,
          user,
        });

        res.json(result);
      } catch (error: any) {
        console.error('Error in PUT /api/padron-requests/:id/review:', error);
        res.status(400).json({ error: error.message || 'Error al resolver solicitud' });
      }
    }
  );
}
