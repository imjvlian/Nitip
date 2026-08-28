import type { UpsertNitipOrderRatingInput } from "@nitip/domain/commerce";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { env, IntegrationNotConfiguredError } from "../config/env.js";
import { authenticateRequest } from "../lib/authenticate.js";
import { cancelPendingCustomerOrder, CustomerCancellationError } from "../repositories/customer-cancellations.js";
import { autoDisableSoldOutProducts } from "../repositories/inventory-guard.js";
import { getCustomerOrderOperations } from "../repositories/order-operations.js";
import { getCustomerOrderTracking } from "../repositories/order-tracking.js";
import { CheckoutError, createCustomerOrder, getCustomerOrder, listCustomerOrders, quoteCheckout, simulateCustomerPayment } from "../repositories/orders.js";
import { getCustomerOrderRating, RatingError, upsertCustomerOrderRating } from "../repositories/ratings.js";
import { parseCheckoutRequest } from "./checkout-validation.js";
import { ValidationError } from "./validation.js";

function handleOrderError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (error instanceof IntegrationNotConfiguredError) return reply.code(503).send({ error: "integration_not_configured", integration: error.integration });
  if (error instanceof ValidationError) return reply.code(400).send({ error: "validation_error", message: error.message });
  if (error instanceof RatingError) return reply.code(error.statusCode).send({ error: error.code, message: error.message });
  if (error instanceof CheckoutError) return reply.code(error.statusCode).send({ error: error.code, message: error.message });
  if (error instanceof CustomerCancellationError) return reply.code(error.statusCode).send({ error: error.code, message: error.message });
  request.log.error({ err: error }, "Nitip order route failed");
  return reply.code(500).send({ error: "internal_server_error", message: "Unable to complete order request" });
}

function parseIdempotencyKey(request: FastifyRequest) {
  const raw = request.headers["idempotency-key"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") throw new ValidationError("Idempotency-Key header is required");
  const key = value.trim();
  if (key.length < 16 || key.length > 128) throw new ValidationError("Idempotency-Key must be between 16 and 128 characters");
  if (!/^[A-Za-z0-9._:-]+$/.test(key)) throw new ValidationError("Idempotency-Key contains unsupported characters");
  return key;
}

function parseRatingInput(value: unknown): UpsertNitipOrderRatingInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ValidationError("Rating body must be an object");
  const body = value as Record<string, unknown>;
  const score = body.score;
  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 5) throw new ValidationError("Rating score must be an integer from 1 to 5");
  const rawComment = body.comment;
  if (rawComment !== undefined && rawComment !== null && typeof rawComment !== "string") throw new ValidationError("Rating comment must be a string");
  const comment = typeof rawComment === "string" ? rawComment.trim() : null;
  if (comment && comment.length > 500) throw new ValidationError("Rating comment must not exceed 500 characters");
  return { score, comment: comment || null };
}

function parseCancelReason(value: unknown) {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw new ValidationError("Cancellation body must be an object");
  const reason = (value as Record<string, unknown>).reason;
  if (reason == null) return null;
  if (typeof reason !== "string") throw new ValidationError("Cancellation reason must be a string");
  const trimmed = reason.trim();
  if (trimmed.length > 300) throw new ValidationError("Cancellation reason must not exceed 300 characters");
  return trimmed || null;
}

export function registerOrderRoutes(app: FastifyInstance) {
  app.post("/checkout/quote", async (request, reply) => {
    const identity = await authenticateRequest(request, reply); if (!identity) return;
    try { return { data: await quoteCheckout(identity.uid, parseCheckoutRequest(request.body)) }; }
    catch (error) { return handleOrderError(request, reply, error); }
  });

  app.post("/orders", async (request, reply) => {
    const identity = await authenticateRequest(request, reply); if (!identity) return;
    try { const order = await createCustomerOrder(identity.uid, parseCheckoutRequest(request.body), parseIdempotencyKey(request)); return reply.code(201).send({ data: order }); }
    catch (error) { return handleOrderError(request, reply, error); }
  });

  app.get("/me/orders", async (request, reply) => {
    const identity = await authenticateRequest(request, reply); if (!identity) return;
    try { return { data: await listCustomerOrders(identity.uid) }; } catch (error) { return handleOrderError(request, reply, error); }
  });

  app.get<{ Params: { id: string } }>("/orders/:id", async (request, reply) => {
    const identity = await authenticateRequest(request, reply); if (!identity) return;
    try { const order = await getCustomerOrder(identity.uid, request.params.id); if (!order) return reply.code(404).send({ error: "order_not_found" }); return { data: order }; }
    catch (error) { return handleOrderError(request, reply, error); }
  });

  app.post<{ Params: { id: string } }>("/orders/:id/cancel", async (request, reply) => {
    const identity = await authenticateRequest(request, reply); if (!identity) return;
    try { const order = await cancelPendingCustomerOrder(identity.uid, request.params.id, parseCancelReason(request.body)); if (!order) return reply.code(404).send({ error: "order_not_found" }); return { data: order }; }
    catch (error) { return handleOrderError(request, reply, error); }
  });

  app.get<{ Params: { id: string } }>("/orders/:id/operations", async (request, reply) => {
    const identity = await authenticateRequest(request, reply); if (!identity) return;
    try { const data = await getCustomerOrderOperations(identity.uid, request.params.id); if (!data) return reply.code(404).send({ error: "order_not_found" }); return { data }; }
    catch (error) { return handleOrderError(request, reply, error); }
  });

  app.get<{ Params: { id: string } }>("/orders/:id/tracking", async (request, reply) => {
    const identity = await authenticateRequest(request, reply); if (!identity) return;
    try { const data = await getCustomerOrderTracking(identity.uid, request.params.id); if (!data) return reply.code(404).send({ error: "order_not_found" }); return { data }; }
    catch (error) { return handleOrderError(request, reply, error); }
  });

  app.get<{ Params: { id: string } }>("/orders/:id/rating", async (request, reply) => {
    const identity = await authenticateRequest(request, reply); if (!identity) return;
    try { return { data: await getCustomerOrderRating(identity.uid, request.params.id) }; } catch (error) { return handleOrderError(request, reply, error); }
  });

  app.put<{ Params: { id: string } }>("/orders/:id/rating", async (request, reply) => {
    const identity = await authenticateRequest(request, reply); if (!identity) return;
    try { return { data: await upsertCustomerOrderRating(identity.uid, request.params.id, parseRatingInput(request.body)) }; } catch (error) { return handleOrderError(request, reply, error); }
  });

  app.post<{ Params: { id: string } }>("/orders/:id/simulate-payment", async (request, reply) => {
    const identity = await authenticateRequest(request, reply); if (!identity) return;
    if (env.nodeEnv === "production") return reply.code(404).send({ error: "not_found" });
    try {
      const order = await simulateCustomerPayment(identity.uid, request.params.id);
      if (!order) return reply.code(409).send({ error: "payment_not_simulatable", message: "Pesanan tidak ditemukan atau sudah tidak menunggu pembayaran" });
      if (order.status === "paid") await autoDisableSoldOutProducts(order.items);
      return { data: order };
    } catch (error) { return handleOrderError(request, reply, error); }
  });
}
