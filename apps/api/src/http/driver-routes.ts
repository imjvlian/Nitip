import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { IntegrationNotConfiguredError } from "../config/env.js";
import { authenticateRequest } from "../lib/authenticate.js";
import {
  createDriverProfile,
  getDriverProfileByOwner,
  setDriverAvailability,
  submitDriverProfile,
  updateDriverProfile,
} from "../repositories/drivers.js";
import { upsertUserFromFirebase } from "../repositories/users.js";
import {
  parseCreateDriver,
  parseDriverAvailability,
  parseUpdateDriver,
} from "./driver-validation.js";
import { ValidationError } from "./validation.js";

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

  if (error instanceof ValidationError) {
    return reply.code(400).send({
      error: "validation_error",
      message: error.message,
    });
  }

  request.log.error({ err: error }, "Nitip driver route failed");
  return reply.code(500).send({
    error: "internal_server_error",
    message: "Unable to complete driver request",
  });
}

export function registerDriverRoutes(app: FastifyInstance) {
  app.get("/driver/me", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      await upsertUserFromFirebase(identity);
      return { data: await getDriverProfileByOwner(identity.uid) };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });

  app.post("/driver/onboarding", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      await upsertUserFromFirebase(identity);
      const input = parseCreateDriver(request.body);
      const profile = await createDriverProfile(identity.uid, input);
      return reply.code(201).send({ data: profile });
    } catch (error) {
      return routeError(request, reply, error);
    }
  });

  app.patch("/driver/me", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      const input = parseUpdateDriver(request.body);
      const profile = await updateDriverProfile(identity.uid, input);
      if (!profile) {
        return reply.code(409).send({
          error: "driver_profile_not_editable",
          message: "Profil hanya dapat diedit saat draft atau ditolak",
        });
      }
      return { data: profile };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });

  app.post("/driver/me/submit", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      const profile = await submitDriverProfile(identity.uid);
      if (!profile) {
        return reply.code(404).send({ error: "driver_profile_not_found" });
      }
      return { data: profile };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });

  app.patch("/driver/me/availability", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      const input = parseDriverAvailability(request.body);
      const profile = await setDriverAvailability(identity.uid, input.isOnline);
      if (!profile) {
        return reply.code(409).send({
          error: "driver_not_available",
          message: "Driver harus approved sebelum dapat online",
        });
      }
      return { data: profile };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });
}
