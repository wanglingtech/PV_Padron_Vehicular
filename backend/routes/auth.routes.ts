import type { CookieOptions, Express } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import { passwordResetLimiter } from '../middleware/rate-limit.ts';
import {
  authenticateUser,
  changeUserPasswordByUid,
  findUserByUid,
  toPublicUser,
} from '../services/auth.service.ts';
import {
  restablecerConToken,
  solicitarRestablecimiento,
} from '../services/password-reset.service.ts';
import { signSessionToken } from '../services/token.service.ts';
import {
  getAuthCookieName,
  getCookieSameSite,
  getSessionMaxAgeMs,
  isCookieSecure,
} from '../config/env.ts';

const LoginSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria.'),
  newPassword: z
    .string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres.')
    .max(128, 'La nueva contraseña es demasiado larga.'),
});

/** Solicitud de restablecimiento de contraseña. */
const ForgotPasswordSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.'),
});

/** Restablecimiento de contraseña con el token recibido por correo. */
const ResetPasswordSchema = z.object({
  token: z.string().min(20, 'El enlace de restablecimiento no es válido.'),
  newPassword: z
    .string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres.')
    .max(128, 'La contraseña es demasiado larga.'),
});

/** Limita los intentos de inicio de sesión por IP. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo en 15 minutos.',
  },
});

const sessionCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isCookieSecure(),
  sameSite: getCookieSameSite(),
  path: '/',
  maxAge: getSessionMaxAgeMs(),
});

/**
 * Registra los endpoints de autenticación real.
 *
 * La web usa la cookie HttpOnly; los clientes de API y las pruebas pueden usar
 * el token Bearer devuelto en la respuesta.
 */
export function registerAuthRoutes(app: Express): void {
  // 1. Inicio de sesión
  app.post('/api/auth/login', loginLimiter, async (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Datos de inicio de sesión inválidos.',
      });
    }

    try {
      const user = await authenticateUser(parsed.data.email, parsed.data.password);

      if (!user) {
        // Mensaje genérico para no revelar si el correo existe.
        return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
      }

      const token = signSessionToken({
        sub: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      res.cookie(getAuthCookieName(), token, sessionCookieOptions());
      return res.json({ user: toPublicUser(user), token });
    } catch (error) {
      console.error('Error en POST /api/auth/login:', error);
      return res.status(500).json({ error: 'No se pudo iniciar sesión. Inténtalo más tarde.' });
    }
  });

  // 2. Cierre de sesión
  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie(getAuthCookieName(), { path: '/' });
    return res.json({ success: true });
  });

  // 3. Sesión actual (cookie o Bearer)
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await findUserByUid(req.user!.uid);
      if (!user || !user.isActive) {
        res.clearCookie(getAuthCookieName(), { path: '/' });
        return res.status(401).json({ error: 'La sesión ya no es válida.' });
      }
      return res.json({ user: toPublicUser(user) });
    } catch (error) {
      console.error('Error en GET /api/auth/me:', error);
      return res.status(500).json({ error: 'No se pudo consultar la sesión.' });
    }
  });

  // 4. Cambio de contraseña del propio usuario
  app.post('/api/auth/change-password', requireAuth, async (req: AuthRequest, res) => {
    const parsed = ChangePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Datos de contraseña inválidos.',
      });
    }

    try {
      const result = await changeUserPasswordByUid(
        req.user!.uid,
        parsed.data.currentPassword,
        parsed.data.newPassword
      );

      if (!result.ok) {
        if (result.code === 'INVALID_CURRENT') {
          return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
        }
        if (result.code === 'SAME_PASSWORD') {
          return res.status(400).json({ error: 'La nueva contraseña debe ser diferente.' });
        }
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Error en POST /api/auth/change-password:', error);
      return res.status(500).json({ error: 'No se pudo cambiar la contraseña.' });
    }
  });

  // 5. Recuperación de contraseña: envío del enlace por correo
  app.post(
    '/api/auth/forgot-password',
    passwordResetLimiter,
    validateBody(ForgotPasswordSchema),
    async (req, res) => {
      try {
        const resultado = await solicitarRestablecimiento(req.body.email);
        // La respuesta es la misma exista o no la cuenta: no se revela qué
        // correos están registrados.
        return res.json({ success: true, message: resultado.mensaje });
      } catch (error: any) {
        console.error('Error en POST /api/auth/forgot-password:', error);
        return res.status(500).json({
          error: 'No se pudo procesar la solicitud de restablecimiento.',
        });
      }
    }
  );

  // 6. Recuperación de contraseña: cambio con el token recibido
  app.post(
    '/api/auth/reset-password',
    passwordResetLimiter,
    validateBody(ResetPasswordSchema),
    async (req, res) => {
      try {
        const resultado = await restablecerConToken(
          req.body.token,
          req.body.newPassword
        );

        if (!resultado.ok) {
          return res.status(400).json({ error: resultado.error });
        }

        return res.json({
          success: true,
          message: 'Tu contraseña se restableció correctamente. Ya puedes iniciar sesión.',
        });
      } catch (error: any) {
        console.error('Error en POST /api/auth/reset-password:', error);
        return res.status(500).json({ error: 'No se pudo restablecer la contraseña.' });
      }
    }
  );
}
