import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  auditLogs,
  padronChangeRequests,
  vehiclePadronHistory,
  vehicles,
} from './schema.ts';

export interface UserContext {
  email: string;
  name: string;
  role?: string;
}

// 1. Reasignar a un padrón libre (Operación de Administrador)
export async function changeVehiclePadron(params: {
  vehicleId: number;
  newPadron: string;
  reason: string;
  authorizationReference?: string | null;
  authorizedBy?: string | null;
  effectiveDate?: string | null;
  user: UserContext;
}) {
  const {
    vehicleId,
    newPadron: rawNewPadron,
    reason,
    authorizationReference,
    authorizedBy,
    effectiveDate,
    user,
  } = params;

  const newPadron = rawNewPadron.trim().toUpperCase();
  if (!newPadron) {
    throw new Error('El nuevo número de padrón no puede estar vacío.');
  }

  return await db.transaction(async (tx) => {
    // 1. Obtener vehículo actual
    const [currentVehicle] = await tx
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .for('update');

    if (!currentVehicle) {
      throw new Error(`El vehículo #${vehicleId} no fue encontrado.`);
    }

    const previousPadron = currentVehicle.padronNumber;
    if (previousPadron === newPadron) {
      throw new Error(`El vehículo ya tiene asignado el padrón "${newPadron}".`);
    }

    // 2. Verificar que el nuevo padrón esté libre
    const [occupant] = await tx
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.padronNumber, newPadron), sql`${vehicles.id} != ${vehicleId}`))
      .for('update');

    if (occupant) {
      throw new Error(
        `El padrón "${newPadron}" ya pertenece al vehículo placa "${occupant.plate}". Debe usar la opción de intercambio si desea intercambiarlo.`
      );
    }

    // 3. Actualizar el vehículo manteniendo vehicle.id permanente
    await tx
      .update(vehicles)
      .set({
        padronNumber: newPadron,
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, vehicleId));

    // 4. Registrar en el historial permanente de padrón
    const [historyEntry] = await tx
      .insert(vehiclePadronHistory)
      .values({
        vehicleId,
        previousPadron,
        newPadron,
        changeType: 'CHANGE',
        reason,
        authorizationReference: authorizationReference || 'Autorización Directa',
        authorizedBy: authorizedBy || user.name,
        changedByUserId: user.email,
        changedByUserName: user.name,
        effectiveDate: effectiveDate || new Date().toISOString().slice(0, 10),
      })
      .returning();

    // 5. Registrar en auditoría
    await tx.insert(auditLogs).values({
      vehicleId,
      padronNumber: newPadron,
      entity: 'PADRON',
      entityId: String(vehicleId),
      action: 'PADRON_CHANGE',
      fieldName: 'N.º de Padrón',
      oldValue: previousPadron,
      newValue: newPadron,
      reason,
      userEmail: user.email,
      userName: user.name,
    });

    return {
      success: true,
      vehicleId,
      previousPadron,
      newPadron,
      historyId: historyEntry.id,
    };
  });
}

// 2. Intercambio atómico de padrones entre dos vehículos (Operación de Administrador)
export async function swapVehiclesPadron(params: {
  vehicleAId: number;
  vehicleBId: number;
  reason: string;
  authorizationReference: string;
  authorizedBy: string;
  effectiveDate?: string | null;
  user: UserContext;
}) {
  const {
    vehicleAId,
    vehicleBId,
    reason,
    authorizationReference,
    authorizedBy,
    effectiveDate,
    user,
  } = params;

  if (vehicleAId === vehicleBId) {
    throw new Error('No se puede intercambiar el padrón de un vehículo consigo mismo.');
  }

  return await db.transaction(async (tx) => {
    // 1. Bloquear y leer ambos vehículos en orden para prevenir deadlocks
    const firstId = Math.min(vehicleAId, vehicleBId);
    const secondId = Math.max(vehicleAId, vehicleBId);

    const lockedVehicles = await tx
      .select()
      .from(vehicles)
      .where(inArray(vehicles.id, [firstId, secondId]))
      .for('update');

    const vehicleA = lockedVehicles.find((v) => v.id === vehicleAId);
    const vehicleB = lockedVehicles.find((v) => v.id === vehicleBId);

    if (!vehicleA) {
      throw new Error(`El vehículo de origen (#${vehicleAId}) no existe.`);
    }
    if (!vehicleB) {
      throw new Error(`El vehículo de destino (#${vehicleBId}) no existe.`);
    }

    const padronA = vehicleA.padronNumber;
    const padronB = vehicleB.padronNumber;

    if (padronA === padronB) {
      throw new Error('Ambos vehículos ya tienen el mismo número de padrón.');
    }

    // 2. Paso seguro con clave temporal para satisfacer la restricción UNIQUE
    const tempPadron = `__TEMP_SWAP_${Date.now()}_${vehicleAId}__`;

    // A -> Temp
    await tx
      .update(vehicles)
      .set({ padronNumber: tempPadron, updatedAt: new Date() })
      .where(eq(vehicles.id, vehicleAId));

    // B -> Padron A
    await tx
      .update(vehicles)
      .set({ padronNumber: padronA, updatedAt: new Date() })
      .where(eq(vehicles.id, vehicleBId));

    // A -> Padron B
    await tx
      .update(vehicles)
      .set({ padronNumber: padronB, updatedAt: new Date() })
      .where(eq(vehicles.id, vehicleAId));

    const effDate = effectiveDate || new Date().toISOString().slice(0, 10);

    // 3. Registrar entrada de historial para Vehículo A
    await tx.insert(vehiclePadronHistory).values({
      vehicleId: vehicleAId,
      previousPadron: padronA,
      newPadron: padronB,
      changeType: 'SWAP',
      relatedVehicleId: vehicleBId,
      reason: `${reason} (Intercambio con placa ${vehicleB.plate})`,
      authorizationReference,
      authorizedBy,
      changedByUserId: user.email,
      changedByUserName: user.name,
      effectiveDate: effDate,
    });

    // 4. Registrar entrada de historial para Vehículo B
    await tx.insert(vehiclePadronHistory).values({
      vehicleId: vehicleBId,
      previousPadron: padronB,
      newPadron: padronA,
      changeType: 'SWAP',
      relatedVehicleId: vehicleAId,
      reason: `${reason} (Intercambio con placa ${vehicleA.plate})`,
      authorizationReference,
      authorizedBy,
      changedByUserId: user.email,
      changedByUserName: user.name,
      effectiveDate: effDate,
    });

    // 5. Registrar auditoría para ambos vehículos
    await tx.insert(auditLogs).values([
      {
        vehicleId: vehicleAId,
        padronNumber: padronB,
        entity: 'PADRON',
        entityId: String(vehicleAId),
        action: 'PADRON_SWAP',
        fieldName: 'N.º de Padrón',
        oldValue: padronA,
        newValue: padronB,
        reason: `Intercambiado con Vehículo #${vehicleBId} (Placa ${vehicleB.plate}): ${reason}`,
        userEmail: user.email,
        userName: user.name,
      },
      {
        vehicleId: vehicleBId,
        padronNumber: padronA,
        entity: 'PADRON',
        entityId: String(vehicleBId),
        action: 'PADRON_SWAP',
        fieldName: 'N.º de Padrón',
        oldValue: padronB,
        newValue: padronA,
        reason: `Intercambiado con Vehículo #${vehicleAId} (Placa ${vehicleA.plate}): ${reason}`,
        userEmail: user.email,
        userName: user.name,
      },
    ]);

    return {
      success: true,
      vehicleA: {
        id: vehicleAId,
        plate: vehicleA.plate,
        previousPadron: padronA,
        newPadron: padronB,
      },
      vehicleB: {
        id: vehicleBId,
        plate: vehicleB.plate,
        previousPadron: padronB,
        newPadron: padronA,
      },
      effectiveDate: effDate,
    };
  });
}

// 3. Consultar historial de padrón de un vehículo
export async function getVehiclePadronHistoryList(vehicleId: number) {
  const history = await db.query.vehiclePadronHistory.findMany({
    where: eq(vehiclePadronHistory.vehicleId, vehicleId),
    with: {
      relatedVehicle: true,
    },
    orderBy: [desc(vehiclePadronHistory.createdAt)],
  });

  return history.map((item) => ({
    id: item.id,
    vehicleId: item.vehicleId,
    previousPadron: item.previousPadron,
    newPadron: item.newPadron,
    changeType: item.changeType as any,
    relatedVehicleId: item.relatedVehicleId,
    relatedVehiclePlate: item.relatedVehicle?.plate || null,
    relatedVehiclePadron: item.relatedVehicle?.padronNumber || null,
    reason: item.reason,
    authorizationReference: item.authorizationReference,
    authorizedBy: item.authorizedBy,
    changedByUserId: item.changedByUserId,
    changedByUserName: item.changedByUserName,
    effectiveDate: item.effectiveDate,
    createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString(),
  }));
}

// 4. Crear solicitud de cambio de padrón (para operadores)
export async function createPadronChangeRequest(params: {
  sourceVehicleId: number;
  targetVehicleId?: number | null;
  requestedPadron: string;
  requestType: 'CHANGE' | 'SWAP';
  reason: string;
  user: UserContext;
}) {
  const [created] = await db
    .insert(padronChangeRequests)
    .values({
      sourceVehicleId: params.sourceVehicleId,
      targetVehicleId: params.targetVehicleId || null,
      requestedPadron: params.requestedPadron.trim().toUpperCase(),
      requestType: params.requestType,
      status: 'PENDIENTE',
      reason: params.reason.trim(),
      requestedByName: params.user.name,
      requestedByEmail: params.user.email,
    })
    .returning();

  return created;
}

// 5. Listar solicitudes de cambio de padrón
export async function listPadronChangeRequests() {
  const list = await db.query.padronChangeRequests.findMany({
    with: {
      sourceVehicle: true,
      targetVehicle: true,
    },
    orderBy: [desc(padronChangeRequests.createdAt)],
  });

  return list.map((r) => ({
    id: r.id,
    sourceVehicleId: r.sourceVehicleId,
    sourceVehiclePadron: r.sourceVehicle?.padronNumber || 'N/A',
    sourceVehiclePlate: r.sourceVehicle?.plate || 'N/A',
    targetVehicleId: r.targetVehicleId,
    targetVehiclePadron: r.targetVehicle?.padronNumber || null,
    targetVehiclePlate: r.targetVehicle?.plate || null,
    requestedPadron: r.requestedPadron,
    requestType: r.requestType as 'CHANGE' | 'SWAP',
    status: r.status as any,
    reason: r.reason,
    requestedByName: r.requestedByName,
    requestedByEmail: r.requestedByEmail,
    reviewedByName: r.reviewedByName,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
  }));
}

// 6. Revisar solicitud de cambio de padrón (Aprobar/Rechazar por Administrador)
export async function reviewPadronChangeRequest(params: {
  requestId: number;
  approved: boolean;
  rejectionReason?: string;
  user: UserContext;
}) {
  const { requestId, approved, rejectionReason, user } = params;

  const request = await db.query.padronChangeRequests.findFirst({
    where: eq(padronChangeRequests.id, requestId),
    with: {
      sourceVehicle: true,
      targetVehicle: true,
    },
  });

  if (!request) {
    throw new Error('Solicitud no encontrada.');
  }
  if (request.status !== 'PENDIENTE') {
    throw new Error(`Esta solicitud ya fue procesada con estado "${request.status}".`);
  }

  if (!approved) {
    await db
      .update(padronChangeRequests)
      .set({
        status: 'RECHAZADA',
        reviewedByName: user.name,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason || 'Rechazada por la administración.',
      })
      .where(eq(padronChangeRequests.id, requestId));

    return { success: true, status: 'RECHAZADA' };
  }

  // Si fue aprobada, ejecutar el cambio correspondiente
  if (request.requestType === 'CHANGE') {
    await changeVehiclePadron({
      vehicleId: request.sourceVehicleId,
      newPadron: request.requestedPadron,
      reason: `Aprobación de Solicitud #${requestId}: ${request.reason}`,
      authorizationReference: `Solicitud #${requestId}`,
      authorizedBy: user.name,
      user,
    });
  } else if (request.requestType === 'SWAP' && request.targetVehicleId) {
    await swapVehiclesPadron({
      vehicleAId: request.sourceVehicleId,
      vehicleBId: request.targetVehicleId,
      reason: `Aprobación de Solicitud #${requestId}: ${request.reason}`,
      authorizationReference: `Solicitud #${requestId}`,
      authorizedBy: user.name,
      user,
    });
  }

  await db
    .update(padronChangeRequests)
    .set({
      status: 'EJECUTADA',
      reviewedByName: user.name,
      reviewedAt: new Date(),
    })
    .where(eq(padronChangeRequests.id, requestId));

  return { success: true, status: 'EJECUTADA' };
}
