import type {
  CreateNitipDriverInput,
  DriverDeliveryAction,
  NitipDriverOffer,
  NitipDriverOrder,
  NitipDriverProfile,
  UpdateDriverLocationInput,
  UpdateNitipDriverInput,
} from "@nitip/domain/driver";
import * as Location from "expo-location";
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

  const body = (await response.json()) as {
    data?: T;
    message?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new ApiError(
      body.message ?? body.error ?? "Nitip API request failed",
      response.status,
    );
  }

  return body.data as T;
}

export function getDriverMe(user: User | null) {
  return apiRequest<NitipDriverProfile | null>(user, "/driver/me");
}

export function createDriver(
  user: User | null,
  input: CreateNitipDriverInput,
) {
  return apiRequest<NitipDriverProfile>(user, "/driver/onboarding", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateDriver(
  user: User | null,
  input: UpdateNitipDriverInput,
) {
  return apiRequest<NitipDriverProfile>(user, "/driver/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function submitDriver(user: User | null) {
  return apiRequest<NitipDriverProfile>(user, "/driver/me/submit", {
    method: "POST",
  });
}

export function updateDriverLocation(
  user: User | null,
  input: UpdateDriverLocationInput,
) {
  return apiRequest<NitipDriverProfile>(user, "/driver/me/location", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

async function captureForegroundLocation(
  user: User | null,
): Promise<NitipDriverProfile | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") return null;

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

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
      capturedLocation = await captureForegroundLocation(user);
    } catch {
      capturedLocation = null;
    }
  }

  const profile = await apiRequest<NitipDriverProfile>(
    user,
    "/driver/me/availability",
    {
      method: "PATCH",
      body: JSON.stringify({ isOnline }),
    },
  );

  return capturedLocation ? { ...capturedLocation, isOnline: profile.isOnline } : profile;
}

export function listDriverOffers(user: User | null) {
  return apiRequest<NitipDriverOffer[]>(user, "/driver/orders/available");
}

export function getCurrentDriverOrder(user: User | null) {
  return apiRequest<NitipDriverOrder | null>(user, "/driver/orders/current");
}

export function getDriverOrder(user: User | null, id: string) {
  return apiRequest<NitipDriverOrder>(user, `/driver/orders/${id}`);
}

export function acceptDriverOffer(user: User | null, id: string) {
  return apiRequest<NitipDriverOrder>(user, `/driver/orders/${id}/accept`, {
    method: "POST",
  });
}

export function actOnDriverOrder(
  user: User | null,
  id: string,
  action: DriverDeliveryAction,
) {
  return apiRequest<NitipDriverOrder>(user, `/driver/orders/${id}/action`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}
