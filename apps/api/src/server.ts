import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";

import {
  env,
  integrationStatus,
  IntegrationNotConfiguredError,
} from "./config/env.js";
import { registerAdminRoutes } from "./http/admin-routes.js";
import { registerCatalogRoutes } from "./http/catalog-routes.js";
import { registerDriverOrderRoutes } from "./http/driver-order-routes.js";
import { registerDriverRoutes } from "./http/driver-routes.js";
import { registerMerchantOrderRoutes } from "./http/merchant-order-routes.js";
import { registerOrderRoutes } from "./http/order-routes.js";
import { registerSupportRoutes } from "./http/support-routes.js";
import { registerUserMediaRoutes } from "./http/user-media-routes.js";
import {
  parseCreateMerchant,
  parseCreateOutlet,
  parseUpdateMerchant,
  parseUpdateOutlet,
} from "./http/merchant-validation.js";
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
import {
  createMerchantProfile,
  getMerchantProfileByOwner,
  submitMerchantProfile,
  updateMerchantProfile,
} from "./repositories/merchants.js";
import {
  createMerchantOutlet,
  deleteMerchantOutlet,
  listMerchantOutlets,
  updateMerchantOutlet,
} from "./repositories/outlets.js";
import { updateUserProfile, upsertUserFromFirebase } from "./repositories/users.js";

const app = Fastify({ logger: true });

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
    if (!profile) return reply.code(404).send({ error: "profile_not_found" });
    return { data: profile };
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

app.get("/me/addresses", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;
  try {
    return { data: await listUserAddresses(identity.uid) };
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

app.patch<{ Params: { id: string } }>("/me/addresses/:id", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;
  try {
    const input = parseUpdateAddress(request.body);
    const address = await updateUserAddress(identity.uid, request.params.id, input);
    if (!address) return reply.code(404).send({ error: "address_not_found" });
    return { data: address };
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

app.delete<{ Params: { id: string } }>("/me/addresses/:id", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;
  try {
    const deleted = await deleteUserAddress(identity.uid, request.params.id);
    if (!deleted) return reply.code(404).send({ error: "address_not_found" });
    return { ok: true };
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

app.get("/merchant/me", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;
  try {
    await upsertUserFromFirebase(identity);
    return { data: await getMerchantProfileByOwner(identity.uid) };
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

app.post("/merchant/onboarding", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;
  try {
    await upsertUserFromFirebase(identity);
    const input = parseCreateMerchant(request.body);
    const merchant = await createMerchantProfile(identity.uid, input);
    return reply.code(201).send({ data: merchant });
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

app.patch("/merchant/me", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;
  try {
    const input = parseUpdateMerchant(request.body);
    const merchant = await updateMerchantProfile(identity.uid, input);
    if (!merchant) {
      return reply.code(409).send({
        error: "merchant_profile_not_editable",
        message: "Profil hanya dapat diedit saat draft atau ditolak",
      });
    }
    return { data: merchant };
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

app.post("/merchant/me/submit", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;
  try {
    const merchant = await submitMerchantProfile(identity.uid);
    if (!merchant) return reply.code(404).send({ error: "merchant_profile_not_found" });
    return { data: merchant };
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

app.get("/merchant/outlets", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;
  try {
    const merchant = await getMerchantProfileByOwner(identity.uid);
    if (!merchant) return reply.code(404).send({ error: "merchant_profile_not_found" });
    return { data: await listMerchantOutlets(merchant.id) };
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

app.post("/merchant/outlets", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;
  try {
    const merchant = await getMerchantProfileByOwner(identity.uid);
    if (!merchant) return reply.code(404).send({ error: "merchant_profile_not_found" });
    const input = parseCreateOutlet(request.body);
    const outlet = await createMerchantOutlet(merchant.id, input);
    return reply.code(201).send({ data: outlet });
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

app.patch<{ Params: { id: string } }>("/merchant/outlets/:id", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;
  try {
    const merchant = await getMerchantProfileByOwner(identity.uid);
    if (!merchant) return reply.code(404).send({ error: "merchant_profile_not_found" });
    const input = parseUpdateOutlet(request.body);
    const outlet = await updateMerchantOutlet(merchant.id, request.params.id, input);
    if (!outlet) return reply.code(404).send({ error: "outlet_not_found" });
    return { data: outlet };
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

app.delete<{ Params: { id: string } }>("/merchant/outlets/:id", async (request, reply) => {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return;
  try {
    const merchant = await getMerchantProfileByOwner(identity.uid);
    if (!merchant) return reply.code(404).send({ error: "merchant_profile_not_found" });
    const deleted = await deleteMerchantOutlet(merchant.id, request.params.id);
    if (!deleted) return reply.code(404).send({ error: "outlet_not_found" });
    return { ok: true };
  } catch (error) {
    return handleRouteError(request, reply, error);
  }
});

registerCatalogRoutes(app);
registerAdminRoutes(app);
registerOrderRoutes(app);
registerMerchantOrderRoutes(app);
registerDriverRoutes(app);
registerDriverOrderRoutes(app);
registerSupportRoutes(app);
registerUserMediaRoutes(app);

app.setNotFoundHandler(async (_request, reply) => {
  await reply.code(404).send({ error: "not_found" });
});

async function start() {
  await app.listen({ host: env.host, port: env.port });
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
