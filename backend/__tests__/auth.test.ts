/**
 * Autenticación real: login, cookie HttpOnly, token Bearer y RBAC.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { DEMO, getApp, login } from './helpers.ts';

describe('Autenticación', () => {
  let app: Express;

  beforeAll(async () => {
    app = await getApp();
  });

  describe('POST /api/auth/login', () => {
    it('acepta credenciales correctas y devuelve token y cookie HttpOnly', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: DEMO.admin.email, password: DEMO.admin.password });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(DEMO.admin.email);
      expect(response.body.user.role).toBe('admin');
      expect(typeof response.body.token).toBe('string');

      // Nunca se devuelve la contraseña ni su hash.
      expect(response.body.user.password).toBeUndefined();

      const setCookie = response.headers['set-cookie'] as unknown as string[];
      const sessionCookie = setCookie?.find((c) => c.startsWith('padron_session='));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toMatch(/HttpOnly/i);
    });

    it('rechaza una contraseña incorrecta con 401 y un mensaje genérico', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: DEMO.admin.email, password: 'clave-incorrecta' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Correo o contraseña incorrectos.');
      expect(response.body.token).toBeUndefined();
    });

    it('rechaza un correo inexistente con 401', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nadie@transporte.pe', password: 'admin123' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Correo o contraseña incorrectos.');
    });

    it('valida el formato del correo con 400', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'correo-invalido', password: 'admin123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('correo');
    });

    it('exige la contraseña con 400', async () => {
      const response = await request(app).post('/api/auth/login').send({ email: DEMO.admin.email });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('restaura la sesión con la cookie HttpOnly', async () => {
      const session = await login(app, DEMO.admin);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', session.cookieHeader);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(DEMO.admin.email);
      expect(response.body.user.password).toBeUndefined();
    });

    it('restaura la sesión con el token Bearer', async () => {
      const session = await login(app, DEMO.operator);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', session.authorization);

      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('operator');
    });

    it('rechaza sin credenciales con 401', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('No autenticado');
    });

    it('rechaza un token manipulado con 401', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token.invalido.firmado');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('cierra la sesión y limpia la cookie', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const setCookie = response.headers['set-cookie'] as unknown as string[];
      const cleared = setCookie?.find((c) => c.startsWith('padron_session='));
      expect(cleared).toBeDefined();
      // La cookie se vacía y se marca para expirar en el pasado.
      expect(cleared).toMatch(/^padron_session=;/);
      expect(cleared).toContain('Expires=Thu, 01 Jan 1970');
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('rechaza cambiar la contraseña con la actual incorrecta', async () => {
      const session = await login(app, DEMO.operator);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', session.authorization)
        .send({ currentPassword: 'no-es-la-actual', newPassword: 'nueva-clave-123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('actual');
    });

    it('rechaza una nueva contraseña demasiado corta', async () => {
      const session = await login(app, DEMO.operator);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', session.authorization)
        .send({ currentPassword: DEMO.operator.password, newPassword: 'corta' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('8 caracteres');
    });

    it('exige sesión activa', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({ currentPassword: 'admin123', newPassword: 'nueva-clave-123' });

      expect(response.status).toBe(401);
    });
  });
});
