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

type ApiBody<T> = {
  data?: T;
  ok?: boolean;
  message?: string;
  error?: string;
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
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${idToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
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

export function getMe(user: User | null) {
  return apiRequest<NitipUserProfile>(user, "/me");
}

export function updateMe(user: User | null, input: UpdateNitipProfileInput) {
  return apiRequest<NitipUserProfile>(user, "/me", {
    method: "PATCH",
    body: JSON.stringify(input),
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

export function createOrder(user: User | null, input: NitipCheckoutRequest) {
  return apiRequest<NitipOrder>(user, "/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
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
