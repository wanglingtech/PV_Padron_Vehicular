import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { systemRoles, users } from '../db/schema.ts';
import { isPrivilegedRole } from '../../shared/roles.ts';
import type { ModulePermissionMode, SystemModuleId } from '../../frontend/src/types/index.ts';
import { getAuthCookieName, isDevAuthEnabled } from '../config/env.ts';
import { verifySessionToken } from '../services/token.service.ts';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name: string;
    role: string;
  };
}

/** Extrae el rol de un token `dev-<rol>-token` (solo en modo desarrollo). */
const parseDevTokenRole = (token: string): string | null => {
  const match = /^dev-([a-z][a-z0-9_-]*)-token$/.exec(token);
  return match ? match[1] : null;
};

/** Obtiene el token de sesión desde `Authorization: Bearer` o la cookie HttpOnly. */
const extractSessionToken = (req: AuthRequest): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim() || null;
  }

  const cookies = (req as AuthRequest & { cookies?: Record<string, string> }).cookies;
  const cookieToken = cookies?.[getAuthCookieName()];
  return typeof cookieToken === 'string' && cookieToken.length > 0 ? cookieToken : null;
};

/**
 * Autenticación de peticiones.
 *
 * Orden de aceptación:
 * 1. Tokens `dev-*` (solo en desarrollo o con AUTH_DEV_MODE=true).
 * 2. JWT propio firmado (Bearer o cookie HttpOnly).
 * 3. Token de Firebase (compatibilidad con el login de Google).
 * 4. Cabeceras de desarrollo (`x-user-role`).
 *
 * En todos los casos se refresca el rol desde PostgreSQL para que un cambio de
 * permisos o la desactivación de una cuenta surta efecto de inmediato.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const devAuthEnabled = isDevAuthEnabled();
  const token = extractSessionToken(req);
  const devRole = (req.headers['x-user-role'] as string) || '';
  const devEmail = (req.headers['x-user-email'] as string) || '';
  const devName = (req.headers['x-user-name'] as string) || '';

  // 1. Tokens de desarrollo (solo en local o con AUTH_DEV_MODE=true)
  if (devAuthEnabled && token) {
    if (token === 'dev-admin-token') {
      req.user = {
        uid: 'admin-dev-01',
        email: devEmail || 'admin@transporte.pe',
        name: devName || 'Administrador Principal',
        role: 'admin',
      };
      return next();
    }

    const tokenRole = parseDevTokenRole(token);
    if (tokenRole) {
      const role = token === 'dev-operator-token' ? devRole || tokenRole : tokenRole;
      req.user = {
        uid: `${role}-dev-uid`,
        email: devEmail || `${role}@transporte.pe`,
        name: devName || `Usuario de desarrollo (${role})`,
        role,
      };
      return next();
    }
  }

  // 2. JWT propio (Bearer o cookie)
  if (token) {
    try {
      const payload = verifySessionToken(token);
      const [row] = await db
        .select()
        .from(users)
        .where(eq(users.uid, payload.sub))
        .limit(1);

      if (row) {
        if (!row.isActive) {
          return res.status(401).json({ error: 'La cuenta está desactivada.' });
        }
        req.user = {
          uid: row.uid,
          email: row.email,
          name: row.name,
          role: row.role,
        };
        return next();
      }

      // Token válido de un usuario sin fila local (por ejemplo, Firebase).
      req.user = {
        uid: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };
      return next();
    } catch {
      // No era un JWT propio; se intenta con Firebase más abajo.
    }

    // 3. Token real de Firebase
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      const email = (decodedToken.email || 'usuario@transporte.pe').toLowerCase();

      let role = email.includes('admin') ? 'admin' : 'operator';
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (dbUser) {
        if (!dbUser.isActive) {
          return res.status(401).json({ error: 'La cuenta está desactivada.' });
        }
        role = dbUser.role;
      }

      req.user = {
        uid: decodedToken.uid,
        email,
        name: decodedToken.name || email.split('@')[0],
        role,
      };
      return next();
    } catch (error) {
      console.warn(
        'Token de sesión inválido:',
        error instanceof Error ? error.message : error
      );
      return res.status(401).json({ error: 'Token de sesión inválido o expirado.' });
    }
  }

  // 4. Cabeceras de sesión de desarrollo (solo en local o con AUTH_DEV_MODE=true)
  if (devAuthEnabled && devRole) {
    req.user = {
      uid: `${devRole}-dev-uid`,
      email: devEmail || `${devRole}@transporte.pe`,
      name: devName || `Usuario (${devRole})`,
      role: devRole,
    };
    return next();
  }

  // 5. Sin credenciales: nunca asumir administrador por defecto
  return res.status(401).json({ error: 'No autenticado. Inicia sesión para continuar.' });
};

/**
 * Permite el acceso solo a roles con control total:
 * administrador, programador/soporte y gerente.
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !isPrivilegedRole(req.user.role)) {
    return res.status(403).json({
      error:
        'Permiso denegado: esta acción requiere rol de Administrador, Programador o Gerente.',
    });
  }
  next();
};

/**
 * Middleware de autorización por módulo.
 *
 * - Los roles privilegiados (admin, developer, gerente) siempre pasan.
 * - El resto debe tener el permiso `write` (modo write) o `read`/`write`
 *   (modo read) en la matriz almacenada en PostgreSQL.
 */
export const requireModule = (
  moduleId: SystemModuleId,
  mode: 'read' | 'write' = 'read'
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado. Inicia sesión para continuar.' });
    }

    if (isPrivilegedRole(req.user.role)) {
      return next();
    }

    try {
      const [role] = await db
        .select()
        .from(systemRoles)
        .where(eq(systemRoles.id, req.user.role))
        .limit(1);

      if (!role) {
        return res.status(403).json({
          error: `El rol "${req.user.role}" no está registrado o no tiene permisos asignados.`,
        });
      }

      let permissions: Partial<Record<SystemModuleId, ModulePermissionMode>> = {};
      try {
        const parsed = JSON.parse(role.permissions);
        if (parsed && typeof parsed === 'object') {
          permissions = parsed;
        }
      } catch {
        permissions = {};
      }

      const granted = permissions[moduleId];
      const allowed =
        mode === 'write'
          ? granted === 'write'
          : granted === 'read' || granted === 'write';

      if (!allowed) {
        return res.status(403).json({
          error: `Permiso denegado: el rol "${role.name}" no tiene acceso de ${
            mode === 'write' ? 'escritura' : 'lectura'
          } al módulo "${moduleId}".`,
        });
      }

      return next();
    } catch (error) {
      console.error('Error al verificar permisos de módulo:', error);
      return res.status(500).json({ error: 'No se pudo verificar los permisos del rol.' });
    }
  };
};
