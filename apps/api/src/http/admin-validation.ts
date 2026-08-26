import type { ReviewNitipMerchantInput } from "@nitip/domain";

import { ValidationError } from "./validation.js";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  return value as Record<string, unknown>;
}

export function parseMerchantReview(body: unknown): ReviewNitipMerchantInput {
  const record = asRecord(body);
  const decision = record.decision;

  if (decision !== "approve" && decision !== "reject") {
    throw new ValidationError("decision must be approve or reject");
  }

  let reason: string | null | undefined;
  if (Object.prototype.hasOwnProperty.call(record, "reason")) {
    const value = record.reason;

    if (value === null) {
      reason = null;
    } else if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 500) {
        throw new ValidationError("reason is too long");
      }
      reason = trimmed || null;
    } else {
      throw new ValidationError("reason must be a string or null");
    }
  }

  if (decision === "reject" && !reason) {
    throw new ValidationError("reason is required when rejecting a merchant");
  }

  return {
    decision,
    ...(reason !== undefined ? { reason } : {}),
  };
}
