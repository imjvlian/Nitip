import type { ReviewNitipMerchantInput } from "@nitip/domain";
import type { CreateNitipPromotionInput } from "@nitip/domain/catalog";

import { ValidationError } from "./validation.js";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  return value as Record<string, unknown>;
}

function nullableString(
  record: Record<string, unknown>,
  key: string,
  maxLength: number,
) {
  const value = record[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new ValidationError(`${key} must be a string or null`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${key} is too long`);
  }
  return trimmed || null;
}

function optionalDate(record: Record<string, unknown>, key: string) {
  const value = nullableString(record, key, 80);
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new ValidationError(`${key} must be a valid ISO date`);
  }
  return new Date(timestamp).toISOString();
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

export function parseCreatePromotion(body: unknown): CreateNitipPromotionInput {
  const record = asRecord(body);
  if (typeof record.title !== "string" || !record.title.trim()) {
    throw new ValidationError("title is required");
  }
  const title = record.title.trim();
  if (title.length > 120) throw new ValidationError("title is too long");

  const description = nullableString(record, "description", 320);
  const ctaLabel = nullableString(record, "ctaLabel", 40);
  const imageUrl = nullableString(record, "imageUrl", 1000);
  const outletId = nullableString(record, "outletId", 100);
  const startsAt = optionalDate(record, "startsAt");
  const endsAt = optionalDate(record, "endsAt");

  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    throw new ValidationError("imageUrl must use http or https");
  }
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    throw new ValidationError("endsAt must be after startsAt");
  }

  const priorityValue = record.priority ?? 0;
  if (
    typeof priorityValue !== "number" ||
    !Number.isInteger(priorityValue) ||
    priorityValue < -100 ||
    priorityValue > 100
  ) {
    throw new ValidationError("priority must be an integer between -100 and 100");
  }

  const activeValue = record.isActive ?? true;
  if (typeof activeValue !== "boolean") {
    throw new ValidationError("isActive must be a boolean");
  }

  return {
    title,
    description,
    ctaLabel,
    imageUrl,
    outletId,
    startsAt,
    endsAt,
    priority: priorityValue,
    isActive: activeValue,
  };
}

export function parsePromotionActivePatch(body: unknown) {
  const record = asRecord(body);
  if (typeof record.isActive !== "boolean") {
    throw new ValidationError("isActive must be a boolean");
  }
  return { isActive: record.isActive };
}
