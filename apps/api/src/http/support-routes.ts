import type { FastifyInstance } from "fastify";

import { authenticateRequest } from "../lib/authenticate.js";
import {
  createSupportTicket,
  listSupportTickets,
} from "../repositories/support-tickets.js";
import { parseCreateSupportTicket, ValidationError } from "./validation.js";

export function registerSupportRoutes(app: FastifyInstance) {
  app.get("/me/support-tickets", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      return { data: await listSupportTickets(identity.uid) };
    } catch (error) {
      request.log.error({ err: error }, "Unable to list support tickets");
      return reply.code(500).send({
        error: "internal_server_error",
        message: "Unable to load support tickets",
      });
    }
  });

  app.post("/me/support-tickets", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;

    try {
      const input = parseCreateSupportTicket(request.body);
      const ticket = await createSupportTicket(identity.uid, input);
      return reply.code(201).send({ data: ticket });
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.code(400).send({
          error: "validation_error",
          message: error.message,
        });
      }
      request.log.error({ err: error }, "Unable to create support ticket");
      return reply.code(500).send({
        error: "internal_server_error",
        message: "Unable to create support ticket",
      });
    }
  });
}
