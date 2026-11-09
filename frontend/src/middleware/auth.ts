import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';

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

    if (token === 'dev-operator-token') {
      req.user = {
        uid: 'operator-dev-02',
        email: devEmail || 'operador@transporte.pe',
        name: devName || 'Operador de Turno',
        role: 'operator',
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
      const role = email.includes('admin') ? 'admin' : (devRole || 'operator');

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

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permiso denegado: Esta acción requiere rol de Administrador.' });
  }
  next();
};
