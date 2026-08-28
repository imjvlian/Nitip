import type { CloudinaryUploadSignature } from "@nitip/domain/catalog";
import type { DriverDeliveryActionInput } from "@nitip/domain/driver";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { IntegrationNotConfiguredError } from "../config/env.js";
import { authenticateRequest } from "../lib/authenticate.js";
import { createDeliveryProofUploadSignature } from "../lib/cloudinary.js";
import { applyDriverDeliveryAction, DriverDeliveryError } from "../repositories/driver-deliveries.js";
import { listDriverCompletedOrders } from "../repositories/driver-history.js";
import { ensureDeliveryOtp } from "../repositories/order-operations.js";
import { listProximityDriverOffers } from "../repositories/driver-proximity.js";
import { getDriverProfileByOwner } from "../repositories/drivers.js";
import { acceptDriverOrder, DriverDispatchError, getDriverCurrentOrder, getDriverOrder } from "../repositories/orders.js";

function routeError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (error instanceof IntegrationNotConfiguredError) {
    return reply.code(503).send({ error: "integration_not_configured", integration: error.integration });
  }
  if (error instanceof DriverDispatchError || error instanceof DriverDeliveryError) {
    return reply.code(error.statusCode).send({ error: error.code, message: error.message });
  }
  request.log.error({ err: error }, "Nitip driver order route failed");
  return reply.code(500).send({ error: "internal_server_error", message: "Unable to complete driver order request" });
}

function parseDeliveryAction(body: unknown): DriverDeliveryActionInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const action = record.action;
  if (action !== "confirm_pickup" && action !== "start_delivery" && action !== "complete_delivery") return null;

  const input: DriverDeliveryActionInput = { action };
  if (record.otp !== undefined) {
    if (typeof record.otp !== "string") return null;
    input.otp = record.otp.trim();
  }
  if (record.proofUrl !== undefined) {
    if (record.proofUrl === null) input.proofUrl = null;
    else if (typeof record.proofUrl === "string") {
      const proofUrl = record.proofUrl.trim();
      if (proofUrl.length > 1600 || (proofUrl && !proofUrl.startsWith("https://"))) return null;
      input.proofUrl = proofUrl || null;
    } else return null;
  }
  return input;
}

async function resolveDriver(request: FastifyRequest, reply: FastifyReply, requireOnline = false) {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return null;
  const driver = await getDriverProfileByOwner(identity.uid);
  if (!driver) { await reply.code(404).send({ error: "driver_profile_not_found" }); return null; }
  if (driver.status !== "approved") {
    await reply.code(403).send({ error: "driver_not_approved", message: "Driver harus approved untuk mengakses dispatch" });
    return null;
  }
  if (requireOnline && !driver.isOnline) {
    await reply.code(409).send({ error: "driver_offline", message: "Aktifkan status online untuk menerima order" });
    return null;
  }
  return driver;
}

export function registerDriverOrderRoutes(app: FastifyInstance) {
  app.get("/driver/orders/current", async (request, reply) => {
    try { const driver = await resolveDriver(request, reply); if (!driver) return; return { data: await getDriverCurrentOrder(driver.id) }; }
    catch (error) { return routeError(request, reply, error); }
  });

  app.get("/driver/orders/available", async (request, reply) => {
    try { const driver = await resolveDriver(request, reply, true); if (!driver) return; return { data: await listProximityDriverOffers(driver) }; }
    catch (error) { return routeError(request, reply, error); }
  });

  app.get("/driver/orders/history", async (request, reply) => {
    try { const driver = await resolveDriver(request, reply); if (!driver) return; return { data: await listDriverCompletedOrders(driver.id) }; }
    catch (error) { return routeError(request, reply, error); }
  });

  app.get<{ Params: { id: string } }>("/driver/orders/:id", async (request, reply) => {
    try {
      const driver = await resolveDriver(request, reply); if (!driver) return;
      const order = await getDriverOrder(driver.id, request.params.id);
      if (!order) return reply.code(404).send({ error: "driver_order_not_found" });
      return { data: order };
    } catch (error) { return routeError(request, reply, error); }
  });

  app.post<{ Params: { id: string } }>("/driver/orders/:id/accept", async (request, reply) => {
    try {
      const driver = await resolveDriver(request, reply, true); if (!driver) return;
      const order = await acceptDriverOrder(driver.id, request.params.id);
      if (!order) return reply.code(409).send({ error: "order_already_taken", message: "Order sudah diambil driver lain atau tidak lagi tersedia" });
      await ensureDeliveryOtp(order.id);
      return { data: order };
    } catch (error) { return routeError(request, reply, error); }
  });

  app.post<{ Params: { id: string } }>("/driver/orders/:id/proof/signature", async (request, reply) => {
    try {
      const driver = await resolveDriver(request, reply); if (!driver) return;
      const order = await getDriverOrder(driver.id, request.params.id);
      if (!order) return reply.code(404).send({ error: "driver_order_not_found" });
      if (order.status !== "on_delivery") {
        return reply.code(409).send({ error: "proof_not_available", message: "Bukti pengantaran dapat diunggah saat order sedang diantar" });
      }
      const data: CloudinaryUploadSignature = createDeliveryProofUploadSignature(driver.id);
      return { data };
    } catch (error) { return routeError(request, reply, error); }
  });

  app.post<{ Params: { id: string } }>("/driver/orders/:id/action", async (request, reply) => {
    try {
      const driver = await resolveDriver(request, reply); if (!driver) return;
      const input = parseDeliveryAction(request.body);
      if (!input) return reply.code(400).send({ error: "invalid_driver_action", message: "Aksi perjalanan driver tidak valid" });
      const updated = await applyDriverDeliveryAction(driver.id, request.params.id, input);
      if (!updated) return reply.code(409).send({ error: "driver_action_not_allowed", message: "Status order sudah berubah atau aksi ini belum tersedia" });
      const order = await getDriverOrder(driver.id, request.params.id);
      if (!order) return reply.code(404).send({ error: "driver_order_not_found" });
      return { data: order };
    } catch (error) { return routeError(request, reply, error); }
  });
}
