/**
 * Validación de archivos para el procesamiento con IA.
 *
 * A diferencia del importador de padrón (solo Excel/PDF), aquí también se
 * aceptan imágenes de planillas escaneadas.
 */

import {
  MAX_UPLOAD_BYTES,
  UploadValidationError,
  sanitizeFileName,
} from './upload.service.ts';

/** Extensiones admitidas por el processor de planillas con IA. */
export const AI_DOCUMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'] as const;

export type AiDocumentExtension = (typeof AI_DOCUMENT_EXTENSIONS)[number];

/** Firmas binarias de los formatos admitidos. */
const MAGIC_NUMBERS: Record<AiDocumentExtension, number[][]> = {
  '.pdf': [[0x25, 0x50, 0x44, 0x46]],
  // JPEG: FF D8 FF
  '.jpg': [[0xff, 0xd8, 0xff]],
  '.jpeg': [[0xff, 0xd8, 0xff]],
  // PNG: 89 50 4E 47
  '.png': [[0x89, 0x50, 0x4e, 0x47]],
  // WebP: "RIFF" .... "WEBP"
  '.webp': [
    [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50],
  ],
};

export interface ValidatedAiDocument {
  fileName: string;
  extension: AiDocumentExtension;
  buffer: Buffer;
  sizeBytes: number;
  /** Data URL lista para enviar al modelo. */
  dataUrl: string;
}

/** Tipo MIME asociado a cada extensión. */
export const MIME_BY_EXTENSION: Record<AiDocumentExtension, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * Valida el documento (PDF o imagen) que se envía al modelo de IA.
 *
 * @throws UploadValidationError si el archivo no cumple las reglas.
 */
export function validateAiDocument(
  fileBase64: string,
  fileName: string,
  declaredMime?: string
): ValidatedAiDocument {
  if (!fileBase64 || typeof fileBase64 !== 'string') {
    throw new UploadValidationError('No se envió el archivo para procesar con IA.');
  }

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

  // La extensión se deduce del nombre; si no viene, del MIME declarado.
  const nombre = sanitizeFileName(fileName);
  let ext = nombre.includes('.') ? nombre.slice(nombre.lastIndexOf('.')).toLowerCase() : '';

  if (!ext && declaredMime) {
    const porMime = Object.entries(MIME_BY_EXTENSION).find(([, mime]) => mime === declaredMime);
    ext = porMime ? porMime[0] : '';
  }

  if (!(AI_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new UploadValidationError(
      `Formato no permitido ("${ext || 'sin extensión'}"). Se aceptan: ${AI_DOCUMENT_EXTENSIONS.join(', ')}.`
    );
  }

  const extension = ext as AiDocumentExtension;
  const coincide = MAGIC_NUMBERS[extension].some((sig) => sig.every((b, i) => buffer[i] === b));

  if (!coincide) {
    throw new UploadValidationError(
      `El contenido del archivo no corresponde a un ${extension.slice(1).toUpperCase()} válido.`
    );
  }

  const mime = MIME_BY_EXTENSION[extension];

  return {
    fileName: nombre,
    extension,
    buffer,
    sizeBytes: buffer.length,
    dataUrl: `data:${mime};base64,${buffer.toString('base64')}`,
  };
}
