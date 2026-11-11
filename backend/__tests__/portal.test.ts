/**
 * Portal institucional: publicaciones y agenda de eventos.
 */

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import type { Express } from 'express';
import { db } from '../db/index.ts';
import { portalPosts } from '../db/schema.ts';
import { DEMO, getApp, login } from './helpers.ts';

/** Título de la publicación temporal que crea cada test. */
const TEMP_TITLE = 'Publicación de prueba automatizada';

describe('Portal institucional', () => {
  let app: Express;

  beforeAll(async () => {
    app = await getApp();
  });

  afterEach(async () => {
    await db.delete(portalPosts).where(eq(portalPosts.title, TEMP_TITLE));
  });

  describe('GET /api/portal/posts', () => {
    it('es público y devuelve las publicaciones sembradas', async () => {
      const response = await request(app).get('/api/portal/posts');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/portal/events', () => {
    it('es público y devuelve la agenda sembrada', async () => {
      const response = await request(app).get('/api/portal/events');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/portal/posts', () => {
    it('el operario NO puede publicar', async () => {
      const session = await login(app, DEMO.operator);

      const response = await request(app)
        .post('/api/portal/posts')
        .set('Authorization', session.authorization)
        .send({ title: TEMP_TITLE, content: 'Contenido de prueba' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Permiso denegado');
    });

    it('exige título y contenido', async () => {
      const session = await login(app, DEMO.admin);

      const response = await request(app)
        .post('/api/portal/posts')
        .set('Authorization', session.authorization)
        .send({});

      expect(response.status).toBe(400);
      // El mensaje lo produce la validación Zod: indica el campo concreto.
      expect(response.body.error).toContain('title');
      expect(response.body.details.some((d: { campo: string }) => d.campo === 'title')).toBe(true);
    });

    it('rechaza una clave desconocida en el cuerpo', async () => {
      const session = await login(app, DEMO.admin);

      const response = await request(app)
        .post('/api/portal/posts')
        .set('Authorization', session.authorization)
        .send({
          title: 'Publicación con campo inyectado',
          content: 'Contenido',
          isAdmin: true,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('el administrador publica y la publicación queda disponible', async () => {
      const session = await login(app, DEMO.admin);

      const response = await request(app)
        .post('/api/portal/posts')
        .set('Authorization', session.authorization)
        .send({ title: TEMP_TITLE, content: 'Contenido de prueba', type: 'notice' });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(TEMP_TITLE);

      const listed = await request(app).get('/api/portal/posts');
      expect(listed.body.some((p: { title: string }) => p.title === TEMP_TITLE)).toBe(true);
    });
  });

  describe('DELETE /api/portal/posts/:id', () => {
    it('el operario NO puede eliminar publicaciones', async () => {
      const session = await login(app, DEMO.operator);

      const response = await request(app)
        .delete('/api/portal/posts/1')
        .set('Authorization', session.authorization);

      expect(response.status).toBe(403);
    });
  });
});
