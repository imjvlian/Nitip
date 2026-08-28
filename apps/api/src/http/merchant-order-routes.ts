import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { IntegrationNotConfiguredError } from "../config/env.js";
import { authenticateRequest } from "../lib/authenticate.js";
import { restoreAutoSoldOutProducts } from "../repositories/inventory-guard.js";
import { getMerchantProfileByOwner } from "../repositories/merchants.js";
import { getMerchantOrderOperations, setPreparationEstimate } from "../repositories/order-operations.js";
import { applyMerchantOrderAction, getMerchantOrder, listMerchantOrders } from "../repositories/orders.js";
import { parseMerchantOrderAction } from "./merchant-order-validation.js";
import { ValidationError } from "./validation.js";

function routeError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (error instanceof IntegrationNotConfiguredError) return reply.code(503).send({ error: "integration_not_configured", integration: error.integration });
  if (error instanceof ValidationError) return reply.code(400).send({ error: "validation_error", message: error.message });
  request.log.error({ err: error }, "Nitip merchant order route failed");
  return reply.code(500).send({ error: "internal_server_error", message: "Unable to complete merchant order request" });
}

async function resolveMerchant(request: FastifyRequest, reply: FastifyReply) {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return null;
  const merchant = await getMerchantProfileByOwner(identity.uid);
  if (!merchant) { await reply.code(404).send({ error: "merchant_profile_not_found" }); return null; }
  if (merchant.status !== "approved") {
    await reply.code(403).send({ error: "merchant_not_approved", message: "Merchant harus approved untuk mengelola pesanan" });
    return null;
  }
  return merchant;
}

export function registerMerchantOrderRoutes(app: FastifyInstance) {
  app.get("/merchant/orders", async (request, reply) => {
    try { const merchant = await resolveMerchant(request, reply); if (!merchant) return; return { data: await listMerchantOrders(merchant.id) }; }
    catch (error) { return routeError(request, reply, error); }
  });

  app.get<{ Params: { id: string } }>("/merchant/orders/:id", async (request, reply) => {
    try {
      const merchant = await resolveMerchant(request, reply); if (!merchant) return;
      const order = await getMerchantOrder(merchant.id, request.params.id);
      if (!order) return reply.code(404).send({ error: "order_not_found" });
      return { data: order };
    } catch (error) { return routeError(request, reply, error); }
  });

  app.get<{ Params: { id: string } }>("/merchant/orders/:id/operations", async (request, reply) => {
    try {
      const merchant = await resolveMerchant(request, reply); if (!merchant) return;
      const data = await getMerchantOrderOperations(merchant.id, request.params.id);
      if (!data) return reply.code(404).send({ error: "order_not_found" });
      return { data };
    } catch (error) { return routeError(request, reply, error); }
  });

  app.post<{ Params: { id: string } }>("/merchant/orders/:id/action", async (request, reply) => {
    try {
      const merchant = await resolveMerchant(request, reply); if (!merchant) return;
      const input = parseMerchantOrderAction(request.body);
      const order = await applyMerchantOrderAction(merchant.id, request.params.id, input);
      if (!order) return reply.code(409).send({ error: "order_not_actionable", message: "Status pesanan sudah berubah atau aksi ini tidak lagi tersedia" });

      if (input.action === "confirm") {
        await setPreparationEstimate(merchant.id, order.id, input.preparationMinutes ?? 15);
      } else if (input.action === "reject") {
        await restoreAutoSoldOutProducts(order.items);
      }

      return { data: order };
    } catch (error) { return routeError(request, reply, error); }
  });
}
