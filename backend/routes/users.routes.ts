/**
 * Usuarios del sistema.
 *
 * Las contraseñas se guardan siempre como hash argon2 y nunca se devuelven
 * al cliente (ni en el listado ni en las respuestas de alta y edición).
 */

import type { Express } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { requireAdmin, requireAuth, requireModule, type AuthRequest } from '../middleware/auth.ts';
import { hashPassword } from '../services/password.service.ts';

/** Longitud mínima de la contraseña en texto plano. */
const MIN_PASSWORD_LENGTH = 8;

export function registerUserRoutes(app: Express): void {
  // Listar usuarios (sin hash de contraseña)
  app.get(
    '/api/users',
    requireAuth,
    requireModule('usuarios', 'read'),
    async (_req: AuthRequest, res) => {
      try {
        const list = await db
          .select({
            id: users.id,
            uid: users.uid,
            email: users.email,
            name: users.name,
            role: users.role,
            assignedPadron: users.assignedPadron,
            isActive: users.isActive,
            createdAt: users.createdAt,
          })
          .from(users);
        res.json(list);
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al listar usuarios' });
      }
    }
  );

  // Crear usuario (solo administrador)
  app.post('/api/users', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { email, name, role, password, assignedPadron, isActive } = req.body;
      if (!email || !name) {
        return res.status(400).json({ error: 'Correo y nombre son requeridos' });
      }
      if (!password || String(password).trim().length < MIN_PASSWORD_LENGTH) {
        return res
          .status(400)
          .json({ error: 'La contraseña inicial debe tener al menos 8 caracteres.' });
      }
      const uid = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const passwordHash = await hashPassword(String(password).trim());
      const [created] = await db
        .insert(users)
        .values({
          uid,
          email: email.trim().toLowerCase(),
          name: name.trim(),
          password: passwordHash,
          role: role || 'operator',
          assignedPadron: assignedPadron ? assignedPadron.trim().toUpperCase() : null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        })
        .returning({
          id: users.id,
          uid: users.uid,
          email: users.email,
          name: users.name,
          role: users.role,
          assignedPadron: users.assignedPadron,
          isActive: users.isActive,
          createdAt: users.createdAt,
        });
      res.status(201).json(created);
    } catch (error: any) {
      console.error('Error in POST /api/users:', error);
      res.status(400).json({ error: error.message || 'Error al registrar usuario en base de datos' });
    }
  });

  // Actualizar usuario (solo administrador)
  app.put('/api/users/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { email, name, role, password, assignedPadron, isActive } = req.body;
      const updates: any = {};
      if (email) updates.email = email.trim().toLowerCase();
      if (name) updates.name = name.trim();
      if (role) updates.role = role;
      if (password) {
        if (String(password).trim().length < MIN_PASSWORD_LENGTH) {
          return res
            .status(400)
            .json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
        }
        updates.password = await hashPassword(String(password).trim());
      }
      if (assignedPadron !== undefined) {
        updates.assignedPadron = assignedPadron ? assignedPadron.trim().toUpperCase() : null;
      }
      if (isActive !== undefined) updates.isActive = Boolean(isActive);

      await db.update(users).set(updates).where(eq(users.id, id));
      res.json({ success: true, id });
    } catch (error: any) {
      console.error('Error in PUT /api/users/:id:', error);
      res.status(400).json({ error: error.message || 'Error al actualizar usuario' });
    }
  });

  // Eliminar usuario (solo administrador)
  app.delete('/api/users/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(users).where(eq(users.id, id));
      res.json({ success: true, id });
    } catch (error: any) {
      console.error('Error in DELETE /api/users/:id:', error);
      res.status(400).json({ error: error.message || 'Error al eliminar usuario' });
    }
  });
}
