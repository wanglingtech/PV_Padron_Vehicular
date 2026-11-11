/**
 * Middleware de validación con Zod.
 *
 * Centraliza el parseo del cuerpo de la petición para que todas las rutas de
 * escritura validen la entrada con el mismo criterio y devuelvan el mismo
 * formato de error.
 */

import type { NextFunction, Request, Response } from 'express';
import { z, type ZodTypeAny } from 'zod';

/** Formato de error devuelto al cliente cuando la validación falla. */
export interface ValidationErrorBody {
  error: string;
  /** Detalle campo a campo, útil para-forms y para depurar. */
  details: Array<{ campo: string; mensaje: string }>;
}

/**
 * Convierte un `ZodError` en la respuesta 400 estandarizada.
 *
 * Zod v4 devuelve mensajes técnicos para los campos ausentes
 * ("Invalid input: expected string, received undefined"). Aquí se traducen a
 * un mensaje utilizable: "El campo «title» es obligatorio."
 */
export function formatZodError(error: z.ZodError): ValidationErrorBody {
  const details = error.issues.map((issue) => {
    const campo = issue.path.join('.') || '(raíz)';

    // Campo ausente: el mensaje por defecto de Zod es técnico.
    if (issue.code === 'invalid_type') {
      const recibido = (issue as { received?: string }).received;
      if (recibido === 'undefined') {
        return { campo, mensaje: `El campo «${campo}» es obligatorio.` };
      }
    }

    // Se conserva el mensaje propio del esquema cuando existe.
    const mensaje = issue.message;
    if (mensaje && !/^Invalid input/i.test(mensaje)) {
      return { campo, mensaje };
    }

    return { campo, mensaje: `El campo «${campo}» no tiene un formato válido.` };
  });

  return {
    error: details[0]?.mensaje ?? 'Datos inválidos.',
    details,
  };
}

/**
 * Middleware que valida `req.body` contra un esquema de Zod.
 *
 * En caso de éxito, reemplaza `req.body` por el resultado del parseo: así
 * la ruta recibe datos ya saneados (defaults aplicados, espacios recortados,
 * tipos convertidos) y nunca el cuerpo crudo del cliente.
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      res.status(400).json(formatZodError(result.error));
      return;
    }

    req.body = result.data;
    next();
  };
}

/**
 * Valida un parámetro de ruta numérico (`req.params.<name>`).
 *
 * Sustituye el `parseInt` suelto por una comprobación explícita: un id no
 * numérico devolvía `NaN` y llegaba hasta la consulta a la base de datos.
 */
export function validateParam(name: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const raw = req.params[name];
    const value = Number(raw);

    if (!Number.isInteger(value) || value <= 0) {
      res.status(400).json({
        error: `El identificador "${name}" debe ser un número entero positivo.`,
        details: [{ campo: name, mensaje: 'Valor no válido.' }],
      });
      return;
    }

    // El valor validado queda disponible como string normalizado.
    req.params[name] = String(value);
    next();
  };
}

/**
 * Valida un parámetro de ruta que es un identificador de texto.
 *
 * Los roles usan identificadores de texto (`admin`, `operator`, `auditor`),
 * así que no pueden pasar por `validateParam`, que exige un número.
 */
export function validateStringParam(name: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const raw = String(req.params[name] ?? '').trim();

    if (!raw || !/^[A-Za-z][A-Za-z0-9_-]{0,49}$/.test(raw)) {
      res.status(400).json({
        error: `El identificador "${name}" no tiene un formato válido.`,
        details: [{ campo: name, mensaje: 'Valor no válido.' }],
      });
      return;
    }

    req.params[name] = raw;
    next();
  };
}

/** Esquema reutilizable para un id numérico de ruta. */
export const IdParamSchema = z.object({
  id: z.coerce.number().int().positive('El identificador debe ser un número entero positivo.'),
});

/**
 * Valida el cuerpo contra un esquema y, si todo está bien, lo deja en
 * `req.body`. Variante para usar dentro de handlers existentes sin tocar la
 * firma de la ruta.
 */
export function parseBody<T extends ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const formatted = formatZodError(result.error);
    const err = new Error(formatted.error) as Error & { status?: number; body?: unknown };
    err.status = 400;
    err.body = formatted;
    throw err;
  }
  return result.data;
}
