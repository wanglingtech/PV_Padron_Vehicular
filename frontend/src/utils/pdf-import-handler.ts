import { db } from '../db/index.ts';
import { vehicles, persons, insurances, technicalInspections, roadSafetyCourses, driverLicenses } from '../db/schema.ts';
import { ExcelImportRow, ImportIssue, ImportPreviewResult, ImportRowClassification } from '../types/index.ts';
import { parseDateFlexible } from './excel-handler.ts';

export interface RawExtractedVehicle {
  padronNumber?: string;
  plate?: string;
  brand?: string;
  modelYear?: number | string;
  engineNumber?: string;
  ownerFullName?: string;
  ownerDni?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  owner2FullName?: string;
  owner2Dni?: string;
  owner2Phone?: string;
  driverFullName?: string;
  driverDni?: string;
  driverPhone?: string;
  driverAddress?: string;
  insuranceEntity?: string;
  insurancePolicy?: string;
  insuranceIssueDate?: string;
  insuranceExpirationDate?: string;
  inspectionCenter?: string;
  inspectionCertificate?: string;
  inspectionIssueDate?: string;
  inspectionExpirationDate?: string;
  courseCertificate?: string;
  courseIssueDate?: string;
  courseExpirationDate?: string;
  licenseNumber?: string;
  licenseOrigin?: string;
  licenseIssueDate?: string;
  licenseExpirationDate?: string;
  [key: string]: any;
}

/**
 * Procesa y diagnostica filas extraídas (desde PDF u otras fuentes)
 * cruzándolas contra la base de datos PostgreSQL de Cloud SQL.
 */
export async function diagnoseAndStageExtractedRows(
  extractedRows: RawExtractedVehicle[]
): Promise<ImportPreviewResult> {
  // 1. Obtener vehículos y personas existentes para validación de unicidad
  const existingVehicles = await db
    .select({
      id: vehicles.id,
      padronNumber: vehicles.padronNumber,
      plate: vehicles.plate,
      brand: vehicles.brand,
      modelYear: vehicles.modelYear,
      status: vehicles.status,
    })
    .from(vehicles);

  const dbPadronMap = new Map<string, typeof existingVehicles[0]>();
  const dbPlateMap = new Map<string, typeof existingVehicles[0]>();

  existingVehicles.forEach((v) => {
    dbPadronMap.set(v.padronNumber.trim().toUpperCase(), v);
    dbPlateMap.set(v.plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), v);
  });

  const seenInFilePadrones = new Map<string, number>();
  const seenInFilePlates = new Map<string, number>();

  let validCount = 0;
  let reviewCount = 0;
  let duplicateCount = 0;
  let conflictCount = 0;
  let formatErrorCount = 0;
  let toCreateCount = 0;
  let toUpdateCount = 0;

  const stagedRows: ExcelImportRow[] = [];

  for (let idx = 0; idx < extractedRows.length; idx++) {
    const raw = extractedRows[idx];
    const rowIndex = idx + 1;

    const padron = String(raw.padronNumber || '').trim().toUpperCase();
    const plate = String(raw.plate || '').trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '');
    const brand = String(raw.brand || 'BAJAJ').trim().toUpperCase();
    const modelYear = parseInt(String(raw.modelYear || '2020')) || 2020;
    const engineNumber = raw.engineNumber ? String(raw.engineNumber).trim() : '';

    const ownerFullName = raw.ownerFullName ? String(raw.ownerFullName).trim() : '';
    const ownerDni = raw.ownerDni ? String(raw.ownerDni).replace(/\D/g, '') : '';
    const ownerPhone = raw.ownerPhone ? String(raw.ownerPhone).trim() : '';
    const ownerAddress = raw.ownerAddress ? String(raw.ownerAddress).trim() : '';

    const owner2FullName = raw.owner2FullName ? String(raw.owner2FullName).trim() : '';
    const owner2Dni = raw.owner2Dni ? String(raw.owner2Dni).replace(/\D/g, '') : '';
    const owner2Phone = raw.owner2Phone ? String(raw.owner2Phone).trim() : '';

    const driverFullName = raw.driverFullName ? String(raw.driverFullName).trim() : '';
    const driverDni = raw.driverDni ? String(raw.driverDni).replace(/\D/g, '') : '';
    const driverPhone = raw.driverPhone ? String(raw.driverPhone).trim() : '';
    const driverAddress = raw.driverAddress ? String(raw.driverAddress).trim() : '';

    const insuranceEntity = raw.insuranceEntity ? String(raw.insuranceEntity).trim() : 'AFOCAT / SOAT';
    const insurancePolicy = raw.insurancePolicy ? String(raw.insurancePolicy).trim() : '';
    const insIssue = parseDateFlexible(raw.insuranceIssueDate);
    const insExp = parseDateFlexible(raw.insuranceExpirationDate);

    const inspectionCenter = raw.inspectionCenter ? String(raw.inspectionCenter).trim() : 'CITV Autorizado';
    const inspectionCertificate = raw.inspectionCertificate ? String(raw.inspectionCertificate).trim() : '';
    const citvIssue = parseDateFlexible(raw.inspectionIssueDate);
    const citvExp = parseDateFlexible(raw.inspectionExpirationDate);

    const courseCertificate = raw.courseCertificate ? String(raw.courseCertificate).trim() : '';
    const courseIssue = parseDateFlexible(raw.courseIssueDate);
    const courseExp = parseDateFlexible(raw.courseExpirationDate);

    const licenseNumber = raw.licenseNumber ? String(raw.licenseNumber).trim() : '';
    const licenseOrigin = raw.licenseOrigin ? String(raw.licenseOrigin).trim() : '';
    const licIssue = parseDateFlexible(raw.licenseIssueDate);
    const licExp = parseDateFlexible(raw.licenseExpirationDate);

    // Omitir filas sin datos identificatorios
    if (!padron && !plate && !ownerFullName && !ownerDni) {
      continue;
    }

    const issues: ImportIssue[] = [];

    // Validaciones
    if (!padron) {
      issues.push({ field: 'padronNumber', message: 'N.º de Padrón no detectado en el documento PDF.', severity: 'error' });
    }
    if (!plate) {
      issues.push({ field: 'plate', message: 'Placa vehicular no especificada en el documento.', severity: 'error' });
    }
    if (!ownerFullName) {
      issues.push({ field: 'ownerFullName', message: 'Propietario no identificado en el extracto del PDF.', severity: 'warning' });
    }
    if (ownerDni && ownerDni.length !== 8) {
      issues.push({ field: 'ownerDni', message: `DNI de propietario ("${ownerDni}") no posee 8 dígitos.`, severity: 'warning', rawValue: ownerDni });
    }
    if (driverDni && driverDni.length !== 8) {
      issues.push({ field: 'driverDni', message: `DNI del conductor ("${driverDni}") no posee 8 dígitos.`, severity: 'info', rawValue: driverDni });
    }

    if (!insExp.isValid && insExp.raw) {
      issues.push({ field: 'insuranceExpirationDate', message: `Vencimiento de seguro no legible ("${insExp.raw}").`, severity: 'warning' });
    }
    if (!citvExp.isValid && citvExp.raw) {
      issues.push({ field: 'inspectionExpirationDate', message: `Vencimiento CITV no legible ("${citvExp.raw}").`, severity: 'warning' });
    }

    let classification: ImportRowClassification = 'VALIDO';
    let action: 'CREATE' | 'UPDATE' | 'SKIP' | 'REVIEW' = 'CREATE';
    let existingMatch: ExcelImportRow['existingMatch'] = undefined;

    const hasCriticalErrors = issues.some((iss) => iss.severity === 'error');

    if (hasCriticalErrors) {
      classification = 'ERROR_FORMATO';
      action = 'SKIP';
      formatErrorCount++;
    } else {
      const cleanPlate = plate.replace(/[^A-Z0-9]/g, '');

      // Duplicidad dentro del mismo PDF
      if (seenInFilePadrones.has(padron)) {
        issues.push({
          field: 'padronNumber',
          message: `El padrón "${padron}" aparece repetido en la fila ${seenInFilePadrones.get(padron)} del mismo PDF.`,
          severity: 'error',
        });
        classification = 'DUPLICADO';
        action = 'SKIP';
      }
      if (seenInFilePlates.has(cleanPlate)) {
        issues.push({
          field: 'plate',
          message: `La placa "${plate}" aparece repetida en la fila ${seenInFilePlates.get(cleanPlate)} del mismo PDF.`,
          severity: 'error',
        });
        classification = 'DUPLICADO';
        action = 'SKIP';
      }

      seenInFilePadrones.set(padron, rowIndex);
      seenInFilePlates.set(cleanPlate, rowIndex);

      if (classification !== 'DUPLICADO') {
        const dbPadronMatch = dbPadronMap.get(padron);
        const dbPlateMatch = dbPlateMap.get(cleanPlate);

        if (dbPadronMatch && dbPlateMatch && dbPadronMatch.id === dbPlateMatch.id) {
          classification = 'DUPLICADO';
          action = 'UPDATE';
          existingMatch = { vehicleId: dbPadronMatch.id, matchedBy: 'both' };
          issues.push({
            field: 'vehicle',
            message: `El vehículo con Padrón "${padron}" y Placa "${plate}" ya existe en el sistema (#${dbPadronMatch.id}). Se actualizará.`,
            severity: 'info',
          });
          duplicateCount++;
          toUpdateCount++;
        } else if (dbPadronMatch && (!dbPlateMatch || dbPadronMatch.plate.replace(/[^A-Z0-9]/g, '') !== cleanPlate)) {
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
          classification = 'CONFLICTO';
          action = 'REVIEW';
          existingMatch = {
            vehicleId: dbPlateMatch.id,
            matchedBy: 'plate',
            conflictingPadron: dbPlateMatch.padronNumber,
          };
          issues.push({
            field: 'plate',
            message: `Conflicto: La placa "${plate}" ya existe registrada bajo el Padrón "${dbPlateMatch.padronNumber}".`,
            severity: 'error',
          });
          conflictCount++;
        } else {
          // Nueva unidad apta
          const hasWarnings = issues.some((iss) => iss.severity === 'warning');
          if (hasWarnings) {
            classification = 'REQUIERE_REVISION';
            action = 'REVIEW';
            reviewCount++;
          } else {
            classification = 'VALIDO';
            action = 'CREATE';
            validCount++;
          }
          toCreateCount++;
        }
      } else {
        duplicateCount++;
      }
    }

    stagedRows.push({
      rowIndex,
      padronNumber: padron,
      plate,
      brand,
      modelYear,
      engineNumber,
      ownerFullName,
      ownerDni,
      ownerPhone,
      ownerAddress,
      owner2FullName,
      owner2Dni,
      owner2Phone,
      driverFullName,
      driverDni,
      driverPhone,
      driverAddress,
      insuranceEntity,
      insurancePolicy,
      insuranceIssueDate: insIssue.parsed,
      insuranceExpirationDate: insExp.parsed,
      inspectionCenter,
      inspectionCertificate,
      inspectionIssueDate: citvIssue.parsed,
      inspectionExpirationDate: citvExp.parsed,
      courseCertificate,
      courseIssueDate: courseIssue.parsed,
      courseExpirationDate: courseExp.parsed,
      licenseNumber,
      licenseOrigin,
      licenseIssueDate: licIssue.parsed,
      licenseExpirationDate: licExp.parsed,
      classification,
      action,
      issues,
      rawData: { ...raw, _originFormat: 'PDF_DOCUMENT' },
      existingMatch,
    });
  }

  return {
    totalRows: stagedRows.length,
    validCount,
    requiresReviewCount: reviewCount,
    duplicateCount,
    conflictCount,
    formatErrorCount,
    toCreateCount,
    toUpdateCount,
    rows: stagedRows,
  };
}
