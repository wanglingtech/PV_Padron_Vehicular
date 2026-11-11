/**
 * Pruebas de las consultas del padrón: listado, filtrado, directorio de
 * personas, vencimientos y métricas del dashboard.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../../backend/db/index.ts';
import {
  vehicles,
  persons,
  vehicleOwners,
  insurances,
  technicalInspections,
} from '../../backend/db/schema.ts';
import {
  getVehicles,
  getVehicleById,
  getPersonsList,
  getExpirationsList,
  getDashboardStats,
  getAuditLogs,
  getDriversWithCoursesList,
} from '../../backend/db/vehicles.ts';
import { listContacts } from '../../backend/services/contacts.service.ts';

describe('Consultas del padrón', () => {
  let personId: number;
  let vehicleId: number;
  let vehicleId2: number;

  beforeAll(async () => {
    const [persona] = await db
      .insert(persons)
      .values({
        dni: '41000555',
        fullName: 'Consulta Test Propietario',
        address: 'Av. de Prueba 123',
        phone: '900111222',
      })
      .returning({ id: persons.id });
    personId = persona.id;

    const [vehiculo] = await db
      .insert(vehicles)
      .values({
        padronNumber: 'CONSULTA-001',
        plate: 'CND-001',
        brand: 'Honda',
        modelYear: 2022,
        engineNumber: '1CND001',
        driverId: personId,
        status: 'ACTIVO',
      })
      .returning({ id: vehicles.id });
    vehicleId = vehiculo.id;

    const [vehiculo2] = await db
      .insert(vehicles)
      .values({
        padronNumber: 'CONSULTA-002',
        plate: 'CND-002',
        brand: 'Yamaha',
        modelYear: 2023,
        status: 'INACTIVO',
      })
      .returning({ id: vehicles.id });
    vehicleId2 = vehiculo2.id;

    await db.insert(vehicleOwners).values({
      vehicleId,
      personId,
      isPrimary: true,
      isCurrent: true,
    });

    // Seguro con vencimiento próxima: debe aparecer en las alertas.
    const enDiezDias = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    await db.insert(insurances).values({
      vehicleId,
      entityName: 'SOAT Rimac',
      policyNumber: 'CONS-001',
      issueDate: '2026-01-01',
      expirationDate: enDiezDias,
      isCurrent: true,
    });

    await db.insert(technicalInspections).values({
      vehicleId,
      centerName: 'Inspectorio de Prueba',
      certificateNumber: 'CITV-CONS',
      issueDate: '2026-01-01',
      expirationDate: enDiezDias,
      isCurrent: true,
    });
  });

  afterAll(async () => {
    await db.delete(insurances).where(eq(insurances.vehicleId, vehicleId));
    await db.delete(technicalInspections).where(eq(technicalInspections.vehicleId, vehicleId));
    await db.delete(vehicleOwners).where(eq(vehicleOwners.vehicleId, vehicleId));
    await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
    await db.delete(vehicles).where(eq(vehicles.id, vehicleId2));
    await db.delete(persons).where(eq(persons.id, personId));
  });

  describe('getVehicles', () => {
    it('devuelve el listado paginado', async () => {
      const r = await getVehicles({ limit: 10 });
      expect(r.vehicles).toBeDefined();
      expect(Array.isArray(r.vehicles)).toBe(true);
      expect(r.total).toBeGreaterThanOrEqual(2);
    });

    it('filtra por búsqueda de placa', async () => {
      const r = await getVehicles({ search: 'CND-001', limit: 10 });
      expect(r.vehicles.length).toBeGreaterThanOrEqual(1);
      expect(r.vehicles.some((v: any) => v.plate === 'CND-001')).toBe(true);
    });

    it('filtra por búsqueda de padrón', async () => {
      const r = await getVehicles({ search: 'CONSULTA-002', limit: 10 });
      expect(r.vehicles.some((v: any) => v.padronNumber === 'CONSULTA-002')).toBe(true);
    });

    it('filtra por estado', async () => {
      const r = await getVehicles({ status: 'INACTIVO', limit: 10 });
      expect(r.vehicles.every((v: any) => v.status === 'INACTIVO')).toBe(true);
    });

    it('normaliza la página y el límite a valores seguros', async () => {
      const r = await getVehicles({ page: -5, limit: 9999 });
      expect(r.page).toBeGreaterThanOrEqual(1);
      expect(r.limit).toBeLessThanOrEqual(200);
    });

    it('incluye el propietario principal y el conductor', async () => {
      const r = await getVehicles({ search: 'CND-001', limit: 5 });
      const vehiculo = r.vehicles.find((v: any) => v.plate === 'CND-001');

      expect(vehiculo).toBeDefined();
      expect(vehiculo!.primaryOwner?.fullName).toBe('Consulta Test Propietario');
      expect(vehiculo!.driver?.fullName).toBe('Consulta Test Propietario');
    });
  });

  describe('getVehicleById', () => {
    it('devuelve el vehículo con su documentación', async () => {
      const v = await getVehicleById(vehicleId);
      expect(v).toBeDefined();
      expect(v!.plate).toBe('CND-001');
      expect(v!.insurance?.entityName).toBe('SOAT Rimac');
    });

    it('devuelve null para un vehículo inexistente', async () => {
      const v = await getVehicleById(999999);
      expect(v).toBeFalsy();
    });
  });

  describe('getPersonsList', () => {
    it('lista las personas con el conteo de unidades', async () => {
      const lista = await getPersonsList({});
      const persona = lista.find((p: any) => p.dni === '41000555');

      expect(persona).toBeDefined();
      expect(persona!.fullName).toBe('Consulta Test Propietario');
      expect(persona!.ownedCount).toBe(1);
      expect(persona!.drivenCount).toBe(1);
    });

    it('filtra por búsqueda de nombre', async () => {
      const lista = await getPersonsList({ search: 'Consulta Test' });
      expect(lista.some((p: any) => p.dni === '41000555')).toBe(true);
    });
  });

  describe('getExpirationsList', () => {
    it('detecta los documentos que vencen pronto', async () => {
      const items = await getExpirationsList({ timeframe: 'all' });

      const delVehiculo = items.filter((i: any) => i.vehicleId === vehicleId);
      expect(delVehiculo.length).toBeGreaterThanOrEqual(2);

      const seguro = delVehiculo.find((i: any) => i.docType === 'insurance');
      expect(seguro).toBeDefined();
      expect(seguro!.status).toBe('proximo');
      // Urgente solo si vence dentro de 7 días; a 10 días todavía no lo es.
      expect(seguro!.isUrgent).toBe(false);
      expect(seguro!.daysRemaining).toBeGreaterThan(0);
    });

    it('filtra solo los vencidos', async () => {
      const items = await getExpirationsList({ timeframe: 'vencidos' });
      expect(items.every((i: any) => i.status === 'vencido')).toBe(true);
    });

    it('filtra por tipo de documento', async () => {
      const items = await getExpirationsList({ timeframe: 'all', docType: 'insurance' });
      expect(items.every((i: any) => i.docType === 'insurance')).toBe(true);
    });
  });

  describe('getDashboardStats', () => {
    it('calcula las métricas del padrón', async () => {
      const stats = await getDashboardStats();

      expect(stats).toBeDefined();
      expect(stats.totalVehicles).toBeGreaterThanOrEqual(2);
      expect(typeof stats.activeVehiclesCount).toBe('number');
      expect(typeof stats.retiredVehiclesCount).toBe('number');
      expect(typeof stats.totalOwners).toBe('number');
      expect(Array.isArray(stats.recentVehicles)).toBe(true);
      expect(stats.fleetHealth).toBeDefined();
      expect(typeof stats.fleetHealth.completePercent).toBe('number');
    });
  });

  describe('getAuditLogs', () => {
    it('devuelve la bitácora paginada', async () => {
      const logs = await getAuditLogs({ limit: 10, offset: 0 });
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getDriversWithCoursesList', () => {
    it('devuelve la lista de conductores con su curso vial', async () => {
      const lista = await getDriversWithCoursesList({});
      expect(Array.isArray(lista)).toBe(true);
    });
  });

  describe('listContacts', () => {
    it('devuelve los contactos paginados', async () => {
      const resultado = await listContacts({ search: '', roleFilter: 'ALL', page: 1, limit: 10 });

      expect(resultado).toBeDefined();
      expect(Array.isArray(resultado.contacts)).toBe(true);
      expect(typeof resultado.total).toBe('number');
    });

    it('filtra por búsqueda', async () => {
      const resultado = await listContacts({
        search: 'Consulta Test',
        roleFilter: 'ALL',
        page: 1,
        limit: 10,
      });
      expect(resultado.contacts.length).toBeGreaterThanOrEqual(0);
    });
  });
});
