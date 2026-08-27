import type {
  CreateNitipDriverInput,
  ReviewNitipDriverInput,
  UpdateDriverAvailabilityInput,
  UpdateDriverLocationInput,
  UpdateNitipDriverInput,
} from "@nitip/domain/driver";

import { ValidationError } from "./validation.js";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Request body must be a JSON object");
  }
  return value as Record<string, unknown>;
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

function optionalString(
  record: Record<string, unknown>,
  key: string,
  maxLength: number,
) {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return undefined;
  return requiredString(record, key, maxLength);
}

function vehicleType(value: unknown) {
  if (value !== "motorcycle" && value !== "car") {
    throw new ValidationError("vehicleType must be motorcycle or car");
  }
  return value;
}

function coordinate(value: unknown, key: "latitude" | "longitude") {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${key} must be a finite number`);
  }
  if (key === "latitude" && (value < -90 || value > 90)) {
    throw new ValidationError("latitude must be between -90 and 90");
  }
  if (key === "longitude" && (value < -180 || value > 180)) {
    throw new ValidationError("longitude must be between -180 and 180");
  }
  return value;
}

export function parseCreateDriver(body: unknown): CreateNitipDriverInput {
  const record = asRecord(body);
  return {
    fullName: requiredString(record, "fullName", 80),
    phoneNumber: requiredString(record, "phoneNumber", 30),
    vehicleType: vehicleType(record.vehicleType),
    vehicleBrandModel: requiredString(record, "vehicleBrandModel", 80),
    vehiclePlate: requiredString(record, "vehiclePlate", 20).toUpperCase(),
  };
}

export function parseUpdateDriver(body: unknown): UpdateNitipDriverInput {
  const record = asRecord(body);
  const fullName = optionalString(record, "fullName", 80);
  const phoneNumber = optionalString(record, "phoneNumber", 30);
  const brandModel = optionalString(record, "vehicleBrandModel", 80);
  const plate = optionalString(record, "vehiclePlate", 20);
  const nextVehicleType = Object.prototype.hasOwnProperty.call(record, "vehicleType")
    ? vehicleType(record.vehicleType)
    : undefined;

  const input: UpdateNitipDriverInput = {
    ...(fullName !== undefined ? { fullName } : {}),
    ...(phoneNumber !== undefined ? { phoneNumber } : {}),
    ...(nextVehicleType !== undefined ? { vehicleType: nextVehicleType } : {}),
    ...(brandModel !== undefined ? { vehicleBrandModel: brandModel } : {}),
    ...(plate !== undefined ? { vehiclePlate: plate.toUpperCase() } : {}),
  };

  if (Object.keys(input).length === 0) {
    throw new ValidationError("No editable driver field was provided");
  }
  return input;
}

export function parseDriverAvailability(
  body: unknown,
): UpdateDriverAvailabilityInput {
  const record = asRecord(body);
  if (typeof record.isOnline !== "boolean") {
    throw new ValidationError("isOnline must be a boolean");
  }
  return { isOnline: record.isOnline };
}

export function parseDriverLocation(body: unknown): UpdateDriverLocationInput {
  const record = asRecord(body);
  const latitude = coordinate(record.latitude, "latitude");
  const longitude = coordinate(record.longitude, "longitude");

  let accuracyMeters: number | null | undefined;
  if (Object.prototype.hasOwnProperty.call(record, "accuracyMeters")) {
    if (record.accuracyMeters === null) {
      accuracyMeters = null;
    } else if (
      typeof record.accuracyMeters === "number" &&
      Number.isFinite(record.accuracyMeters) &&
      record.accuracyMeters >= 0
    ) {
      accuracyMeters = record.accuracyMeters;
    } else {
      throw new ValidationError("accuracyMeters must be a non-negative number or null");
    }
  }

  return {
    latitude,
    longitude,
    ...(accuracyMeters !== undefined ? { accuracyMeters } : {}),
  };
}

export function parseDriverReview(body: unknown): ReviewNitipDriverInput {
  const record = asRecord(body);
  if (record.decision !== "approve" && record.decision !== "reject") {
    throw new ValidationError("decision must be approve or reject");
  }

  let reason: string | null | undefined;
  if (Object.prototype.hasOwnProperty.call(record, "reason")) {
    if (record.reason === null) reason = null;
    else if (typeof record.reason === "string") {
      const trimmed = record.reason.trim();
      if (trimmed.length > 300) throw new ValidationError("reason is too long");
      reason = trimmed || null;
    } else {
      throw new ValidationError("reason must be a string or null");
    }
  }

  if (record.decision === "reject" && !reason) {
    throw new ValidationError("reason is required when rejecting a driver");
  }

  return {
    decision: record.decision,
    ...(reason !== undefined ? { reason } : {}),
  };
}
