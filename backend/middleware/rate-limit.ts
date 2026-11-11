/**
 * Límites de tasa (rate limiting) para las rutas de escritura.
 *
 * El login ya tenía su propio límite (por IP). El resto de escrituras
 * quedaban sin protection: un bucle automatizado podía alterar el padrón,
 * crear usuarios o publicar miles de entradas en la cartelera.
 *
 * Los límites son generosos para el uso humano real (un operador de campo
 * puede registrar varias unidades seguidas) pero cortan la automatización.
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Identificador de la peticion para el contador.
 *
 * `ipKeyGenerator` es obligatorio en express-rate-limit v8: normaliza la IP
 * y agrupa los rangos IPv6. Sin él, el limitador lanza
 * `ERR_ERL_KEY_GEN_IPV6` y deja de contar en IPv6.
 *
 * Se combina con el usuario autenticado: así un mismo usuario no puede
 * saltarse el límite cambiando de IP, y dos operadores distintos en la misma
 * oficina no se bloquean entre sí.
 */
function keyGenerator(req: Request): string {
  const user = (req as Request & { user?: { uid?: string } }).user;
  const ip = ipKeyGenerator(req.ip || req.socket.remoteAddress || 'desconocida');
  return user?.uid ? `${user.uid}:${ip}` : ip;
}

/** Respuesta estandarizada cuando se excede el límite. */
function limitMessage(message: string) {
  return (req: Request, res: import('express').Response) => {
    res.status(429).json({
      error: message,
      details: [],
    });
  };
}

/**
 * Límite a aplicar según el entorno.
 *
 * En pruebas el límite real estorba: una misma suite hace decenas de
 * escrituras seguidas y recviría 429 antes de poder comprobar nada. El
 * middleware se sigue montando (se ejercita), pero con un margen alto.
 */
function limite(maximo: number): number {
  return process.env.NODE_ENV === 'test' ? 100_000 : maximo;
}

/**
 * Límite para operaciones de escritura habituales del padrón
 * (alta de vehículos, edición, cambios de padrón).
 */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: limite(60),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  message: limitMessage(
    'Demasiadas operaciones en poco tiempo. Espera un momento e inténtalo de nuevo.'
  ),
});

/**
 * Límite más estricto para operaciones sensibles o costosas:
 * gestión de usuarios y roles, publicaciones de la cartelera, importaciones.
 */
export const sensitiveWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: limite(30),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  message: limitMessage(
    'Demasiadas operaciones sensibles en los últimos 15 minutos. Inténtalo más tarde.'
  ),
});

/**
 * Límite para cargas de archivos (importación de Excel/PDF).
 *
 * El coste en memoria y CPU es alto por petición, así que es el más bajo.
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: limite(10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  message: limitMessage(
    'Demasiadas importaciones en los últimos 15 minutos. Inténtalo más tarde.'
  ),
});

/**
 * Límite para la recuperación de contraseña.
 *
 * Es la única ruta sin autenticación que dispara un envío de correo, así que
 * necesita un límite agresivo para no convertir el sistema en un generador
 * de spam.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: limite(5),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limitMessage(
    'Se enviaron demasiadas solicitudes de restablecimiento. Inténtalo en una hora.'
  ),
});
