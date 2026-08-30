import type {
  CreateNitipAddressInput,
  CreateNitipSupportTicketInput,
  NitipAddress,
  NitipSupportTicket,
  NitipUserProfile,
  UpdateNitipAddressInput,
  UpdateNitipProfileInput,
} from "@nitip/domain";
import type { NitipCatalogOutlet, NitipCatalogOutletSummary, NitipPromotion } from "@nitip/domain/catalog";
import type {
  MidtransNativeMethod,
  NitipCheckoutQuote,
  NitipCheckoutRequest,
  NitipMidtransChargeResult,
  NitipOrder,
  NitipOrderChatMessage,
  NitipOrderChatThread,
  NitipOrderOperations,
  NitipOrderReviews,
  NitipOrderTracking,
  NitipPaymentConfig,
  NitipReview,
  UpsertNitipReviewInput,
} from "@nitip/domain/commerce";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, UploadType } from "expo-file-system";
import type { User } from "firebase/auth";

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
const ORDER_IDEMPOTENCY_PREFIX = "@nitip/order-idempotency/";
export const apiConfigured = apiBaseUrl.length > 0;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = "ApiError"; }
}

type ApiBody<T> = { data?: T; ok?: boolean; message?: string; error?: string };
type ProfilePhotoUploadSignature = { cloudName: string; apiKey: string; timestamp: number; folder: string; publicId: string; overwrite: true; signature: string; uploadUrl: string };

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiBody<T>;
  if (!response.ok) throw new ApiError(body.message ?? body.error ?? "Nitip API request failed", response.status);
  if (body.data !== undefined) return body.data;
  return body as unknown as T;
}

async function apiRequest<T>(user: User | null, path: string, init?: RequestInit): Promise<T> {
  if (!apiConfigured) throw new Error("EXPO_PUBLIC_API_URL is not configured");
  if (!user) throw new Error("Authentication is required");
  const idToken = await user.getIdToken();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json"); headers.set("Authorization", `Bearer ${idToken}`);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return readResponse<T>(await fetch(`${apiBaseUrl}${path}`, { ...init, headers }));
}

async function publicApiRequest<T>(path: string): Promise<T> {
  if (!apiConfigured) throw new Error("EXPO_PUBLIC_API_URL is not configured");
  return readResponse<T>(await fetch(`${apiBaseUrl}${path}`, { headers: { Accept: "application/json" } }));
}

function canonicalCheckoutFingerprint(user: User, input: NitipCheckoutRequest) {
  const items = input.items.map((item) => `${item.productId}:${item.quantity}:${[...(item.addonIds ?? [])].sort().join("+")}`).sort().join(",");
  return `${user.uid}:${input.outletId}:${input.addressId}:${items}`;
}

function storageKeyForCheckout(user: User, input: NitipCheckoutRequest) {
  const fingerprint = canonicalCheckoutFingerprint(user, input);
  let hash = 2166136261;
  for (let index = 0; index < fingerprint.length; index += 1) { hash ^= fingerprint.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return `${ORDER_IDEMPOTENCY_PREFIX}${user.uid}/${(hash >>> 0).toString(16)}`;
}

function generateOrderIdempotencyKey() {
  return ["order", Date.now().toString(36), Math.random().toString(36).slice(2, 12), Math.random().toString(36).slice(2, 12)].join("-");
}

async function getOrCreateOrderIdempotencyKey(user: User, input: NitipCheckoutRequest) {
  const storageKey = storageKeyForCheckout(user, input);
  const existing = await AsyncStorage.getItem(storageKey);
  if (existing) return { storageKey, idempotencyKey: existing };
  const idempotencyKey = generateOrderIdempotencyKey();
  await AsyncStorage.setItem(storageKey, idempotencyKey);
  return { storageKey, idempotencyKey };
}

export const getMe = (user: User | null) => apiRequest<NitipUserProfile>(user, "/me");
export const updateMe = (user: User | null, input: UpdateNitipProfileInput) => apiRequest<NitipUserProfile>(user, "/me", { method: "PATCH", body: JSON.stringify(input) });
export const getProfilePhotoUploadSignature = (user: User | null) => apiRequest<ProfilePhotoUploadSignature>(user, "/me/media/signature", { method: "POST" });

export async function uploadProfilePhoto(user: User | null, asset: { uri: string; mimeType?: string | null }) {
  const signed = await getProfilePhotoUploadSignature(user);
  const file = new File(asset.uri);
  const response = await file.upload(signed.uploadUrl, { httpMethod: "POST", uploadType: UploadType.MULTIPART, fieldName: "file", mimeType: asset.mimeType ?? "image/jpeg", parameters: { api_key: signed.apiKey, timestamp: String(signed.timestamp), folder: signed.folder, public_id: signed.publicId, overwrite: String(signed.overwrite), signature: signed.signature } });
  let body: { secure_url?: string; error?: { message?: string } } = {};
  try { body = JSON.parse(response.body) as typeof body; } catch { throw new Error("Respons upload Cloudinary tidak valid"); }
  if (response.status < 200 || response.status >= 300 || !body.secure_url) throw new Error(body.error?.message ?? "Gagal mengunggah foto profil");
  return body.secure_url;
}

export const updateProfilePhoto = (user: User | null, photoUrl: string | null) => apiRequest<NitipUserProfile>(user, "/me/photo", { method: "PATCH", body: JSON.stringify({ photoUrl }) });
export const listSupportTickets = (user: User | null) => apiRequest<NitipSupportTicket[]>(user, "/me/support-tickets");
export const createSupportTicket = (user: User | null, input: CreateNitipSupportTicketInput) => apiRequest<NitipSupportTicket>(user, "/me/support-tickets", { method: "POST", body: JSON.stringify(input) });
export const listAddresses = (user: User | null) => apiRequest<NitipAddress[]>(user, "/me/addresses");
export const createAddress = (user: User | null, input: CreateNitipAddressInput) => apiRequest<NitipAddress>(user, "/me/addresses", { method: "POST", body: JSON.stringify(input) });
export const updateAddress = (user: User | null, id: string, input: UpdateNitipAddressInput) => apiRequest<NitipAddress>(user, `/me/addresses/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteAddress = (user: User | null, id: string) => apiRequest<{ ok: boolean }>(user, `/me/addresses/${id}`, { method: "DELETE" });
export const listCatalogPromotions = () => publicApiRequest<NitipPromotion[]>("/catalog/promotions");
export const listCatalogOutlets = () => publicApiRequest<NitipCatalogOutletSummary[]>("/catalog/outlets");
export const getCatalogOutlet = (id: string) => publicApiRequest<NitipCatalogOutlet>(`/catalog/outlets/${id}`);
export const getCheckoutQuote = (user: User | null, input: NitipCheckoutRequest) => apiRequest<NitipCheckoutQuote>(user, "/checkout/quote", { method: "POST", body: JSON.stringify(input) });

export async function createOrder(user: User | null, input: NitipCheckoutRequest) {
  if (!user) throw new Error("Authentication is required");
  const { storageKey, idempotencyKey } = await getOrCreateOrderIdempotencyKey(user, input);
  const order = await apiRequest<NitipOrder>(user, "/orders", { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) });
  await AsyncStorage.removeItem(storageKey);
  return order;
}

export const getOrder = (user: User | null, id: string) => apiRequest<NitipOrder>(user, `/orders/${id}`);
export const getOrderOperations = (user: User | null, id: string) => apiRequest<NitipOrderOperations>(user, `/orders/${id}/operations`);
export const getOrderTracking = (user: User | null, id: string) => apiRequest<NitipOrderTracking>(user, `/orders/${id}/tracking`);
export const getOrderChat = (user: User | null, id: string) => apiRequest<NitipOrderChatThread>(user, `/orders/${id}/chat`);
export const sendOrderChatMessage = (user: User | null, id: string, text: string) => apiRequest<NitipOrderChatMessage>(user, `/orders/${id}/chat`, { method: "POST", body: JSON.stringify({ text }) });
export const listOrders = (user: User | null) => apiRequest<NitipOrder[]>(user, "/me/orders");
export const getOrderReviews = (user: User | null, id: string) => apiRequest<NitipOrderReviews>(user, `/orders/${id}/reviews`);
export const upsertProductReview = (user: User | null, id: string, productId: string, input: UpsertNitipReviewInput) => apiRequest<NitipReview>(user, `/orders/${id}/reviews/products/${productId}`, { method: "PUT", body: JSON.stringify(input) });
export const upsertDriverReview = (user: User | null, id: string, input: UpsertNitipReviewInput) => apiRequest<NitipReview>(user, `/orders/${id}/reviews/driver`, { method: "PUT", body: JSON.stringify(input) });
export const simulateOrderPayment = (user: User | null, id: string) => apiRequest<NitipOrder>(user, `/orders/${id}/simulate-payment`, { method: "POST" });

export const getPaymentConfig = (user: User | null) => apiRequest<NitipPaymentConfig>(user, "/payments/config");
export const startDokuOrderPayment = (user: User | null, id: string) => apiRequest<NitipOrder>(user, `/orders/${id}/payment/doku`, { method: "POST" });
export const reconcileDokuOrderPayment = (user: User | null, id: string) => apiRequest<NitipOrder>(user, `/orders/${id}/payment/doku/reconcile`, { method: "POST" });
export const startMidtransOrderPayment = (user: User | null, id: string, method: MidtransNativeMethod) => apiRequest<NitipMidtransChargeResult>(user, `/orders/${id}/payment/midtrans`, { method: "POST", body: JSON.stringify({ method }) });
export const reconcileMidtransOrderPayment = (user: User | null, id: string) => apiRequest<NitipMidtransChargeResult>(user, `/orders/${id}/payment/midtrans/reconcile`, { method: "POST" });
