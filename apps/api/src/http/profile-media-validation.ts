import { ValidationError } from "./validation.js";

export function parseProfilePhotoPatch(body: unknown): { photoUrl: string | null } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  const record = body as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, "photoUrl")) {
    throw new ValidationError("photoUrl is required");
  }

  const value = record.photoUrl;
  if (value === null) return { photoUrl: null };
  if (typeof value !== "string") {
    throw new ValidationError("photoUrl must be a string or null");
  }

  const photoUrl = value.trim();
  if (!photoUrl) return { photoUrl: null };
  if (photoUrl.length > 1000) {
    throw new ValidationError("photoUrl is too long");
  }

  let url: URL;
  try {
    url = new URL(photoUrl);
  } catch {
    throw new ValidationError("photoUrl must be a valid URL");
  }

  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") {
    throw new ValidationError("photoUrl must be a secure Cloudinary URL");
  }

  return { photoUrl };
}
