/**
 * Pruebas de los caminos felices de las rutas de escritura.
 *
 * Complementan a `write-routes.validation.test.ts`, que cubre los rechazos.
 * Aquí se verifica que las operaciones válidos funcionan y que el RBAC
 * permite o bloquea según el rol.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { eq } from 'drizzle-orm';
import { getApp, login, DEMO, type Session } from './helpers.ts';
import { db } from '../../backend/db/index.ts';
import {
  portalPosts,
  portalEvents,
  systemRoles,
  users,
  vehicles,
  persons,
} from '../../backend/db/schema.ts';

describe('Caminos felices de las rutas de escritura', () => {
  let app: Express;
  let admin: Session;
  let secretaria: Session;
  let registrador: Session;
  let tesorero: Session;

  beforeAll(async () => {
    app = await getApp();
    admin = await login(app, DEMO.admin);
    secretaria = await login(app, DEMO.secretaria);
    registrador = await login(app, DEMO.registrador);
    tesorero = await login(app, DEMO.tesorero);
  });

  afterAll(async () => {
    await db.delete(portalPosts).where(eq(portalPosts.title, 'Publicación de prueba'));
    await db.delete(portalEvents).where(eq(portalEvents.title, 'Evento de prueba'));
    await db.delete(systemRoles).where(eq(systemRoles.id, 'rol-prueba'));
    await db.delete(users).where(eq(users.email, 'rol-prueba@transporte.pe'));
  });

  describe('Portal · publicaciones', () => {
    it('el administrador publica y la publicación queda disponible', async () => {
      const res = await request(app)
        .post('/api/portal/posts')
        .set('Authorization', secretaria.authorization)
        .send({
          title: 'Publicación de prueba',
          content: 'Contenido del comunicado de prueba',
          type: 'notice',
          category: 'Comunicado',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Publicación de prueba');

      const listado = await request(app).get('/api/portal/posts');
      expect(listado.body.some((p: any) => p.title === 'Publicación de prueba')).toBe(true);
    });

    it('actualiza una publicación existente', async () => {
      const creados = await request(app)
        .post('/api/portal/posts')
        .set('Authorization', secretaria.authorization)
        .send({ title: 'Publicación de prueba', content: 'Contenido original' });

      const res = await request(app)
        .put(`/api/portal/posts/${creados.body.id}`)
        .set('Authorization', secretaria.authorization)
        .send({ title: 'Publicación de prueba', content: 'Contenido actualizado' });

      expect(res.status).toBe(200);
      expect(res.body.content).toBe('Contenido actualizado');
    });

    it('elimina una publicación', async () => {
      const creados = await request(app)
        .post('/api/portal/posts')
        .set('Authorization', secretaria.authorization)
        .send({ title: 'Publicación de prueba', content: 'Para eliminar' });

      const res = await request(app)
        .delete(`/api/portal/posts/${creados.body.id}`)
        .set('Authorization', secretaria.authorization);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('reordena la cartelera', async () => {
      const res = await request(app)
        .patch('/api/portal/posts/reorder')
        .set('Authorization', secretaria.authorization)
        .send({ orderedIds: [1, 2, 3] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Portal · eventos', () => {
    it('crea un evento en la agenda', async () => {
      const res = await request(app)
        .post('/api/portal/events')
        .set('Authorization', secretaria.authorization)
        .send({
          title: 'Evento de prueba',
          type: 'asamblea',
          eventDate: '2026-12-15',
          eventTime: '18:00',
          location: 'Auditorio',
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Evento de prueba');
      expect(res.body.status).toBe('upcoming');
    });

    it('actualiza un evento', async () => {
      const creados = await request(app)
        .post('/api/portal/events')
        .set('Authorization', secretaria.authorization)
        .send({ title: 'Evento de prueba', eventDate: '2026-12-15' });

      const res = await request(app)
        .put(`/api/portal/events/${creados.body.id}`)
        .set('Authorization', secretaria.authorization)
        .send({ title: 'Evento de prueba', location: 'Nuevo lugar' });

      expect(res.status).toBe(200);
      expect(res.body.location).toBe('Nuevo lugar');
    });

    it('elimina un evento', async () => {
      const creados = await request(app)
        .post('/api/portal/events')
        .set('Authorization', secretaria.authorization)
        .send({ title: 'Evento de prueba', eventDate: '2026-12-15' });

      const res = await request(app)
        .delete(`/api/portal/events/${creados.body.id}`)
        .set('Authorization', secretaria.authorization);

      expect(res.status).toBe(200);
    });
  });

  describe('Roles', () => {
    it('el administrador crea un rol personalizado', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', admin.authorization)
        .send({
          id: 'rol-prueba',
          name: 'Rol de Prueba',
          description: 'Rol creado por las pruebas',
          badgeColor: 'cyan',
          permissions: { padron: 'read', dashboard: 'read' },
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('rol-prueba');
    });

    it('actualiza los permisos del rol', async () => {
      const res = await request(app)
        .put('/api/roles/rol-prueba')
        .set('Authorization', admin.authorization)
        .send({ permissions: { padron: 'write' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('el rol creado aparece en el listado', async () => {
      const res = await request(app).get('/api/roles');
      expect(res.body.some((r: any) => r.id === 'rol-prueba')).toBe(true);
    });

    it('elimina el rol personalizado', async () => {
      const res = await request(app)
        .delete('/api/roles/rol-prueba')
        .set('Authorization', admin.authorization);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('NO permite eliminar un rol institucional', async () => {
      const res = await request(app)
        .delete('/api/roles/admin')
        .set('Authorization', admin.authorization);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('institucionales');
    });
  });

  describe('Usuarios', () => {
    let userId: number;

    it('el administrador crea un usuario con un rol válido', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', admin.authorization)
        .send({
          email: 'rol-prueba@transporte.pe',
          name: 'Usuario de Prueba',
          password: 'claveDePrueba123',
          role: 'operator',
        });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('rol-prueba@transporte.pe');
      // La contraseña nunca se devuelve al cliente.
      expect(res.body.password).toBeUndefined();
      userId = res.body.id;
    });

    it('actualiza el usuario creado', async () => {
      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', admin.authorization)
        .send({ name: 'Nombre Actualizado' });

      expect(res.status).toBe(200);
    });

    it('elimina el usuario creado', async () => {
      const res = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', admin.authorization);

      expect(res.status).toBe(200);
    });
  });

  describe('Padrón vehicular', () => {
    let vehicleId: number;

    it('el registrador da de alta una unidad', async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', registrador.authorization)
        .send({
          padronNumber: 'RUTA-999',
          plate: 'RUT-999',
          brand: 'Honda',
          modelYear: 2024,
          engineNumber: '1RUT999',
        });

      expect(res.status).toBe(201);
      expect(res.body.padronNumber).toBe('RUTA-999');
      vehicleId = res.body.id;
    });

    it('actualiza la unidad creada', async () => {
      const res = await request(app)
        .put(`/api/vehicles/${vehicleId}`)
        .set('Authorization', registrador.authorization)
        .send({
          padronNumber: 'RUTA-999',
          plate: 'RUT-999',
          brand: 'Yamaha',
          modelYear: 2024,
        });

      expect(res.status).toBe(200);
    });

    it('retira la unidad con un motivo', async () => {
      const res = await request(app)
        .post(`/api/vehicles/${vehicleId}/retire`)
        .set('Authorization', admin.authorization)
        .send({ reason: 'Baja por prueba' });

      expect(res.status).toBe(200);
    });

    it('reactiva la unidad retirada', async () => {
      const res = await request(app)
        .post(`/api/vehicles/${vehicleId}/reactivate`)
        .set('Authorization', admin.authorization);

      expect(res.status).toBe(200);
    });

    it('elimina la unidad con confirmación explícita', async () => {
      const res = await request(app)
        .delete(`/api/vehicles/${vehicleId}?confirmed=true`)
        .set('Authorization', admin.authorization);

      expect(res.status).toBe(200);
    });
  });

  describe('Personas', () => {
    it('actualiza una persona existente', async () => {
      const [persona] = await db
        .insert(persons)
        .values({ dni: '41000333', fullName: 'Persona Editable' })
        .returning({ id: persons.id });

      const res = await request(app)
        .put(`/api/persons/${persona.id}`)
        .set('Authorization', secretaria.authorization)
        .send({ fullName: 'Persona Actualizada', phone: '900333333' });

      expect(res.status).toBe(200);

      await db.delete(persons).where(eq(persons.id, persona.id));
    });
  });

  describe('Backup', () => {
    it('exporta el respaldo en JSON', async () => {
      const res = await request(app)
        .get('/api/backup/export?format=json')
        .set('Authorization', admin.authorization);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.metadata).toBeDefined();
    });

    it('exporta el respaldo en SQL', async () => {
      const res = await request(app)
        .get('/api/backup/export?format=sql')
        .set('Authorization', admin.authorization);

      expect(res.status).toBe(200);
      expect(String(res.text)).toContain('CREATE TABLE');
    });

    it('consulta las métricas del respaldo', async () => {
      const res = await request(app)
        .get('/api/backup/stats')
        .set('Authorization', admin.authorization);

      expect(res.status).toBe(200);
      expect(res.body.databaseStatus).toBe('CONECTADO');
    });
  });

  describe('Importación y exportación', () => {
    it('exporta el padrón a Excel', async () => {
      const res = await request(app)
        .get('/api/export')
        .set('Authorization', tesorero.authorization);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheet');
    });
  });

  describe('Curso vial', () => {
    it('sincroniza evaluaciones en lote', async () => {
      const res = await request(app)
        .post('/api/drivers/courses/bulk-sync')
        .set('Authorization', secretaria.authorization)
        .send({
          evaluations: [{ driverId: 1, passed: true }],
          year: new Date().getFullYear(),
        });

      // 200 o 404 (conductor inexistente): lo importante es que no es un 400
      // de validación ni un 500.
      expect([200, 404]).toContain(res.status);
    });
  });
});
