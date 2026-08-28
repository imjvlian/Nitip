import { Readable } from "node:stream";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { env, IntegrationNotConfiguredError } from "../config/env.js";
import { verifyDokuNotificationSignature, type DokuNotificationBody } from "../lib/doku.js";
import { authenticateRequest } from "../lib/authenticate.js";
import { DokuPaymentError, processDokuNotification, startCustomerDokuCheckout } from "../repositories/doku-payments.js";

interface RawBodyRequest extends FastifyRequest {
  dokuRawBody?: string;
}

function headerValue(request: FastifyRequest, name: string) {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : typeof value === "string" ? value : null;
}

function routeError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (error instanceof IntegrationNotConfiguredError) {
    return reply.code(503).send({ error: "integration_not_configured", integration: error.integration });
  }
  if (error instanceof DokuPaymentError) {
    return reply.code(error.statusCode).send({ error: error.code, message: error.message });
  }
  request.log.error({ err: error }, "Nitip DOKU route failed");
  return reply.code(500).send({ error: "internal_server_error", message: "Unable to complete DOKU request" });
}

export function registerDokuRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>("/orders/:id/payment/doku", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;
    try {
      const order = await startCustomerDokuCheckout(identity.uid, request.params.id);
      if (!order) return reply.code(404).send({ error: "order_not_found" });
      return { data: order };
    } catch (error) {
      return routeError(request, reply, error);
    }
  });

  app.post(
    "/payments/doku/notification",
    {
      preParsing: async (request, _reply, payload) => {
        const chunks: Buffer[] = [];
        for await (const chunk of payload) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        (request as RawBodyRequest).dokuRawBody = buffer.toString("utf8");
        return Readable.from(buffer);
      },
    },
    async (request, reply) => {
      try {
        if (!env.dokuClientId || !env.dokuSecretKey) throw new IntegrationNotConfiguredError("doku");
        const rawBody = (request as RawBodyRequest).dokuRawBody ?? "";
        const clientId = headerValue(request, "client-id");
        const requestId = headerValue(request, "request-id");
        const requestTimestamp = headerValue(request, "request-timestamp");
        const signature = headerValue(request, "signature");
        if (!clientId || !requestId || !requestTimestamp || !signature || !rawBody) {
          return reply.code(401).send({ error: "invalid_doku_notification_headers" });
        }
        const requestTarget = request.raw.url?.split("?")[0] ?? "/payments/doku/notification";
        const valid = verifyDokuNotificationSignature({
          clientId,
          requestId,
          requestTimestamp,
          signature,
          requestTarget,
          rawBody,
        });
        if (!valid) return reply.code(401).send({ error: "invalid_doku_signature" });

        const body = request.body as DokuNotificationBody;
        const result = await processDokuNotification(requestId, body);
        return { ok: true, duplicate: result.duplicate };
      } catch (error) {
        return routeError(request, reply, error);
      }
    },
  );
}
