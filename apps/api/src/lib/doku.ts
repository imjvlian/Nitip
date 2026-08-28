import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { env, IntegrationNotConfiguredError } from "../config/env.js";

export const DOKU_CHECKOUT_PATH = "/checkout/v1/payment";

export interface DokuCheckoutResponse {
  response?: {
    order?: {
      amount?: number;
      invoice_number?: string;
    };
    payment?: {
      token_id?: string;
      url?: string;
      expired_date?: string;
    };
  };
  error_messages?: string[];
  message?: unknown;
}

export interface DokuNotificationBody {
  order?: {
    invoice_number?: string;
    amount?: number | string;
    status?: string;
  };
  transaction?: {
    status?: string;
    date?: string;
    original_request_id?: string;
  };
  service?: { id?: string };
  acquirer?: { id?: string };
  channel?: { id?: string };
  [key: string]: unknown;
}

function requireDokuCredentials() {
  if (!env.dokuClientId || !env.dokuSecretKey) {
    throw new IntegrationNotConfiguredError("doku");
  }
  return { clientId: env.dokuClientId, secretKey: env.dokuSecretKey };
}

export function dokuDigest(rawBody: string) {
  return createHash("sha256").update(rawBody, "utf8").digest("base64");
}

export function dokuSignature(input: {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  rawBody?: string | null;
  secretKey: string;
}) {
  const parts = [
    `Client-Id:${input.clientId}`,
    `Request-Id:${input.requestId}`,
    `Request-Timestamp:${input.requestTimestamp}`,
    `Request-Target:${input.requestTarget}`,
  ];
  if (input.rawBody != null) parts.push(`Digest:${dokuDigest(input.rawBody)}`);
  const digest = createHmac("sha256", input.secretKey)
    .update(parts.join("\n"), "utf8")
    .digest("base64");
  return `HMACSHA256=${digest}`;
}

export function verifyDokuNotificationSignature(input: {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  signature: string;
  requestTarget: string;
  rawBody: string;
}) {
  const credentials = requireDokuCredentials();
  if (input.clientId !== credentials.clientId) return false;
  const expected = dokuSignature({
    clientId: input.clientId,
    requestId: input.requestId,
    requestTimestamp: input.requestTimestamp,
    requestTarget: input.requestTarget,
    rawBody: input.rawBody,
    secretKey: credentials.secretKey,
  });
  const actualBuffer = Buffer.from(input.signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function parseDokuExpiry(value: string | undefined) {
  if (!value || !/^\d{14}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const hourUtcPlus7 = Number(value.slice(8, 10));
  const minute = Number(value.slice(10, 12));
  const second = Number(value.slice(12, 14));
  const timestamp = Date.UTC(year, month - 1, day, hourUtcPlus7 - 7, minute, second);
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createDokuCheckout(input: {
  invoiceNumber: string;
  amount: number;
  dueMinutes: number;
}) {
  const credentials = requireDokuCredentials();
  const requestId = randomUUID();
  const requestTimestamp = new Date().toISOString();
  const body = {
    order: {
      amount: input.amount,
      invoice_number: input.invoiceNumber,
      currency: "IDR",
      auto_redirect: false,
    },
    payment: {
      payment_due_date: Math.max(1, Math.floor(input.dueMinutes)),
      type: "SALE",
    },
    ...(env.dokuNotificationUrl
      ? { additional_info: { override_notification_url: env.dokuNotificationUrl } }
      : {}),
  };
  const rawBody = JSON.stringify(body);
  const signature = dokuSignature({
    clientId: credentials.clientId,
    requestId,
    requestTimestamp,
    requestTarget: DOKU_CHECKOUT_PATH,
    rawBody,
    secretKey: credentials.secretKey,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${env.dokuBaseUrl}${DOKU_CHECKOUT_PATH}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Client-Id": credentials.clientId,
        "Request-Id": requestId,
        "Request-Timestamp": requestTimestamp,
        Signature: signature,
      },
      body: rawBody,
      signal: controller.signal,
    });

    let parsed: DokuCheckoutResponse = {};
    try {
      parsed = (await response.json()) as DokuCheckoutResponse;
    } catch {
      throw new Error("DOKU returned an invalid JSON response");
    }
    if (!response.ok) {
      const message = parsed.error_messages?.join("; ") || `DOKU Checkout failed with HTTP ${response.status}`;
      throw new Error(message);
    }

    const checkoutUrl = parsed.response?.payment?.url;
    if (!checkoutUrl) throw new Error("DOKU Checkout did not return payment.url");
    return {
      requestId,
      checkoutUrl,
      expiresAt: parseDokuExpiry(parsed.response?.payment?.expired_date),
      tokenId: parsed.response?.payment?.token_id ?? null,
    };
  } finally {
    clearTimeout(timer);
  }
}
