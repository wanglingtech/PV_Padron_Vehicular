import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { systemRoles, users } from '../db/schema.ts';
import { isPrivilegedRole } from '../config/roles.ts';
import type { ModulePermissionMode, SystemModuleId } from '../types/index.ts';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Los tokens de desarrollo solo se aceptan en local o cuando AUTH_DEV_MODE=true.
 * En producción (NODE_ENV=production) quedan deshabilitados por defecto.
 */
const isDevAuthEnabled = (): boolean =>
  process.env.AUTH_DEV_MODE === 'true' || process.env.NODE_ENV !== 'production';

/** Extrae el rol de un token `dev-<rol>-token` (solo en modo desarrollo). */
const parseDevTokenRole = (token: string): string | null => {
  const match = /^dev-([a-z][a-z0-9_-]*)-token$/.exec(token);
  return match ? match[1] : null;
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const devRole = (req.headers['x-user-role'] as string) || '';
  const devEmail = (req.headers['x-user-email'] as string) || '';
  const devName = (req.headers['x-user-name'] as string) || '';
  const devAuthEnabled = isDevAuthEnabled();

  // 1. Tokens de desarrollo (solo en local o con AUTH_DEV_MODE=true)
  if (devAuthEnabled && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length);

    if (token === 'dev-admin-token') {
      req.user = {
        uid: 'admin-dev-01',
        email: devEmail || 'admin@transporte.pe',
        name: devName || 'Administrador Principal',
        role: 'admin',
      };
      return next();
    }

    // Permite probar cualquier rol con dev-<rol>-token, por ejemplo:
    // dev-gerente-token, dev-fiscalizador-token, dev-registrador-token.
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

  // 2. Token real de Firebase
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length);

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      const email = decodedToken.email || 'usuario@transporte.pe';

      // Buscamos el rol asignado en la base de datos; si no existe, usamos
      // una heurística temporal hasta implementar el login real (Fase 1).
      let role = devRole || (email.includes('admin') ? 'admin' : 'operator');
      try {
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);
        if (dbUser?.role) role = dbUser.role;
      } catch {
        // Si la consulta falla, conservamos el rol heurístico.
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

  // 3. Cabeceras de sesión de desarrollo (solo en local o con AUTH_DEV_MODE=true)
  if (devAuthEnabled && devRole) {
    req.user = {
      uid: `${devRole}-dev-uid`,
      email: devEmail || `${devRole}@transporte.pe`,
      name: devName || `Usuario (${devRole})`,
      role: devRole,
    };
    return next();
  }

  // 4. Sin credenciales: nunca asumir administrador por defecto
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
