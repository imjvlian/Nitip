import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { IntegrationNotConfiguredError } from "../config/env.js";
import { authorizeAdmin } from "../lib/admin-auth.js";
import {
  listDriverProfiles,
  reviewDriverProfile,
} from "../repositories/drivers.js";
import {
  listMerchantProfiles,
  reviewMerchantProfile,
} from "../repositories/merchants.js";
import { parseMerchantReview } from "./admin-validation.js";
import { parseDriverReview } from "./driver-validation.js";
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

  request.log.error({ err: error }, "Nitip admin route failed");
  return reply.code(500).send({
    error: "internal_server_error",
    message: "Unable to complete request",
  });
}

export function registerAdminRoutes(app: FastifyInstance) {
  app.get("/admin/me", async (request, reply) => {
    try {
      const admin = await authorizeAdmin(request, reply);
      if (!admin) return;

      return {
        data: {
          firebaseUid: admin.identity.uid,
          email: admin.identity.email ?? null,
          authorizedBy: admin.authorizedBy,
        },
      };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });

  app.get("/admin/merchants", async (request, reply) => {
    try {
      const admin = await authorizeAdmin(request, reply);
      if (!admin) return;
      return { data: await listMerchantProfiles() };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });

  app.post<{ Params: { id: string } }>(
    "/admin/merchants/:id/review",
    async (request, reply) => {
      try {
        const admin = await authorizeAdmin(request, reply);
        if (!admin) return;

        const input = parseMerchantReview(request.body);
        const merchant = await reviewMerchantProfile(
          request.params.id,
          admin.identity.uid,
          input,
        );

        if (!merchant) {
          return reply.code(409).send({
            error: "merchant_not_reviewable",
            message:
              "Merchant harus berstatus pending_review dan tidak dapat direview oleh pemiliknya sendiri",
          });
        }

        return { data: merchant };
      } catch (error) {
        return routeError(request, reply, error);
      }
    },
  );

  app.get("/admin/drivers", async (request, reply) => {
    try {
      const admin = await authorizeAdmin(request, reply);
      if (!admin) return;
      return { data: await listDriverProfiles() };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });

  app.post<{ Params: { id: string } }>(
    "/admin/drivers/:id/review",
    async (request, reply) => {
      try {
        const admin = await authorizeAdmin(request, reply);
        if (!admin) return;

        const input = parseDriverReview(request.body);
        const driver = await reviewDriverProfile(
          request.params.id,
          admin.identity.uid,
          input,
        );

        if (!driver) {
          return reply.code(409).send({
            error: "driver_not_reviewable",
            message:
              "Driver harus berstatus pending_review dan tidak dapat mereview dirinya sendiri",
          });
        }

        return { data: driver };
      } catch (error) {
        return routeError(request, reply, error);
      }
    },
  );
}
