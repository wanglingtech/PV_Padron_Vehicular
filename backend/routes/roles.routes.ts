/**
 * Roles del sistema y matriz de permisos (RBAC).
 */

import type { Express } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { systemRoles, users } from '../db/schema.ts';
import { requireAdmin, requireAuth, type AuthRequest } from '../middleware/auth.ts';
import { validateBody, validateStringParam } from '../middleware/validate.ts';
import { sensitiveWriteLimiter } from '../middleware/rate-limit.ts';
import { RoleCreateSchema, RoleUpdateSchema } from '../utils/validation.ts';

export function registerRoleRoutes(app: Express): void {
  // Listar roles (público: el frontend lo usa para pintar la matriz)
  app.get('/api/roles', async (_req, res) => {
    try {
      const list = await db.select().from(systemRoles);
      const parsed = list.map((r) => {
        let permissions = {};
        try {
          permissions = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions;
        } catch (e) {
          permissions = {};
        }
        return {
          id: r.id,
          name: r.name,
          description: r.description,
          badgeColor: r.badgeColor,
          isSystem: r.isSystem,
          permissions,
          createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString(),
        };
      });
      res.json(parsed);
    } catch (error: any) {
      console.error('Error in GET /api/roles:', error);
      res.status(500).json({ error: error.message || 'Error al listar roles' });
    }
  });

  // Crear rol (solo administrador)
  app.post(
    '/api/roles',
    requireAuth,
    requireAdmin,
    sensitiveWriteLimiter,
    validateBody(RoleCreateSchema),
    async (req: AuthRequest, res) => {
      try {
        const { id, name, description, badgeColor, permissions } = req.body;
        const roleId = id.toLowerCase().replace(/\s+/g, '_');

        const [existing] = await db
          .select({ id: systemRoles.id })
          .from(systemRoles)
          .where(eq(systemRoles.id, roleId))
          .limit(1);
        if (existing) {
          return res.status(400).json({ error: 'Ya existe un rol con ese identificador.' });
        }

        const newRole = {
          id: roleId,
          name,
          description: description ?? '',
          badgeColor,
          isSystem: false,
          permissions: JSON.stringify(permissions),
          updatedAt: new Date(),
        };
        await db.insert(systemRoles).values(newRole);
        res.status(201).json({ ...newRole, permissions });
      } catch (error: any) {
        console.error('Error in POST /api/roles:', error);
        res.status(400).json({ error: error.message || 'Error al crear rol en base de datos' });
      }
    }
  );

  // Actualizar permisos de un rol (solo administrador)
  app.put(
    '/api/roles/:id',
    requireAuth,
    requireAdmin,
    sensitiveWriteLimiter,
    validateStringParam('id'),
    validateBody(RoleUpdateSchema),
    async (req: AuthRequest, res) => {
      try {
        const roleId = req.params.id;
        const { name, description, badgeColor, permissions } = req.body;

        const updates: Partial<typeof systemRoles.$inferInsert> = { updatedAt: new Date() };
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (badgeColor !== undefined) updates.badgeColor = badgeColor;
        if (permissions !== undefined) updates.permissions = JSON.stringify(permissions);

        const [updated] = await db
          .update(systemRoles)
          .set(updates)
          .where(eq(systemRoles.id, roleId))
          .returning({ id: systemRoles.id });

        if (!updated) {
          return res.status(404).json({ error: 'El rol no existe.' });
        }

        res.json({ success: true, roleId });
      } catch (error: any) {
        console.error('Error in PUT /api/roles/:id:', error);
        res.status(400).json({ error: error.message || 'Error al actualizar permisos de rol' });
      }
    }
  );

  // Eliminar rol (solo administrador, nunca los institucionales)
  app.delete(
    '/api/roles/:id',
    requireAuth,
    requireAdmin,
    sensitiveWriteLimiter,
    validateStringParam('id'),
    async (req: AuthRequest, res) => {
      try {
        const roleId = req.params.id;
        const [role] = await db
          .select()
          .from(systemRoles)
          .where(eq(systemRoles.id, roleId))
          .limit(1);

        if (!role) {
          return res.status(404).json({ error: 'El rol no existe.' });
        }
        if (role.isSystem) {
          return res.status(400).json({
            error: 'No se pueden eliminar los roles institucionales del sistema.',
          });
        }
        // Reasignar usuarios de este rol a 'operator'
        await db.update(users).set({ role: 'operator' }).where(eq(users.role, roleId));
        await db.delete(systemRoles).where(eq(systemRoles.id, roleId));
        res.json({ success: true });
      } catch (error: any) {
        console.error('Error in DELETE /api/roles/:id:', error);
        res.status(400).json({ error: error.message || 'Error al eliminar rol' });
      }
    }
  );
}
