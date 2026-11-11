/**
 * Validación y sanitización de archivos subidos.
 *
 * Los archivos llegan en base64 dentro del cuerpo JSON (no multipart). Antes
 * se aceptaba cualquier contenido: un `.exe` o un `.html` con script se
 * guardaba en el servidor sin comprobar nada.
 *
 * Aquí se valida:
 *  1. Que el tamaño en bytes esté dentro del límite.
 *  2. Que la firma binaria (magic number) coincida con una extensión permitida.
 *     Es la única comprobación fiable: el `Content-Type` lo elige el cliente.
 *  3. Que el nombre del archivo sea seguro (sin rutas ni caracteres de control).
 */

import path from 'node:path';

/** Tamaño máximo por archivo: 15 MB. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Tamaño máximo del cuerpo en base64 (≈ 1.34× el binario, con margen). */
export const MAX_BASE64_LENGTH = Math.ceil(MAX_UPLOAD_BYTES * 1.4);

/** Extensiones admitidas por el importador. */
export const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.csv', '.pdf'] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

/**
 * Firmas binarias por extensión.
 *
 * Se comparan los primeros bytes del archivo. Los formatos de Office son
 * contenedores ZIP (`PK\x03\x04`) y el PDF empieza por `%PDF-`.
 */
const MAGIC_NUMBERS: Record<AllowedExtension, number[][]> = {
  // Contenedor ZIP: Excel 2007+ (.xlsx, .xlsm)
  '.xlsx': [[0x50, 0x4b, 0x03, 0x04]],
  '.xlsm': [[0x50, 0x4b, 0x03, 0x04]],
  // Excel 97-2003: compound file binary (D0 CF 11 E0 A1 B1 1A E1)
  '.xls': [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  // PDF
  '.pdf': [[0x25, 0x50, 0x44, 0x46]],
  // CSV: texto plano, se valida aparte (no tiene firma fija)
  '.csv': [],
};

export interface ValidatedUpload {
  /** Nombre original saneado (sin ruta ni caracteres de control). */
  fileName: string;
  /** Extensión en minúsculas, incluida el punto. */
  extension: AllowedExtension;
  /** Contenido binario decodificado. */
  buffer: Buffer;
  /** Tamaño real en bytes. */
  sizeBytes: number;
}

/** Error de validación de archivo, con mensaje apto para el frontend. */
export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

/**
 * Extrae la extensión de un nombre de archivo y verifica que esté permitida.
 */
export function resolveExtension(fileName: string): AllowedExtension {
  const ext = path.extname(String(fileName || '')).toLowerCase();
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new UploadValidationError(
      `Formato no permitido ("${ext || 'sin extensión'}"). Se aceptan: ${ALLOWED_EXTENSIONS.join(', ')}.`
    );
  }
  return ext as AllowedExtension;
}

/**
 * Verifica que los primeros bytes coincidan con la firma del formato.
 *
 * Para CSV (texto plano) se comprueba que no contenga bytes nulos, que es lo
 * que distingue un CSV de un binario arbitrario.
 */
function assertMagicNumber(buffer: Buffer, extension: AllowedExtension): void {
  const signatures = MAGIC_NUMBERS[extension];

  if (extension === '.csv') {
    if (buffer.includes(0)) {
      throw new UploadValidationError(
        'El archivo no tiene el formato CSV esperado (contiene datos binarios).'
      );
    }
    return;
  }

  const coincide = signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );

  if (!coincide) {
    throw new UploadValidationError(
      `El contenido del archivo no corresponde a un ${extension.slice(1).toUpperCase()} válido.`
    );
  }
}

/**
 * Sanea el nombre del archivo: elimina la ruta y los caracteres de control.
 *
 * No se usa `path.basename`: en Windows interpreta `c:` como una unidad de
 * disco y descartaría el prefijo de un archivo llamado `a:b.xlsx`.
 */
export function sanitizeFileName(fileName: string): string {
  const base = String(fileName || '')
    .split(/[\\/]/)
    .pop() ?? '';
  const limpio = base
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"|?*]/g, '_')
    .trim();
  return limpio.slice(0, 255) || 'archivo';
}

/**
 * Valida y decodifica un archivo recibido en base64.
 *
 * @param fileBase64  Contenido en base64 (con o sin prefijo data URL).
 * @param fileName    Nombre original (para la extensión).
 * @throws UploadValidationError si el archivo no cumple las reglas.
 */
export function validateUpload(fileBase64: string, fileName: string): ValidatedUpload {
  if (!fileBase64 || typeof fileBase64 !== 'string') {
    throw new UploadValidationError('No se envió el archivo.');
  }

  if (fileBase64.length > MAX_BASE64_LENGTH) {
    throw new UploadValidationError(
      `El archivo supera el tamaño máximo permitido (${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`
    );
  }

  // Se acepta tanto "data:mime;base64,XXX" como el base64 pelado.
  const base64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    throw new UploadValidationError('El archivo no está codificado en base64 válido.');
  }

  if (buffer.length === 0) {
    throw new UploadValidationError('El archivo está vacío.');
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError(
      `El archivo supera el tamaño máximo permitido (${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`
    );
  }

  const extension = resolveExtension(fileName);
  assertMagicNumber(buffer, extension);

  return {
    fileName: sanitizeFileName(fileName),
    extension,
    buffer,
    sizeBytes: buffer.length,
  };
}
