/**
 * Personas del padrón (propietarios y conductores) y directorio de contactos.
 */

import type { Express } from 'express';
import { getPersonsList, updatePerson } from '../db/vehicles.ts';
import { requireAuth, requireModule, type AuthRequest } from '../middleware/auth.ts';
import { validateBody, validateParam } from '../middleware/validate.ts';
import { writeLimiter } from '../middleware/rate-limit.ts';
import { PersonUpdateSchema } from '../utils/validation.ts';
import { listContacts } from '../services/contacts.service.ts';

export function registerPersonRoutes(app: Express): void {
  // Listado de personas registradas
  app.get('/api/persons', async (req, res) => {
    try {
      const search = req.query.search as string;
      const status = req.query.status as string;
      const list = await getPersonsList({ search, status });
      res.json(list);
    } catch (error: any) {
      console.error('Error in GET /api/persons:', error);
      res.status(500).json({ error: error.message || 'Error al listar personas' });
    }
  });

  // Actualizar persona
  app.put(
    '/api/persons/:id',
    requireAuth,
    requireModule('personas', 'write'),
    writeLimiter,
    validateParam('id'),
    validateBody(PersonUpdateSchema),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);

        const user = {
          email: req.user?.email || 'admin@transporte.pe',
          name: req.user?.name || 'Administrador',
        };

        const updated = await updatePerson(id, req.body, user);
        if (!updated) {
          return res.status(404).json({ error: 'La persona no existe.' });
        }
        res.json(updated);
      } catch (error: any) {
        console.error('Error in PUT /api/persons/:id:', error);
        res.status(400).json({ error: error.message || 'Error al actualizar persona' });
      }
    }
  );

  // Directorio de contactos telefónicos y WhatsApp por rol
  app.get(
    '/api/contacts',
    requireAuth,
    requireModule('directorio-contacto', 'read'),
    async (req: AuthRequest, res) => {
      try {
        const search = (req.query.search as string || '').toLowerCase().trim();
        const roleFilter = (req.query.role as string || 'ALL').trim();
        const page = Math.max(1, parseInt(req.query.page as string || '1'));
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '10')));

        const result = await listContacts({ search, roleFilter, page, limit });
        res.json(result);
      } catch (error: any) {
        console.error('Error in GET /api/contacts:', error);
        res.status(500).json({ error: error.message || 'Error al listar contactos' });
      }
    }
  );
}
