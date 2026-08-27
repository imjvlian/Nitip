import type {
  CreateNitipAddressInput,
  CreateNitipSupportTicketInput,
  NitipAddress,
  NitipSupportTicket,
  NitipUserProfile,
  UpdateNitipAddressInput,
  UpdateNitipProfileInput,
} from "@nitip/domain";
import type {
  NitipCatalogOutlet,
  NitipCatalogOutletSummary,
} from "@nitip/domain/catalog";
import type {
  NitipCheckoutQuote,
  NitipCheckoutRequest,
  NitipOrder,
} from "@nitip/domain/commerce";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, UploadType } from "expo-file-system";
import type { User } from "firebase/auth";

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const ORDER_IDEMPOTENCY_PREFIX = "@nitip/order-idempotency/";

export const apiConfigured = apiBaseUrl.length > 0;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiBody<T> = {
  data?: T;
  ok?: boolean;
  message?: string;
  error?: string;
};

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

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiBody<T>;
  if (!response.ok) {
    throw new ApiError(
      body.message ?? body.error ?? "Nitip API request failed",
      response.status,
    );
  }
  if (body.data !== undefined) return body.data;
  return body as unknown as T;
}

async function apiRequest<T>(
  user: User | null,
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (!apiConfigured) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured");
  }

  if (!user) {
    throw new Error("Authentication is required");
  }

  const idToken = await user.getIdToken();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${idToken}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  return readResponse<T>(response);
}

async function publicApiRequest<T>(path: string): Promise<T> {
  if (!apiConfigured) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured");
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Accept: "application/json" },
  });
  return readResponse<T>(response);
}

function canonicalCheckoutFingerprint(
  user: User,
  input: NitipCheckoutRequest,
) {
  const items = input.items
    .map((item) => `${item.productId}:${item.quantity}`)
    .sort()
    .join(",");
  return `${user.uid}:${input.outletId}:${input.addressId}:${items}`;
}

function storageKeyForCheckout(user: User, input: NitipCheckoutRequest) {
  const fingerprint = canonicalCheckoutFingerprint(user, input);
  let hash = 2166136261;
  for (let index = 0; index < fingerprint.length; index += 1) {
    hash ^= fingerprint.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${ORDER_IDEMPOTENCY_PREFIX}${user.uid}/${(hash >>> 0).toString(16)}`;
}

function generateOrderIdempotencyKey() {
  return [
    "order",
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 12),
    Math.random().toString(36).slice(2, 12),
  ].join("-");
}

async function getOrCreateOrderIdempotencyKey(
  user: User,
  input: NitipCheckoutRequest,
) {
  const storageKey = storageKeyForCheckout(user, input);
  const existing = await AsyncStorage.getItem(storageKey);
  if (existing) return { storageKey, idempotencyKey: existing };

  const idempotencyKey = generateOrderIdempotencyKey();
  await AsyncStorage.setItem(storageKey, idempotencyKey);
  return { storageKey, idempotencyKey };
}

export function getMe(user: User | null) {
  return apiRequest<NitipUserProfile>(user, "/me");
}

export function updateMe(user: User | null, input: UpdateNitipProfileInput) {
  return apiRequest<NitipUserProfile>(user, "/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function getProfilePhotoUploadSignature(user: User | null) {
  return apiRequest<ProfilePhotoUploadSignature>(user, "/me/media/signature", {
    method: "POST",
  });
}

export async function uploadProfilePhoto(
  user: User | null,
  asset: { uri: string; mimeType?: string | null },
) {
  const signed = await getProfilePhotoUploadSignature(user);
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
    throw new Error(body.error?.message ?? "Gagal mengunggah foto profil");
  }

  return body.secure_url;
}

export function updateProfilePhoto(user: User | null, photoUrl: string | null) {
  return apiRequest<NitipUserProfile>(user, "/me/photo", {
    method: "PATCH",
    body: JSON.stringify({ photoUrl }),
  });
}

export function listSupportTickets(user: User | null) {
  return apiRequest<NitipSupportTicket[]>(user, "/me/support-tickets");
}

export function createSupportTicket(
  user: User | null,
  input: CreateNitipSupportTicketInput,
) {
  return apiRequest<NitipSupportTicket>(user, "/me/support-tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listAddresses(user: User | null) {
  return apiRequest<NitipAddress[]>(user, "/me/addresses");
}

export function createAddress(user: User | null, input: CreateNitipAddressInput) {
  return apiRequest<NitipAddress>(user, "/me/addresses", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAddress(
  user: User | null,
  id: string,
  input: UpdateNitipAddressInput,
) {
  return apiRequest<NitipAddress>(user, `/me/addresses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAddress(user: User | null, id: string) {
  return apiRequest<{ ok: boolean }>(user, `/me/addresses/${id}`, {
    method: "DELETE",
  });
}

export function listCatalogOutlets() {
  return publicApiRequest<NitipCatalogOutletSummary[]>("/catalog/outlets");
}

export function getCatalogOutlet(id: string) {
  return publicApiRequest<NitipCatalogOutlet>(`/catalog/outlets/${id}`);
}

export function getCheckoutQuote(
  user: User | null,
  input: NitipCheckoutRequest,
) {
  return apiRequest<NitipCheckoutQuote>(user, "/checkout/quote", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createOrder(
  user: User | null,
  input: NitipCheckoutRequest,
) {
  if (!user) {
    throw new Error("Authentication is required");
  }

  const { storageKey, idempotencyKey } =
    await getOrCreateOrderIdempotencyKey(user, input);

  try {
    const order = await apiRequest<NitipOrder>(user, "/orders", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(input),
    });
    await AsyncStorage.removeItem(storageKey);
    return order;
  } catch (error) {
    throw error;
  }
}

export function getOrder(user: User | null, id: string) {
  return apiRequest<NitipOrder>(user, `/orders/${id}`);
}

export function listOrders(user: User | null) {
  return apiRequest<NitipOrder[]>(user, "/me/orders");
}

export function simulateOrderPayment(user: User | null, id: string) {
  return apiRequest<NitipOrder>(user, `/orders/${id}/simulate-payment`, {
    method: "POST",
  });
}
