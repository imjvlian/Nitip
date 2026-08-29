import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { env, IntegrationNotConfiguredError } from "../config/env.js";

export const DOKU_CHECKOUT_PATH = "/checkout/v1/payment";
export const DOKU_STATUS_PATH = "/orders/v1/status";

export interface DokuCheckoutResponse {
  response?: {
    order?: { amount?: number | string; invoice_number?: string };
    payment?: { token_id?: string; url?: string; expired_date?: string };
  };
  error_messages?: string[];
  message?: unknown;
}

export interface DokuNotificationBody {
  order?: {
    invoice_number?: string;
    amount?: number | string;
    status?: string;
    date?: string;
  };
  transaction?: {
    status?: string;
    date?: string;
    original_request_id?: string;
  };
  service?: { id?: string | null };
  acquirer?: { id?: string | null };
  channel?: { id?: string | null };
  [key: string]: unknown;
}

function requireDokuCredentials() {
  if (!env.dokuClientId || !env.dokuSecretKey) {
    throw new IntegrationNotConfiguredError("doku");
  }
  return { clientId: env.dokuClientId, secretKey: env.dokuSecretKey };
}

function dokuTimestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
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

function dokuErrorText(value: unknown) {
  if (typeof value === "string") return value.trim() || null;
  if (!value || typeof value !== "object") return value == null ? null : String(value);
  const nested = value as { code?: unknown; message?: unknown; type?: unknown };
  const message = typeof nested.message === "string" ? nested.message.trim() : "";
  const code = typeof nested.code === "string" ? nested.code.trim() : "";
  const type = typeof nested.type === "string" ? nested.type.trim() : "";
  if (message) return [code, message].filter(Boolean).join(": ");
  if (type) return [code, type].filter(Boolean).join(": ");
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function readDokuJson<T>(response: Response, operation: string): Promise<T> {
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new Error(`DOKU ${operation} returned an invalid JSON response`);
  }
  if (!response.ok) {
    const body = parsed as {
      error_messages?: unknown;
      message?: unknown;
      error?: unknown;
    };
    const errorMessages = Array.isArray(body.error_messages)
      ? body.error_messages.map(dokuErrorText).filter((value): value is string => Boolean(value))
      : [];
    const messageValues = Array.isArray(body.message)
      ? body.message.map(dokuErrorText).filter((value): value is string => Boolean(value))
      : [];
    const directMessage = !Array.isArray(body.message) ? dokuErrorText(body.message) : null;
    const nestedError = dokuErrorText(body.error);
    const detail =
      errorMessages.join("; ") ||
      messageValues.join("; ") ||
      directMessage ||
      nestedError;
    let fallback = "";
    if (!detail) {
      try {
        fallback = JSON.stringify(parsed).slice(0, 1200);
      } catch {
        fallback = String(parsed);
      }
    }
    throw new Error(
      detail
        ? `DOKU ${operation} rejected the request: ${detail}`
        : `DOKU ${operation} failed with HTTP ${response.status}${fallback ? `: ${fallback}` : ""}`,
    );
  }
  return parsed as T;
}

function validateCheckoutResponse(parsed: DokuCheckoutResponse, input: { invoiceNumber: string; amount: number }) {
  const returnedInvoice = parsed.response?.order?.invoice_number;
  if (returnedInvoice && returnedInvoice !== input.invoiceNumber) {
    throw new Error("DOKU Checkout returned a different invoice number");
  }
  const rawAmount = parsed.response?.order?.amount;
  const returnedAmount = typeof rawAmount === "string" ? Number(rawAmount) : rawAmount;
  if (returnedAmount != null && (!Number.isFinite(returnedAmount) || Math.round(returnedAmount) !== Math.round(input.amount))) {
    throw new Error("DOKU Checkout returned a different order amount");
  }
  const checkoutUrl = parsed.response?.payment?.url;
  if (!checkoutUrl) throw new Error("DOKU Checkout did not return payment.url");
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(checkoutUrl);
  } catch {
    throw new Error("DOKU Checkout returned an invalid payment.url");
  }
  if (parsedUrl.protocol !== "https:") throw new Error("DOKU Checkout returned an insecure payment.url");
  return checkoutUrl;
}

export async function createDokuCheckout(input: {
  invoiceNumber: string;
  amount: number;
  dueMinutes: number;
}) {
  const credentials = requireDokuCredentials();
  const amount = Math.round(input.amount);
  if (!Number.isFinite(input.amount) || amount <= 0 || amount !== input.amount) {
    throw new Error("DOKU Checkout amount must be a positive whole IDR value");
  }
  const requestId = randomUUID();
  const requestTimestamp = dokuTimestamp();
  const body = {
    order: {
      amount,
      invoice_number: input.invoiceNumber,
    },
    payment: {
      payment_due_date: Math.max(1, Math.floor(input.dueMinutes)),
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
    const parsed = await readDokuJson<DokuCheckoutResponse>(response, "Checkout");
    const checkoutUrl = validateCheckoutResponse(parsed, { invoiceNumber: input.invoiceNumber, amount });
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

export async function getDokuOrderStatus(invoiceNumber: string): Promise<DokuNotificationBody> {
  const credentials = requireDokuCredentials();
  const requestId = randomUUID();
  const requestTimestamp = dokuTimestamp();
  const requestTarget = `${DOKU_STATUS_PATH}/${encodeURIComponent(invoiceNumber)}`;
  const signature = dokuSignature({
    clientId: credentials.clientId,
    requestId,
    requestTimestamp,
    requestTarget,
    secretKey: credentials.secretKey,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${env.dokuBaseUrl}${requestTarget}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Client-Id": credentials.clientId,
        "Request-Id": requestId,
        "Request-Timestamp": requestTimestamp,
        Signature: signature,
      },
      signal: controller.signal,
    });
    return await readDokuJson<DokuNotificationBody>(response, "Check Status");
  } finally {
    clearTimeout(timer);
  }
}
