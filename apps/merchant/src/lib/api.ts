import type {
  CreateNitipMerchantInput,
  CreateNitipOutletInput,
  NitipMerchantProfile,
  NitipOutlet,
  UpdateNitipMerchantInput,
  UpdateNitipOutletInput,
} from "@nitip/domain";
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

export function createMerchant(
  user: User | null,
  input: CreateNitipMerchantInput,
) {
  return apiRequest<NitipMerchantProfile>(user, "/merchant/onboarding", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMerchant(
  user: User | null,
  input: UpdateNitipMerchantInput,
) {
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

export function createOutlet(
  user: User | null,
  input: CreateNitipOutletInput,
) {
  return apiRequest<NitipOutlet>(user, "/merchant/outlets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateOutlet(
  user: User | null,
  id: string,
  input: UpdateNitipOutletInput,
) {
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
