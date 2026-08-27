import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { IntegrationNotConfiguredError } from "../config/env.js";
import { authenticateRequest } from "../lib/authenticate.js";
import { getDriverProfileByOwner } from "../repositories/drivers.js";
import {
  acceptDriverOrder,
  DriverDispatchError,
  getDriverCurrentOrder,
  getDriverOrder,
  listAvailableDriverOffers,
} from "../repositories/orders.js";

function routeError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown,
) {
  if (error instanceof IntegrationNotConfiguredError) {
    return reply.code(503).send({
      error: "integration_not_configured",
      integration: error.integration,
    });
  }

  if (error instanceof DriverDispatchError) {
    return reply.code(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  request.log.error({ err: error }, "Nitip driver order route failed");
  return reply.code(500).send({
    error: "internal_server_error",
    message: "Unable to complete driver order request",
  });
}

async function resolveDriver(
  request: FastifyRequest,
  reply: FastifyReply,
  requireOnline = false,
) {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return null;

  const driver = await getDriverProfileByOwner(identity.uid);
  if (!driver) {
    await reply.code(404).send({ error: "driver_profile_not_found" });
    return null;
  }

  if (driver.status !== "approved") {
    await reply.code(403).send({
      error: "driver_not_approved",
      message: "Driver harus approved untuk mengakses dispatch",
    });
    return null;
  }

  if (requireOnline && !driver.isOnline) {
    await reply.code(409).send({
      error: "driver_offline",
      message: "Aktifkan status online untuk menerima order",
    });
    return null;
  }

  return driver;
}

export function registerDriverOrderRoutes(app: FastifyInstance) {
  app.get("/driver/orders/current", async (request, reply) => {
    try {
      const driver = await resolveDriver(request, reply);
      if (!driver) return;
      return { data: await getDriverCurrentOrder(driver.id) };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });

  app.get("/driver/orders/available", async (request, reply) => {
    try {
      const driver = await resolveDriver(request, reply, true);
      if (!driver) return;
      return { data: await listAvailableDriverOffers(driver.id) };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });

  app.get<{ Params: { id: string } }>(
    "/driver/orders/:id",
    async (request, reply) => {
      try {
        const driver = await resolveDriver(request, reply);
        if (!driver) return;

        const order = await getDriverOrder(driver.id, request.params.id);
        if (!order) {
          return reply.code(404).send({ error: "driver_order_not_found" });
        }

        return { data: order };
      } catch (error) {
        return routeError(request, reply, error);
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/driver/orders/:id/accept",
    async (request, reply) => {
      try {
        const driver = await resolveDriver(request, reply, true);
        if (!driver) return;

        const order = await acceptDriverOrder(driver.id, request.params.id);
        if (!order) {
          return reply.code(409).send({
            error: "order_already_taken",
            message: "Order sudah diambil driver lain atau tidak lagi tersedia",
          });
        }

        return { data: order };
      } catch (error) {
        return routeError(request, reply, error);
      }
    },
  );
}
