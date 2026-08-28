import type {
  CreateNitipCategoryInput,
  CreateNitipProductAddonInput,
  CreateNitipProductInput,
  UpdateNitipCategoryInput,
  UpdateNitipProductInput,
} from "@nitip/domain/catalog";

import { ValidationError } from "./validation.js";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Request body must be a JSON object");
  }
  return value as Record<string, unknown>;
}

function has(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function requiredString(record: Record<string, unknown>, key: string, maxLength: number) {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${key} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new ValidationError(`${key} is too long`);
  return trimmed;
}

function optionalRequiredString(record: Record<string, unknown>, key: string, maxLength: number) {
  if (!has(record, key)) return undefined;
  return requiredString(record, key, maxLength);
}

function nullableString(
  record: Record<string, unknown>,
  key: string,
  maxLength: number,
): string | null | undefined {
  if (!has(record, key)) return undefined;
  const value = record[key];
  if (value === null) return null;
  if (typeof value !== "string") throw new ValidationError(`${key} must be a string or null`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) throw new ValidationError(`${key} is too long`);
  return trimmed;
}

function optionalBoolean(record: Record<string, unknown>, key: string) {
  if (!has(record, key)) return undefined;
  if (typeof record[key] !== "boolean") throw new ValidationError(`${key} must be a boolean`);
  return record[key] as boolean;
}

function optionalInteger(
  record: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): number | undefined {
  if (!has(record, key)) return undefined;
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`${key} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function nullableStock(record: Record<string, unknown>): number | null | undefined {
  if (!has(record, "stockQuantity")) return undefined;
  const value = record.stockQuantity;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 1_000_000) {
    throw new ValidationError("stockQuantity must be a non-negative integer or null");
  }
  return value;
}

function nullableHttpsUrl(record: Record<string, unknown>, key: string) {
  const value = nullableString(record, key, 800);
  if (value == null) return value;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") throw new Error("invalid protocol");
  } catch {
    throw new ValidationError(`${key} must be a valid HTTPS URL or null`);
  }
  return value;
}

function parseAddons(
  record: Record<string, unknown>,
): CreateNitipProductAddonInput[] | undefined {
  if (!has(record, "addons")) return undefined;
  const value = record.addons;
  if (!Array.isArray(value)) throw new ValidationError("addons must be an array");
  if (value.length > 20) throw new ValidationError("addons cannot contain more than 20 options");

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  return value.map((item, index) => {
    const addon = asRecord(item);
    const idValue = addon.id;
    let id: string | undefined;
    if (idValue !== undefined) {
      if (typeof idValue !== "string" || !/^[a-f\d]{24}$/i.test(idValue.trim())) {
        throw new ValidationError(`addons[${index}].id must be a valid id`);
      }
      id = idValue.trim();
      if (seenIds.has(id)) throw new ValidationError("Duplicate addon id is not allowed");
      seenIds.add(id);
    }

    const name = requiredString(addon, "name", 80);
    const normalizedName = name.toLocaleLowerCase();
    if (seenNames.has(normalizedName)) {
      throw new ValidationError("Addon names must be unique within a product");
    }
    seenNames.add(normalizedName);

    const price = optionalInteger(addon, "price", 0, 100_000_000);
    if (price === undefined) throw new ValidationError(`addons[${index}].price is required`);

    return {
      ...(id ? { id } : {}),
      name,
      price,
      isAvailable: optionalBoolean(addon, "isAvailable") ?? true,
    };
  });
}

export function parseCreateCategory(body: unknown): CreateNitipCategoryInput {
  const record = asRecord(body);
  return {
    name: requiredString(record, "name", 80),
    description: nullableString(record, "description", 300) ?? null,
    sortOrder: optionalInteger(record, "sortOrder", 0, 10_000) ?? 0,
    isActive: optionalBoolean(record, "isActive") ?? true,
  };
}

export function parseUpdateCategory(body: unknown): UpdateNitipCategoryInput {
  const record = asRecord(body);
  const name = optionalRequiredString(record, "name", 80);
  const description = nullableString(record, "description", 300);
  const sortOrder = optionalInteger(record, "sortOrder", 0, 10_000);
  const isActive = optionalBoolean(record, "isActive");
  const input: UpdateNitipCategoryInput = {
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(sortOrder !== undefined ? { sortOrder } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
  };
  if (Object.keys(input).length === 0) throw new ValidationError("No editable category field was provided");
  return input;
}

export function parseCreateProduct(body: unknown): CreateNitipProductInput {
  const record = asRecord(body);
  const price = optionalInteger(record, "price", 0, 100_000_000);
  if (price === undefined) throw new ValidationError("price is required");
  const stockQuantity = nullableStock(record);
  const requestedAvailable = optionalBoolean(record, "isAvailable") ?? true;
  return {
    categoryId: requiredString(record, "categoryId", 64),
    name: requiredString(record, "name", 120),
    description: requiredString(record, "description", 500),
    price,
    imageUrl: nullableHttpsUrl(record, "imageUrl") ?? null,
    imagePublicId: nullableString(record, "imagePublicId", 300) ?? null,
    stockQuantity: stockQuantity ?? null,
    isAvailable: stockQuantity === 0 ? false : requestedAvailable,
    isActive: optionalBoolean(record, "isActive") ?? true,
    sortOrder: optionalInteger(record, "sortOrder", 0, 10_000) ?? 0,
    addons: parseAddons(record) ?? [],
  };
}

export function parseUpdateProduct(body: unknown): UpdateNitipProductInput {
  const record = asRecord(body);
  const categoryId = optionalRequiredString(record, "categoryId", 64);
  const name = optionalRequiredString(record, "name", 120);
  const description = optionalRequiredString(record, "description", 500);
  const price = optionalInteger(record, "price", 0, 100_000_000);
  const imageUrl = nullableHttpsUrl(record, "imageUrl");
  const imagePublicId = nullableString(record, "imagePublicId", 300);
  const stockQuantity = nullableStock(record);
  const isAvailable = optionalBoolean(record, "isAvailable");
  const isActive = optionalBoolean(record, "isActive");
  const sortOrder = optionalInteger(record, "sortOrder", 0, 10_000);
  const addons = parseAddons(record);

  const input: UpdateNitipProductInput = {
    ...(categoryId !== undefined ? { categoryId } : {}),
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(price !== undefined ? { price } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    ...(imagePublicId !== undefined ? { imagePublicId } : {}),
    ...(stockQuantity !== undefined ? { stockQuantity } : {}),
    ...(isAvailable !== undefined ? { isAvailable } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(sortOrder !== undefined ? { sortOrder } : {}),
    ...(addons !== undefined ? { addons } : {}),
  };

  if (stockQuantity === 0) input.isAvailable = false;
  if (Object.keys(input).length === 0) throw new ValidationError("No editable product field was provided");
  return input;
}
