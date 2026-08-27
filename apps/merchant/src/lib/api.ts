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
import type {
  MerchantOrderActionInput,
  NitipMerchantOrder,
} from "@nitip/domain/commerce";
import { File, UploadType } from "expo-file-system";
import type { User } from "firebase/auth";

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

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
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${idToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  const body = (await response.json()) as {
    data?: T;
    ok?: boolean;
    message?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new ApiError(
      body.message ?? body.error ?? "Nitip API request failed",
      response.status,
    );
  }

  if (body.data !== undefined) return body.data;
  return body as unknown as T;
}

export function getMerchantMe(user: User | null) {
  return apiRequest<NitipMerchantProfile | null>(user, "/merchant/me");
}

export function createMerchant(user: User | null, input: CreateNitipMerchantInput) {
  return apiRequest<NitipMerchantProfile>(user, "/merchant/onboarding", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMerchant(user: User | null, input: UpdateNitipMerchantInput) {
  return apiRequest<NitipMerchantProfile>(user, "/merchant/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function submitMerchant(user: User | null) {
  return apiRequest<NitipMerchantProfile>(user, "/merchant/me/submit", {
    method: "POST",
  });
}

export function listOutlets(user: User | null) {
  return apiRequest<NitipOutlet[]>(user, "/merchant/outlets");
}

export function createOutlet(user: User | null, input: CreateNitipOutletInput) {
  return apiRequest<NitipOutlet>(user, "/merchant/outlets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateOutlet(user: User | null, id: string, input: UpdateNitipOutletInput) {
  return apiRequest<NitipOutlet>(user, `/merchant/outlets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteOutlet(user: User | null, id: string) {
  return apiRequest<{ ok: boolean }>(user, `/merchant/outlets/${id}`, {
    method: "DELETE",
  });
}

export function listCategories(user: User | null, outletId: string) {
  return apiRequest<NitipCategory[]>(user, `/merchant/outlets/${outletId}/categories`);
}

export function createCategory(
  user: User | null,
  outletId: string,
  input: CreateNitipCategoryInput,
) {
  return apiRequest<NitipCategory>(user, `/merchant/outlets/${outletId}/categories`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCategory(
  user: User | null,
  outletId: string,
  id: string,
  input: UpdateNitipCategoryInput,
) {
  return apiRequest<NitipCategory>(user, `/merchant/outlets/${outletId}/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCategory(user: User | null, outletId: string, id: string) {
  return apiRequest<{ ok: boolean }>(user, `/merchant/outlets/${outletId}/categories/${id}`, {
    method: "DELETE",
  });
}

export function listProducts(user: User | null, outletId: string) {
  return apiRequest<NitipProduct[]>(user, `/merchant/outlets/${outletId}/products`);
}

export function createProduct(
  user: User | null,
  outletId: string,
  input: CreateNitipProductInput,
) {
  return apiRequest<NitipProduct>(user, `/merchant/outlets/${outletId}/products`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProduct(
  user: User | null,
  outletId: string,
  id: string,
  input: UpdateNitipProductInput,
) {
  return apiRequest<NitipProduct>(user, `/merchant/outlets/${outletId}/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteProduct(user: User | null, outletId: string, id: string) {
  return apiRequest<{ ok: boolean }>(user, `/merchant/outlets/${outletId}/products/${id}`, {
    method: "DELETE",
  });
}

export function listMerchantOrders(user: User | null) {
  return apiRequest<NitipMerchantOrder[]>(user, "/merchant/orders");
}

export function getMerchantOrder(user: User | null, id: string) {
  return apiRequest<NitipMerchantOrder>(user, `/merchant/orders/${id}`);
}

export function actOnMerchantOrder(
  user: User | null,
  id: string,
  input: MerchantOrderActionInput,
) {
  return apiRequest<NitipMerchantOrder>(user, `/merchant/orders/${id}/action`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getProductUploadSignature(user: User | null) {
  return apiRequest<CloudinaryUploadSignature>(user, "/merchant/media/signature", {
    method: "POST",
  });
}

export async function uploadProductImage(
  user: User | null,
  asset: { uri: string; fileName?: string | null; mimeType?: string | null },
) {
  const signed = await getProductUploadSignature(user);
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
    public_id?: string;
    error?: { message?: string };
  } = {};

  try {
    body = JSON.parse(response.body) as typeof body;
  } catch {
    throw new Error("Respons upload Cloudinary tidak valid");
  }

  if (
    response.status < 200 ||
    response.status >= 300 ||
    !body.secure_url ||
    !body.public_id
  ) {
    throw new Error(body.error?.message ?? "Gagal mengunggah foto produk");
  }

  return {
    imageUrl: body.secure_url,
    imagePublicId: body.public_id,
  };
}
