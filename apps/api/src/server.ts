import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";

import {
  env,
  integrationStatus,
  IntegrationNotConfiguredError,
} from "./config/env.js";
import {
  parseCreateAddress,
  parseProfilePatch,
  parseUpdateAddress,
  ValidationError,
} from "./http/validation.js";
import { authenticateRequest } from "./lib/authenticate.js";
import { closeMongoDb } from "./lib/mongodb.js";
import {
  createUserAddress,
  deleteUserAddress,
  listUserAddresses,
  updateUserAddress,
} from "./repositories/addresses.js";
import { updateUserProfile, upsertUserFromFirebase } from "./repositories/users.js";

const app = Fastify({
  logger: true,
});

function handleRouteError(
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

  request.log.error({ err: error }, "Nitip API route failed");
  return reply.code(500).send({
    error: "internal_server_error",
    message: "Unable to complete request",
  });
}

app.get("/health", async () => ({
  ok: true,
  service: "nitip-api",
  environment: env.nodeEnv,
  integrations: integrationStatus,
}));

app.get("/me", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;

  try {
    const profile = await upsertUserFromFirebase(identity);
    return { data: profile };
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

app.patch("/me", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;

  try {
    await upsertUserFromFirebase(identity);
    const input = parseProfilePatch(request.body);
    const profile = await updateUserProfile(identity.uid, input);

    if (!profile) {
      return reply.code(404).send({ error: "profile_not_found" });
    }

    return { data: profile };
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

app.get("/me/addresses", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;

  try {
    const addresses = await listUserAddresses(identity.uid);
    return { data: addresses };
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

app.post("/me/addresses", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;

  try {
    const input = parseCreateAddress(request.body);
    const address = await createUserAddress(identity.uid, input);
    return reply.code(201).send({ data: address });
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

app.patch<{ Params: { id: string } }>(
  "/me/addresses/:id",
  async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      const input = parseUpdateAddress(request.body);
      const address = await updateUserAddress(
        identity.uid,
        request.params.id,
        input,
      );

      if (!address) {
        return reply.code(404).send({ error: "address_not_found" });
      }

      return { data: address };
    } catch (error) {
      return handleRouteError(request, reply, error);
    }
  },
);

app.delete<{ Params: { id: string } }>(
  "/me/addresses/:id",
  async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      const deleted = await deleteUserAddress(identity.uid, request.params.id);
      if (!deleted) {
        return reply.code(404).send({ error: "address_not_found" });
      }

      return { ok: true };
    } catch (error) {
      return handleRouteError(request, reply, error);
    }
  },
);

app.setNotFoundHandler(async (_request, reply) => {
  await reply.code(404).send({
    error: "not_found",
  });
});

async function start() {
  await app.listen({
    host: env.host,
    port: env.port,
  });
}

async function shutdown(signal: string) {
  app.log.info({ signal }, "Shutting down Nitip API");
  await app.close();
  await closeMongoDb();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
