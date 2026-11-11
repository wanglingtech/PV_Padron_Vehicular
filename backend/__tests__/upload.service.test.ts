/**
 * Pruebas unitarias del servicio de validación de archivos subidos.
 *
 * Es la barrera que impide que se guarde un `.exe` o un `.html` con script
 * en el servidor disfrazado de Excel.
 */

import { describe, it, expect } from 'vitest';
import {
  UploadValidationError,
  resolveExtension,
  sanitizeFileName,
  validateUpload,
  MAX_UPLOAD_BYTES,
} from '../../backend/services/upload.service.ts';

/** Bytes que empiezan por la firma de un contenedor ZIP (Excel 2007+). */
const FIRMA_ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
/** Bytes que empiezan por la firma de un PDF. */
const FIRMA_PDF = Buffer.from('%PDF-1.7');

describe('resolveExtension', () => {
  it('acepta las extensiones permitidas', () => {
    expect(resolveExtension('datos.xlsx')).toBe('.xlsx');
    expect(resolveExtension('reporte.PDF')).toBe('.pdf');
    expect(resolveExtension('lista.csv')).toBe('.csv');
  });

  it('rechaza una extensión no permitida', () => {
    expect(() => resolveExtension('virus.exe')).toThrow(UploadValidationError);
  });

  it('rechaza un archivo sin extensión', () => {
    expect(() => resolveExtension('archivo')).toThrow(UploadValidationError);
  });
});

describe('sanitizeFileName', () => {
  it('elimina la ruta del nombre', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('C:\\Windows\\system32\\cmd.exe')).toBe('cmd.exe');
  });

  it('elimina los caracteres de control', () => {
    expect(sanitizeFileName('archivo\u0000.txt')).toBe('archivo.txt');
  });

  it('sustituye los caracteres reservados de Windows', () => {
    expect(sanitizeFileName('a:b*c?.xlsx')).toBe('a_b_c_.xlsx');
  });
});

describe('validateUpload', () => {
  const aBase64 = (buf: Buffer) => buf.toString('base64');

  it('acepta un PDF válido', () => {
    const archivo = Buffer.concat([FIRMA_PDF, Buffer.from('%PDF-1.7\ncontenido')]);
    const r = validateUpload(aBase64(archivo), 'documento.pdf');
    expect(r.extension).toBe('.pdf');
    expect(r.sizeBytes).toBe(archivo.length);
    expect(r.fileName).toBe('documento.pdf');
  });

  it('acepta un Excel con firma ZIP', () => {
    const archivo = Buffer.concat([FIRMA_ZIP, Buffer.from('contenido de hoja')]);
    const r = validateUpload(aBase64(archivo), 'padron.xlsx');
    expect(r.extension).toBe('.xlsx');
  });

  it('acepta un CSV con texto plano', () => {
    const archivo = Buffer.from('placa;marca\nABC-123;Honda\n', 'utf8');
    const r = validateUpload(aBase64(archivo), 'padron.csv');
    expect(r.extension).toBe('.csv');
  });

  it('rechaza un PDF cuyo contenido no es un PDF', () => {
    const archivo = Buffer.from('MZ\x90\x00ejecutable', 'binary');
    expect(() => validateUpload(aBase64(archivo), 'falso.pdf')).toThrow(
      /no corresponde a un PDF válido/
    );
  });

  it('rechaza un Excel con contenido binario arbitrario', () => {
    const archivo = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    expect(() => validateUpload(aBase64(archivo), 'falso.xlsx')).toThrow(
      /no corresponde a un XLSX válido/
    );
  });

  it('rechaza un CSV que en realidad es binario', () => {
    const archivo = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
    expect(() => validateUpload(aBase64(archivo), 'falso.csv')).toThrow(
      /no tiene el formato CSV esperado/
    );
  });

  it('rechaza un archivo vacío', () => {
    expect(() => validateUpload('', 'vacio.pdf')).toThrow(UploadValidationError);
  });

  it('rechaza una base64 corrupta que no decodifica a nada', () => {
    expect(() => validateUpload('!!!!', 'raro.pdf')).toThrow(UploadValidationError);
  });

  it('rechaza un archivo con extensión no permitida', () => {
    const archivo = Buffer.concat([FIRMA_PDF, Buffer.from('x')]);
    expect(() => validateUpload(aBase64(archivo), 'script.html')).toThrow(
      /Formato no permitido/
    );
  });

  it('acepta un data URL con prefijo', () => {
    const archivo = Buffer.concat([FIRMA_PDF, Buffer.from('%PDF-1.7')]);
    const dataUrl = `data:application/pdf;base64,${aBase64(archivo)}`;
    const r = validateUpload(dataUrl, 'documento.pdf');
    expect(r.extension).toBe('.pdf');
  });

  it('rechaza un archivo que supera el tamaño máximo', () => {
    const grande = Buffer.concat([FIRMA_PDF, Buffer.alloc(MAX_UPLOAD_BYTES + 1024)]);
    expect(() => validateUpload(aBase64(grande), 'grande.pdf')).toThrow(
      /supera el tamaño máximo/
    );
  });
});
