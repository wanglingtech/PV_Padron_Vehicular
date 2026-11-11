/**
 * Pruebas de la lógica de cambio e intercambio de padrón.
 *
 * Es la parte más delicada del sistema: el número de padrón es la identidad
 * de una unidad y un canje mal hecho corrompe el padrón completo.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../../backend/db/index.ts';
import {
  vehiclePadronHistory,
  vehicles,
  padronChangeRequests,
} from '../../backend/db/schema.ts';
import {
  changeVehiclePadron,
  swapVehiclesPadron,
  createPadronChangeRequest,
  listPadronChangeRequests,
  reviewPadronChangeRequest,
  getVehiclePadronHistoryList,
} from '../../backend/db/padron-changes.ts';

const USUARIO = {
  email: 'admin@transporte.pe',
  name: 'Administrador de Prueba',
  role: 'admin',
};

describe('Cambio e intercambio de padrón', () => {
  let vehicleA: number;
  let vehicleB: number;

  beforeAll(async () => {
    const [a] = await db
      .insert(vehicles)
      .values({
        padronNumber: 'TEST-A-001',
        plate: 'TST-A-001',
        brand: 'Honda',
        modelYear: 2020,
      })
      .returning({ id: vehicles.id });

    const [b] = await db
      .insert(vehicles)
      .values({
        padronNumber: 'TEST-B-002',
        plate: 'TST-B-002',
        brand: 'Yamaha',
        modelYear: 2021,
      })
      .returning({ id: vehicles.id });

    vehicleA = a.id;
    vehicleB = b.id;
  });

  afterAll(async () => {
    await db.delete(vehiclePadronHistory).where(eq(vehiclePadronHistory.vehicleId, vehicleA));
    await db.delete(vehiclePadronHistory).where(eq(vehiclePadronHistory.vehicleId, vehicleB));
    await db.delete(padronChangeRequests).where(eq(padronChangeRequests.sourceVehicleId, vehicleA));
    await db.delete(vehicles).where(eq(vehicles.id, vehicleA));
    await db.delete(vehicles).where(eq(vehicles.id, vehicleB));
  });

  describe('changeVehiclePadron', () => {
    it('asigna un padrón libre y conserva el id del vehículo', async () => {
      const res = await changeVehiclePadron({
        vehicleId: vehicleA,
        newPadron: 'TEST-NUEVO-100',
        reason: 'Cambio de titular',
        user: USUARIO,
      });

      expect(res).toBeDefined();
      const [actualizado] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleA));
      // El id nunca cambia: es la identidad permanente de la unidad.
      expect(actualizado.id).toBe(vehicleA);
      expect(actualizado.padronNumber).toBe('TEST-NUEVO-100');
    });

    it('normaliza el padrón a mayúsculas', async () => {
      await changeVehiclePadron({
        vehicleId: vehicleA,
        newPadron: '  test-min-200  ',
        reason: 'Prueba de normalización',
        user: USUARIO,
      });

      const [actualizado] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleA));
      expect(actualizado.padronNumber).toBe('TEST-MIN-200');
    });

    it('registra el cambio en el historial', async () => {
      await changeVehiclePadron({
        vehicleId: vehicleA,
        newPadron: 'TEST-HIST-300',
        reason: 'Cambio con historial',
        authorizationReference: 'RES-2026-001',
        authorizedBy: 'Gerencia',
        user: USUARIO,
      });

      const historial = await getVehiclePadronHistoryList(vehicleA);
      expect(historial.length).toBeGreaterThan(0);
      const ultimo = historial[0];
      expect(ultimo.newPadron).toBe('TEST-HIST-300');
    });

    it('rechaza un padrón ya ocupado por otro vehículo', async () => {
      await expect(
        changeVehiclePadron({
          vehicleId: vehicleA,
          newPadron: 'TEST-B-002', // pertenece al vehículo B
          reason: 'Intento de robo de padrón',
          user: USUARIO,
        })
      ).rejects.toThrow(/ya pertenece al vehículo/);
    });

    it('rechaza un vehículo inexistente', async () => {
      await expect(
        changeVehiclePadron({
          vehicleId: 999999,
          newPadron: 'TEST-INEXISTENTE',
          reason: 'Prueba',
          user: USUARIO,
        })
      ).rejects.toThrow(/no fue encontrado/);
    });

    it('rechaza un padrón vacío', async () => {
      await expect(
        changeVehiclePadron({
          vehicleId: vehicleA,
          newPadron: '   ',
          reason: 'Prueba',
          user: USUARIO,
        })
      ).rejects.toThrow(/no puede estar vacío/);
    });

    it('rechaza asignar el mismo padrón que ya tiene', async () => {
      const [actual] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleA));

      await expect(
        changeVehiclePadron({
          vehicleId: vehicleA,
          newPadron: actual.padronNumber,
          reason: 'Prueba',
          user: USUARIO,
        })
      ).rejects.toThrow(/ya tiene asignado/);
    });
  });

  describe('swapVehiclesPadron', () => {
    it('intercambia los padrón entre dos vehículos', async () => {
      const [antesA] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleA));
      const [antesB] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleB));

      await swapVehiclesPadron({
        vehicleAId: vehicleA,
        vehicleBId: vehicleB,
        reason: 'Intercambio por inoperatividad',
        authorizationReference: 'RES-2026-SWAP',
        authorizedBy: 'Gerencia General',
        user: USUARIO,
      });

      const [despuesA] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleA));
      const [despuesB] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleB));

      expect(despuesA.padronNumber).toBe(antesB.padronNumber);
      expect(despuesB.padronNumber).toBe(antesA.padronNumber);
      // Los ids siguen siendo los mismos.
      expect(despuesA.id).toBe(vehicleA);
      expect(despuesB.id).toBe(vehicleB);
    });

    it('registra el canje en el historial de ambos vehículos', async () => {
      const historialA = await getVehiclePadronHistoryList(vehicleA);
      const historialB = await getVehiclePadronHistoryList(vehicleB);

      expect(historialA.some((h: any) => h.changeType === 'SWAP')).toBe(true);
      expect(historialB.some((h: any) => h.changeType === 'SWAP')).toBe(true);
    });

    it('rechaza intercambiar un vehículo consigo mismo', async () => {
      await expect(
        swapVehiclesPadron({
          vehicleAId: vehicleA,
          vehicleBId: vehicleA,
          reason: 'Prueba inválida',
          authorizationReference: 'RES',
          authorizedBy: 'Gerencia',
          user: USUARIO,
        })
      ).rejects.toThrow(/consigo mismo/);
    });

    it('rechaza si el vehículo de destino no existe', async () => {
      await expect(
        swapVehiclesPadron({
          vehicleAId: vehicleA,
          vehicleBId: 999999,
          reason: 'Prueba inválida',
          authorizationReference: 'RES',
          authorizedBy: 'Gerencia',
          user: USUARIO,
        })
      ).rejects.toThrow(/no existe/);
    });
  });

  describe('Solicitudes de cambio de padrón', () => {
    it('crea una solicitud en estado PENDIENTE', async () => {
      const creada = await createPadronChangeRequest({
        sourceVehicleId: vehicleA,
        targetVehicleId: vehicleB,
        requestedPadron: 'TEST-SOL-400',
        requestType: 'SWAP',
        reason: 'Solicitud de intercambio',
        user: { email: 'operador@transporte.pe', name: 'Operario', role: 'operator' },
      });

      expect(creada.status).toBe('PENDIENTE');
      expect(creada.requestedPadron).toBe('TEST-SOL-400');
    });

    it('aparece en el listado con la placa de origen', async () => {
      const lista = await listPadronChangeRequests();
      const solicitud = lista.find((s: any) => s.requestedPadron === 'TEST-SOL-400');
      expect(solicitud).toBeDefined();
      expect(solicitud!.sourceVehiclePlate).toBeTruthy();
      expect(solicitud!.sourceVehiclePadron).toBeTruthy();
    });

    it('aprueba una solicitud y ejecuta el canje', async () => {
      const lista = await listPadronChangeRequests();
      const solicitud = lista.find((s: any) => s.requestedPadron === 'TEST-SOL-400');

      const [antesA] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleA));
      const [antesB] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleB));

      const resultado = await reviewPadronChangeRequest({
        requestId: solicitud!.id,
        approved: true,
        user: USUARIO,
      });

      expect(resultado).toBeDefined();

      const [despuesA] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleA));
      const [despuesB] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleB));

      // El canje se aplicó: los padrón cambiaron de lugar.
      expect(despuesA.padronNumber).toBe(antesB.padronNumber);
      expect(despuesB.padronNumber).toBe(antesA.padronNumber);
    });

    it('rechaza una solicitud con motivo', async () => {
      const creada = await createPadronChangeRequest({
        sourceVehicleId: vehicleA,
        requestedPadron: 'TEST-RECH-500',
        requestType: 'CHANGE',
        reason: 'Solicitud que se va a rechazar',
        user: { email: 'operador@transporte.pe', name: 'Operario', role: 'operator' },
      });

      const resultado = await reviewPadronChangeRequest({
        requestId: creada.id,
        approved: false,
        rejectionReason: 'No cumple el formato requerido',
        user: USUARIO,
      });

      expect(resultado).toBeDefined();
    });
  });
});
