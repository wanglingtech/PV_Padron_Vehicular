/**
 * Padrón vehicular: lectura, validaciones Zod y permisos de escritura.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import type { Express } from 'express';
import { db } from '../db/index.ts';
import { vehicles } from '../db/schema.ts';
import { DEMO, getApp, login } from './helpers.ts';

/** Número de padrón de la unidad de prueba. */
const TEST_PADRON = 'TEST-01';

describe('Padrón vehicular', () => {
  let app: Express;
  let vehicleId: number | null = null;

  beforeAll(async () => {
    app = await getApp();
  });

  afterAll(async () => {
    if (vehicleId) {
      await db.delete(vehicles).where(eq(vehicles.padronNumber, TEST_PADRON));
    }
  });

  describe('GET /api/vehicles', () => {
    it('devuelve el listado paginado', async () => {
      const response = await request(app).get('/api/vehicles');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.vehicles)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });

    it('acepta filtros de búsqueda y paginación', async () => {
      const response = await request(app).get('/api/vehicles?search=ZZZ&page=1&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.vehicles.length).toBeLessThanOrEqual(5);
    });

    it('devuelve 404 para un vehículo inexistente', async () => {
      const response = await request(app).get('/api/vehicles/999999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Vehículo no encontrado');
    });

    it('devuelve 400 para un identificador no numérico', async () => {
      const response = await request(app).get('/api/vehicles/abc');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID de vehículo inválido');
    });
  });

  describe('POST /api/vehicles', () => {
    it('rechaza el registro sin sesión con 401', async () => {
      const response = await request(app)
        .post('/api/vehicles')
        .send({ padronNumber: TEST_PADRON, plate: 'TST-123', brand: 'TEST', modelYear: 2024 });

      expect(response.status).toBe(401);
    });

    it('el operario NO puede registrar unidades', async () => {
      const session = await login(app, DEMO.operator);

      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', session.authorization)
        .send({ padronNumber: TEST_PADRON, plate: 'TST-123', brand: 'TEST', modelYear: 2024 });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Permiso denegado');
    });

    it('el administrador recibe 400 si los datos no pasan el esquema Zod', async () => {
      const session = await login(app, DEMO.admin);

      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', session.authorization)
        .send({ padronNumber: '', plate: 'AB', brand: '', modelYear: 1950 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    it('el administrador registra una unidad válida', async () => {
      const session = await login(app, DEMO.admin);

      const response = await request(app)
        .post('/api/vehicles')
        .set('Authorization', session.authorization)
        .send({
          padronNumber: TEST_PADRON,
          plate: 'TST-123',
          brand: 'TEST',
          modelYear: 2024,
          owners: [{ fullName: 'Propietario de Prueba', dni: '12345678' }],
        });

      expect(response.status).toBe(201);
      expect(response.body.padronNumber).toBe(TEST_PADRON);
      vehicleId = response.body.id;

      // La unidad recién creada aparece en el listado.
      const listed = await request(app).get(`/api/vehicles?search=${TEST_PADRON}`);
      expect(listed.body.vehicles.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/vehicles/:id', () => {
    it('el operario NO puede eliminar unidades', async () => {
      const session = await login(app, DEMO.operator);

      const response = await request(app)
        .delete('/api/vehicles/1')
        .set('Authorization', session.authorization);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/vehicles/:id/retire', () => {
    it('rechaza un motivo de retiro inválido con 400', async () => {
      const session = await login(app, DEMO.admin);

      const response = await request(app)
        .post(`/api/vehicles/${vehicleId ?? 1}/retire`)
        .set('Authorization', session.authorization)
        .send({ reason: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });
});
