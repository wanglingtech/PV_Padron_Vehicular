/**
 * Padrón vehicular: alta, edición, baja lógica, reasignación e intercambio de padrón.
 */

import type { Express } from "express";
import {
  createVehicle,
  deleteVehicle,
  getVehicleById,
  getVehicles,
  reactivateVehicle,
  retireVehicle,
  updateVehicle,
} from "../db/vehicles.ts";
import {
  changeVehiclePadron,
  getVehiclePadronHistoryList,
  swapVehiclesPadron,
} from "../db/padron-changes.ts";
import {
  requireAdmin,
  requireAuth,
  requireModule,
  type AuthRequest,
} from "../middleware/auth.ts";
import {
  ChangePadronSchema,
  RetireVehicleSchema,
  SwapPadronSchema,
  VehicleInputSchema,
} from "../utils/validation.ts";
import { validateBody, validateParam } from "../middleware/validate.ts";
import { sensitiveWriteLimiter, writeLimiter } from "../middleware/rate-limit.ts";

export function registerVehicleRoutes(app: Express): void {
  // Listado paginado y filtrado
  app.get("/api/vehicles", async (req, res) => {
    try {
      const search = req.query.search as string;
      const status = req.query.status as string;
      const lifeStatus = req.query.lifeStatus as string;
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as "asc" | "desc";
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const result = await getVehicles({
        search,
        status,
        lifeStatus,
        sortBy,
        sortOrder,
        page,
        limit,
      });
      res.json(result);
    } catch (error: any) {
      console.error("Error in GET /api/vehicles:", error);
      res
        .status(500)
        .json({ error: error.message || "Error al obtener vehículos" });
    }
  });

  // Detalle individual de un vehículo
  app.get("/api/vehicles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de vehículo inválido" });
      }

      const vehicle = await getVehicleById(id);
      if (!vehicle) {
        return res.status(404).json({ error: "Vehículo no encontrado" });
      }

      res.json(vehicle);
    } catch (error: any) {
      console.error("Error in GET /api/vehicles/:id:", error);
      res
        .status(500)
        .json({
          error: error.message || "Error al obtener detalle del vehículo",
        });
    }
  });

  // Registrar nuevo vehículo
  app.post(
    "/api/vehicles",
    requireAuth,
    requireModule("nuevo", "write"),
    writeLimiter,
    validateBody(VehicleInputSchema),
    async (req: AuthRequest, res) => {
      try {
        const validation = { success: true as const, data: req.body };
        const user = {
          email: req.user?.email || "admin@transporte.pe",
          name: req.user?.name || "Administrador",
        };

        const newVehicle = await createVehicle(validation.data as any, user);
        res.status(201).json(newVehicle);
      } catch (error: any) {
        console.error("Error in POST /api/vehicles:", error);
        res
          .status(400)
          .json({ error: error.message || "Error al registrar vehículo" });
      }
    },
  );

  // Actualizar vehículo existente
  app.put(
    "/api/vehicles/:id",
    requireAuth,
    requireModule("padron", "write"),
    writeLimiter,
    validateParam("id"),
    validateBody(VehicleInputSchema),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const validation = { success: true as const, data: req.body };
        const user = {
          email: req.user?.email || "admin@transporte.pe",
          name: req.user?.name || "Administrador",
        };

        const updated = await updateVehicle(id, validation.data as any, user);
        res.json(updated);
      } catch (error: any) {
        console.error("Error in PUT /api/vehicles/:id:", error);
        res
          .status(400)
          .json({ error: error.message || "Error al actualizar vehículo" });
      }
    },
  );

  // Baja lógica / retirar vehículo (solo administrador)
  app.post(
    "/api/vehicles/:id/retire",
    requireAuth,
    requireAdmin,
    sensitiveWriteLimiter,
    validateParam("id"),
    validateBody(RetireVehicleSchema),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const validation = { success: true as const, data: req.body };
        const user = {
          email: req.user?.email || "admin@transporte.pe",
          name: req.user?.name || "Administrador",
        };

        const retired = await retireVehicle(id, validation.data, user);
        res.json(retired);
      } catch (error: any) {
        console.error("Error in POST /api/vehicles/:id/retire:", error);
        res
          .status(400)
          .json({ error: error.message || "Error al dar de baja el vehículo" });
      }
    },
  );

  // Reactivar vehículo retirado (solo administrador)
  app.post(
    "/api/vehicles/:id/reactivate",
    requireAuth,
    requireAdmin,
    sensitiveWriteLimiter,
    validateParam("id"),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);

        const user = {
          email: req.user?.email || "admin@transporte.pe",
          name: req.user?.name || "Administrador",
        };

        const reactivated = await reactivateVehicle(id, user);
        res.json(reactivated);
      } catch (error: any) {
        console.error("Error in POST /api/vehicles/:id/reactivate:", error);
        res
          .status(400)
          .json({ error: error.message || "Error al reactivar el vehículo" });
      }
    },
  );

  // Reasignar a un padrón libre (solo administrador)
  app.post(
    "/api/vehicles/:id/padron/change",
    requireAuth,
    requireAdmin,
    sensitiveWriteLimiter,
    validateParam("id"),
    validateBody(ChangePadronSchema),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        const validation = { success: true as const, data: req.body };

        const user = {
          email: req.user?.email || "admin@transporte.pe",
          name: req.user?.name || "Administrador",
          role: req.user?.role || "admin",
        };

        const result = await changeVehiclePadron({
          vehicleId: id,
          newPadron: validation.data.newPadron,
          reason: validation.data.reason,
          authorizationReference: validation.data.authorizationReference,
          authorizedBy: validation.data.authorizedBy,
          effectiveDate: validation.data.effectiveDate,
          user,
        });

        res.json(result);
      } catch (error: any) {
        console.error("Error in POST /api/vehicles/:id/padron/change:", error);
        res
          .status(400)
          .json({ error: error.message || "Error al reasignar el padrón" });
      }
    },
  );

  // Intercambiar padrón entre dos unidades (solo administrador)
  app.post(
    "/api/vehicles/padron/swap",
    requireAuth,
    requireAdmin,
    sensitiveWriteLimiter,
    validateBody(SwapPadronSchema),
    async (req: AuthRequest, res) => {
      try {
        const validation = { success: true as const, data: req.body };

        const user = {
          email: req.user?.email || "admin@transporte.pe",
          name: req.user?.name || "Administrador",
          role: req.user?.role || "admin",
        };

        const result = await swapVehiclesPadron({
          vehicleAId: validation.data.vehicleAId,
          vehicleBId: validation.data.vehicleBId,
          reason: validation.data.reason,
          authorizationReference: validation.data.authorizationReference,
          authorizedBy: validation.data.authorizedBy,
          effectiveDate: validation.data.effectiveDate,
          user,
        });

        res.json(result);
      } catch (error: any) {
        console.error("Error in POST /api/vehicles/padron/swap:", error);
        res.status(400).json({
          error: error.message || "Error al realizar el intercambio de padrón",
        });
      }
    },
  );

  // Historial de cambios de padrón de un vehículo
  app.get("/api/vehicles/:id/padron-history", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de vehículo inválido" });
      }

      const history = await getVehiclePadronHistoryList(id);
      res.json(history);
    } catch (error: any) {
      console.error("Error in GET /api/vehicles/:id/padron-history:", error);
      res
        .status(500)
        .json({ error: error.message || "Error al obtener historial" });
    }
  });

  // Eliminar vehículo físicamente (solo administrador con confirmación explícita)
  app.delete(
    "/api/vehicles/:id",
    requireAuth,
    requireAdmin,
    sensitiveWriteLimiter,
    validateParam("id"),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);

        // El borrado físico es irreversible: exige confirmación explícita
        // en el cuerpo o en la query.
        const confirmed =
          req.query.confirmed === "true" || req.body?.confirmed === true;

        if (!confirmed) {
          return res.status(400).json({
            error:
              "Se requiere confirmación explícita (confirmed=true) para eliminar un vehículo.",
          });
        }

        const user = {
          email: req.user?.email || "admin@transporte.pe",
          name: req.user?.name || "Administrador",
        };

        const result = await deleteVehicle(id, user, confirmed);
        res.json(result);
      } catch (error: any) {
        console.error("Error in DELETE /api/vehicles/:id:", error);
        res
          .status(400)
          .json({ error: error.message || "Error al eliminar vehículo" });
      }
    },
  );
}
