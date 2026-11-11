/**
 * Pruebas del servicio de validación de documentos para IA y del
 * diagnóstico de importación desde PDF.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../../backend/db/index.ts';
import { vehicles, persons } from '../../backend/db/schema.ts';
import {
  validateAiDocument,
  MIME_BY_EXTENSION,
} from '../../backend/services/ai-document.service.ts';
import { UploadValidationError } from '../../backend/services/upload.service.ts';
import { diagnoseAndStageExtractedRows } from '../../backend/utils/pdf-import-handler.ts';

const FIRMA_PDF = Buffer.from('%PDF-1.7\ncontenido');
const FIRMA_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const FIRMA_WEBP = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe('Validación de documentos para IA', () => {
  it('acepta un PDF válido', () => {
    const r = validateAiDocument(FIRMA_PDF.toString('base64'), 'planilla.pdf');
    expect(r.extension).toBe('.pdf');
    expect(r.dataUrl.startsWith('data:application/pdf;base64,')).toBe(true);
  });

  it('acepta una imagen JPEG', () => {
    const r = validateAiDocument(FIRMA_JPEG.toString('base64'), 'planilla.jpg');
    expect(r.extension).toBe('.jpg');
    expect(r.dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true);
  });

  it('acepta una imagen PNG', () => {
    const r = validateAiDocument(FIRMA_PNG.toString('base64'), 'planilla.png');
    expect(r.extension).toBe('.png');
  });

  it('acepta una imagen WebP', () => {
    const r = validateAiDocument(FIRMA_WEBP.toString('base64'), 'planilla.webp');
    expect(r.extension).toBe('.webp');
  });

  it('rechaza un PDF cuyo contenido no es un PDF', () => {
    expect(() =>
      validateAiDocument(Buffer.from('MZ\x90\x00ejecutable').toString('base64'), 'falso.pdf')
    ).toThrow(/no corresponde a un PDF válido/);
  });

  it('rechaza una imagen con contenido binario arbitrario', () => {
    expect(() =>
      validateAiDocument(Buffer.from([0x00, 0x01, 0x02]).toString('base64'), 'falso.png')
    ).toThrow(/no corresponde a un PNG válido/);
  });

  it('rechaza un formato no admitido', () => {
    expect(() =>
      validateAiDocument(FIRMA_PDF.toString('base64'), 'documento.docx')
    ).toThrow(/Formato no permitido/);
  });

  it('rechaza un archivo vacío', () => {
    expect(() => validateAiDocument('', 'vacio.pdf')).toThrow(UploadValidationError);
  });

  it('deduce la extensión a partir del MIME declarado si no hay nombre', () => {
    const r = validateAiDocument(
      FIRMA_PDF.toString('base64'),
      'documento',
      'application/pdf'
    );
    expect(r.extension).toBe('.pdf');
  });

  it('expone el MIME de cada extensión admitida', () => {
    expect(MIME_BY_EXTENSION['.pdf']).toBe('application/pdf');
    expect(MIME_BY_EXTENSION['.png']).toBe('image/png');
  });
});

describe('Diagnóstico de importación desde PDF', () => {
  let vehicleId: number;

  beforeAll(async () => {
    const [v] = await db
      .insert(vehicles)
      .values({
        padronNumber: 'PDF-001',
        plate: 'PDF-001',
        brand: 'Honda',
        modelYear: 2021,
      })
      .returning({ id: vehicles.id });
    vehicleId = v.id;
  });

  afterAll(async () => {
    await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
  });

  it('devuelve un resultado vacío si no hay filas extraídas', async () => {
    const r = await diagnoseAndStageExtractedRows([]);
    expect(r.totalRows).toBe(0);
    expect(r.rows).toEqual([]);
  });

  it('clasifica como válida una fila completa y nueva', async () => {
    const r = await diagnoseAndStageExtractedRows([
      {
        padronNumber: 'PDF-NUEVO-1',
        plate: 'PDN-001',
        brand: 'Kawasaki',
        modelYear: '2023',
        engineNumber: '1PDF001',
        ownerFullName: 'Propietario PDF',
        ownerDni: '41000888',
      } as any,
    ]);

    expect(r.totalRows).toBe(1);
    expect(r.toCreateCount).toBe(1);
  });

  it('detecta un conflicto cuando el padrón y la placa son de unidades distintas', async () => {
    const r = await diagnoseAndStageExtractedRows([
      {
        padronNumber: 'PDF-001',
        plate: 'PLACA-QUE-NO-ES',
        brand: 'Honda',
        modelYear: '2021',
      } as any,
    ]);

    expect(r.conflictCount).toBeGreaterThan(0);
  });

  it('marca como duplicada una fila repetida', async () => {
    const fila = {
      padronNumber: 'PDF-DUP-1',
      plate: 'PDUP-001',
      brand: 'Honda',
      modelYear: '2021',
    } as any;

    const r = await diagnoseAndStageExtractedRows([fila, { ...fila }]);
    expect(r.duplicateCount).toBeGreaterThan(0);
  });
});
