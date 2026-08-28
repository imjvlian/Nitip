import type {
  NitipSupportTicket,
  NitipUserProfile,
  SupportTicketCategory,
} from "@nitip/domain";
import type { CloudinaryUploadSignature } from "@nitip/domain/catalog";
import type {
  CreateNitipDriverInput,
  DriverDeliveryActionInput,
  NitipDriverOffer,
  NitipDriverOrder,
  NitipDriverProfile,
  UpdateDriverLocationInput,
  UpdateNitipDriverInput,
} from "@nitip/domain/driver";
import { File, UploadType } from "expo-file-system";
import * as Location from "expo-location";
import type { User } from "firebase/auth";

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
export const apiConfigured = apiBaseUrl.length > 0;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

type ProfilePhotoUploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId: string;
  overwrite: true;
  signature: string;
  uploadUrl: string;
};

async function apiRequest<T>(user: User | null, path: string, init?: RequestInit): Promise<T> {
  if (!apiConfigured) throw new Error("EXPO_PUBLIC_API_URL is not configured");
  if (!user) throw new Error("Authentication is required");
  const idToken = await user.getIdToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${idToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const body = (await response.json()) as { data?: T; message?: string; error?: string };
  if (!response.ok) {
    throw new ApiError(body.message ?? body.error ?? "Nitip API request failed", response.status);
  }
  return body.data as T;
}

export const getDriverAccountProfile = (user: User | null) =>
  apiRequest<NitipUserProfile>(user, "/me");

export const getDriverMe = (user: User | null) =>
  apiRequest<NitipDriverProfile | null>(user, "/driver/me");

export const createDriver = (user: User | null, input: CreateNitipDriverInput) =>
  apiRequest<NitipDriverProfile>(user, "/driver/onboarding", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateDriver = (user: User | null, input: UpdateNitipDriverInput) =>
  apiRequest<NitipDriverProfile>(user, "/driver/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const submitDriver = (user: User | null) =>
  apiRequest<NitipDriverProfile>(user, "/driver/me/submit", { method: "POST" });

export const updateDriverLocation = (user: User | null, input: UpdateDriverLocationInput) =>
  apiRequest<NitipDriverProfile>(user, "/driver/me/location", {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export async function refreshDriverLocation(user: User | null): Promise<NitipDriverProfile | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") return null;
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return updateDriverLocation(user, {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: position.coords.accuracy ?? null,
  });
}

export async function setDriverOnline(user: User | null, isOnline: boolean) {
  let capturedLocation: NitipDriverProfile | null = null;
  if (isOnline) {
    try {
      capturedLocation = await refreshDriverLocation(user);
    } catch {
      capturedLocation = null;
    }
  }
  const profile = await apiRequest<NitipDriverProfile>(user, "/driver/me/availability", {
    method: "PATCH",
    body: JSON.stringify({ isOnline }),
  });
  return capturedLocation ? { ...capturedLocation, isOnline: profile.isOnline } : profile;
}

export async function listDriverOffers(user: User | null) {
  try {
    await refreshDriverLocation(user);
  } catch {
    // Unranked offers remain available if a location refresh fails.
  }
  return apiRequest<NitipDriverOffer[]>(user, "/driver/orders/available");
}

export const getCurrentDriverOrder = (user: User | null) =>
  apiRequest<NitipDriverOrder | null>(user, "/driver/orders/current");

export const listDriverOrderHistory = (user: User | null) =>
  apiRequest<NitipDriverOrder[]>(user, "/driver/orders/history");

export const getDriverOrder = (user: User | null, id: string) =>
  apiRequest<NitipDriverOrder>(user, `/driver/orders/${id}`);

export const acceptDriverOffer = (user: User | null, id: string) =>
  apiRequest<NitipDriverOrder>(user, `/driver/orders/${id}/accept`, { method: "POST" });

export const actOnDriverOrder = (
  user: User | null,
  id: string,
  input: DriverDeliveryActionInput,
) =>
  apiRequest<NitipDriverOrder>(user, `/driver/orders/${id}/action`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getDeliveryProofSignature = (user: User | null, id: string) =>
  apiRequest<CloudinaryUploadSignature>(user, `/driver/orders/${id}/proof/signature`, {
    method: "POST",
  });

export const getDriverProfilePhotoUploadSignature = (user: User | null) =>
  apiRequest<ProfilePhotoUploadSignature>(user, "/me/media/signature", { method: "POST" });

export async function uploadDriverProfilePhoto(
  user: User | null,
  asset: { uri: string; mimeType?: string | null },
) {
  const signed = await getDriverProfilePhotoUploadSignature(user);
  const file = new File(asset.uri);
  const response = await file.upload(signed.uploadUrl, {
    httpMethod: "POST",
    uploadType: UploadType.MULTIPART,
    fieldName: "file",
    mimeType: asset.mimeType ?? "image/jpeg",
    parameters: {
      api_key: signed.apiKey,
      timestamp: String(signed.timestamp),
      folder: signed.folder,
      public_id: signed.publicId,
      overwrite: String(signed.overwrite),
      signature: signed.signature,
    },
  });

  let body: { secure_url?: string; error?: { message?: string } } = {};
  try {
    body = JSON.parse(response.body) as typeof body;
  } catch {
    throw new Error("Respons upload Cloudinary tidak valid");
  }

  if (response.status < 200 || response.status >= 300 || !body.secure_url) {
    throw new Error(body.error?.message ?? "Gagal mengunggah foto profil");
  }
  return body.secure_url;
}

export const updateDriverProfilePhoto = (user: User | null, photoUrl: string | null) =>
  apiRequest<NitipUserProfile>(user, "/me/photo", {
    method: "PATCH",
    body: JSON.stringify({ photoUrl }),
  });

export const listDriverSupportTickets = (user: User | null) =>
  apiRequest<NitipSupportTicket[]>(user, "/me/support-tickets");

export const createDriverSupportTicket = (
  user: User | null,
  input: {
    category: Extract<SupportTicketCategory, "order" | "driver" | "account" | "other">;
    subject: string;
    message: string;
    orderCode?: string | null;
  },
) =>
  apiRequest<NitipSupportTicket>(user, "/me/support-tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });

export async function uploadDeliveryProof(
  user: User | null,
  id: string,
  asset: { uri: string; mimeType?: string | null; fileName?: string | null },
) {
  const signed = await getDeliveryProofSignature(user, id);
  const file = new File(asset.uri);
  const response = await file.upload(signed.uploadUrl, {
    httpMethod: "POST",
    uploadType: UploadType.MULTIPART,
    fieldName: "file",
    mimeType: asset.mimeType ?? "image/jpeg",
    parameters: {
      api_key: signed.apiKey,
      timestamp: String(signed.timestamp),
      folder: signed.folder,
      signature: signed.signature,
    },
  });

  let body: {
    secure_url?: string;
    error?: { message?: string };
  } = {};

  try {
    body = JSON.parse(response.body) as typeof body;
  } catch {
    throw new Error("Respons upload Cloudinary tidak valid");
  }

  if (response.status < 200 || response.status >= 300 || !body.secure_url) {
    throw new Error(body.error?.message ?? "Gagal mengunggah bukti pengantaran");
  }

  return body.secure_url;
}
