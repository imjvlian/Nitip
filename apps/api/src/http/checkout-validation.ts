import type { NitipCheckoutRequest } from "@nitip/domain/commerce";

import { ValidationError } from "./validation.js";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Request body must be a JSON object");
  }
  return value as Record<string, unknown>;
}

function requiredId(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${key} is required`);
  }
  return value.trim();
}

export function parseCheckoutRequest(body: unknown): NitipCheckoutRequest {
  const record = asRecord(body);
  const outletId = requiredId(record, "outletId");
  const addressId = requiredId(record, "addressId");

  if (!Array.isArray(record.items) || record.items.length === 0) {
    throw new ValidationError("items must contain at least one product");
  }
  if (record.items.length > 50) {
    throw new ValidationError("items cannot contain more than 50 products");
  }

  const seen = new Set<string>();
  const items = record.items.map((value, index) => {
    const item = asRecord(value);
    const productId = requiredId(item, "productId");
    const quantity = item.quantity;

    if (!Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 99) {
      throw new ValidationError(`items[${index}].quantity must be an integer from 1 to 99`);
    }
    if (seen.has(productId)) {
      throw new ValidationError("Duplicate productId is not allowed");
    }
    seen.add(productId);

    return {
      productId,
      quantity: Number(quantity),
    };
  });

  return { outletId, addressId, items };
}
