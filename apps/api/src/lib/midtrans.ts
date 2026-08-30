import { createHash, timingSafeEqual } from "node:crypto";

import { env, IntegrationNotConfiguredError } from "../config/env.js";

export type MidtransAction = {
  name?: string;
  method?: string;
  url?: string;
};

export interface MidtransResponse {
  status_code?: string;
  status_message?: string;
  validation_messages?: string[];
  transaction_id?: string;
  order_id?: string;
  gross_amount?: string;
  currency?: string;
  payment_type?: string;
  transaction_time?: string;
  settlement_time?: string;
  transaction_status?: string;
  fraud_status?: string;
  signature_key?: string;
  expiry_time?: string;
  va_numbers?: Array<{ bank?: string; va_number?: string }>;
  permata_va_number?: string;
  biller_code?: string;
  bill_key?: string;
  qr_string?: string;
  actions?: MidtransAction[];
}

export type MidtransChargeBody = {
  payment_type: string;
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  custom_expiry?: {
    expiry_duration: number;
    unit: "minute";
  };
  customer_details?: {
    first_name?: string;
    phone?: string;
  };
  qris?: {
    acquirer?: "gopay";
  };
  bank_transfer?: {
    bank: "bca" | "bni" | "bri";
  };
  echannel?: {
    bill_info1?: string;
    bill_info2?: string;
  };
  gopay?: {
    enable_callback: boolean;
    callback_url: string;
  };
  shopeepay?: {
    callback_url: string;
  };
};

export class MidtransApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly providerMessage: string,
  ) {
    super(providerMessage);
    this.name = "MidtransApiError";
  }
}

function credentials() {
  if (!env.midtransServerKey) {
    throw new IntegrationNotConfiguredError("midtrans");
  }
  return Buffer.from(`${env.midtransServerKey}:`, "utf8").toString("base64");
}

async function readMidtransResponse(response: Response) {
  let body: MidtransResponse = {};
  try {
    body = (await response.json()) as MidtransResponse;
  } catch {
    // Keep the provider response opaque to callers when the upstream body is malformed.
  }

  if (!response.ok) {
    const message =
      body.validation_messages?.filter(Boolean).join(" · ") ||
      body.status_message ||
      `Midtrans returned HTTP ${response.status}`;
    throw new MidtransApiError(response.status, message);
  }
  return body;
}

async function midtransRequest(
  path: string,
  init?: RequestInit & { idempotencyKey?: string },
) {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Basic ${credentials()}`);
  if (init?.body) headers.set("Content-Type", "application/json");
  if (init?.idempotencyKey) headers.set("Idempotency-Key", init.idempotencyKey);
  if (env.midtransNotificationUrl && init?.method === "POST" && path === "/v2/charge") {
    headers.set("X-Override-Notification", env.midtransNotificationUrl);
  }

  return readMidtransResponse(
    await fetch(`${env.midtransBaseUrl}${path}`, {
      ...init,
      headers,
    }),
  );
}

export function createMidtransCharge(
  body: MidtransChargeBody,
  idempotencyKey: string,
) {
  return midtransRequest("/v2/charge", {
    method: "POST",
    body: JSON.stringify(body),
    idempotencyKey,
  });
}

export function getMidtransTransactionStatus(reference: string) {
  return midtransRequest(`/v2/${encodeURIComponent(reference)}/status`);
}

export function verifyMidtransNotificationSignature(body: MidtransResponse) {
  if (!env.midtransServerKey) {
    throw new IntegrationNotConfiguredError("midtrans");
  }
  const orderId = body.order_id ?? "";
  const statusCode = body.status_code ?? "";
  const grossAmount = body.gross_amount ?? "";
  const signature = body.signature_key?.trim().toLowerCase() ?? "";
  if (!orderId || !statusCode || !grossAmount || !signature) return false;

  const expected = createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${env.midtransServerKey}`, "utf8")
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export function findMidtransAction(
  body: MidtransResponse,
  ...names: string[]
) {
  const wanted = new Set(names);
  return body.actions?.find((action) => action.name && wanted.has(action.name))?.url ?? null;
}
