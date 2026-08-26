import {
  WEEKDAYS,
  type CreateNitipMerchantInput,
  type CreateNitipOutletInput,
  type OutletOpeningHour,
  type UpdateNitipMerchantInput,
  type UpdateNitipOutletInput,
  type Weekday,
} from "@nitip/domain";

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

function requiredString(
  record: Record<string, unknown>,
  key: string,
  maxLength: number,
) {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${key} is required`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${key} is too long`);
  }

  return trimmed;
}

function optionalRequiredString(
  record: Record<string, unknown>,
  key: string,
  maxLength: number,
) {
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
  if (typeof value !== "string") {
    throw new ValidationError(`${key} must be a string or null`);
  }

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${key} is too long`);
  }

  return trimmed;
}

function optionalBoolean(record: Record<string, unknown>, key: string) {
  if (!has(record, key)) return undefined;
  if (typeof record[key] !== "boolean") {
    throw new ValidationError(`${key} must be a boolean`);
  }
  return record[key] as boolean;
}

function optionalCoordinate(
  record: Record<string, unknown>,
  key: "latitude" | "longitude",
): number | null | undefined {
  if (!has(record, key)) return undefined;

  const value = record[key];
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${key} must be a number or null`);
  }

  if (key === "latitude" && (value < -90 || value > 90)) {
    throw new ValidationError("latitude must be between -90 and 90");
  }

  if (key === "longitude" && (value < -180 || value > 180)) {
    throw new ValidationError("longitude must be between -180 and 180");
  }

  return value;
}

function parseOpeningHours(value: unknown): OutletOpeningHour[] {
  if (!Array.isArray(value) || value.length !== WEEKDAYS.length) {
    throw new ValidationError("openingHours must contain all 7 days");
  }

  const seen = new Set<Weekday>();
  const parsed = value.map((item): OutletOpeningHour => {
    const record = asRecord(item);
    const day = record.day;

    if (
      typeof day !== "string" ||
      !WEEKDAYS.includes(day as Weekday) ||
      seen.has(day as Weekday)
    ) {
      throw new ValidationError("openingHours contains an invalid or duplicate day");
    }
    seen.add(day as Weekday);

    if (typeof record.isOpen !== "boolean") {
      throw new ValidationError("openingHours.isOpen must be a boolean");
    }

    if (!record.isOpen) {
      return {
        day: day as Weekday,
        isOpen: false,
        opensAt: null,
        closesAt: null,
      };
    }

    const opensAt = record.opensAt;
    const closesAt = record.closesAt;
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

    if (
      typeof opensAt !== "string" ||
      typeof closesAt !== "string" ||
      !timePattern.test(opensAt) ||
      !timePattern.test(closesAt)
    ) {
      throw new ValidationError("openingHours times must use HH:MM");
    }

    if (opensAt >= closesAt) {
      throw new ValidationError("openingHours opensAt must be before closesAt");
    }

    return {
      day: day as Weekday,
      isOpen: true,
      opensAt,
      closesAt,
    };
  });

  return WEEKDAYS.map((day) => {
    const item = parsed.find((entry) => entry.day === day);
    if (!item) {
      throw new ValidationError("openingHours must contain all 7 days");
    }
    return item;
  });
}

export function parseCreateMerchant(
  body: unknown,
): CreateNitipMerchantInput {
  const record = asRecord(body);

  return {
    businessName: requiredString(record, "businessName", 120),
    contactName: requiredString(record, "contactName", 80),
    phoneNumber: requiredString(record, "phoneNumber", 30),
    description: nullableString(record, "description", 500) ?? null,
  };
}

export function parseUpdateMerchant(
  body: unknown,
): UpdateNitipMerchantInput {
  const record = asRecord(body);
  const businessName = optionalRequiredString(record, "businessName", 120);
  const contactName = optionalRequiredString(record, "contactName", 80);
  const phoneNumber = optionalRequiredString(record, "phoneNumber", 30);
  const description = nullableString(record, "description", 500);

  const input: UpdateNitipMerchantInput = {
    ...(businessName !== undefined ? { businessName } : {}),
    ...(contactName !== undefined ? { contactName } : {}),
    ...(phoneNumber !== undefined ? { phoneNumber } : {}),
    ...(description !== undefined ? { description } : {}),
  };

  if (Object.keys(input).length === 0) {
    throw new ValidationError("No editable merchant field was provided");
  }

  return input;
}

export function parseCreateOutlet(body: unknown): CreateNitipOutletInput {
  const record = asRecord(body);
  const latitude = optionalCoordinate(record, "latitude");
  const longitude = optionalCoordinate(record, "longitude");

  if ((latitude == null) !== (longitude == null)) {
    throw new ValidationError("latitude and longitude must be provided together");
  }

  const openingHours = has(record, "openingHours")
    ? parseOpeningHours(record.openingHours)
    : undefined;

  return {
    name: requiredString(record, "name", 120),
    phoneNumber: requiredString(record, "phoneNumber", 30),
    addressLine: requiredString(record, "addressLine", 300),
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    isActive: optionalBoolean(record, "isActive") ?? true,
    acceptingOrders: optionalBoolean(record, "acceptingOrders") ?? false,
    ...(openingHours ? { openingHours } : {}),
  };
}

export function parseUpdateOutlet(body: unknown): UpdateNitipOutletInput {
  const record = asRecord(body);
  const name = optionalRequiredString(record, "name", 120);
  const phoneNumber = optionalRequiredString(record, "phoneNumber", 30);
  const addressLine = optionalRequiredString(record, "addressLine", 300);
  const latitude = optionalCoordinate(record, "latitude");
  const longitude = optionalCoordinate(record, "longitude");
  const isActive = optionalBoolean(record, "isActive");
  const acceptingOrders = optionalBoolean(record, "acceptingOrders");
  const openingHours = has(record, "openingHours")
    ? parseOpeningHours(record.openingHours)
    : undefined;

  const input: UpdateNitipOutletInput = {
    ...(name !== undefined ? { name } : {}),
    ...(phoneNumber !== undefined ? { phoneNumber } : {}),
    ...(addressLine !== undefined ? { addressLine } : {}),
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(acceptingOrders !== undefined ? { acceptingOrders } : {}),
    ...(openingHours !== undefined ? { openingHours } : {}),
  };

  if (Object.keys(input).length === 0) {
    throw new ValidationError("No editable outlet field was provided");
  }

  return input;
}
