import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { authenticateRequest } from "../lib/authenticate.js";
import { getDriverProfileByOwner } from "../repositories/drivers.js";
import {
  getCustomerOrderChat,
  getDriverOrderChat,
  OrderChatError,
  sendCustomerOrderChatMessage,
  sendDriverOrderChatMessage,
} from "../repositories/order-chat.js";

function chatRouteError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (error instanceof OrderChatError) {
    return reply.code(error.statusCode).send({ error: error.code, message: error.message });
  }
  request.log.error({ err: error }, "Nitip order chat route failed");
  return reply.code(500).send({
    error: "internal_server_error",
    message: "Unable to complete chat request",
  });
}

function parseMessageBody(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new OrderChatError("chat_message_invalid", 400, "Chat body harus berupa object.");
  }
  const text = (body as Record<string, unknown>).text;
  if (typeof text !== "string") {
    throw new OrderChatError("chat_message_invalid", 400, "Field text wajib berupa string.");
  }
  return text;
}

async function resolveDriver(request: FastifyRequest, reply: FastifyReply) {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return null;
  const driver = await getDriverProfileByOwner(identity.uid);
  if (!driver) {
    await reply.code(404).send({ error: "driver_profile_not_found" });
    return null;
  }
  if (driver.status !== "approved") {
    await reply.code(403).send({
      error: "driver_not_approved",
      message: "Driver harus approved untuk mengakses chat order.",
    });
    return null;
  }
  return driver;
}

export function registerOrderChatRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/orders/:id/chat", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;
    try {
      const thread = await getCustomerOrderChat(identity.uid, request.params.id);
      if (!thread) return reply.code(404).send({ error: "order_not_found" });
      return { data: thread };
    } catch (error) {
      return chatRouteError(request, reply, error);
    }
  });

  app.post<{ Params: { id: string } }>("/orders/:id/chat", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;
    try {
      const message = await sendCustomerOrderChatMessage(
        identity.uid,
        request.params.id,
        parseMessageBody(request.body),
      );
      if (!message) return reply.code(404).send({ error: "order_not_found" });
      return reply.code(201).send({ data: message });
    } catch (error) {
      return chatRouteError(request, reply, error);
    }
  });

  app.get<{ Params: { id: string } }>("/driver/orders/:id/chat", async (request, reply) => {
    try {
      const driver = await resolveDriver(request, reply);
      if (!driver) return;
      const thread = await getDriverOrderChat(driver.id, request.params.id);
      if (!thread) return reply.code(404).send({ error: "driver_order_not_found" });
      return { data: thread };
    } catch (error) {
      return chatRouteError(request, reply, error);
    }
  });

  app.post<{ Params: { id: string } }>("/driver/orders/:id/chat", async (request, reply) => {
    try {
      const driver = await resolveDriver(request, reply);
      if (!driver) return;
      const message = await sendDriverOrderChatMessage(
        driver.id,
        request.params.id,
        parseMessageBody(request.body),
      );
      if (!message) return reply.code(404).send({ error: "driver_order_not_found" });
      return reply.code(201).send({ data: message });
    } catch (error) {
      return chatRouteError(request, reply, error);
    }
  });
}
