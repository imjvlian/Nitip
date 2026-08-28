import type {
  CreateNitipMerchantInput,
  CreateNitipOutletInput,
  NitipMerchantProfile,
  NitipOutlet,
  UpdateNitipMerchantInput,
  UpdateNitipOutletInput,
} from "@nitip/domain";
import type {
  CloudinaryUploadSignature,
  CreateNitipCategoryInput,
  CreateNitipProductInput,
  NitipCategory,
  NitipProduct,
  UpdateNitipCategoryInput,
  UpdateNitipProductInput,
} from "@nitip/domain/catalog";
import type { MerchantOrderActionInput, NitipMerchantOrder, NitipOrderOperations } from "@nitip/domain/commerce";
import { File, UploadType } from "expo-file-system";
import type { User } from "firebase/auth";

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
export const apiConfigured = apiBaseUrl.length > 0;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = "ApiError"; }
}

async function apiRequest<T>(user: User | null, path: string, init?: RequestInit): Promise<T> {
  if (!apiConfigured) throw new Error("EXPO_PUBLIC_API_URL is not configured");
  if (!user) throw new Error("Authentication is required");
  const idToken = await user.getIdToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { Accept: "application/json", Authorization: `Bearer ${idToken}`, ...(init?.body ? { "Content-Type": "application/json" } : {}) },
  });
  const body = (await response.json()) as { data?: T; ok?: boolean; message?: string; error?: string };
  if (!response.ok) throw new ApiError(body.message ?? body.error ?? "Nitip API request failed", response.status);
  if (body.data !== undefined) return body.data;
  return body as unknown as T;
}

export const getMerchantMe = (user: User | null) => apiRequest<NitipMerchantProfile | null>(user, "/merchant/me");
export const createMerchant = (user: User | null, input: CreateNitipMerchantInput) => apiRequest<NitipMerchantProfile>(user, "/merchant/onboarding", { method: "POST", body: JSON.stringify(input) });
export const updateMerchant = (user: User | null, input: UpdateNitipMerchantInput) => apiRequest<NitipMerchantProfile>(user, "/merchant/me", { method: "PATCH", body: JSON.stringify(input) });
export const submitMerchant = (user: User | null) => apiRequest<NitipMerchantProfile>(user, "/merchant/me/submit", { method: "POST" });
export const listOutlets = (user: User | null) => apiRequest<NitipOutlet[]>(user, "/merchant/outlets");
export const createOutlet = (user: User | null, input: CreateNitipOutletInput) => apiRequest<NitipOutlet>(user, "/merchant/outlets", { method: "POST", body: JSON.stringify(input) });
export const updateOutlet = (user: User | null, id: string, input: UpdateNitipOutletInput) => apiRequest<NitipOutlet>(user, `/merchant/outlets/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteOutlet = (user: User | null, id: string) => apiRequest<{ ok: boolean }>(user, `/merchant/outlets/${id}`, { method: "DELETE" });
export const listCategories = (user: User | null, outletId: string) => apiRequest<NitipCategory[]>(user, `/merchant/outlets/${outletId}/categories`);
export const createCategory = (user: User | null, outletId: string, input: CreateNitipCategoryInput) => apiRequest<NitipCategory>(user, `/merchant/outlets/${outletId}/categories`, { method: "POST", body: JSON.stringify(input) });
export const updateCategory = (user: User | null, outletId: string, id: string, input: UpdateNitipCategoryInput) => apiRequest<NitipCategory>(user, `/merchant/outlets/${outletId}/categories/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteCategory = (user: User | null, outletId: string, id: string) => apiRequest<{ ok: boolean }>(user, `/merchant/outlets/${outletId}/categories/${id}`, { method: "DELETE" });
export const listProducts = (user: User | null, outletId: string) => apiRequest<NitipProduct[]>(user, `/merchant/outlets/${outletId}/products`);
export const createProduct = (user: User | null, outletId: string, input: CreateNitipProductInput) => apiRequest<NitipProduct>(user, `/merchant/outlets/${outletId}/products`, { method: "POST", body: JSON.stringify(input) });
export const updateProduct = (user: User | null, outletId: string, id: string, input: UpdateNitipProductInput) => apiRequest<NitipProduct>(user, `/merchant/outlets/${outletId}/products/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteProduct = (user: User | null, outletId: string, id: string) => apiRequest<{ ok: boolean }>(user, `/merchant/outlets/${outletId}/products/${id}`, { method: "DELETE" });
export const listMerchantOrders = (user: User | null) => apiRequest<NitipMerchantOrder[]>(user, "/merchant/orders");
export const getMerchantOrder = (user: User | null, id: string) => apiRequest<NitipMerchantOrder>(user, `/merchant/orders/${id}`);
export const getMerchantOrderOperations = (user: User | null, id: string) => apiRequest<NitipOrderOperations>(user, `/merchant/orders/${id}/operations`);
export const actOnMerchantOrder = (user: User | null, id: string, input: MerchantOrderActionInput) => apiRequest<NitipMerchantOrder>(user, `/merchant/orders/${id}/action`, { method: "POST", body: JSON.stringify(input) });
export const getProductUploadSignature = (user: User | null) => apiRequest<CloudinaryUploadSignature>(user, "/merchant/media/signature", { method: "POST" });

export async function uploadProductImage(user: User | null, asset: { uri: string; fileName?: string | null; mimeType?: string | null }) {
  const signed = await getProductUploadSignature(user);
  const file = new File(asset.uri);
  const response = await file.upload(signed.uploadUrl, {
    httpMethod: "POST", uploadType: UploadType.MULTIPART, fieldName: "file", mimeType: asset.mimeType ?? "image/jpeg",
    parameters: { api_key: signed.apiKey, timestamp: String(signed.timestamp), folder: signed.folder, signature: signed.signature },
  });
  let body: { secure_url?: string; public_id?: string; error?: { message?: string } } = {};
  try { body = JSON.parse(response.body) as typeof body; } catch { throw new Error("Respons upload Cloudinary tidak valid"); }
  if (response.status < 200 || response.status >= 300 || !body.secure_url || !body.public_id) throw new Error(body.error?.message ?? "Gagal mengunggah foto produk");
  return { imageUrl: body.secure_url, imagePublicId: body.public_id };
}
