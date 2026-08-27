import type {
  MerchantOrderAction,
  MerchantOrderActionInput,
} from "@nitip/domain/commerce";

import { ValidationError } from "./validation.js";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Request body must be a JSON object");
  }
  return value as Record<string, unknown>;
}

function isAction(value: unknown): value is MerchantOrderAction {
  return (
    value === "confirm" ||
    value === "reject" ||
    value === "start_preparing" ||
    value === "ready_for_pickup"
  );
}

export function parseMerchantOrderAction(
  body: unknown,
): MerchantOrderActionInput {
  const record = asRecord(body);
  if (!isAction(record.action)) {
    throw new ValidationError("action is not supported");
  }

  let reason: string | null | undefined;
  if (Object.prototype.hasOwnProperty.call(record, "reason")) {
    if (record.reason === null) {
      reason = null;
    } else if (typeof record.reason === "string") {
      const trimmed = record.reason.trim();
      if (trimmed.length > 300) {
        throw new ValidationError("reason is too long");
      }
      reason = trimmed || null;
    } else {
      throw new ValidationError("reason must be a string or null");
    }
  }

  return {
    action: record.action,
    ...(reason !== undefined ? { reason } : {}),
  };
}
