/**
 * Roles del sistema y matriz de permisos (RBAC).
 */

import type { Express } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { systemRoles, users } from '../db/schema.ts';
import { requireAdmin, requireAuth, type AuthRequest } from '../middleware/auth.ts';

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
  app.post('/api/roles', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { id, name, description, badgeColor, permissions } = req.body;
      if (!id || !name) {
        return res.status(400).json({ error: 'ID y nombre de rol son obligatorios' });
      }
      const roleId = String(id).toLowerCase().trim().replace(/\s+/g, '_');
      const permsString = typeof permissions === 'string' ? permissions : JSON.stringify(permissions || {});
      const newRole = {
        id: roleId,
        name: String(name).trim(),
        description: String(description || '').trim(),
        badgeColor: badgeColor || 'indigo',
        isSystem: false,
        permissions: permsString,
        updatedAt: new Date(),
      };
      await db.insert(systemRoles).values(newRole);
      res.status(201).json({
        ...newRole,
        permissions: typeof permissions === 'string' ? JSON.parse(permissions) : permissions || {},
      });
    } catch (error: any) {
      console.error('Error in POST /api/roles:', error);
      res.status(400).json({ error: error.message || 'Error al crear rol en base de datos' });
    }
  });

  // Actualizar permisos de un rol (solo administrador)
  app.put('/api/roles/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const roleId = req.params.id;
      const { name, description, badgeColor, permissions } = req.body;
      const updates: any = { updatedAt: new Date() };
      if (name) updates.name = String(name).trim();
      if (description !== undefined) updates.description = String(description).trim();
      if (badgeColor) updates.badgeColor = badgeColor;
      if (permissions) {
        updates.permissions = typeof permissions === 'string' ? permissions : JSON.stringify(permissions);
      }

      await db.update(systemRoles).set(updates).where(eq(systemRoles.id, roleId));
      res.json({ success: true, roleId });
    } catch (error: any) {
      console.error('Error in PUT /api/roles/:id:', error);
      res.status(400).json({ error: error.message || 'Error al actualizar permisos de rol' });
    }
  });

  // Eliminar rol (solo administrador, nunca los institucionales)
  app.delete('/api/roles/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
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
  });
}
