import type { DecodedIdToken } from "firebase-admin/auth";
import type { FastifyReply, FastifyRequest } from "fastify";

import { IntegrationNotConfiguredError } from "../config/env.js";
import { getFirebaseAdminAuth } from "./firebase-admin.js";

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<DecodedIdToken | null> {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    await reply.code(401).send({
      error: "unauthorized",
      message: "Bearer token is required",
    });
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    await reply.code(401).send({
      error: "unauthorized",
      message: "Bearer token is required",
    });
    return null;
  }

  try {
    return await getFirebaseAdminAuth().verifyIdToken(token);
  } catch (error) {
    if (error instanceof IntegrationNotConfiguredError) {
      await reply.code(503).send({
        error: "integration_not_configured",
        integration: error.integration,
      });
      return null;
    }

    request.log.warn({ err: error }, "Firebase ID token verification failed");
    await reply.code(401).send({
      error: "unauthorized",
      message: "Invalid or expired Firebase ID token",
    });
    return null;
  }
}
