import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  auditLogs,
  driverLicenses,
  insurances,
  persons,
  roadSafetyCourses,
  technicalInspections,
  vehicleDrivers,
  vehicleOwners,
  vehiclePadronHistory,
  vehicles,
} from './schema.ts';
import { evaluateDocumentDate, evaluateVehicleOverallStatus } from '../../shared/date-utils.ts';
import { getVehiclePadronHistoryList } from './padron-changes.ts';

export interface VehicleOwnerInput {
  fullName: string;
  dni: string;
  address?: string;
  phone?: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface VehicleFullInput {
  padronNumber: string;
  plate: string;
  brand: string;
  modelYear: number;
  engineNumber?: string;
  status?: 'ACTIVO' | 'INACTIVO' | 'RETIRADO';
  requiresReview?: boolean;
  reviewNotes?: string;
  importSource?: string;
  importBatchId?: string;
  importRawData?: string;
  importNotes?: string;

  // Propietarios (soporta múltiples)
  owners: VehicleOwnerInput[];

  // Conductor
  driver?: {
    fullName: string;
    dni: string;
    address?: string;
    phone?: string;
  };

  // Documentos
  insurance?: {
    entityName: string;
    policyNumber?: string;
    issueDate?: string;
    expirationDate?: string;
  };
  technicalInspection?: {
    centerName?: string;
    certificateNumber?: string;
    issueDate?: string;
    expirationDate?: string;
  };
  roadSafetyCourse?: {
    certificateNumber?: string;
    issueDate?: string;
    expirationDate?: string;
  };
  driverLicense?: {
    licenseNumber?: string;
    originAuthority?: string;
    issueDate?: string;
    expirationDate?: string;
  };
}

// 1. Obtener todos los vehículos con filtros y paginación
export async function getVehicles(params: {
  search?: string;
  status?: string;
  lifeStatus?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
} = {}) {
  try {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, Math.min(200, params?.limit || 20));
    const offset = (page - 1) * limit;

    // Obtener vehículos con relaciones actuales
    const allVehicles = await db.query.vehicles.findMany({
      with: {
        driver: true,
        owners: {
          where: eq(vehicleOwners.isCurrent, true),
          with: {
            person: true,
          },
        },
        insurances: {
          where: eq(insurances.isCurrent, true),
        },
        technicalInspections: {
          where: eq(technicalInspections.isCurrent, true),
        },
        roadSafetyCourses: {
          where: eq(roadSafetyCourses.isCurrent, true),
        },
        driverLicenses: {
          where: eq(driverLicenses.isCurrent, true),
        },
      },
      orderBy: [desc(vehicles.createdAt)],
    });

    // Formatear y calcular estados
    const formatted = allVehicles.map((v) => {
      const primaryOwner = v.owners.find((o) => o.isPrimary)?.person || v.owners[0]?.person;
      const allOwnersList = v.owners.map((o) => ({
        id: o.person.id,
        fullName: o.person.fullName,
        dni: o.person.dni,
        address: o.person.address,
        phone: o.person.phone,
        isPrimary: o.isPrimary,
        isCurrent: o.isCurrent,
        validFrom: o.validFrom,
        validUntil: o.validUntil,
        notes: o.notes,
      }));

      const activeInsurance = v.insurances[0] || null;
      const activeInspection = v.technicalInspections[0] || null;
      const activeCourse = v.roadSafetyCourses[0] || null;
      const activeLicense = v.driverLicenses[0] || null;

      const overall = evaluateVehicleOverallStatus({
        insuranceExp: activeInsurance?.expirationDate,
        inspectionExp: activeInspection?.expirationDate,
        courseExp: activeCourse?.expirationDate,
        licenseExp: activeLicense?.expirationDate,
        requiresReview: v.requiresReview,
      });

      return {
        id: v.id,
        padronNumber: v.padronNumber,
        plate: v.plate,
        brand: v.brand,
        modelYear: v.modelYear,
        engineNumber: v.engineNumber,
        status: (v.status || 'ACTIVO') as 'ACTIVO' | 'INACTIVO' | 'RETIRADO',
        withdrawalDate: v.withdrawalDate,
        withdrawalReason: v.withdrawalReason,
        withdrawalUserName: v.withdrawalUserName,
        requiresReview: v.requiresReview,
        reviewNotes: v.reviewNotes,
        importSource: v.importSource,
        importBatchId: v.importBatchId,
        importNotes: v.importNotes,
        createdAt: v.createdAt ? v.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: v.updatedAt ? v.updatedAt.toISOString() : new Date().toISOString(),
        primaryOwner: primaryOwner
          ? {
              id: primaryOwner.id,
              fullName: primaryOwner.fullName,
              dni: primaryOwner.dni,
              phone: primaryOwner.phone,
              address: primaryOwner.address,
            }
          : null,
        owners: allOwnersList,
        driver: v.driver
          ? {
              id: v.driver.id,
              fullName: v.driver.fullName,
              dni: v.driver.dni,
              phone: v.driver.phone,
              address: v.driver.address,
            }
          : null,
        insurance: activeInsurance,
        insuranceEvaluation: evaluateDocumentDate(activeInsurance?.expirationDate),
        technicalInspection: activeInspection,
        technicalInspectionEvaluation: evaluateDocumentDate(activeInspection?.expirationDate),
        roadSafetyCourse: activeCourse,
        roadSafetyCourseEvaluation: evaluateDocumentDate(activeCourse?.expirationDate),
        driverLicense: activeLicense,
        driverLicenseEvaluation: evaluateDocumentDate(activeLicense?.expirationDate),
        overallStatus: overall,
      };
    });

    // Filtros
    let filtered = formatted;

    // Filtro por estado del ciclo de vida (ACTIVO / RETIRADO / INACTIVO)
    if (params.lifeStatus && params.lifeStatus !== 'all') {
      filtered = filtered.filter((item) => item.status === params.lifeStatus);
    }

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        return (
          item.padronNumber.toLowerCase().includes(q) ||
          item.plate.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          (item.engineNumber && item.engineNumber.toLowerCase().includes(q)) ||
          (item.primaryOwner &&
            (item.primaryOwner.fullName.toLowerCase().includes(q) ||
              item.primaryOwner.dni.includes(q))) ||
          item.owners.some(
            (o) => o.fullName.toLowerCase().includes(q) || o.dni.includes(q)
          ) ||
          (item.driver &&
            (item.driver.fullName.toLowerCase().includes(q) ||
              item.driver.dni.includes(q))) ||
          (item.driverLicense?.licenseNumber &&
            item.driverLicense.licenseNumber.toLowerCase().includes(q))
        );
      });
    }

    // Filtro por estado documental
    if (params.status && params.status !== 'all') {
      if (params.status === 'ACTIVO' || params.status === 'RETIRADO' || params.status === 'INACTIVO') {
        filtered = filtered.filter((item) => item.status === params.status);
      } else {
        filtered = filtered.filter((item) => item.overallStatus.status === params.status);
      }
    }

    // Ordenamiento
    if (params.sortBy) {
      const field = params.sortBy;
      const asc = params.sortOrder === 'asc';
      filtered.sort((a: any, b: any) => {
        let valA = a[field];
        let valB = b[field];
        if (field === 'owner') {
          valA = a.primaryOwner?.fullName || '';
          valB = b.primaryOwner?.fullName || '';
        } else if (field === 'driver') {
          valA = a.driver?.fullName || '';
          valB = b.driver?.fullName || '';
        } else if (field === 'padron') {
          valA = a.padronNumber || '';
          valB = b.padronNumber || '';
        }
        if (typeof valA === 'string') {
          return asc ? valA.localeCompare(valB || '') : (valB || '').localeCompare(valA);
        }
        return asc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      vehicles: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  } catch (error) {
    console.error('Database query getVehicles failed:', error);
    throw new Error('Error al consultar el padrón vehicular', { cause: error });
  }
}

// 2. Obtener un vehículo por ID con historial completo (Padrón, Propietarios, Conductores)
export async function getVehicleById(id: number) {
  try {
    const v = await db.query.vehicles.findFirst({
      where: eq(vehicles.id, id),
      with: {
        driver: true,
        owners: {
          with: {
            person: true,
          },
        },
        insurances: {
          where: eq(insurances.isCurrent, true),
        },
        technicalInspections: {
          where: eq(technicalInspections.isCurrent, true),
        },
        roadSafetyCourses: {
          where: eq(roadSafetyCourses.isCurrent, true),
        },
        driverLicenses: {
          where: eq(driverLicenses.isCurrent, true),
        },
      },
    });

    if (!v) return null;

    // Obtener historial completo de propietarios
    const allOwnersList = v.owners.map((o) => ({
      id: o.person.id,
      fullName: o.person.fullName,
      dni: o.person.dni,
      address: o.person.address,
      phone: o.person.phone,
      isPrimary: o.isPrimary,
      isCurrent: o.isCurrent,
      validFrom: o.validFrom,
      validUntil: o.validUntil,
      notes: o.notes,
    }));

    const currentOwners = allOwnersList.filter((o) => o.isCurrent !== false);
    const primaryOwner = currentOwners.find((o) => o.isPrimary) || currentOwners[0] || null;

    // Obtener historial completo de conductores
    const driverHistoryRecords = await db.query.vehicleDrivers.findMany({
      where: eq(vehicleDrivers.vehicleId, id),
      with: {
        person: true,
      },
      orderBy: [desc(vehicleDrivers.createdAt)],
    });

    const driverHistory = driverHistoryRecords.map((d) => ({
      id: d.person.id,
      fullName: d.person.fullName,
      dni: d.person.dni,
      phone: d.person.phone,
      address: d.person.address,
      isCurrent: d.isCurrent,
      validFrom: d.validFrom,
      validUntil: d.validUntil,
      notes: d.notes,
    }));

    // Obtener historial de cambios de padrón
    const padronHistory = await getVehiclePadronHistoryList(id);

    const activeInsurance = v.insurances[0] || null;
    const activeInspection = v.technicalInspections[0] || null;
    const activeCourse = v.roadSafetyCourses[0] || null;
    const activeLicense = v.driverLicenses[0] || null;

    const overall = evaluateVehicleOverallStatus({
      insuranceExp: activeInsurance?.expirationDate,
      inspectionExp: activeInspection?.expirationDate,
      courseExp: activeCourse?.expirationDate,
      licenseExp: activeLicense?.expirationDate,
      requiresReview: v.requiresReview,
    });

    return {
      id: v.id,
      padronNumber: v.padronNumber,
      plate: v.plate,
      brand: v.brand,
      modelYear: v.modelYear,
      engineNumber: v.engineNumber,
      status: (v.status || 'ACTIVO') as 'ACTIVO' | 'INACTIVO' | 'RETIRADO',
      withdrawalDate: v.withdrawalDate,
      withdrawalReason: v.withdrawalReason,
      withdrawalUserName: v.withdrawalUserName,
      requiresReview: v.requiresReview,
      reviewNotes: v.reviewNotes,
      importSource: v.importSource,
      importBatchId: v.importBatchId,
      importNotes: v.importNotes,
      importRawData: v.importRawData,
      createdAt: v.createdAt ? v.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: v.updatedAt ? v.updatedAt.toISOString() : new Date().toISOString(),
      primaryOwner,
      owners: currentOwners,
      ownerHistory: allOwnersList,
      driver: v.driver
        ? {
            id: v.driver.id,
            fullName: v.driver.fullName,
            dni: v.driver.dni,
            phone: v.driver.phone,
            address: v.driver.address,
          }
        : null,
      driverHistory,
      padronHistory,
      insurance: activeInsurance,
      insuranceEvaluation: evaluateDocumentDate(activeInsurance?.expirationDate),
      technicalInspection: activeInspection,
      technicalInspectionEvaluation: evaluateDocumentDate(activeInspection?.expirationDate),
      roadSafetyCourse: activeCourse,
      roadSafetyCourseEvaluation: evaluateDocumentDate(activeCourse?.expirationDate),
      driverLicense: activeLicense,
      driverLicenseEvaluation: evaluateDocumentDate(activeLicense?.expirationDate),
      overallStatus: overall,
    };
  } catch (error) {
    console.error(`Database query getVehicleById(${id}) failed:`, error);
    throw new Error(`Error al obtener el vehículo #${id}`, { cause: error });
  }
}

// 3. Crear vehículo con historial inicial
export async function createVehicle(
  data: VehicleFullInput,
  user: { email: string; name: string }
) {
  try {
    const padron = (data.padronNumber || '').trim().toUpperCase();
    const plate = (data.plate || '').trim().toUpperCase();

    if (!padron) {
      throw new Error('El N.º de padrón es obligatorio y no puede estar vacío.');
    }
    if (!plate) {
      throw new Error('La placa del vehículo es obligatoria y no puede estar vacía.');
    }

    // Validar unicidad de Padrón y Placa
    const existingPadron = await db.query.vehicles.findFirst({
      where: eq(vehicles.padronNumber, padron),
    });
    if (existingPadron) {
      throw new Error(`El N.º de padrón "${padron}" ya se encuentra registrado.`);
    }

    const existingPlate = await db.query.vehicles.findFirst({
      where: eq(vehicles.plate, plate),
    });
    if (existingPlate) {
      throw new Error(`La placa "${plate}" ya se encuentra registrada.`);
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // Manejar conductor si existe
    let driverId: number | null = null;
    if (data.driver && data.driver.dni && data.driver.fullName) {
      const driverDni = data.driver.dni.trim();
      let person = await db.query.persons.findFirst({
        where: eq(persons.dni, driverDni),
      });

      if (!person) {
        const [newPerson] = await db
          .insert(persons)
          .values({
            dni: driverDni,
            fullName: data.driver.fullName.trim(),
            address: data.driver.address?.trim() || null,
            phone: data.driver.phone?.trim() || null,
            status: 'ACTIVO',
          })
          .returning();
        person = newPerson;
      } else {
        await db
          .update(persons)
          .set({
            fullName: data.driver.fullName.trim(),
            address: data.driver.address?.trim() || person.address,
            phone: data.driver.phone?.trim() || person.phone,
            updatedAt: new Date(),
          })
          .where(eq(persons.id, person.id));
      }
      driverId = person.id;
    }

    // Insertar Vehículo
    const [newVehicle] = await db
      .insert(vehicles)
      .values({
        padronNumber: padron,
        plate: plate,
        brand: (data.brand || 'SIN MARCA').trim().toUpperCase(),
        modelYear: Number(data.modelYear) || new Date().getFullYear(),
        engineNumber: data.engineNumber?.trim() || null,
        status: data.status || 'ACTIVO',
        driverId,
        requiresReview: Boolean(data.requiresReview),
        reviewNotes: data.reviewNotes?.trim() || null,
        importSource: data.importSource || null,
        importBatchId: data.importBatchId || null,
        importRawData: data.importRawData || null,
        importNotes: data.importNotes || null,
      })
      .returning();

    // Historial inicial de Padrón
    await db.insert(vehiclePadronHistory).values({
      vehicleId: newVehicle.id,
      previousPadron: padron,
      newPadron: padron,
      changeType: 'INITIAL_ASSIGNMENT',
      reason: 'Registro inicial de unidad en el padrón',
      authorizedBy: user.name,
      changedByUserId: user.email,
      changedByUserName: user.name,
      effectiveDate: todayStr,
    });

    // Registrar historial de conductor si aplica
    if (driverId) {
      await db.insert(vehicleDrivers).values({
        vehicleId: newVehicle.id,
        personId: driverId,
        isCurrent: true,
        validFrom: todayStr,
        notes: 'Conductor asignado en el registro inicial',
      });
    }

    // Insertar Propietarios con historial de vigencia
    if (data.owners && data.owners.length > 0) {
      for (const ownerInput of data.owners) {
        if (!ownerInput.dni || !ownerInput.fullName) continue;
        const ownerDni = ownerInput.dni.trim();

        let ownerPerson = await db.query.persons.findFirst({
          where: eq(persons.dni, ownerDni),
        });

        if (!ownerPerson) {
          const [createdOwner] = await db
            .insert(persons)
            .values({
              dni: ownerDni,
              fullName: ownerInput.fullName.trim(),
              address: ownerInput.address?.trim() || null,
              phone: ownerInput.phone?.trim() || null,
              status: 'ACTIVO',
            })
            .returning();
          ownerPerson = createdOwner;
        } else {
          await db
            .update(persons)
            .set({
              fullName: ownerInput.fullName.trim(),
              address: ownerInput.address?.trim() || ownerPerson.address,
              phone: ownerInput.phone?.trim() || ownerPerson.phone,
              updatedAt: new Date(),
            })
            .where(eq(persons.id, ownerPerson.id));
        }

        await db.insert(vehicleOwners).values({
          vehicleId: newVehicle.id,
          personId: ownerPerson.id,
          isPrimary: ownerInput.isPrimary ?? true,
          isCurrent: true,
          validFrom: todayStr,
          notes: ownerInput.notes || null,
        });
      }
    }

    // Insertar Documentos
    if (data.insurance && data.insurance.entityName) {
      await db.insert(insurances).values({
        vehicleId: newVehicle.id,
        entityName: data.insurance.entityName.trim(),
        policyNumber: data.insurance.policyNumber?.trim() || null,
        issueDate: data.insurance.issueDate || null,
        expirationDate: data.insurance.expirationDate || null,
        isCurrent: true,
      });
    }

    if (
      data.technicalInspection &&
      (data.technicalInspection.certificateNumber ||
        data.technicalInspection.centerName ||
        data.technicalInspection.expirationDate)
    ) {
      await db.insert(technicalInspections).values({
        vehicleId: newVehicle.id,
        centerName: data.technicalInspection.centerName?.trim() || 'CITV Autorizado',
        certificateNumber: data.technicalInspection.certificateNumber?.trim() || null,
        issueDate: data.technicalInspection.issueDate || null,
        expirationDate: data.technicalInspection.expirationDate || null,
        isCurrent: true,
      });
    }

    if (
      data.roadSafetyCourse &&
      (data.roadSafetyCourse.certificateNumber || data.roadSafetyCourse.expirationDate)
    ) {
      await db.insert(roadSafetyCourses).values({
        vehicleId: newVehicle.id,
        personId: driverId,
        certificateNumber: data.roadSafetyCourse.certificateNumber?.trim() || null,
        issueDate: data.roadSafetyCourse.issueDate || null,
        expirationDate: data.roadSafetyCourse.expirationDate || null,
        isCurrent: true,
      });
    }

    if (
      data.driverLicense &&
      (data.driverLicense.licenseNumber || data.driverLicense.expirationDate)
    ) {
      await db.insert(driverLicenses).values({
        vehicleId: newVehicle.id,
        personId: driverId,
        licenseNumber: data.driverLicense.licenseNumber?.trim() || null,
        originAuthority: data.driverLicense.originAuthority?.trim() || null,
        issueDate: data.driverLicense.issueDate || null,
        expirationDate: data.driverLicense.expirationDate || null,
        isCurrent: true,
      });
    }

    // Registrar en auditoría
    await db.insert(auditLogs).values({
      vehicleId: newVehicle.id,
      padronNumber: padron,
      entity: 'VEHICLE',
      entityId: String(newVehicle.id),
      action: 'CREATE',
      fieldName: 'Vehículo completo',
      oldValue: null,
      newValue: `Padrón: ${padron}, Placa: ${plate}, Marca: ${data.brand}`,
      userEmail: user.email,
      userName: user.name,
    });

    return await getVehicleById(newVehicle.id);
  } catch (error: any) {
    console.error('createVehicle error:', error);
    throw new Error(error.message || 'Error al registrar el vehículo');
  }
}

// 4. Actualizar vehículo de forma no destructiva con auditoría y preservación de períodos históricos
export async function updateVehicle(
  id: number,
  data: VehicleFullInput,
  user: { email: string; name: string }
) {
  try {
    const current = await getVehicleById(id);
    if (!current) {
      throw new Error(`El vehículo #${id} no existe.`);
    }

    const padron = (data.padronNumber || '').trim().toUpperCase();
    const plate = (data.plate || '').trim().toUpperCase();

    if (!padron) {
      throw new Error('El N.º de padrón es obligatorio y no puede estar vacío.');
    }
    if (!plate) {
      throw new Error('La placa del vehículo es obligatoria y no puede estar vacía.');
    }

    // Validar colisión de padrón o placa con otros vehículos
    const padronCheck = await db.query.vehicles.findFirst({
      where: and(eq(vehicles.padronNumber, padron), sql`${vehicles.id} != ${id}`),
    });
    if (padronCheck) {
      throw new Error(
        `El N.º de padrón "${padron}" ya está en uso por otro vehículo. Use la herramienta de intercambio si desea intercambiarlo.`
      );
    }

    const plateCheck = await db.query.vehicles.findFirst({
      where: and(eq(vehicles.plate, plate), sql`${vehicles.id} != ${id}`),
    });
    if (plateCheck) {
      throw new Error(`La placa "${plate}" ya está en uso por otro vehículo.`);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const auditEntries: Array<{
      fieldName: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    // Auditar campos principales
    if (current.padronNumber !== padron) {
      auditEntries.push({
        fieldName: 'N.º Padrón',
        oldValue: current.padronNumber,
        newValue: padron,
      });
      // Guardar cambio en padron history también
      await db.insert(vehiclePadronHistory).values({
        vehicleId: id,
        previousPadron: current.padronNumber,
        newPadron: padron,
        changeType: 'CHANGE',
        reason: 'Modificación de padrón en edición directa',
        authorizedBy: user.name,
        changedByUserId: user.email,
        changedByUserName: user.name,
        effectiveDate: todayStr,
      });
    }
    if (current.plate !== plate) {
      auditEntries.push({ fieldName: 'Placa', oldValue: current.plate, newValue: plate });
    }
    if (current.brand !== data.brand.trim()) {
      auditEntries.push({
        fieldName: 'Marca',
        oldValue: current.brand,
        newValue: data.brand.trim(),
      });
    }
    if (current.modelYear !== Number(data.modelYear)) {
      auditEntries.push({
        fieldName: 'Año Modelo',
        oldValue: String(current.modelYear),
        newValue: String(data.modelYear),
      });
    }

    // Gestionar Conductor con historial de vigencia
    let driverId = current.driver?.id || null;
    if (data.driver && data.driver.dni && data.driver.fullName) {
      const driverDni = data.driver.dni.trim();
      let person = await db.query.persons.findFirst({ where: eq(persons.dni, driverDni) });

      if (!person) {
        const [newPerson] = await db
          .insert(persons)
          .values({
            dni: driverDni,
            fullName: data.driver.fullName.trim(),
            address: data.driver.address?.trim() || null,
            phone: data.driver.phone?.trim() || null,
            status: 'ACTIVO',
          })
          .returning();
        person = newPerson;
      } else {
        await db
          .update(persons)
          .set({
            fullName: data.driver.fullName.trim(),
            address: data.driver.address?.trim() || person.address,
            phone: data.driver.phone?.trim() || person.phone,
            updatedAt: new Date(),
          })
          .where(eq(persons.id, person.id));
      }

      // Si cambió el conductor respecto al anterior, registrar períodos
      if (current.driver?.id !== person.id) {
        if (current.driver?.id) {
          // Desactivar conductor anterior con fecha de cese
          await db
            .update(vehicleDrivers)
            .set({
              isCurrent: false,
              validUntil: todayStr,
            })
            .where(
              and(
                eq(vehicleDrivers.vehicleId, id),
                eq(vehicleDrivers.isCurrent, true)
              )
            );
        }

        // Insertar nuevo conductor vigente
        await db.insert(vehicleDrivers).values({
          vehicleId: id,
          personId: person.id,
          isCurrent: true,
          validFrom: todayStr,
          notes: 'Conductor actualizado',
        });

        auditEntries.push({
          fieldName: 'Conductor',
          oldValue: current.driver ? `${current.driver.fullName} (${current.driver.dni})` : 'Sin conductor',
          newValue: `${person.fullName} (${person.dni})`,
        });
      }
      driverId = person.id;
    }

    // Actualizar vehículo
    await db
      .update(vehicles)
      .set({
        padronNumber: padron,
        plate: plate,
        brand: data.brand.trim(),
        modelYear: Number(data.modelYear),
        engineNumber: data.engineNumber?.trim() || null,
        driverId,
        requiresReview: Boolean(data.requiresReview),
        reviewNotes: data.reviewNotes?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, id));

    // Gestionar Propietarios de forma no destructiva
    if (data.owners && Array.isArray(data.owners)) {
      const incomingDnis = new Set(
        data.owners.map((o) => o.dni.trim()).filter(Boolean)
      );

      // Obtener propietarios actualmente vinculados
      const existingOwners = await db.query.vehicleOwners.findMany({
        where: eq(vehicleOwners.vehicleId, id),
        with: { person: true },
      });

      // 1. Para propietarios anteriores que ya no están en la lista incoming: marcar isCurrent = false
      for (const ex of existingOwners) {
        if (ex.isCurrent && !incomingDnis.has(ex.person.dni)) {
          await db
            .update(vehicleOwners)
            .set({
              isCurrent: false,
              validUntil: todayStr,
            })
            .where(eq(vehicleOwners.id, ex.id));

          auditEntries.push({
            fieldName: 'Baja de Propietario',
            oldValue: `${ex.person.fullName} (${ex.person.dni})`,
            newValue: `Cese en fecha ${todayStr}`,
          });
        }
      }

      // 2. Para cada propietario incoming
      for (const ownerInput of data.owners) {
        if (!ownerInput.dni || !ownerInput.fullName) continue;
        const oDni = ownerInput.dni.trim();

        let person = await db.query.persons.findFirst({ where: eq(persons.dni, oDni) });
        if (!person) {
          const [newP] = await db
            .insert(persons)
            .values({
              dni: oDni,
              fullName: ownerInput.fullName.trim(),
              address: ownerInput.address?.trim() || null,
              phone: ownerInput.phone?.trim() || null,
              status: 'ACTIVO',
            })
            .returning();
          person = newP;
        } else {
          await db
            .update(persons)
            .set({
              fullName: ownerInput.fullName.trim(),
              address: ownerInput.address?.trim() || person.address,
              phone: ownerInput.phone?.trim() || person.phone,
              updatedAt: new Date(),
            })
            .where(eq(persons.id, person.id));
        }

        const existingRelation = existingOwners.find((eo) => eo.personId === person.id);
        if (existingRelation) {
          await db
            .update(vehicleOwners)
            .set({
              isCurrent: true,
              isPrimary: ownerInput.isPrimary ?? true,
              notes: ownerInput.notes || existingRelation.notes,
            })
            .where(eq(vehicleOwners.id, existingRelation.id));
        } else {
          await db.insert(vehicleOwners).values({
            vehicleId: id,
            personId: person.id,
            isPrimary: ownerInput.isPrimary ?? true,
            isCurrent: true,
            validFrom: todayStr,
            notes: ownerInput.notes || null,
          });

          auditEntries.push({
            fieldName: 'Alta de Propietario',
            oldValue: null,
            newValue: `${person.fullName} (${person.dni})`,
          });
        }
      }
    }

    // Actualizar Seguros
    if (data.insurance) {
      await db.delete(insurances).where(eq(insurances.vehicleId, id));
      if (data.insurance.entityName) {
        await db.insert(insurances).values({
          vehicleId: id,
          entityName: data.insurance.entityName.trim(),
          policyNumber: data.insurance.policyNumber?.trim() || null,
          issueDate: data.insurance.issueDate || null,
          expirationDate: data.insurance.expirationDate || null,
          isCurrent: true,
        });
      }
    }

    // Actualizar Revisión Técnica
    if (data.technicalInspection) {
      await db.delete(technicalInspections).where(eq(technicalInspections.vehicleId, id));
      if (
        data.technicalInspection.certificateNumber ||
        data.technicalInspection.centerName ||
        data.technicalInspection.expirationDate
      ) {
        await db.insert(technicalInspections).values({
          vehicleId: id,
          centerName: data.technicalInspection.centerName?.trim() || 'CITV Autorizado',
          certificateNumber: data.technicalInspection.certificateNumber?.trim() || null,
          issueDate: data.technicalInspection.issueDate || null,
          expirationDate: data.technicalInspection.expirationDate || null,
          isCurrent: true,
        });
      }
    }

    // Actualizar Curso Vial
    if (data.roadSafetyCourse) {
      await db.delete(roadSafetyCourses).where(eq(roadSafetyCourses.vehicleId, id));
      if (data.roadSafetyCourse.certificateNumber || data.roadSafetyCourse.expirationDate) {
        await db.insert(roadSafetyCourses).values({
          vehicleId: id,
          personId: driverId,
          certificateNumber: data.roadSafetyCourse.certificateNumber?.trim() || null,
          issueDate: data.roadSafetyCourse.issueDate || null,
          expirationDate: data.roadSafetyCourse.expirationDate || null,
          isCurrent: true,
        });
      }
    }

    // Actualizar Licencia
    if (data.driverLicense) {
      await db.delete(driverLicenses).where(eq(driverLicenses.vehicleId, id));
      if (data.driverLicense.licenseNumber || data.driverLicense.expirationDate) {
        await db.insert(driverLicenses).values({
          vehicleId: id,
          personId: driverId,
          licenseNumber: data.driverLicense.licenseNumber?.trim() || null,
          originAuthority: data.driverLicense.originAuthority?.trim() || null,
          issueDate: data.driverLicense.issueDate || null,
          expirationDate: data.driverLicense.expirationDate || null,
          isCurrent: true,
        });
      }
    }

    // Guardar bitácora de auditoría
    for (const audit of auditEntries) {
      await db.insert(auditLogs).values({
        vehicleId: id,
        padronNumber: padron,
        entity: 'VEHICLE',
        entityId: String(id),
        action: 'UPDATE',
        fieldName: audit.fieldName,
        oldValue: audit.oldValue,
        newValue: audit.newValue,
        userEmail: user.email,
        userName: user.name,
      });
    }

    return await getVehicleById(id);
  } catch (error: any) {
    console.error('updateVehicle error:', error);
    throw new Error(error.message || 'Error al actualizar el vehículo');
  }
}

// 5. Baja Lógica / Retiro de unidad (Solo Administrador)
export async function retireVehicle(
  id: number,
  params: { reason: string; withdrawalDate?: string },
  user: { email: string; name: string }
) {
  const current = await getVehicleById(id);
  if (!current) {
    throw new Error(`El vehículo #${id} no existe.`);
  }

  const withdrawalDate = params.withdrawalDate || new Date().toISOString().slice(0, 10);
  const reason = params.reason.trim();

  await db
    .update(vehicles)
    .set({
      status: 'RETIRADO',
      withdrawalDate,
      withdrawalReason: reason,
      withdrawalUserName: user.name,
      updatedAt: new Date(),
    })
    .where(eq(vehicles.id, id));

  // Registrar en historial de padrón el cese
  await db.insert(vehiclePadronHistory).values({
    vehicleId: id,
    previousPadron: current.padronNumber,
    newPadron: current.padronNumber,
    changeType: 'RELEASE',
    reason: `Baja de unidad: ${reason}`,
    authorizedBy: user.name,
    changedByUserId: user.email,
    changedByUserName: user.name,
    effectiveDate: withdrawalDate,
  });

  // Auditoría
  await db.insert(auditLogs).values({
    vehicleId: id,
    padronNumber: current.padronNumber,
    entity: 'VEHICLE',
    entityId: String(id),
    action: 'RETIRE',
    fieldName: 'Estado',
    oldValue: current.status,
    newValue: 'RETIRADO',
    reason,
    userEmail: user.email,
    userName: user.name,
  });

  return await getVehicleById(id);
}

// 6. Reactivación de unidad retirada
export async function reactivateVehicle(
  id: number,
  user: { email: string; name: string }
) {
  const current = await getVehicleById(id);
  if (!current) {
    throw new Error(`El vehículo #${id} no existe.`);
  }

  // Verificar que el padrón no esté ocupado por otra unidad activa
  const padronConflict = await db.query.vehicles.findFirst({
    where: and(
      eq(vehicles.padronNumber, current.padronNumber),
      sql`${vehicles.id} != ${id}`
    ),
  });

  if (padronConflict) {
    throw new Error(
      `No se puede reactivar con el padrón "${current.padronNumber}" porque ya fue asignado al vehículo #${padronConflict.id} (Placa ${padronConflict.plate}). Primero debe reasignar el padrón.`
    );
  }

  await db
    .update(vehicles)
    .set({
      status: 'ACTIVO',
      withdrawalDate: null,
      withdrawalReason: null,
      withdrawalUserName: null,
      updatedAt: new Date(),
    })
    .where(eq(vehicles.id, id));

  await db.insert(vehiclePadronHistory).values({
    vehicleId: id,
    previousPadron: current.padronNumber,
    newPadron: current.padronNumber,
    changeType: 'REASSIGNMENT',
    reason: 'Reactivación de unidad en el padrón',
    authorizedBy: user.name,
    changedByUserId: user.email,
    changedByUserName: user.name,
    effectiveDate: new Date().toISOString().slice(0, 10),
  });

  await db.insert(auditLogs).values({
    vehicleId: id,
    padronNumber: current.padronNumber,
    entity: 'VEHICLE',
    entityId: String(id),
    action: 'REACTIVATE',
    fieldName: 'Estado',
    oldValue: 'RETIRADO',
    newValue: 'ACTIVO',
    reason: 'Reactivación administrativa',
    userEmail: user.email,
    userName: user.name,
  });

  return await getVehicleById(id);
}

// 7. Eliminación física definitiva (Solo Administrador con confirmación explícita)
export async function deleteVehicle(
  id: number,
  user: { email: string; name: string },
  confirmed = false
) {
  if (!confirmed) {
    throw new Error(
      'La eliminación física permanente requiere confirmación explícita. Se recomienda usar la opción "Baja / Retirar unidad".'
    );
  }

  const current = await getVehicleById(id);
  if (!current) {
    throw new Error(`El vehículo #${id} no existe.`);
  }

  await db.insert(auditLogs).values({
    vehicleId: id,
    padronNumber: current.padronNumber,
    entity: 'VEHICLE',
    entityId: String(id),
    action: 'DELETE',
    fieldName: 'Eliminación física',
    oldValue: `Padrón: ${current.padronNumber}, Placa: ${current.plate}`,
    newValue: 'REGISTRO PURGADO DE LA BASE DE DATOS',
    reason: 'Eliminación física confirmada por administrador',
    userEmail: user.email,
    userName: user.name,
  });

  await db.delete(vehicles).where(eq(vehicles.id, id));
  return { success: true, message: `Vehículo #${id} eliminado físicamente.` };
}

// 8. Estadísticas del Dashboard con Salud Documental Real
export async function getDashboardStats() {
  try {
    const all = await getVehicles({ limit: 5000 });
    const list = all.vehicles;

    let activeVehiclesCount = 0;
    let retiredVehiclesCount = 0;

    let completeCount = 0;
    let upcomingCount = 0;
    let expiredCount = 0;
    let incompleteCount = 0;

    let expiredDocsTotal = 0;
    let upcomingDocsTotal = 0;
    let validDocsTotal = 0;
    let reviewCount = 0;

    const documentAlerts: Array<{
      id: string;
      vehicleId: number;
      padronNumber: string;
      plate: string;
      docType: string;
      docName: string;
      expirationDate: string;
      daysRemaining: number;
      status: 'vencido' | 'proximo';
      badgeClass: string;
    }> = [];

    const ownerDniSet = new Set<string>();
    const driverDniSet = new Set<string>();

    for (const v of list) {
      if (v.status === 'RETIRADO' || v.status === 'INACTIVO') {
        retiredVehiclesCount++;
      } else {
        activeVehiclesCount++;
      }

      if (v.requiresReview) reviewCount++;

      v.owners.forEach((o) => {
        if (o.dni) ownerDniSet.add(o.dni);
      });
      if (v.driver?.dni) driverDniSet.add(v.driver.dni);

      // Evaluación documental
      const docs = [
        {
          type: 'AFOCAT / SOAT',
          name: v.insurance?.entityName || 'SOAT',
          eval: v.insuranceEvaluation,
          exp: v.insurance?.expirationDate,
        },
        {
          type: 'Revisión Técnica',
          name: v.technicalInspection?.centerName || 'CITV',
          eval: v.technicalInspectionEvaluation,
          exp: v.technicalInspection?.expirationDate,
        },
        {
          type: 'Curso Vial',
          name: 'Curso Educación Vial',
          eval: v.roadSafetyCourseEvaluation,
          exp: v.roadSafetyCourse?.expirationDate,
        },
        {
          type: 'Licencia B-II-C',
          name: v.driverLicense?.licenseNumber
            ? `Lic. ${v.driverLicense.licenseNumber}`
            : 'Licencia B-II-C',
          eval: v.driverLicenseEvaluation,
          exp: v.driverLicense?.expirationDate,
        },
      ];

      let hasExpired = false;
      let hasUpcoming = false;
      let hasMissing = false;

      for (const d of docs) {
        if (d.eval.status === 'vencido') {
          hasExpired = true;
          expiredDocsTotal++;
          if (d.exp) {
            documentAlerts.push({
              id: `${v.id}-${d.type}`,
              vehicleId: v.id,
              padronNumber: v.padronNumber,
              plate: v.plate,
              docType: d.type,
              docName: d.name,
              expirationDate: d.exp,
              daysRemaining: d.eval.daysRemaining || 0,
              status: 'vencido',
              badgeClass: d.eval.badgeClass,
            });
          }
        } else if (d.eval.status === 'proximo') {
          hasUpcoming = true;
          upcomingDocsTotal++;
          if (d.exp) {
            documentAlerts.push({
              id: `${v.id}-${d.type}`,
              vehicleId: v.id,
              padronNumber: v.padronNumber,
              plate: v.plate,
              docType: d.type,
              docName: d.name,
              expirationDate: d.exp,
              daysRemaining: d.eval.daysRemaining || 0,
              status: 'proximo',
              badgeClass: d.eval.badgeClass,
            });
          }
        } else if (d.eval.status === 'vigente') {
          validDocsTotal++;
        } else {
          hasMissing = true;
        }
      }

      // Salud del vehículo
      if (hasExpired) {
        expiredCount++;
      } else if (hasUpcoming) {
        upcomingCount++;
      } else if (hasMissing) {
        incompleteCount++;
      } else {
        completeCount++;
      }
    }

    const totalVehicles = list.length;
    const completePercent = totalVehicles > 0 ? Math.round((completeCount / totalVehicles) * 100) : 0;
    const upcomingPercent = totalVehicles > 0 ? Math.round((upcomingCount / totalVehicles) * 100) : 0;
    const expiredPercent = totalVehicles > 0 ? Math.round((expiredCount / totalVehicles) * 100) : 0;
    const incompletePercent = totalVehicles > 0 ? Math.round((incompleteCount / totalVehicles) * 100) : 0;

    // Conteo total de personas en la base de datos
    const allPersonsCount = await db.select({ count: sql<number>`count(*)` }).from(persons);
    const totalPersons = Number(allPersonsCount[0]?.count) || ownerDniSet.size + driverDniSet.size;

    // Cambios de padrón recientes
    const recentPadronChangesRaw = await db.query.vehiclePadronHistory.findMany({
      limit: 6,
      orderBy: [desc(vehiclePadronHistory.createdAt)],
      with: {
        relatedVehicle: true,
      },
    });

    const recentPadronChanges = recentPadronChangesRaw.map((h) => ({
      id: h.id,
      vehicleId: h.vehicleId,
      previousPadron: h.previousPadron,
      newPadron: h.newPadron,
      changeType: h.changeType as any,
      relatedVehicleId: h.relatedVehicleId,
      relatedVehiclePlate: h.relatedVehicle?.plate || null,
      relatedVehiclePadron: h.relatedVehicle?.padronNumber || null,
      reason: h.reason,
      authorizationReference: h.authorizationReference,
      authorizedBy: h.authorizedBy,
      changedByUserId: h.changedByUserId,
      changedByUserName: h.changedByUserName,
      effectiveDate: h.effectiveDate,
      createdAt: h.createdAt ? h.createdAt.toISOString() : new Date().toISOString(),
    }));

    // Ordenar alertas: primero los vencidos (más negativos), luego los que vencen antes
    documentAlerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      totalVehicles,
      activeVehiclesCount,
      retiredVehiclesCount,
      totalPersons,
      totalOwners: ownerDniSet.size,
      totalDrivers: driverDniSet.size,
      validDocumentsCount: validDocsTotal,
      expiredDocuments: expiredDocsTotal,
      upcomingDocuments: upcomingDocsTotal,
      requiresReviewCount: reviewCount,
      fleetHealth: {
        completeCount,
        completePercent,
        upcomingCount,
        upcomingPercent,
        expiredCount,
        expiredPercent,
        incompleteCount,
        incompletePercent,
      },
      recentPadronChanges,
      documentAlerts: documentAlerts.slice(0, 15),
      recentVehicles: list.slice(0, 6),
    };
  } catch (error) {
    console.error('getDashboardStats error:', error);
    throw new Error('Error al generar estadísticas del dashboard', { cause: error });
  }
}

// 9. Lista de Personas Registradas (Propietarios y Conductores)
export async function getPersonsList(params: { search?: string; status?: string }) {
  try {
    const list = await db.query.persons.findMany({
      with: {
        ownedVehicles: {
          with: {
            vehicle: true,
          },
        },
        drivenVehicles: true,
      },
      orderBy: [desc(persons.createdAt)],
    });

    let formatted = list.map((p) => {
      const activeOwned = p.ownedVehicles.filter((ov) => ov.isCurrent && ov.vehicle);
      const activeDriven = p.drivenVehicles.filter((v) => v.status === 'ACTIVO');

      return {
        id: p.id,
        dni: p.dni,
        fullName: p.fullName,
        address: p.address,
        phone: p.phone,
        status: p.status || 'ACTIVO',
        withdrawalDate: p.withdrawalDate,
        withdrawalReason: p.withdrawalReason,
        ownedCount: activeOwned.length,
        drivenCount: activeDriven.length,
        ownedVehicles: activeOwned.map((ov) => ({
          vehicleId: ov.vehicle.id,
          padronNumber: ov.vehicle.padronNumber,
          plate: ov.vehicle.plate,
        })),
        drivenVehicles: activeDriven.map((dv) => ({
          vehicleId: dv.id,
          padronNumber: dv.padronNumber,
          plate: dv.plate,
        })),
        createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
      };
    });

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      formatted = formatted.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.dni.includes(q) ||
          (p.phone && p.phone.includes(q))
      );
    }

    if (params.status && params.status !== 'all') {
      formatted = formatted.filter((p) => p.status === params.status);
    }

    return formatted;
  } catch (error) {
    console.error('getPersonsList error:', error);
    throw new Error('Error al listar personas', { cause: error });
  }
}

// 10. Actualizar información de una Persona
export async function updatePerson(
  id: number,
  data: {
    fullName?: string;
    dni?: string;
    phone?: string;
    address?: string;
    status?: 'ACTIVO' | 'INACTIVO';
  },
  user: { email: string; name: string }
) {
  const current = await db.query.persons.findFirst({
    where: eq(persons.id, id),
  });
  if (!current) {
    throw new Error(`La persona #${id} no existe.`);
  }

  if (data.dni && data.dni.trim() !== current.dni) {
    const collision = await db.query.persons.findFirst({
      where: and(eq(persons.dni, data.dni.trim()), sql`${persons.id} != ${id}`),
    });
    if (collision) {
      throw new Error(`El DNI "${data.dni}" ya pertenece a otra persona (${collision.fullName}).`);
    }
  }

  await db
    .update(persons)
    .set({
      fullName: data.fullName?.trim() || current.fullName,
      dni: data.dni?.trim() || current.dni,
      phone: data.phone?.trim() ?? current.phone,
      address: data.address?.trim() ?? current.address,
      status: data.status || current.status,
      updatedAt: new Date(),
    })
    .where(eq(persons.id, id));

  await db.insert(auditLogs).values({
    entity: 'PERSON',
    entityId: String(id),
    action: 'UPDATE',
    fieldName: 'Datos de persona',
    oldValue: `${current.fullName} (DNI: ${current.dni})`,
    newValue: `${data.fullName || current.fullName} (DNI: ${data.dni || current.dni})`,
    userEmail: user.email,
    userName: user.name,
  });

  return await db.query.persons.findFirst({ where: eq(persons.id, id) });
}

// 11. Lista de Vencimientos Unificada
export async function getExpirationsList(filter: {
  timeframe?: 'all' | 'vencidos' | '7' | '15' | '30' | '60';
  docType?: string;
  search?: string;
}) {
  try {
    const all = await getVehicles({ limit: 2000 });
    const list = all.vehicles;

    const items: Array<{
      id: string;
      vehicleId: number;
      padronNumber: string;
      plate: string;
      brand: string;
      primaryOwnerName: string;
      driverName: string;
      docType: 'insurance' | 'technicalInspection' | 'roadSafetyCourse' | 'driverLicense';
      docTypeName: string;
      docIdentifier: string;
      expirationDate: string;
      issueDate: string | null;
      daysRemaining: number | null;
      status: 'vigente' | 'proximo' | 'vencido' | 'sin_informacion';
      statusLabel: string;
      badgeClass: string;
      isUrgent: boolean;
    }> = [];

    for (const v of list) {
      const docsToCheck = [
        {
          docType: 'insurance' as const,
          docTypeName: 'AFOCAT / SOAT',
          docIdentifier: v.insurance?.entityName
            ? `${v.insurance.entityName} (${v.insurance.policyNumber || 'S/N'})`
            : 'Sin seguro',
          exp: v.insurance?.expirationDate,
          issue: v.insurance?.issueDate || null,
          eval: v.insuranceEvaluation,
        },
        {
          docType: 'technicalInspection' as const,
          docTypeName: 'Revisión Técnica',
          docIdentifier: v.technicalInspection?.certificateNumber
            ? `Cert. ${v.technicalInspection.certificateNumber}`
            : 'CITV',
          exp: v.technicalInspection?.expirationDate,
          issue: v.technicalInspection?.issueDate || null,
          eval: v.technicalInspectionEvaluation,
        },
        {
          docType: 'roadSafetyCourse' as const,
          docTypeName: 'Curso Educación Vial',
          docIdentifier: v.roadSafetyCourse?.certificateNumber
            ? `Cert. ${v.roadSafetyCourse.certificateNumber}`
            : 'Curso Vial',
          exp: v.roadSafetyCourse?.expirationDate,
          issue: v.roadSafetyCourse?.issueDate || null,
          eval: v.roadSafetyCourseEvaluation,
        },
        {
          docType: 'driverLicense' as const,
          docTypeName: 'Licencia B-II-C',
          docIdentifier: v.driverLicense?.licenseNumber
            ? `Lic. ${v.driverLicense.licenseNumber}`
            : 'Licencia B-II-C',
          exp: v.driverLicense?.expirationDate,
          issue: v.driverLicense?.issueDate || null,
          eval: v.driverLicenseEvaluation,
        },
      ];

      for (const d of docsToCheck) {
        items.push({
          id: `${v.id}-${d.docType}`,
          vehicleId: v.id,
          padronNumber: v.padronNumber,
          plate: v.plate,
          brand: v.brand,
          primaryOwnerName: v.primaryOwner?.fullName || 'No asignado',
          driverName: v.driver?.fullName || 'No asignado',
          docType: d.docType,
          docTypeName: d.docTypeName,
          docIdentifier: d.docIdentifier,
          expirationDate: d.exp || 'Sin fecha',
          issueDate: d.issue,
          daysRemaining: d.eval.daysRemaining,
          status: d.eval.status,
          statusLabel: d.eval.label,
          badgeClass: d.eval.badgeClass,
          isUrgent: d.eval.isUrgent,
        });
      }
    }

    let filtered = items;

    if (filter.timeframe && filter.timeframe !== 'all') {
      if (filter.timeframe === 'vencidos') {
        filtered = filtered.filter((i) => i.status === 'vencido');
      } else {
        const maxDays = Number(filter.timeframe);
        filtered = filtered.filter(
          (i) =>
            i.daysRemaining !== null &&
            i.daysRemaining >= 0 &&
            i.daysRemaining <= maxDays
        );
      }
    }

    if (filter.docType && filter.docType !== 'all') {
      filtered = filtered.filter((i) => i.docType === filter.docType);
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.toLowerCase().trim();
      filtered = filtered.filter(
        (i) =>
          i.padronNumber.toLowerCase().includes(q) ||
          i.plate.toLowerCase().includes(q) ||
          i.primaryOwnerName.toLowerCase().includes(q) ||
          i.driverName.toLowerCase().includes(q) ||
          i.docIdentifier.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      if (a.daysRemaining === null && b.daysRemaining === null) return 0;
      if (a.daysRemaining === null) return 1;
      if (b.daysRemaining === null) return -1;
      return a.daysRemaining - b.daysRemaining;
    });

    return filtered;
  } catch (error) {
    console.error('getExpirationsList error:', error);
    throw new Error('Error al consultar vencimientos', { cause: error });
  }
}

// 12. Bitácora de Auditoría
export async function getAuditLogs(params: {
  padron?: string;
  entity?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const limit = params.limit || 50;
    const offset = params.offset || 0;

    let whereClause = undefined;
    if (params.padron && params.padron.trim()) {
      whereClause = eq(auditLogs.padronNumber, params.padron.trim().toUpperCase());
    }

    const logs = await db.query.auditLogs.findMany({
      where: whereClause,
      orderBy: [desc(auditLogs.createdAt)],
      limit,
      offset,
    });

    return logs;
  } catch (error) {
    console.error('getAuditLogs error:', error);
    throw new Error('Error al obtener auditoría', { cause: error });
  }
}

// 13. Padrón de Conductores y Estado de Curso de Educación Vial Anual
export async function getDriversWithCoursesList(params: {
  search?: string;
  courseStatus?: string; // 'all' | 'APROBADO' | 'PENDIENTE' | 'VENCIDO'
}) {
  try {
    // Obtener vehículos activos con sus conductores y documentos
    const allVehicles = await db.query.vehicles.findMany({
      where: eq(vehicles.status, 'ACTIVO'),
      with: {
        driver: true,
        driverLicenses: {
          where: eq(driverLicenses.isCurrent, true),
        },
        roadSafetyCourses: {
          where: eq(roadSafetyCourses.isCurrent, true),
        },
      },
      orderBy: [desc(vehicles.createdAt)],
    });

    const driversMap = new Map<number, any>();

    for (const v of allVehicles) {
      if (!v.driver) continue;

      const d = v.driver;
      const activeLicense = v.driverLicenses[0] || null;
      const activeCourse = v.roadSafetyCourses[0] || null;

      const evalCourse = evaluateDocumentDate(activeCourse?.expirationDate);
      const passed =
        evalCourse.status === 'vigente' ||
        evalCourse.status === 'proximo' ||
        Boolean(activeCourse?.certificateNumber && evalCourse.status !== 'vencido');

      let statusCalculated: 'APROBADO' | 'PENDIENTE' | 'VENCIDO' = 'PENDIENTE';
      if (evalCourse.status === 'vencido') {
        statusCalculated = 'VENCIDO';
      } else if (passed) {
        statusCalculated = 'APROBADO';
      }

      driversMap.set(d.id, {
        id: d.id,
        driverId: d.id,
        dni: d.dni,
        fullName: d.fullName,
        phone: d.phone || null,
        address: d.address || null,
        personStatus: d.status || 'ACTIVO',
        vehicleId: v.id,
        padronNumber: v.padronNumber,
        plate: v.plate,
        brand: v.brand,
        licenseNumber: activeLicense?.licenseNumber || null,
        licenseExpirationDate: activeLicense?.expirationDate || null,
        courseId: activeCourse?.id || null,
        certificateNumber: activeCourse?.certificateNumber || null,
        courseIssueDate: activeCourse?.issueDate || null,
        courseExpirationDate: activeCourse?.expirationDate || null,
        passedCourse: passed,
        courseStatus: statusCalculated,
        daysRemaining: evalCourse.daysRemaining,
        badgeClass: evalCourse.badgeClass,
      });
    }

    // Convertir a lista
    let list = Array.from(driversMap.values());

    // Filtro por búsqueda
    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.fullName.toLowerCase().includes(q) ||
          item.dni.includes(q) ||
          (item.padronNumber && item.padronNumber.toLowerCase().includes(q)) ||
          (item.plate && item.plate.toLowerCase().includes(q)) ||
          (item.certificateNumber && item.certificateNumber.toLowerCase().includes(q))
      );
    }

    // Filtro por estado de curso
    if (params.courseStatus && params.courseStatus !== 'all') {
      list = list.filter((item) => item.courseStatus === params.courseStatus);
    }

    return list;
  } catch (error) {
    console.error('getDriversWithCoursesList error:', error);
    throw new Error('Error al listar conductores y curso vial', { cause: error });
  }
}

// 14. Actualizar o Registrar Curso Vial para un Conductor
export async function updateDriverRoadSafetyCourse(
  driverId: number,
  data: {
    vehicleId?: number;
    certificateNumber?: string;
    issueDate?: string;
    expirationDate?: string;
  },
  user: { email: string; name: string }
) {
  try {
    const person = await db.query.persons.findFirst({
      where: eq(persons.id, driverId),
    });
    if (!person) {
      throw new Error(`Conductor con ID ${driverId} no encontrado`);
    }

    // Buscar si tiene vehículo asignado
    let targetVehicleId = data.vehicleId;
    if (!targetVehicleId) {
      const assigned = await db.query.vehicles.findFirst({
        where: eq(vehicles.driverId, driverId),
      });
      targetVehicleId = assigned?.id;
    }

    if (!targetVehicleId) {
      throw new Error('El conductor no tiene un vehículo asignado en el padrón actualmente.');
    }

    // Desactivar cursos previos actuales
    await db
      .update(roadSafetyCourses)
      .set({ isCurrent: false })
      .where(and(eq(roadSafetyCourses.vehicleId, targetVehicleId), eq(roadSafetyCourses.isCurrent, true)));

    // Insertar nuevo registro
    const [inserted] = await db
      .insert(roadSafetyCourses)
      .values({
        vehicleId: targetVehicleId,
        personId: driverId,
        certificateNumber: data.certificateNumber?.trim() || `CV-${new Date().getFullYear()}-${person.dni.slice(-4)}`,
        issueDate: data.issueDate || new Date().toISOString().slice(0, 10),
        expirationDate:
          data.expirationDate ||
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        isCurrent: true,
      })
      .returning();

    // Auditoría
    await db.insert(auditLogs).values({
      vehicleId: targetVehicleId,
      entity: 'DOCUMENT',
      action: 'UPDATE',
      fieldName: 'ROAD_SAFETY_COURSE',
      oldValue: 'Actualización de Curso Vial',
      newValue: `Cert: ${inserted.certificateNumber} | Exp: ${inserted.expirationDate}`,
      reason: 'Registro o actualización de Curso de Educación Vial Anual',
      userEmail: user.email,
      userName: user.name,
    });

    return inserted;
  } catch (error) {
    console.error('updateDriverRoadSafetyCourse error:', error);
    throw new Error('Error al actualizar curso vial del conductor', { cause: error });
  }
}

// 15. Sincronización Masiva de Curso Vial (Cruzar lista de aprobados o planilla de evaluación)
export async function syncRoadSafetyCoursesBulk(
  approvedIdentifiersOrOptions:
    | string[]
    | {
        approvedIdentifiers?: string[];
        evaluations?: Array<{ driverId: number; vehicleId?: number; dni?: string; passed: boolean }>;
        courseYear?: number;
      },
  courseYearParam: number = new Date().getFullYear(),
  userParam?: { email: string; name: string }
) {
  try {
    let approvedIdentifiers: string[] = [];
    let evaluations: Array<{ driverId: number; vehicleId?: number; dni?: string; passed: boolean }> | undefined;
    let courseYear = courseYearParam;
    let user = userParam || { email: 'admin@transporte.pe', name: 'Administrador' };

    if (Array.isArray(approvedIdentifiersOrOptions)) {
      approvedIdentifiers = approvedIdentifiersOrOptions;
    } else if (typeof approvedIdentifiersOrOptions === 'object' && approvedIdentifiersOrOptions !== null) {
      approvedIdentifiers = approvedIdentifiersOrOptions.approvedIdentifiers || [];
      evaluations = approvedIdentifiersOrOptions.evaluations;
      if (approvedIdentifiersOrOptions.courseYear) {
        courseYear = approvedIdentifiersOrOptions.courseYear;
      }
    }

    const allDrivers = await getDriversWithCoursesList({});
    const updatedDrivers: any[] = [];
    const missingDrivers: any[] = [];
    let passedCount = 0;
    let failedCount = 0;

    const defaultExpiration = `${courseYear + 1}-12-31`;
    const defaultIssue = `${courseYear}-01-15`;

    // Modo A: Evaluaciones directas por conductor (Aprobó o No Pasó)
    if (evaluations && Array.isArray(evaluations) && evaluations.length > 0) {
      for (const ev of evaluations) {
        const targetDriver = allDrivers.find((d) => d.driverId === ev.driverId) || {
          driverId: ev.driverId,
          vehicleId: ev.vehicleId,
          dni: ev.dni,
        };

        const vId = ev.vehicleId || targetDriver.vehicleId;
        if (vId) {
          if (ev.passed) {
            await updateDriverRoadSafetyCourse(
              ev.driverId,
              {
                vehicleId: vId,
                certificateNumber: `ACTA-${courseYear}-${ev.dni || targetDriver.dni || ev.driverId}`,
                issueDate: defaultIssue,
                expirationDate: defaultExpiration,
              },
              user
            );
            passedCount++;
          } else {
            // Marcado como desaprobado / no asistió
            await updateDriverRoadSafetyCourse(
              ev.driverId,
              {
                vehicleId: vId,
                certificateNumber: `DESAPROBADO-${courseYear}`,
                issueDate: defaultIssue,
                expirationDate: `${courseYear - 1}-12-31`, // Vencido
              },
              user
            );
            failedCount++;
          }
          updatedDrivers.push({ ...targetDriver, passed: ev.passed });
        }
      }

      return {
        totalEvaluated: evaluations.length,
        passedCount,
        failedCount,
        missingCount: failedCount,
        updatedDrivers,
        missingDrivers,
      };
    }

    // Modo B: Cruzar por identificadores (DNI o Nombre)
    const normalizedIdentifiers = new Set(
      approvedIdentifiers.map((s) => s.trim().toUpperCase().replace(/[^0-9A-Z]/g, ''))
    );

    for (const d of allDrivers) {
      const cleanDni = d.dni ? d.dni.trim().toUpperCase().replace(/[^0-9A-Z]/g, '') : '';
      const cleanName = d.fullName ? d.fullName.trim().toUpperCase().replace(/[^0-9A-Z]/g, '') : '';

      const isApproved =
        (cleanDni && normalizedIdentifiers.has(cleanDni)) ||
        (cleanName && normalizedIdentifiers.has(cleanName)) ||
        Array.from(normalizedIdentifiers).some(
          (id) => (cleanDni && id.includes(cleanDni)) || (cleanName && cleanName.includes(id))
        );

      if (isApproved) {
        if (d.vehicleId) {
          await updateDriverRoadSafetyCourse(
            d.driverId,
            {
              vehicleId: d.vehicleId,
              certificateNumber: d.certificateNumber || `ACTA-${courseYear}-${d.dni}`,
              issueDate: defaultIssue,
              expirationDate: defaultExpiration,
            },
            user
          );
          updatedDrivers.push(d);
          passedCount++;
        }
      } else {
        missingDrivers.push(d);
        failedCount++;
      }
    }

    return {
      totalEvaluated: allDrivers.length,
      passedCount,
      failedCount,
      missingCount: missingDrivers.length,
      updatedDrivers,
      missingDrivers,
    };
  } catch (error) {
    console.error('syncRoadSafetyCoursesBulk error:', error);
    throw new Error('Error al sincronizar lista de curso vial', { cause: error });
  }
}

