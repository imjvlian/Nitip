import type {
  CreateNitipAddressInput,
  NitipAddress,
  NitipUserProfile,
  UpdateNitipAddressInput,
  UpdateNitipProfileInput,
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

export function getMe(user: User | null) {
  return apiRequest<NitipUserProfile>(user, "/me");
}

export function updateMe(user: User | null, input: UpdateNitipProfileInput) {
  return apiRequest<NitipUserProfile>(user, "/me", {
    method: "PATCH",
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
