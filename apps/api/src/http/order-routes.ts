import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { IntegrationNotConfiguredError } from "../config/env.js";
import { authenticateRequest } from "../lib/authenticate.js";
import {
  CheckoutError,
  createCustomerOrder,
  getCustomerOrder,
  listCustomerOrders,
  quoteCheckout,
} from "../repositories/orders.js";
import { parseCheckoutRequest } from "./checkout-validation.js";
import { ValidationError } from "./validation.js";

function handleOrderError(
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

  if (error instanceof CheckoutError) {
    return reply.code(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  request.log.error({ err: error }, "Nitip order route failed");
  return reply.code(500).send({
    error: "internal_server_error",
    message: "Unable to complete order request",
  });
}

export function registerOrderRoutes(app: FastifyInstance) {
  app.post("/checkout/quote", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      const input = parseCheckoutRequest(request.body);
      return { data: await quoteCheckout(identity.uid, input) };
    } catch (error) {
      return handleOrderError(request, reply, error);
    }
  });

  app.post("/orders", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      const input = parseCheckoutRequest(request.body);
      const order = await createCustomerOrder(identity.uid, input);
      return reply.code(201).send({ data: order });
    } catch (error) {
      return handleOrderError(request, reply, error);
    }
  });

  app.get("/me/orders", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      return { data: await listCustomerOrders(identity.uid) };
    } catch (error) {
      return handleOrderError(request, reply, error);
    }
  });

  app.get<{ Params: { id: string } }>("/orders/:id", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      const order = await getCustomerOrder(identity.uid, request.params.id);
      if (!order) {
        return reply.code(404).send({ error: "order_not_found" });
      }
      return { data: order };
    } catch (error) {
      return handleOrderError(request, reply, error);
    }
  });
}
