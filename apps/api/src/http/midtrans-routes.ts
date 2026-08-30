import type { MidtransNativeMethod } from "@nitip/domain/commerce";
import type { FastifyInstance } from "fastify";

import { env, integrationStatus, IntegrationNotConfiguredError } from "../config/env.js";
import {
  type MidtransApiError,
  type MidtransResponse,
  verifyMidtransNotificationSignature,
} from "../lib/midtrans.js";
import { authenticateRequest } from "../lib/authenticate.js";
import {
  MidtransPaymentError,
  processMidtransNotification,
  reconcileCustomerMidtransPayment,
  startCustomerMidtransPayment,
} from "../repositories/midtrans-payments.js";

const METHODS = new Set<MidtransNativeMethod>([
  "qris",
  "bca_va",
  "bni_va",
  "bri_va",
  "mandiri_bill",
  "gopay",
  "shopeepay",
]);

function parseMethod(body: unknown): MidtransNativeMethod {
  const value =
    typeof body === "object" && body !== null && "method" in body
      ? String((body as { method?: unknown }).method ?? "")
      : "";
  if (!METHODS.has(value as MidtransNativeMethod)) {
    throw new MidtransPaymentError("invalid_payment_method", 400, "Metode pembayaran tidak tersedia.");
  }
  return value as MidtransNativeMethod;
}

function handleError(reply: Parameters<Parameters<FastifyInstance["post"]>[1]>[1], error: unknown) {
  if (error instanceof IntegrationNotConfiguredError) {
    return reply.code(503).send({ error: "integration_not_configured" });
  }
  if (error instanceof MidtransPaymentError) {
    return reply.code(error.statusCode).send({ error: error.code, message: error.message });
  }
  const providerError = error as Partial<MidtransApiError>;
  if (providerError?.name === "MidtransApiError") {
    return reply.code(502).send({
      error: "payment_provider_error",
      message: "Pembayaran belum dapat disiapkan. Coba lagi beberapa saat.",
    });
  }
  throw error;
}

export function registerMidtransRoutes(app: FastifyInstance) {
  app.get("/payments/config", async (request, reply) => {
    const identity = await authenticateRequest(request, reply);
    if (!identity) return;
    const available =
      env.paymentProvider === "midtrans"
        ? integrationStatus.midtrans
        : integrationStatus.doku;
    return {
      data: {
        provider: env.paymentProvider,
        available,
      },
    };
  });

  app.post<{ Params: { id: string } }>(
    "/orders/:id/payment/midtrans",
    async (request, reply) => {
      const identity = await authenticateRequest(request, reply);
      if (!identity) return;
      try {
        const result = await startCustomerMidtransPayment(
          identity.uid,
          request.params.id,
          parseMethod(request.body),
        );
        if (!result) return reply.code(404).send({ error: "order_not_found" });
        return { data: result };
      } catch (error) {
        try {
          return handleError(reply as never, error);
        } catch (unhandled) {
          request.log.error({ err: unhandled }, "Midtrans charge failed");
          return reply.code(500).send({ error: "internal_server_error", message: "Pembayaran belum dapat disiapkan." });
        }
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/orders/:id/payment/midtrans/reconcile",
    async (request, reply) => {
      const identity = await authenticateRequest(request, reply);
      if (!identity) return;
      try {
        const result = await reconcileCustomerMidtransPayment(identity.uid, request.params.id);
        if (!result) return reply.code(404).send({ error: "order_not_found" });
        return { data: result };
      } catch (error) {
        try {
          return handleError(reply as never, error);
        } catch (unhandled) {
          request.log.error({ err: unhandled }, "Midtrans reconciliation failed");
          return reply.code(500).send({ error: "internal_server_error", message: "Status pembayaran belum dapat diperbarui." });
        }
      }
    },
  );

  app.post("/payments/midtrans/notification", async (request, reply) => {
    const body = request.body as MidtransResponse;
    try {
      if (!verifyMidtransNotificationSignature(body)) {
        return reply.code(401).send({ error: "invalid_signature" });
      }
      const result = await processMidtransNotification(body);
      return { ok: true, ...result };
    } catch (error) {
      try {
        return handleError(reply as never, error);
      } catch (unhandled) {
        request.log.error({ err: unhandled }, "Midtrans notification failed");
        return reply.code(500).send({ error: "internal_server_error" });
      }
    }
  });
}
