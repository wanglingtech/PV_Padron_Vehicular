/**
 * Health check y configuración de entorno del backend.
 */

import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { getApp } from './helpers.ts';

describe('GET /api/health', () => {
  it('responde 200 con la base de datos conectada', async () => {
    const app = await getApp();
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('up');
    expect(response.body.target).toContain('padron_vehicular_test');
  });

  it('devuelve una marca de tiempo en formato ISO', async () => {
    const app = await getApp();
    const response = await request(app).get('/api/health');

    expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
  });
});
