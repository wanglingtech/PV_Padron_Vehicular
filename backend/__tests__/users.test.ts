/**
 * Gestión de usuarios: RBAC, validación y protección de las contraseñas.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import type { Express } from 'express';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { DEMO, getApp, login } from './helpers.ts';

/** Correo de la cuenta temporal que crea cada test. */
const TEMP_EMAIL = 'test.temporal@transporte.pe';

describe('Usuarios del sistema', () => {
  let app: Express;

  beforeAll(async () => {
    app = await getApp();
  });

  afterEach(async () => {
    // Se borra la cuenta temporal para no dejar rastro entre tests.
    await db.delete(users).where(eq(users.email, TEMP_EMAIL));
  });

  describe('GET /api/users', () => {
    it('el administrador lista los usuarios sin exponer contraseñas', async () => {
      const session = await login(app, DEMO.admin);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', session.authorization);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      for (const user of response.body) {
        expect(user.password).toBeUndefined();
        expect(user).not.toHaveProperty('passwordHash');
        expect(JSON.stringify(user)).not.toContain('$argon2');
      }
    });

    it('el operario NO puede listar usuarios', async () => {
      const session = await login(app, DEMO.operator);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', session.authorization);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Permiso denegado');
    });

    it('exige sesión activa', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/users', () => {
    it('el administrador crea un usuario y la respuesta no incluye el hash', async () => {
      const session = await login(app, DEMO.admin);

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', session.authorization)
        .send({
          email: TEMP_EMAIL,
          name: 'Usuario Temporal',
          role: 'operator',
          password: 'clave-temporal-123',
        });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe(TEMP_EMAIL);
      expect(response.body.password).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain('$argon2');
    });

    it('rechaza contraseñas de menos de 8 caracteres', async () => {
      const session = await login(app, DEMO.admin);

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', session.authorization)
        .send({ email: TEMP_EMAIL, name: 'Usuario Temporal', password: 'corta' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('8 caracteres');
    });

    it('exige correo y nombre', async () => {
      const session = await login(app, DEMO.admin);

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', session.authorization)
        .send({ password: 'clave-temporal-123' });

      expect(response.status).toBe(400);
    });

    it('el operario NO puede crear usuarios', async () => {
      const session = await login(app, DEMO.operator);

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', session.authorization)
        .send({
          email: TEMP_EMAIL,
          name: 'Usuario Temporal',
          password: 'clave-temporal-123',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('el administrador actualiza los datos del usuario', async () => {
      const session = await login(app, DEMO.admin);

      const created = await request(app)
        .post('/api/users')
        .set('Authorization', session.authorization)
        .send({
          email: TEMP_EMAIL,
          name: 'Usuario Temporal',
          role: 'operator',
          password: 'clave-temporal-123',
        });
      expect(created.status).toBe(201);

      const response = await request(app)
        .put(`/api/users/${created.body.id}`)
        .set('Authorization', session.authorization)
        .send({ name: 'Usuario Renombrado' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const [row] = await db.select().from(users).where(eq(users.email, TEMP_EMAIL));
      expect(row.name).toBe('Usuario Renombrado');
    });

    it('rechaza una nueva contraseña demasiado corta', async () => {
      const session = await login(app, DEMO.admin);

      const created = await request(app)
        .post('/api/users')
        .set('Authorization', session.authorization)
        .send({
          email: TEMP_EMAIL,
          name: 'Usuario Temporal',
          password: 'clave-temporal-123',
        });

      const response = await request(app)
        .put(`/api/users/${created.body.id}`)
        .set('Authorization', session.authorization)
        .send({ password: '123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('8 caracteres');
    });

    it('el operario NO puede actualizar usuarios', async () => {
      const session = await login(app, DEMO.operator);

      const response = await request(app)
        .put('/api/users/1')
        .set('Authorization', session.authorization)
        .send({ name: 'Intruso' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('el administrador elimina un usuario', async () => {
      const session = await login(app, DEMO.admin);

      const created = await request(app)
        .post('/api/users')
        .set('Authorization', session.authorization)
        .send({
          email: TEMP_EMAIL,
          name: 'Usuario Temporal',
          password: 'clave-temporal-123',
        });

      const response = await request(app)
        .delete(`/api/users/${created.body.id}`)
        .set('Authorization', session.authorization);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const rows = await db.select().from(users).where(eq(users.email, TEMP_EMAIL));
      expect(rows.length).toBe(0);
    });

    it('el operario NO puede eliminar usuarios', async () => {
      const session = await login(app, DEMO.operator);

      const response = await request(app)
        .delete('/api/users/1')
        .set('Authorization', session.authorization);

      expect(response.status).toBe(403);
    });
  });
});
