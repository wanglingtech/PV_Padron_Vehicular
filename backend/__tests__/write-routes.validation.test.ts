/**
 * Pruebas de las rutas de escritura: validación de entrada y RBAC.
 *
 * Cada ruta de escritura debe rechazar los datos inválidos con un 400 y
 * un mensaje que indique el campo. Estos tests son la red de seguridad del
 * endurecimiento de la Fase 1.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { getApp, login, DEMO, type Session } from './helpers.ts';

describe('Validación de las rutas de escritura', () => {
  let app: Express;
  let admin: Session;
  let operator: Session;
  let secretaria: Session;
  let registrador: Session;

  beforeAll(async () => {
    app = await getApp();
    admin = await login(app, DEMO.admin);
    operator = await login(app, DEMO.operator);
    secretaria = await login(app, DEMO.secretaria);
    registrador = await login(app, DEMO.registrador);
  });

  /* ------------------------------- Portal ------------------------------- */

  describe('POST /api/portal/posts', () => {
    it('rechaza un cuerpo vacío', async () => {
      const res = await request(app)
        .post('/api/portal/posts')
        .set('Authorization', secretaria.authorization)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    it('rechaza una URL de imagen inválida', async () => {
      const res = await request(app)
        .post('/api/portal/posts')
        .set('Authorization', secretaria.authorization)
        .send({
          title: 'Prueba de validación',
          content: 'Contenido',
          mediaUrl: 'javascript:alert(1)',
        });

      expect(res.status).toBe(400);
    });

    it('rechaza una fecha con formato incorrecto', async () => {
      const res = await request(app)
        .post('/api/portal/posts')
        .set('Authorization', secretaria.authorization)
        .send({
          title: 'Prueba de validación',
          content: 'Contenido',
          startDate: '15/06/2026',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/portal/posts/:id', () => {
    it('rechaza un identificador no numérico', async () => {
      const res = await request(app)
        .put('/api/portal/posts/abc')
        .set('Authorization', secretaria.authorization)
        .send({ title: 'Título válido' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('identificador');
    });

    it('no permite escribir campos fuera del esquema', async () => {
      const res = await request(app)
        .put('/api/portal/posts/1')
        .set('Authorization', secretaria.authorization)
        .send({ isAdmin: true, id: 999 });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/portal/events', () => {
    it('exige título y fecha', async () => {
      const res = await request(app)
        .post('/api/portal/events')
        .set('Authorization', secretaria.authorization)
        .send({ title: 'Solo título' });

      expect(res.status).toBe(400);
    });

    it('rechaza una hora con formato incorrecto', async () => {
      const res = await request(app)
        .post('/api/portal/events')
        .set('Authorization', secretaria.authorization)
        .send({
          title: 'Asamblea de prueba',
          eventDate: '2026-12-01',
          eventTime: '18 horas',
        });

      expect(res.status).toBe(400);
    });
  });

  /* ------------------------------- Usuarios ----------------------------- */

  describe('POST /api/users', () => {
    it('exige correo, nombre y contraseña', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', admin.authorization)
        .send({ email: 'nuevo@transporte.pe' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('rechaza un correo con formato inválido', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', admin.authorization)
        .send({
          email: 'no-es-correo',
          name: 'Usuario de Prueba',
          password: 'clave1234',
        });

      expect(res.status).toBe(400);
    });

    it('rechaza una contraseña corta', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', admin.authorization)
        .send({
          email: 'nuevo@transporte.pe',
          name: 'Usuario de Prueba',
          password: 'corta',
        });

      expect(res.status).toBe(400);
    });

    it('rechaza un rol que no existe en la matriz', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', admin.authorization)
        .send({
          email: 'nuevo@transporte.pe',
          name: 'Usuario de Prueba',
          password: 'clave1234',
          role: 'rol-inexistente',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('no está registrado');
    });

    it('el operario NO puede crear usuarios', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', operator.authorization)
        .send({
          email: 'nuevo@transporte.pe',
          name: 'Usuario de Prueba',
          password: 'clave1234',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('rechaza un identificador no numérico', async () => {
      const res = await request(app)
        .put('/api/users/abc')
        .set('Authorization', admin.authorization)
        .send({ name: 'Nuevo nombre' });

      expect(res.status).toBe(400);
    });

    it('no permite cambiar la contraseña sin longitud mínima', async () => {
      const res = await request(app)
        .put('/api/users/1')
        .set('Authorization', admin.authorization)
        .send({ password: 'corta' });

      expect(res.status).toBe(400);
    });
  });

  /* -------------------------------- Roles ------------------------------- */

  describe('POST /api/roles', () => {
    it('exige identificador y nombre', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', admin.authorization)
        .send({});

      expect(res.status).toBe(400);
    });

    it('rechaza un permiso con valor inválido', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', admin.authorization)
        .send({
          id: 'auditor-prueba',
          name: 'Auditor de Prueba',
          permissions: { padron: 'eliminar' },
        });

      expect(res.status).toBe(400);
    });

    it('el operario NO puede crear roles', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', operator.authorization)
        .send({ id: 'auditor-prueba', name: 'Auditor de Prueba' });

      expect(res.status).toBe(403);
    });
  });

  /* ------------------------------- Personas ----------------------------- */

  describe('PUT /api/persons/:id', () => {
    it('rechaza un identificador no numérico', async () => {
      const res = await request(app)
        .put('/api/persons/xyz')
        .set('Authorization', secretaria.authorization)
        .send({ fullName: 'Nombre Válido' });

      expect(res.status).toBe(400);
    });

    it('rechaza un DNI demasiado corto', async () => {
      const res = await request(app)
        .put('/api/persons/1')
        .set('Authorization', secretaria.authorization)
        .send({ dni: '12' });

      expect(res.status).toBe(400);
    });

    it('rechaza un estado desconocido', async () => {
      const res = await request(app)
        .put('/api/persons/1')
        .set('Authorization', secretaria.authorization)
        .send({ status: 'PENDIENTE' });

      expect(res.status).toBe(400);
    });
  });

  /* --------------------------- Cursos viales ---------------------------- */

  describe('PUT /api/drivers/:id/course', () => {
    it('rechaza un identificador no numérico', async () => {
      const res = await request(app)
        .put('/api/drivers/abc/course')
        .set('Authorization', secretaria.authorization)
        .send({ certificateNumber: 'CSV-1' });

      expect(res.status).toBe(400);
    });

    it('rechaza una fecha con formato incorrecto', async () => {
      const res = await request(app)
        .put('/api/drivers/1/course')
        .set('Authorization', secretaria.authorization)
        .send({ issueDate: '15/06/2026' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/drivers/courses/bulk-sync', () => {
    it('exige evaluaciones o identificadores', async () => {
      const res = await request(app)
        .post('/api/drivers/courses/bulk-sync')
        .set('Authorization', secretaria.authorization)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  /* ------------------------- Solicitudes de padrón ---------------------- */

  describe('POST /api/padron-requests', () => {
    it('exige los campos obligatorios', async () => {
      const res = await request(app)
        .post('/api/padron-requests')
        .set('Authorization', operator.authorization)
        .send({});

      expect(res.status).toBe(400);
    });

    it('rechaza un motivo demasiado corto', async () => {
      const res = await request(app)
        .post('/api/padron-requests')
        .set('Authorization', operator.authorization)
        .send({
          sourceVehicleId: 1,
          requestedPadron: 'PAD-999',
          requestType: 'CHANGE',
          reason: 'x',
        });

      expect(res.status).toBe(400);
    });
  });

  /* ------------------------------- Vehículos ---------------------------- */

  describe('POST /api/vehicles', () => {
    it('exige los campos del vehículo', async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', registrador.authorization)
        .send({});

      expect(res.status).toBe(400);
    });

    it('rechaza una placa demasiado corta', async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', registrador.authorization)
        .send({
          padronNumber: 'PAD-999',
          plate: 'AB',
          brand: 'Honda',
          modelYear: 2024,
        });

      expect(res.status).toBe(400);
    });

    it('rechaza un año fuera de rango', async () => {
      const res = await request(app)
        .post('/api/vehicles')
        .set('Authorization', registrador.authorization)
        .send({
          padronNumber: 'PAD-999',
          plate: 'ABC-999',
          brand: 'Honda',
          modelYear: 1970,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/vehicles/:id', () => {
    it('exige confirmación explícita', async () => {
      const res = await request(app)
        .delete('/api/vehicles/1')
        .set('Authorization', admin.authorization);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('confirmación');
    });

    it('rechaza un identificador no numérico', async () => {
      const res = await request(app)
        .delete('/api/vehicles/abc?confirmed=true')
        .set('Authorization', admin.authorization);

      expect(res.status).toBe(400);
    });
  });

  /* ------------------------------- Backup ------------------------------- */

  describe('POST /api/backup/restore', () => {
    it('exige la confirmación RESTAURAR', async () => {
      const res = await request(app)
        .post('/api/backup/restore')
        .set('Authorization', admin.authorization)
        .send({
          backupData: { data: { vehicles: [] } },
          mode: 'merge',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('RESTAURAR');
    });

    it('el operario NO puede restaurar', async () => {
      const res = await request(app)
        .post('/api/backup/restore')
        .set('Authorization', operator.authorization)
        .send({
          backupData: { data: { vehicles: [] } },
          mode: 'merge',
          confirm: 'RESTAURAR',
        });

      expect(res.status).toBe(403);
    });
  });

  /* ------------------------------ Importación --------------------------- */

  describe('POST /api/import/preview', () => {
    it('rechaza un archivo sin extensión permitida', async () => {
      const res = await request(app)
        .post('/api/import/preview')
        .set('Authorization', admin.authorization)
        .send({
          fileBase64: Buffer.from('%PDF-1.7').toString('base64'),
          fileName: 'malicioso.html',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Formato no permitido');
    });

    it('rechaza un PDF cuyo contenido no es un PDF', async () => {
      const res = await request(app)
        .post('/api/import/preview')
        .set('Authorization', admin.authorization)
        .send({
          fileBase64: Buffer.from('MZ\x90\x00ejecutable').toString('base64'),
          fileName: 'falso.pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('no corresponde');
    });

    it('rechaza un archivo vacío', async () => {
      const res = await request(app)
        .post('/api/import/preview')
        .set('Authorization', admin.authorization)
        .send({ fileBase64: '', fileName: 'vacio.pdf' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/import/confirm', () => {
    it('exige un arreglo de filas', async () => {
      const res = await request(app)
        .post('/api/import/confirm')
        .set('Authorization', admin.authorization)
        .send({ rows: 'no-es-un-arreglo' });

      expect(res.status).toBe(400);
    });
  });

  /* --------------------------- Recuperación de clave -------------------- */

  describe('POST /api/auth/forgot-password', () => {
    it('responde igual aunque el correo no exista', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'no-existe@transporte.pe' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Si el correo está registrado');
    });

    it('rechaza un correo con formato inválido', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'no-es-correo' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('rechaza un token inválido', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'corto', newPassword: 'NuevaClave123' });

      expect(res.status).toBe(400);
    });

    it('rechaza una contraseña corta', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'a'.repeat(64), newPassword: 'corta' });

      expect(res.status).toBe(400);
    });
  });

  /* --------------------- Identificadores de ruta ----------------------- */

  describe('Identificadores de ruta inválidos', () => {
    const rutas: Array<{ metodo: 'put' | 'delete' | 'post'; url: string; cuerpo?: unknown }> = [
      { metodo: 'put', url: '/api/users/abc', cuerpo: { name: 'X' } },
      { metodo: 'delete', url: '/api/users/abc' },
      { metodo: 'post', url: '/api/vehicles/xyz/retire', cuerpo: { reason: 'Motivo válido' } },
      { metodo: 'put', url: '/api/persons/abc', cuerpo: { fullName: 'Nombre Válido' } },
      { metodo: 'put', url: '/api/drivers/abc/course', cuerpo: { certificateNumber: 'X' } },
    ];

    for (const ruta of rutas) {
      it(`rechaza ${ruta.metodo.toUpperCase()} ${ruta.url}`, async () => {
        const res = await (request(app) as any)
          [ruta.metodo](ruta.url)
          .set('Authorization', admin.authorization)
          .send(ruta.cuerpo ?? {});

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('identificador');
      });
    }
  });
});
