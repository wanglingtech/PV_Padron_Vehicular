import * as XLSX from 'xlsx';
import { and, eq, or } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { persons, vehicleDrivers, vehicleOwners, vehicles, auditLogs } from '../db/schema.ts';
import { createVehicle, updateVehicle } from '../db/vehicles.ts';
import {
  ExcelImportRow,
  ImportIssue,
  ImportPreviewResult,
  ImportRowClassification,
} from '../../frontend/src/types/index.ts';

// Diccionario exhaustivo de sinónimos de encabezados
const HEADER_SYNONYMS: Record<string, string[]> = {
  padronNumber: ['n° padrón', 'n° padron', 'nro padron', 'nro. padron', 'padron', 'padrón', 'n padron', 'padron n°', 'numero padron', 'n_padron'],
  plate: ['placa', 'n° placa', 'nro placa', 'placa de rodaje', 'placa rodaje', 'matricula', 'n_placa'],
  brand: ['marca', 'marca vehiculo', 'marca del vehiculo', 'marca de la moto'],
  modelYear: ['año', 'anio', 'año modelo', 'modelo año', 'ano fabricacion', 'año fab.', 'año fabricacion'],
  engineNumber: ['n° motor', 'nro motor', 'motor', 'numero de motor', 'n_motor'],

  // Propietario 1
  ownerFullName: [
    'propietario',
    'nombre propietario',
    'apellidos y nombres propietario',
    'propietario principal',
    'datos del propietario',
    'nom propietario',
    'titular',
  ],
  ownerDni: ['dni propietario', 'dni', 'd.n.i.', 'd.n.i propietario', 'doc identidad propietario', 'dni_propietario'],
  ownerPhone: ['celular propietario', 'celular', 'telefono', 'teléfono', 'cel. propietario', 'telefono propietario'],
  ownerAddress: ['domicilio propietario', 'domicilio', 'direccion', 'dirección', 'direccion propietario', 'dir. propietario'],

  // Propietario 2
  owner2FullName: ['segundo propietario', 'co-propietario', 'copropietario', 'propietario 2', 'apellidos y nombres copropietario'],
  owner2Dni: ['dni copropietario', 'dni segundo propietario', 'dni co-propietario', 'dni propietario 2'],
  owner2Phone: ['celular copropietario', 'telefono copropietario'],

  // Conductor
  driverFullName: ['conductor', 'nombre conductor', 'apellidos y nombres conductor', 'chofer', 'nom conductor'],
  driverDni: ['dni conductor', 'dni chofer', 'd.n.i conductor', 'doc conductor', 'dni_conductor'],
  driverPhone: ['celular conductor', 'cel. conductor', 'telefono conductor'],
  driverAddress: ['domicilio conductor', 'direccion conductor', 'dir conductor'],

  // Seguro (AFOCAT / SOAT)
  insuranceEntity: ['afocat / soat', 'entidad seguro', 'seguro', 'tipo seguro', 'afocat', 'soat', 'empresa seguro'],
  insurancePolicy: ['n° afocat/soat', 'n° poliza', 'poliza', 'póliza', 'nro poliza', 'cert seguro'],
  insuranceIssueDate: ['emisión afocat/soat', 'emision afocat/soat', 'f. emision seguro', 'emision seguro', 'fecha emision soat'],
  insuranceExpirationDate: ['vencimiento afocat/soat', 'vcto afocat/soat', 'vencimiento seguro', 'f. vencimiento seguro', 'fecha caducidad soat', 'vence seguro', 'vence afocat'],

  // Revisión Técnica (CITV)
  inspectionCenter: ['centro citv', 'citv', 'planta citv', 'centro de inspeccion', 'empresa rt'],
  inspectionCertificate: ['certificado rt', 'n° certificado rt', 'cert rt', 'nro certificado rt', 'revision tecnica'],
  inspectionIssueDate: ['emisión rt', 'emision rt', 'f. emision rt', 'fecha emision rt'],
  inspectionExpirationDate: ['vencimiento rt', 'vcto rt', 'vencimiento revision', 'f. vencimiento rt', 'vence rt'],

  // Curso Educación Vial
  courseCertificate: ['certificado curso', 'n° curso vial', 'curso educacion vial', 'cert. curso', 'curso vial'],
  courseIssueDate: ['emisión curso', 'emision curso', 'f. emision curso', 'fecha emision curso'],
  courseExpirationDate: ['vencimiento curso', 'vcto curso', 'f. vencimiento curso', 'vence curso vial', 'vence curso'],

  // Licencia de Conducir (B-II-C)
  licenseNumber: ['n° licencia', 'licencia', 'n° licencia b-ii-c', 'licencia b-ii-c', 'nro licencia', 'licencia conducir'],
  licenseOrigin: ['procedencia licencia', 'municipalidad licencia', 'origen licencia', 'entidad licencia'],
  licenseIssueDate: ['emisión licencia', 'emision licencia', 'f. emision licencia', 'fecha emision licencia'],
  licenseExpirationDate: ['vencimiento licencia', 'vcto licencia', 'f. vencimiento licencia', 'vence licencia'],
};

// Normalizar y limpiar textos de cabecera
function cleanHeader(rawHeader: string): string {
  return rawHeader
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-\/\.\,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Analizar fechas con soporte de serial Excel, formato ISO, DD/MM/YYYY y preservación del valor original
export function parseDateFlexible(val: any): { parsed?: string; raw: string; isValid: boolean } {
  if (val === null || val === undefined || String(val).trim() === '') {
    return { raw: '', isValid: true };
  }

  const rawStr = String(val).trim();

  // 1. Número serial de Excel (ej: 44927)
  if (typeof val === 'number' || (/^\d{5}$/.test(rawStr) && Number(rawStr) > 20000 && Number(rawStr) < 70000)) {
    const num = Number(val);
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return { parsed: `${year}-${month}-${day}`, raw: rawStr, isValid: true };
    }
  }

  // 2. Formato DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = rawStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmyMatch) {
    let year = Number(dmyMatch[3]);
    if (year < 100) year += 2000;
    const month = Number(dmyMatch[2]);
    const day = Number(dmyMatch[1]);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const testDate = new Date(year, month - 1, day);
      if (testDate.getFullYear() === year && testDate.getMonth() === month - 1 && testDate.getDate() === day) {
        const mStr = String(month).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        return { parsed: `${year}-${mStr}-${dStr}`, raw: rawStr, isValid: true };
      }
    }
  }

  // 3. Formato YYYY-MM-DD
  const ymdMatch = rawStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const testDate = new Date(year, month - 1, day);
      if (testDate.getFullYear() === year && testDate.getMonth() === month - 1 && testDate.getDate() === day) {
        const mStr = String(month).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        return { parsed: `${year}-${mStr}-${dStr}`, raw: rawStr, isValid: true };
      }
    }
  }

  // Si no calza, se marca como no válida pero se conserva el rawStr
  return { raw: rawStr, isValid: false };
}

// Mapear cabeceras reales de una hoja con los campos canónicos
function buildHeaderMapping(sheetHeaders: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const rawCol of sheetHeaders) {
    if (!rawCol || typeof rawCol !== 'string') continue;
    const normalized = cleanHeader(rawCol);

    for (const [canonicalKey, synonyms] of Object.entries(HEADER_SYNONYMS)) {
      if (synonyms.some((syn) => normalized === cleanHeader(syn) || normalized.includes(cleanHeader(syn)))) {
        mapping[canonicalKey] = rawCol;
        break;
      }
    }
  }

  return mapping;
}

// 1. Análisis y Previsualización Robusta de Excel
export async function parseAndPreviewExcel(fileBuffer: Buffer): Promise<ImportPreviewResult> {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convertir a matriz de filas crudas para detectar cabeceras compuestas si existen
  const sheetArray: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (sheetArray.length === 0) {
    return {
      totalRows: 0,
      validCount: 0,
      requiresReviewCount: 0,
      duplicateCount: 0,
      conflictCount: 0,
      formatErrorCount: 0,
      toCreateCount: 0,
      toUpdateCount: 0,
      rows: [],
    };
  }

  // Detectar fila de cabecera (usualmente fila 0 o fila 1 si hay título institucional)
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(sheetArray.length, 5); r++) {
    const row = sheetArray[r];
    const joined = row.map((cell) => cleanHeader(String(cell))).join(' ');
    if (joined.includes('padron') || joined.includes('placa') || joined.includes('propietario')) {
      headerRowIndex = r;
      break;
    }
  }

  // Obtener nombres de columnas
  const headerRow = sheetArray[headerRowIndex].map((c) => String(c).trim());
  const headerMap = buildHeaderMapping(headerRow);

  // Obtener filas de datos (a partir de headerRowIndex + 1)
  const rawRows = sheetArray.slice(headerRowIndex + 1);

  // Consultar vehículos existentes en la base de datos para clasificación
  const existingVehicles = await db.query.vehicles.findMany({
    columns: { id: true, padronNumber: true, plate: true },
  });

  const dbPadronMap = new Map<string, { id: number; plate: string }>();
  const dbPlateMap = new Map<string, { id: number; padronNumber: string }>();

  for (const ev of existingVehicles) {
    dbPadronMap.set(ev.padronNumber.toUpperCase(), { id: ev.id, plate: ev.plate });
    dbPlateMap.set(ev.plate.toUpperCase(), { id: ev.id, padronNumber: ev.padronNumber });
  }

  const seenInFilePadrones = new Map<string, number>();
  const seenInFilePlates = new Map<string, number>();

  const rows: ExcelImportRow[] = [];
  let validCount = 0;
  let requiresReviewCount = 0;
  let duplicateCount = 0;
  let conflictCount = 0;
  let formatErrorCount = 0;
  let toCreateCount = 0;
  let toUpdateCount = 0;

  for (let idx = 0; idx < rawRows.length; idx++) {
    const rawRow = rawRows[idx];
    if (!rawRow || rawRow.length === 0) continue;

    // Descartar filas totalmente vacías
    const hasAnyContent = rawRow.some((val) => val !== null && val !== undefined && String(val).trim() !== '');
    if (!hasAnyContent) continue;

    const rowObj: Record<string, any> = {};
    headerRow.forEach((colName, colIdx) => {
      rowObj[colName] = rawRow[colIdx] ?? '';
    });

    const getVal = (canonicalKey: string): string => {
      const col = headerMap[canonicalKey];
      return col && rowObj[col] !== undefined ? String(rowObj[col]).trim() : '';
    };

    const padron = getVal('padronNumber').toUpperCase();
    const plate = getVal('plate').toUpperCase().replace(/[^A-Z0-9\-]/g, '');
    const brand = getVal('brand') || 'SIN MARCA';
    const yearRaw = Number(getVal('modelYear'));
    const modelYear = !isNaN(yearRaw) && yearRaw >= 1980 && yearRaw <= new Date().getFullYear() + 2 ? yearRaw : 2020;
    const engineNumber = getVal('engineNumber');

    // Propietarios
    const ownerFullName = getVal('ownerFullName');
    const ownerDni = getVal('ownerDni').replace(/\D/g, '');
    const ownerPhone = getVal('ownerPhone');
    const ownerAddress = getVal('ownerAddress');

    const owner2FullName = getVal('owner2FullName');
    const owner2Dni = getVal('owner2Dni').replace(/\D/g, '');
    const owner2Phone = getVal('owner2Phone');

    // Conductor
    const driverFullName = getVal('driverFullName');
    const driverDni = getVal('driverDni').replace(/\D/g, '');
    const driverPhone = getVal('driverPhone');
    const driverAddress = getVal('driverAddress');

    // Documentación con evaluación flexible de fechas
    const insuranceEntity = getVal('insuranceEntity') || 'AFOCAT / SOAT';
    const insurancePolicy = getVal('insurancePolicy');
    const insIssue = parseDateFlexible(rowObj[headerMap['insuranceIssueDate']]);
    const insExp = parseDateFlexible(rowObj[headerMap['insuranceExpirationDate']]);

    const inspectionCenter = getVal('inspectionCenter') || 'CITV Autorizado';
    const inspectionCertificate = getVal('inspectionCertificate');
    const citvIssue = parseDateFlexible(rowObj[headerMap['inspectionIssueDate']]);
    const citvExp = parseDateFlexible(rowObj[headerMap['inspectionExpirationDate']]);

    const courseCertificate = getVal('courseCertificate');
    const courseIssue = parseDateFlexible(rowObj[headerMap['courseIssueDate']]);
    const courseExp = parseDateFlexible(rowObj[headerMap['courseExpirationDate']]);

    const licenseNumber = getVal('licenseNumber');
    const licenseOrigin = getVal('licenseOrigin');
    const licIssue = parseDateFlexible(rowObj[headerMap['licenseIssueDate']]);
    const licExp = parseDateFlexible(rowObj[headerMap['licenseExpirationDate']]);

    // Omitir filas sin datos identificatorios
    if (!padron && !plate && !ownerFullName && !ownerDni) {
      continue;
    }

    const issues: ImportIssue[] = [];
    const rowIndex = headerRowIndex + idx + 2;

    // 1. Validaciones estructurales de campos obligatorios
    if (!padron) {
      issues.push({
        field: 'padronNumber',
        message: 'N.º de Padrón no especificado en la fila.',
        severity: 'error',
      });
    }

    if (!plate) {
      issues.push({
        field: 'plate',
        message: 'Placa del vehículo no especificada.',
        severity: 'error',
      });
    }

    if (!ownerFullName) {
      issues.push({
        field: 'ownerFullName',
        message: 'Nombre del propietario no indicado.',
        severity: 'warning',
      });
    }

    if (ownerDni && ownerDni.length !== 8) {
      issues.push({
        field: 'ownerDni',
        message: `DNI de propietario no cuenta con 8 dígitos ("${ownerDni}").`,
        severity: 'warning',
        rawValue: ownerDni,
      });
    }

    if (driverDni && driverDni.length !== 8) {
      issues.push({
        field: 'driverDni',
        message: `DNI del conductor ("${driverDni}") no posee 8 dígitos.`,
        severity: 'info',
        rawValue: driverDni,
      });
    }

    // Validar coherencia de fechas y formato
    if (!insExp.isValid && insExp.raw) {
      issues.push({
        field: 'insuranceExpirationDate',
        message: `Fecha de vencimiento de seguro no legible ("${insExp.raw}"). Se preservó para revisión.`,
        severity: 'warning',
        rawValue: insExp.raw,
      });
    }
    if (insIssue.parsed && insExp.parsed && insExp.parsed < insIssue.parsed) {
      issues.push({
        field: 'insuranceExpirationDate',
        message: 'Fecha de vencimiento del seguro es anterior a su emisión.',
        severity: 'warning',
      });
    }

    if (!citvExp.isValid && citvExp.raw) {
      issues.push({
        field: 'inspectionExpirationDate',
        message: `Fecha de vencimiento CITV no legible ("${citvExp.raw}"). Se preservó para revisión.`,
        severity: 'warning',
        rawValue: citvExp.raw,
      });
    }

    if (!courseExp.isValid && courseExp.raw) {
      issues.push({
        field: 'courseExpirationDate',
        message: `Fecha de vencimiento de Curso Vial no legible ("${courseExp.raw}").`,
        severity: 'warning',
        rawValue: courseExp.raw,
      });
    }

    if (!licExp.isValid && licExp.raw) {
      issues.push({
        field: 'licenseExpirationDate',
        message: `Fecha de vencimiento de Licencia no legible ("${licExp.raw}").`,
        severity: 'warning',
        rawValue: licExp.raw,
      });
    }

    // Clasificación diagnóstica (VALIDO, REQUIERE_REVISION, DUPLICADO, CONFLICTO, ERROR_FORMATO)
    let classification: ImportRowClassification = 'VALIDO';
    let action: 'CREATE' | 'UPDATE' | 'SKIP' | 'REVIEW' = 'CREATE';
    let existingMatch: ExcelImportRow['existingMatch'] = undefined;

    const hasCriticalErrors = issues.some((iss) => iss.severity === 'error');

    if (hasCriticalErrors) {
      classification = 'ERROR_FORMATO';
      action = 'SKIP';
      formatErrorCount++;
    } else {
      // Verificar duplicidad en el mismo archivo
      if (seenInFilePadrones.has(padron)) {
        issues.push({
          field: 'padronNumber',
          message: `El padrón "${padron}" aparece repetido en la fila ${seenInFilePadrones.get(padron)} del mismo archivo.`,
          severity: 'error',
        });
        classification = 'DUPLICADO';
        action = 'SKIP';
      }
      if (seenInFilePlates.has(plate)) {
        issues.push({
          field: 'plate',
          message: `La placa "${plate}" aparece repetida en la fila ${seenInFilePlates.get(plate)} del mismo archivo.`,
          severity: 'error',
        });
        classification = 'DUPLICADO';
        action = 'SKIP';
      }

      seenInFilePadrones.set(padron, rowIndex);
      seenInFilePlates.set(plate, rowIndex);

      // Si no fue descartado por duplicidad interna en el archivo, verificar contra la Base de Datos
      if (classification !== 'DUPLICADO') {
        const dbPadronMatch = dbPadronMap.get(padron);
        const dbPlateMatch = dbPlateMap.get(plate);

        if (dbPadronMatch && dbPlateMatch && dbPadronMatch.id === dbPlateMatch.id) {
          // Ambos coinciden con el mismo vehículo: Actualización / Re-importación idempotente
          classification = 'DUPLICADO';
          action = 'UPDATE';
          existingMatch = {
            vehicleId: dbPadronMatch.id,
            matchedBy: 'both',
          };
          issues.push({
            field: 'vehicle',
            message: `El vehículo con Padrón "${padron}" y Placa "${plate}" ya existe en el sistema (#${dbPadronMatch.id}). Se actualizarán sus datos.`,
            severity: 'info',
          });
          duplicateCount++;
          toUpdateCount++;
        } else if (dbPadronMatch && (!dbPlateMatch || dbPadronMatch.plate !== plate)) {
          // Conflicto: El padrón ya pertenece a OTRA placa
          classification = 'CONFLICTO';
          action = 'REVIEW';
          existingMatch = {
            vehicleId: dbPadronMatch.id,
            matchedBy: 'padron',
            conflictingPlate: dbPadronMatch.plate,
          };
          issues.push({
            field: 'padronNumber',
            message: `Conflicto: El N.º de padrón "${padron}" ya está asignado al vehículo con Placa "${dbPadronMatch.plate}".`,
            severity: 'error',
          });
          conflictCount++;
        } else if (dbPlateMatch && (!dbPadronMatch || dbPlateMatch.padronNumber !== padron)) {
          // Conflicto: La placa ya está registrada con OTRO padrón
          classification = 'CONFLICTO';
          action = 'REVIEW';
          existingMatch = {
            vehicleId: dbPlateMatch.id,
            matchedBy: 'plate',
            conflictingPadron: dbPlateMatch.padronNumber,
          };
          issues.push({
            field: 'plate',
            message: `Conflicto: La placa "${plate}" ya está registrada con el Padrón "${dbPlateMatch.padronNumber}".`,
            severity: 'error',
          });
          conflictCount++;
        } else {
          // Es un registro nuevo
          if (issues.some((iss) => iss.severity === 'warning')) {
            classification = 'REQUIERE_REVISION';
            action = 'CREATE';
            requiresReviewCount++;
            toCreateCount++;
          } else {
            classification = 'VALIDO';
            action = 'CREATE';
            validCount++;
            toCreateCount++;
          }
        }
      } else {
        duplicateCount++;
      }
    }

    rows.push({
      rowIndex,
      padronNumber: padron,
      plate,
      brand,
      modelYear,
      engineNumber: engineNumber || undefined,
      ownerFullName: ownerFullName || 'Propietario No Indicado',
      ownerDni: ownerDni || '00000000',
      ownerPhone: ownerPhone || undefined,
      ownerAddress: ownerAddress || undefined,
      owner2FullName: owner2FullName || undefined,
      owner2Dni: owner2Dni || undefined,
      owner2Phone: owner2Phone || undefined,
      driverFullName: driverFullName || undefined,
      driverDni: driverDni || undefined,
      driverPhone: driverPhone || undefined,
      driverAddress: driverAddress || undefined,
      insuranceEntity,
      insurancePolicy: insurancePolicy || undefined,
      insuranceIssueDate: insIssue.parsed,
      insuranceExpirationDate: insExp.parsed,
      inspectionCenter,
      inspectionCertificate: inspectionCertificate || undefined,
      inspectionIssueDate: citvIssue.parsed,
      inspectionExpirationDate: citvExp.parsed,
      courseCertificate: courseCertificate || undefined,
      courseIssueDate: courseIssue.parsed,
      courseExpirationDate: courseExp.parsed,
      licenseNumber: licenseNumber || undefined,
      licenseOrigin: licenseOrigin || undefined,
      licenseIssueDate: licIssue.parsed,
      licenseExpirationDate: licExp.parsed,
      classification,
      action,
      issues,
      rawData: rowObj,
      existingMatch,
    });
  }

  return {
    totalRows: rows.length,
    validCount,
    requiresReviewCount,
    duplicateCount,
    conflictCount,
    formatErrorCount,
    toCreateCount,
    toUpdateCount,
    rows,
  };
}

// 2. Ejecutar Importación en Lote Idempotente con Clasificación y Vínculo a Personas
export async function executeImportBatch(
  rowsToImport: ExcelImportRow[],
  user: { email: string; name: string }
): Promise<{
  importedCount: number;
  updatedCount: number;
  reviewCount: number;
  skippedCount: number;
}> {
  let importedCount = 0;
  let updatedCount = 0;
  let reviewCount = 0;
  let skippedCount = 0;

  const batchId = `BATCH-${Date.now()}`;

  for (const row of rowsToImport) {
    // Si la fila tiene conflicto grave o error de formato, omitir
    if (row.classification === 'ERROR_FORMATO' || (row.classification === 'CONFLICTO' && row.action === 'SKIP')) {
      skippedCount++;
      continue;
    }

    const padron = (row.padronNumber || '').trim().toUpperCase();
    const plate = (row.plate || '').trim().toUpperCase();

    if (!padron || !plate) {
      skippedCount++;
      continue;
    }

    const requiresReview = row.classification === 'REQUIERE_REVISION' || row.classification === 'CONFLICTO';
    const reviewNotes = row.issues.length > 0
      ? `Importación (${batchId}): ${row.issues.map((i) => i.message).join(' | ')}`
      : undefined;

    // Construir lista de propietarios
    const ownersList = [];
    if (row.ownerFullName) {
      ownersList.push({
        fullName: row.ownerFullName.trim(),
        dni: row.ownerDni?.trim() || '00000000',
        phone: row.ownerPhone?.trim() || undefined,
        address: row.ownerAddress?.trim() || undefined,
        isPrimary: true,
      });
    }
    if (row.owner2FullName) {
      ownersList.push({
        fullName: row.owner2FullName.trim(),
        dni: row.owner2Dni?.trim() || '00000000',
        phone: row.owner2Phone?.trim() || undefined,
        isPrimary: false,
      });
    }

    const vehicleData = {
      padronNumber: padron,
      plate,
      brand: (row.brand || 'SIN MARCA').trim().toUpperCase(),
      modelYear: row.modelYear || 2020,
      engineNumber: row.engineNumber?.trim() || undefined,
      requiresReview,
      reviewNotes,
      importSource: 'EXCEL',
      importBatchId: batchId,
      importNotes: row.issues.map((i) => i.message).join('; ') || null,
      importRawData: JSON.stringify(row.rawData),
      owners: ownersList,
      driver:
        row.driverDni && row.driverFullName
          ? {
              fullName: row.driverFullName.trim(),
              dni: row.driverDni.trim(),
              phone: row.driverPhone?.trim(),
              address: row.driverAddress?.trim(),
            }
          : undefined,
      insurance:
        row.insuranceEntity || row.insurancePolicy || row.insuranceExpirationDate
          ? {
              entityName: row.insuranceEntity?.trim() || 'AFOCAT',
              policyNumber: row.insurancePolicy?.trim(),
              issueDate: row.insuranceIssueDate,
              expirationDate: row.insuranceExpirationDate,
            }
          : undefined,
      technicalInspection:
        row.inspectionCertificate || row.inspectionCenter || row.inspectionExpirationDate
          ? {
              centerName: row.inspectionCenter?.trim() || 'CITV Autorizado',
              certificateNumber: row.inspectionCertificate?.trim(),
              issueDate: row.inspectionIssueDate,
              expirationDate: row.inspectionExpirationDate,
            }
          : undefined,
      roadSafetyCourse:
        row.courseCertificate || row.courseExpirationDate
          ? {
              certificateNumber: row.courseCertificate?.trim(),
              issueDate: row.courseIssueDate,
              expirationDate: row.courseExpirationDate,
            }
          : undefined,
      driverLicense:
        row.licenseNumber || row.licenseExpirationDate
          ? {
              licenseNumber: row.licenseNumber?.trim(),
              originAuthority: row.licenseOrigin?.trim(),
              issueDate: row.licenseIssueDate,
              expirationDate: row.licenseExpirationDate,
            }
          : undefined,
    };

    try {
      if (row.action === 'UPDATE' && row.existingMatch?.vehicleId) {
        await updateVehicle(row.existingMatch.vehicleId, vehicleData, user);
        updatedCount++;
      } else {
        await createVehicle(vehicleData, user);
        if (requiresReview) {
          reviewCount++;
        } else {
          importedCount++;
        }
      }
    } catch (err) {
      console.error(`Error importando fila padrón ${padron}:`, err);
      skippedCount++;
    }
  }

  return { importedCount, updatedCount, reviewCount, skippedCount };
}

// 3. Exportación a Excel con todas las columnas canónicas del padrón
export function generateExcelExport(vehiclesList: any[]): Buffer {
  const flatData = vehiclesList.map((v) => ({
    'N° Padrón': v.padronNumber,
    'Placa': v.plate,
    'Marca': v.brand,
    'Año': v.modelYear,
    'N° Motor': v.engineNumber || '',
    'Estado Operativo': v.status || 'ACTIVO',
    'Estado Documental': v.overallStatus?.label || '',
    'Requiere Revisión': v.requiresReview ? 'SÍ' : 'NO',
    'Notas Revisión': v.reviewNotes || '',

    // Propietario
    'Propietario Principal': v.primaryOwner?.fullName || '',
    'DNI Propietario': v.primaryOwner?.dni || '',
    'Celular Propietario': v.primaryOwner?.phone || '',
    'Domicilio Propietario': v.primaryOwner?.address || '',
    'Otros Propietarios':
      v.owners
        ?.filter((o: any) => !o.isPrimary)
        .map((o: any) => `${o.fullName} (${o.dni})`)
        .join(', ') || '',

    // Conductor
    'Conductor': v.driver?.fullName || '',
    'DNI Conductor': v.driver?.dni || '',
    'Celular Conductor': v.driver?.phone || '',
    'Domicilio Conductor': v.driver?.address || '',

    // AFOCAT / SOAT
    'Entidad AFOCAT/SOAT': v.insurance?.entityName || '',
    'N° AFOCAT/SOAT': v.insurance?.policyNumber || '',
    'Emisión AFOCAT/SOAT': v.insurance?.issueDate || '',
    'Vencimiento AFOCAT/SOAT': v.insurance?.expirationDate || '',
    'Estado AFOCAT/SOAT': v.insuranceEvaluation?.label || '',

    // Revisión Técnica
    'Centro CITV': v.technicalInspection?.centerName || '',
    'N° Certificado RT': v.technicalInspection?.certificateNumber || '',
    'Emisión RT': v.technicalInspection?.issueDate || '',
    'Vencimiento RT': v.technicalInspection?.expirationDate || '',
    'Estado RT': v.technicalInspectionEvaluation?.label || '',

    // Curso Vial
    'N° Certificado Curso': v.roadSafetyCourse?.certificateNumber || '',
    'Emisión Curso': v.roadSafetyCourse?.issueDate || '',
    'Vencimiento Curso': v.roadSafetyCourse?.expirationDate || '',
    'Estado Curso': v.roadSafetyCourseEvaluation?.label || '',

    // Licencia
    'N° Licencia B-II-C': v.driverLicense?.licenseNumber || '',
    'Procedencia Licencia': v.driverLicense?.originAuthority || '',
    'Emisión Licencia': v.driverLicense?.issueDate || '',
    'Vencimiento Licencia': v.driverLicense?.expirationDate || '',
    'Estado Licencia': v.driverLicenseEvaluation?.label || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(flatData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Padrón Vehicular');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
