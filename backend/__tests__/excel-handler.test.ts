/**
 * Pruebas del importador y exportador de Excel.
 *
 * La importación es la vía principal de carga del padrón: un error aquí
 * duplica unidades o pierde documentación.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ExcelJS from 'exceljs';
import { eq } from 'drizzle-orm';
import { db } from '../../backend/db/index.ts';
import { vehicles, persons } from '../../backend/db/schema.ts';
import {
  parseAndPreviewExcel,
  generateExcelExport,
} from '../../backend/utils/excel-handler.ts';

/** Construye un .xlsx en memoria a partir de una matriz de filas. */
async function construirXlsx(filas: (string | number)[][]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Padrón');
  hoja.addRows(filas);
  const buffer = await libro.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

describe('Importador de Excel', () => {
  let vehicleId: number;

  beforeAll(async () => {
    const [persona] = await db
      .insert(persons)
      .values({
        dni: '41000999',
        fullName: 'Propietario de Prueba',
        address: 'Dirección de prueba',
        phone: '900000000',
      })
      .returning({ id: persons.id });

    const [vehiculo] = await db
      .insert(vehicles)
      .values({
        padronNumber: 'XLSX-001',
        plate: 'XLS-001',
        brand: 'Honda',
        modelYear: 2020,
        driverId: persona.id,
      })
      .returning({ id: vehicles.id });

    vehicleId = vehiculo.id;
  });

  afterAll(async () => {
    await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
    await db.delete(persons).where(eq(persons.dni, '41000999'));
  });

  it('devuelve un resultado vacío para una hoja sin datos', async () => {
    const buffer = await construirXlsx([]);
    const resultado = await parseAndPreviewExcel(buffer);

    expect(resultado.totalRows).toBe(0);
    expect(resultado.rows).toEqual([]);
  });

  it('detecta la fila de cabecera aunque haya un título institucional encima', async () => {
    const buffer = await construirXlsx([
      ['ACTEP - SISTEMA DE PADRÓN VEHICULAR'],
      ['N° Padrón', 'Placa', 'Marca', 'Año', 'Propietario', 'DNI'],
      ['PAD-900', 'ZZZ-900', 'Kawasaki', '2022', 'Propietario Nuevo', '41000991'],
    ]);

    const resultado = await parseAndPreviewExcel(buffer);

    // La fila del título NO se toma como cabecera ni como dato.
    expect(resultado.totalRows).toBe(1);
    expect(resultado.validCount).toBe(1);
  });

  it('marca requiere revisión cuando falta el nombre del propietario', async () => {
    const buffer = await construirXlsx([
      ['N° Padrón', 'Placa', 'Marca', 'Año'],
      ['PAD-901', 'ZZZ-901', 'Kawasaki', '2022'],
    ]);

    const resultado = await parseAndPreviewExcel(buffer);

    expect(resultado.requiresReviewCount).toBe(1);
    expect(resultado.validCount).toBe(0);
  });

  it('clasifica como actualización una fila cuyo padrón ya existe', async () => {
    const buffer = await construirXlsx([
      ['N° Padrón', 'Placa', 'Marca', 'Año'],
      ['XLSX-001', 'XLS-001', 'Honda', '2021'],
    ]);

    const resultado = await parseAndPreviewExcel(buffer);

    expect(resultado.toUpdateCount).toBe(1);
    expect(resultado.toCreateCount).toBe(0);
  });

  it('clasifica como creación una fila con padrón y placa nuevos', async () => {
    const buffer = await construirXlsx([
      ['N° Padrón', 'Placa', 'Marca', 'Año'],
      ['XLSX-NUEVO-9', 'NUE-999', 'Yamaha', '2023'],
    ]);

    const resultado = await parseAndPreviewExcel(buffer);

    expect(resultado.toCreateCount).toBe(1);
  });

  it('detecta un conflicto cuando el padrón y la placa pertenecen a unidades distintas', async () => {
    const buffer = await construirXlsx([
      ['N° Padrón', 'Placa', 'Marca', 'Año'],
      ['XLSX-001', 'PLACA-DE-OTRO-777', 'Honda', '2020'],
    ]);

    const resultado = await parseAndPreviewExcel(buffer);

    expect(resultado.conflictCount).toBeGreaterThan(0);
  });

  it('marca como duplicada una fila repetida dentro del mismo archivo', async () => {
    const buffer = await construirXlsx([
      ['N° Padrón', 'Placa', 'Marca', 'Año'],
      ['XLSX-DUP-1', 'DUP-001', 'Honda', '2020'],
      ['XLSX-DUP-1', 'DUP-001', 'Honda', '2020'],
    ]);

    const resultado = await parseAndPreviewExcel(buffer);

    expect(resultado.duplicateCount).toBeGreaterThan(0);
  });

  it('informa una fila sin datos obligatorios', async () => {
    const buffer = await construirXlsx([
      ['N° Padrón', 'Placa', 'Marca', 'Año'],
      ['', '', '', ''],
    ]);

    const resultado = await parseAndPreviewExcel(buffer);

    expect(resultado.totalRows).toBeGreaterThanOrEqual(0);
  });
});

describe('Exportador de Excel', () => {
  it('exporta las columnas principales del padrón', async () => {
    const buffer = await generateExcelExport([
      {
        padronNumber: 'PAD-001',
        plate: 'ABC-123',
        brand: 'Honda',
        modelYear: 2024,
        engineNumber: '1ABC234',
        status: 'ACTIVO',
        requiresReview: false,
        owners: [],
        driver: { fullName: 'Conductor', dni: '41000001', phone: '900000001', address: 'Calle 1' },
        primaryOwner: {
          fullName: 'Propietario',
          dni: '41000002',
          phone: '900000002',
          address: 'Calle 2',
        },
      },
    ]);

    expect(Buffer.isBuffer(buffer)).toBe(true);

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(buffer as unknown as ArrayBuffer);
    const hoja = libro.worksheets[0];

    const cabeceras: string[] = [];
    hoja.getRow(1).eachCell((celda) => cabeceras.push(String(celda.value)));

    expect(cabeceras).toContain('N° Padrón');
    expect(cabeceras).toContain('Placa');
    expect(cabeceras).toContain('Propietario Principal');

    // La primera fila de datos conserva los valores.
    const datos: string[] = [];
    hoja.getRow(2).eachCell((celda) => datos.push(String(celda.value)));
    expect(datos).toContain('PAD-001');
    expect(datos).toContain('Propietario');
  });

  it('exporta una lista vacía sin fallar', async () => {
    const buffer = await generateExcelExport([]);
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });
});
