/**
 * Cartelera digital y portal de inicio: publicaciones y agenda de eventos.
 */

import type { Express } from 'express';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { portalEvents, portalPosts } from '../db/schema.ts';
import { requireAuth, requireModule, type AuthRequest } from '../middleware/auth.ts';
import { validateBody, validateParam } from '../middleware/validate.ts';
import { sensitiveWriteLimiter } from '../middleware/rate-limit.ts';
import {
  PortalEventCreateSchema,
  PortalEventUpdateSchema,
  PortalPostCreateSchema,
  PortalPostReorderSchema,
  PortalPostUpdateSchema,
} from '../utils/validation.ts';

export function registerPortalRoutes(app: Express): void {
  // --- Publicaciones de la cartelera ---

  app.get('/api/portal/posts', async (_req, res) => {
    try {
      const posts = await db
        .select()
        .from(portalPosts)
        .orderBy(asc(portalPosts.orderIndex), desc(portalPosts.createdAt));
      res.json(posts);
    } catch (error: any) {
      console.error('Error in GET /api/portal/posts:', error);
      res.status(500).json({ error: error.message || 'Error al obtener publicaciones' });
    }
  });

  app.post(
    '/api/portal/posts',
    requireAuth,
    requireModule('gestion-portal', 'write'),
    sensitiveWriteLimiter,
    validateBody(PortalPostCreateSchema),
    async (req: AuthRequest, res) => {
      try {
        const {
          title,
          subtitle,
          content,
          type,
          mediaUrl,
          videoUrl,
          pdfUrl,
          pdfFileName,
          pdfFileSize,
          category,
          badgeText,
          badgeColor,
          startDate,
          endDate,
          isActive,
          isHeroCarousel,
          orderIndex,
          authorName,
        } = req.body;

        const [newPost] = await db
          .insert(portalPosts)
          .values({
            title,
            subtitle,
            content,
            type,
            mediaUrl,
            videoUrl,
            pdfUrl,
            pdfFileName,
            pdfFileSize,
            category,
            badgeText,
            badgeColor,
            startDate,
            endDate,
            isActive,
            isHeroCarousel,
            orderIndex,
            authorName: authorName || (req.user?.name ? `${req.user.name}` : 'Administración'),
          })
          .returning();

        res.status(201).json(newPost);
      } catch (error: any) {
        console.error('Error in POST /api/portal/posts:', error);
        res.status(400).json({ error: error.message || 'Error al registrar publicación' });
      }
    }
  );

  app.put(
    '/api/portal/posts/:id',
    requireAuth,
    requireModule('gestion-portal', 'write'),
    sensitiveWriteLimiter,
    validateParam('id'),
    validateBody(PortalPostUpdateSchema),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);

        // Antes se hacía `{...req.body}` directo al UPDATE: eso permitía
        // escribir `id`, `createdAt` o cualquier columna. Ahora el esquema
        // Zod `.strict()` filtra las claves desconocidas.
        const updates = { ...req.body, updatedAt: new Date() };

        const [updated] = await db
          .update(portalPosts)
          .set(updates)
          .where(eq(portalPosts.id, id))
          .returning();

        if (!updated) {
          return res.status(404).json({ error: 'La publicación no existe.' });
        }

        res.json(updated);
      } catch (error: any) {
        console.error('Error in PUT /api/portal/posts/:id:', error);
        res.status(400).json({ error: error.message || 'Error al actualizar publicación' });
      }
    }
  );

  app.delete(
    '/api/portal/posts/:id',
    requireAuth,
    requireModule('gestion-portal', 'write'),
    sensitiveWriteLimiter,
    validateParam('id'),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const [deleted] = await db
          .delete(portalPosts)
          .where(eq(portalPosts.id, id))
          .returning({ id: portalPosts.id });
        if (!deleted) {
          return res.status(404).json({ error: 'La publicación no existe.' });
        }
        res.json({ success: true, id });
      } catch (error: any) {
        console.error('Error in DELETE /api/portal/posts/:id:', error);
        res.status(400).json({ error: error.message || 'Error al eliminar publicación' });
      }
    }
  );

  // Reordenar la cartelera
  app.patch(
    '/api/portal/posts/reorder',
    requireAuth,
    requireModule('gestion-portal', 'write'),
    sensitiveWriteLimiter,
    validateBody(PortalPostReorderSchema),
    async (req: AuthRequest, res) => {
      try {
        const { orderedIds } = req.body;
        for (let i = 0; i < orderedIds.length; i++) {
          await db
            .update(portalPosts)
            .set({ orderIndex: i })
            .where(eq(portalPosts.id, orderedIds[i]));
        }
        res.json({ success: true });
      } catch (error: any) {
        console.error('Error in PATCH /api/portal/posts/reorder:', error);
        res.status(400).json({ error: error.message || 'Error al reordenar publicaciones' });
      }
    }
  );

  // --- Agenda de eventos ---

  app.get('/api/portal/events', async (_req, res) => {
    try {
      const events = await db
        .select()
        .from(portalEvents)
        .orderBy(asc(portalEvents.eventDate), asc(portalEvents.orderIndex));
      res.json(events);
    } catch (error: any) {
      console.error('Error in GET /api/portal/events:', error);
      res.status(500).json({ error: error.message || 'Error al obtener agenda' });
    }
  });

  app.post(
    '/api/portal/events',
    requireAuth,
    requireModule('gestion-portal', 'write'),
    sensitiveWriteLimiter,
    validateBody(PortalEventCreateSchema),
    async (req: AuthRequest, res) => {
      try {
        const {
          title,
          type,
          eventDate,
          eventTime,
          location,
          description,
          agenda,
          status,
          isActive,
          orderIndex,
        } = req.body;

        const [newEvent] = await db
          .insert(portalEvents)
          .values({
            title,
            type,
            eventDate,
            eventTime,
            location,
            description,
            agenda,
            status,
            isActive,
            orderIndex,
          })
          .returning();

        res.status(201).json(newEvent);
      } catch (error: any) {
        console.error('Error in POST /api/portal/events:', error);
        res.status(400).json({ error: error.message || 'Error al registrar evento' });
      }
    }
  );

  app.put(
    '/api/portal/events/:id',
    requireAuth,
    requireModule('gestion-portal', 'write'),
    sensitiveWriteLimiter,
    validateParam('id'),
    validateBody(PortalEventUpdateSchema),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const updates = { ...req.body };

        const [updated] = await db
          .update(portalEvents)
          .set(updates)
          .where(eq(portalEvents.id, id))
          .returning();

        if (!updated) {
          return res.status(404).json({ error: 'El evento no existe.' });
        }

        res.json(updated);
      } catch (error: any) {
        console.error('Error in PUT /api/portal/events/:id:', error);
        res.status(400).json({ error: error.message || 'Error al actualizar evento' });
      }
    }
  );

  app.delete(
    '/api/portal/events/:id',
    requireAuth,
    requireModule('gestion-portal', 'write'),
    sensitiveWriteLimiter,
    validateParam('id'),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const [deleted] = await db
          .delete(portalEvents)
          .where(eq(portalEvents.id, id))
          .returning({ id: portalEvents.id });
        if (!deleted) {
          return res.status(404).json({ error: 'El evento no existe.' });
        }
        res.json({ success: true, id });
      } catch (error: any) {
        console.error('Error in DELETE /api/portal/events/:id:', error);
        res.status(400).json({ error: error.message || 'Error al eliminar evento' });
      }
    }
  );
}
