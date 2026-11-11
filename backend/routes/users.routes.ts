/**
 * Usuarios del sistema.
 *
 * Las contraseñas se guardan siempre como hash argon2 y nunca se devuelven
 * al cliente (ni en el listado ni en las respuestas de alta y edición).
 */

import type { Express } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { systemRoles, users } from '../db/schema.ts';
import { requireAdmin, requireAuth, requireModule, type AuthRequest } from '../middleware/auth.ts';
import { validateBody, validateParam } from '../middleware/validate.ts';
import { sensitiveWriteLimiter } from '../middleware/rate-limit.ts';
import { hashPassword } from '../services/password.service.ts';
import { UserCreateSchema, UserUpdateSchema } from '../utils/validation.ts';

/** Longitud mínima de la contraseña en texto plano. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Comprueba que el rol exista en la matriz de permisos.
 *
 * Antes se aceptaba cualquier cadena como `role`, lo que podía dejar
 * usuarios con un rol inexistente y, por tanto, sin permisos asignados.
 */
async function assertRoleExists(roleId: string): Promise<boolean> {
  const [row] = await db.select({ id: systemRoles.id }).from(systemRoles).where(eq(systemRoles.id, roleId)).limit(1);
  return Boolean(row);
}

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
  app.post(
    '/api/users',
    requireAuth,
    requireAdmin,
    sensitiveWriteLimiter,
    validateBody(UserCreateSchema),
    async (req: AuthRequest, res) => {
      try {
        const { email, name, role, password, assignedPadron, isActive } = req.body;

        // El rol debe existir en la matriz: si no, el usuario nace sin permisos.
        if (!(await assertRoleExists(role))) {
          return res.status(400).json({
            error: `El rol "${role}" no está registrado en el sistema.`,
          });
        }

        const uid = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const passwordHash = await hashPassword(password);
        const [created] = await db
          .insert(users)
          .values({
            uid,
            email: email.toLowerCase(),
            name,
            password: passwordHash,
            role,
            assignedPadron: assignedPadron ? assignedPadron.toUpperCase() : null,
            isActive,
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
    }
  );

  // Actualizar usuario (solo administrador)
  app.put(
    '/api/users/:id',
    requireAuth,
    requireAdmin,
    sensitiveWriteLimiter,
    validateParam('id'),
    validateBody(UserUpdateSchema),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const { email, name, role, password, assignedPadron, isActive } = req.body;

        if (role && !(await assertRoleExists(role))) {
          return res.status(400).json({
            error: `El rol "${role}" no está registrado en el sistema.`,
          });
        }

        const updates: Partial<typeof users.$inferInsert> = {};
        if (email !== undefined) updates.email = email.toLowerCase();
        if (name !== undefined) updates.name = name;
        if (role !== undefined) updates.role = role;
        if (password !== undefined) updates.password = await hashPassword(password);
        if (assignedPadron !== undefined) {
          updates.assignedPadron = assignedPadron ? assignedPadron.toUpperCase() : null;
        }
        if (isActive !== undefined) updates.isActive = isActive;

        const [updated] = await db
          .update(users)
          .set(updates)
          .where(eq(users.id, id))
          .returning({ id: users.id });

        if (!updated) {
          return res.status(404).json({ error: 'El usuario no existe.' });
        }

        res.json({ success: true, id });
      } catch (error: any) {
        console.error('Error in PUT /api/users/:id:', error);
        res.status(400).json({ error: error.message || 'Error al actualizar usuario' });
      }
    }
  );

  // Eliminar usuario (solo administrador)
  app.delete(
    '/api/users/:id',
    requireAuth,
    requireAdmin,
    sensitiveWriteLimiter,
    validateParam('id'),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);

        // Evitar que el administrador se quede a sí mismo sin acceso.
        if (req.user?.uid) {
          const [target] = await db
            .select({ uid: users.uid, email: users.email })
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
          if (target && target.uid === req.user.uid) {
            return res.status(400).json({
              error: 'No puedes eliminar tu propia cuenta.',
            });
          }
        }

        const [deleted] = await db
          .delete(users)
          .where(eq(users.id, id))
          .returning({ id: users.id });
        if (!deleted) {
          return res.status(404).json({ error: 'El usuario no existe.' });
        }
        res.json({ success: true, id });
      } catch (error: any) {
        console.error('Error in DELETE /api/users/:id:', error);
        res.status(400).json({ error: error.message || 'Error al eliminar usuario' });
      }
    }
  );
}
