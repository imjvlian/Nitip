import Fastify from "fastify";

import {
  env,
  integrationStatus,
  IntegrationNotConfiguredError,
} from "./config/env.js";
import { authenticateRequest } from "./lib/authenticate.js";
import { closeMongoDb } from "./lib/mongodb.js";
import { upsertUserFromFirebase } from "./repositories/users.js";

const app = Fastify({
  logger: true,
});

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
    if (error instanceof IntegrationNotConfiguredError) {
      return reply.code(503).send({
        error: "integration_not_configured",
        integration: error.integration,
      });
    }

    request.log.error({ err: error }, "Failed to load Nitip user profile");
    return reply.code(500).send({
      error: "internal_server_error",
      message: "Unable to load user profile",
    });
  }
});

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
