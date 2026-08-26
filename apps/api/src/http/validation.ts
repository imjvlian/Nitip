import type {
  AddressLabel,
  CreateNitipAddressInput,
  UpdateNitipAddressInput,
  UpdateNitipProfileInput,
} from "@nitip/domain";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  return value as Record<string, unknown>;
}

function has(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
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

function requiredString(
  record: Record<string, unknown>,
  key: string,
  maxLength: number,
): string {
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
): string | undefined {
  if (!has(record, key)) return undefined;
  return requiredString(record, key, maxLength);
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

function addressLabel(
  record: Record<string, unknown>,
  required: boolean,
): AddressLabel | undefined {
  if (!has(record, "label")) {
    if (required) throw new ValidationError("label is required");
    return undefined;
  }

  const value = record.label;
  if (value !== "home" && value !== "office" && value !== "other") {
    throw new ValidationError("label must be home, office, or other");
  }

  return value;
}

export function parseProfilePatch(body: unknown): UpdateNitipProfileInput {
  const record = asRecord(body);
  const displayName = nullableString(record, "displayName", 80);
  const phoneNumber = nullableString(record, "phoneNumber", 30);

  if (displayName === undefined && phoneNumber === undefined) {
    throw new ValidationError("No editable profile field was provided");
  }

  return {
    ...(displayName !== undefined ? { displayName } : {}),
    ...(phoneNumber !== undefined ? { phoneNumber } : {}),
  };
}

export function parseCreateAddress(body: unknown): CreateNitipAddressInput {
  const record = asRecord(body);
  const label = addressLabel(record, true);
  if (!label) throw new ValidationError("label is required");

  const customLabel = nullableString(record, "customLabel", 30);
  const latitude = optionalCoordinate(record, "latitude");
  const longitude = optionalCoordinate(record, "longitude");
  const hasLatitude = latitude !== undefined && latitude !== null;
  const hasLongitude = longitude !== undefined && longitude !== null;

  if (hasLatitude !== hasLongitude) {
    throw new ValidationError("latitude and longitude must be provided together");
  }

  if (label === "other" && !customLabel) {
    throw new ValidationError("customLabel is required when label is other");
  }

  return {
    label,
    customLabel: label === "other" ? customLabel : null,
    recipientName: requiredString(record, "recipientName", 80),
    phoneNumber: requiredString(record, "phoneNumber", 30),
    addressLine: requiredString(record, "addressLine", 300),
    notes: nullableString(record, "notes", 300) ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    isDefault: optionalBoolean(record, "isDefault") ?? false,
  };
}

export function parseUpdateAddress(body: unknown): UpdateNitipAddressInput {
  const record = asRecord(body);
  const label = addressLabel(record, false);
  const customLabel = nullableString(record, "customLabel", 30);
  const recipientName = optionalRequiredString(record, "recipientName", 80);
  const phoneNumber = optionalRequiredString(record, "phoneNumber", 30);
  const addressLine = optionalRequiredString(record, "addressLine", 300);
  const notes = nullableString(record, "notes", 300);
  const latitude = optionalCoordinate(record, "latitude");
  const longitude = optionalCoordinate(record, "longitude");
  const isDefault = optionalBoolean(record, "isDefault");

  if (label === "other" && !customLabel) {
    throw new ValidationError("customLabel is required when changing label to other");
  }

  const input: UpdateNitipAddressInput = {
    ...(label !== undefined ? { label } : {}),
    ...(customLabel !== undefined ? { customLabel } : {}),
    ...(recipientName !== undefined ? { recipientName } : {}),
    ...(phoneNumber !== undefined ? { phoneNumber } : {}),
    ...(addressLine !== undefined ? { addressLine } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
    ...(isDefault !== undefined ? { isDefault } : {}),
  };

  if (Object.keys(input).length === 0) {
    throw new ValidationError("No editable address field was provided");
  }

  return input;
}
