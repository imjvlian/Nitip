import type { MidtransNativeMethod } from "@nitip/domain/commerce";
import type { FastifyInstance, FastifyReply } from "fastify";

import { env, integrationStatus, IntegrationNotConfiguredError } from "../config/env.js";
import {
  cancelMidtransTransaction,
  MidtransApiError,
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
    throw new MidtransPaymentError(
      "invalid_payment_method",
      400,
      "Metode pembayaran tidak tersedia.",
    );
  }
  return value as MidtransNativeMethod;
}

function shouldReplacePayment(body: unknown) {
  return (
    typeof body === "object" &&
    body !== null &&
    "replace" in body &&
    (body as { replace?: unknown }).replace === true
  );
}

function isTerminalRetryStatus(status: string) {
  const value = status.trim().toLowerCase();
  return value === "cancel" || value === "deny";
}

function handleError(reply: FastifyReply, error: unknown) {
  if (error instanceof IntegrationNotConfiguredError) {
    return reply.code(503).send({
      error: "integration_not_configured",
      message: "Metode pembayaran belum tersedia.",
    });
  }
  if (error instanceof MidtransPaymentError) {
    return reply.code(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }
  if (error instanceof MidtransApiError) {
    return reply.code(502).send({
      error: "payment_provider_error",
      message: "Pembayaran belum dapat disiapkan. Coba lagi beberapa saat.",
    });
  }
  return null;
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
        const method = parseMethod(request.body);

        if (shouldReplacePayment(request.body)) {
          const current = await reconcileCustomerMidtransPayment(
            identity.uid,
            request.params.id,
          );
          if (!current) return reply.code(404).send({ error: "order_not_found" });
          if (current.order.status !== "pending_payment") return { data: current };
          if (current.instruction.method === method) return { data: current };

          if (!isTerminalRetryStatus(current.instruction.transactionStatus)) {
            try {
              await cancelMidtransTransaction(current.instruction.reference);
            } catch (cancelError) {
              const latest = await reconcileCustomerMidtransPayment(
                identity.uid,
                request.params.id,
              ).catch(() => null);
              if (latest && latest.order.status !== "pending_payment") {
                return { data: latest };
              }
              throw cancelError;
            }

            const cancelled = await reconcileCustomerMidtransPayment(
              identity.uid,
              request.params.id,
            );
            if (!cancelled) return reply.code(404).send({ error: "order_not_found" });
            if (cancelled.order.status !== "pending_payment") return { data: cancelled };
            if (!isTerminalRetryStatus(cancelled.instruction.transactionStatus)) {
              throw new MidtransPaymentError(
                "payment_method_change_failed",
                409,
                "Metode pembayaran belum dapat diubah. Coba lagi beberapa saat.",
              );
            }
          }
        }

        const result = await startCustomerMidtransPayment(
          identity.uid,
          request.params.id,
          method,
        );
        if (!result) return reply.code(404).send({ error: "order_not_found" });
        return { data: result };
      } catch (error) {
        const handled = handleError(reply, error);
        if (handled) return handled;
        request.log.error({ err: error }, "Midtrans charge failed");
        return reply.code(500).send({
          error: "internal_server_error",
          message: "Pembayaran belum dapat disiapkan.",
        });
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/orders/:id/payment/midtrans/reconcile",
    async (request, reply) => {
      const identity = await authenticateRequest(request, reply);
      if (!identity) return;
      try {
        const result = await reconcileCustomerMidtransPayment(
          identity.uid,
          request.params.id,
        );
        if (!result) return reply.code(404).send({ error: "order_not_found" });
        return { data: result };
      } catch (error) {
        const handled = handleError(reply, error);
        if (handled) return handled;
        request.log.error({ err: error }, "Midtrans reconciliation failed");
        return reply.code(500).send({
          error: "internal_server_error",
          message: "Status pembayaran belum dapat diperbarui.",
        });
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
      const handled = handleError(reply, error);
      if (handled) return handled;
      request.log.error({ err: error }, "Midtrans notification failed");
      return reply.code(500).send({ error: "internal_server_error" });
    }
  });
}
