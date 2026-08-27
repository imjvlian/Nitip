import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import {
  env,
  IntegrationNotConfiguredError,
} from "../config/env.js";

export const DOKU_CHECKOUT_TARGET = "/checkout/v1/payment";

export interface DokuConfig {
  baseUrl: string;
  clientId: string;
  secretKey: string;
  notificationUrl: string | null;
}

export interface DokuSignatureInput {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  body?: string | null;
  secretKey: string;
}

export interface DokuCheckoutInput {
  invoiceNumber: string;
  amount: number;
  paymentDueMinutes?: number;
  notificationUrl?: string | null;
}

export interface DokuCheckoutResult {
  requestId: string;
  checkoutUrl: string;
  response: unknown;
}

export class DokuApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response: unknown,
  ) {
    super(message);
    this.name = "DokuApiError";
  }
}

export function getDokuConfig(): DokuConfig {
  if (!env.dokuClientId || !env.dokuSecretKey) {
    throw new IntegrationNotConfiguredError("doku");
  }

  return {
    baseUrl: env.dokuBaseUrl.replace(/\/+$/, ""),
    clientId: env.dokuClientId,
    secretKey: env.dokuSecretKey,
    notificationUrl: env.dokuNotificationUrl,
  };
}

export function generateDokuDigest(body: string) {
  return createHash("sha256").update(body, "utf8").digest("base64");
}

export function generateDokuSignature(input: DokuSignatureInput) {
  const components = [
    `Client-Id:${input.clientId}`,
    `Request-Id:${input.requestId}`,
    `Request-Timestamp:${input.requestTimestamp}`,
    `Request-Target:${input.requestTarget}`,
  ];

  if (input.body != null) {
    components.push(`Digest:${generateDokuDigest(input.body)}`);
  }

  const digest = createHmac("sha256", input.secretKey)
    .update(components.join("\n"), "utf8")
    .digest("base64");

  return `HMACSHA256=${digest}`;
}

export function verifyDokuSignature(
  input: DokuSignatureInput & { signature: string },
) {
  const expected = Buffer.from(generateDokuSignature(input), "utf8");
  const received = Buffer.from(input.signature.trim(), "utf8");

  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  );
}

export function createDokuRequestHeaders(
  requestTarget: string,
  body?: string | null,
) {
  const config = getDokuConfig();
  const requestId = randomUUID();
  const requestTimestamp = new Date().toISOString();
  const signature = generateDokuSignature({
    clientId: config.clientId,
    requestId,
    requestTimestamp,
    requestTarget,
    body,
    secretKey: config.secretKey,
  });

  return {
    requestId,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Client-Id": config.clientId,
      "Request-Id": requestId,
      "Request-Timestamp": requestTimestamp,
      Signature: signature,
    },
  };
}

export function buildDokuCheckoutBody(input: DokuCheckoutInput) {
  const invoiceNumber = input.invoiceNumber.trim();
  if (!invoiceNumber || invoiceNumber.length > 64) {
    throw new Error("DOKU invoiceNumber must be between 1 and 64 characters");
  }
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("DOKU amount must be a positive integer in IDR");
  }
  if (
    input.paymentDueMinutes != null &&
    (!Number.isSafeInteger(input.paymentDueMinutes) || input.paymentDueMinutes <= 0)
  ) {
    throw new Error("DOKU paymentDueMinutes must be a positive integer");
  }

  const config = getDokuConfig();
  const notificationUrl = input.notificationUrl ?? config.notificationUrl;

  return JSON.stringify({
    order: {
      amount: input.amount,
      invoice_number: invoiceNumber,
      currency: "IDR",
    },
    ...(input.paymentDueMinutes != null
      ? { payment: { payment_due_date: input.paymentDueMinutes } }
      : {}),
    ...(notificationUrl
      ? { additional_info: { override_notification_url: notificationUrl } }
      : {}),
  });
}

function readCheckoutUrl(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const root = value as {
    payment?: { url?: unknown };
    response?: { payment?: { url?: unknown } };
  };
  const candidate = root.response?.payment?.url ?? root.payment?.url;
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : null;
}

export async function createDokuCheckout(
  input: DokuCheckoutInput,
): Promise<DokuCheckoutResult> {
  const config = getDokuConfig();
  const body = buildDokuCheckoutBody(input);
  const { requestId, headers } = createDokuRequestHeaders(
    DOKU_CHECKOUT_TARGET,
    body,
  );

  const response = await fetch(`${config.baseUrl}${DOKU_CHECKOUT_TARGET}`, {
    method: "POST",
    headers,
    body,
  });

  const raw = await response.text();
  let parsed: unknown = raw;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // Keep the raw response for diagnostics when DOKU does not return JSON.
  }

  if (!response.ok) {
    throw new DokuApiError(
      `DOKU checkout request failed with HTTP ${response.status}`,
      response.status,
      parsed,
    );
  }

  const checkoutUrl = readCheckoutUrl(parsed);
  if (!checkoutUrl) {
    throw new DokuApiError(
      "DOKU checkout response did not include payment.url",
      response.status,
      parsed,
    );
  }

  return {
    requestId,
    checkoutUrl,
    response: parsed,
  };
}
