import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { IntegrationNotConfiguredError } from "../config/env.js";
import { authenticateRequest } from "../lib/authenticate.js";
import { createProfilePhotoUploadSignature } from "../lib/cloudinary.js";
import { updateUserPhoto, upsertUserFromFirebase } from "../repositories/users.js";
import { parseProfilePhotoPatch } from "./profile-media-validation.js";
import { ValidationError } from "./validation.js";

function routeError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
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
  request.log.error({ err: error }, "Nitip user media route failed");
  return reply.code(500).send({
    error: "internal_server_error",
    message: "Unable to complete request",
  });
}

export function registerUserMediaRoutes(app: FastifyInstance) {
  app.post("/me/media/signature", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      await upsertUserFromFirebase(identity);
      return { data: createProfilePhotoUploadSignature(identity.uid) };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });

  app.patch("/me/photo", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      await upsertUserFromFirebase(identity);
      const { photoUrl } = parseProfilePhotoPatch(request.body);
      const profile = await updateUserPhoto(identity.uid, photoUrl);
      if (!profile) return reply.code(404).send({ error: "profile_not_found" });
      return { data: profile };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });
}
