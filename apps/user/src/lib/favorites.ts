import type { User } from "firebase/auth";

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export interface FavoriteProductRecord {
  id: string;
  outletId: string;
  outletName: string;
  businessName: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  createdAt: string;
}

export class FavoritesApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "FavoritesApiError";
  }
}

type ApiBody<T> = {
  data?: T;
  ok?: boolean;
  message?: string;
  error?: string;
};

async function favoriteRequest<T>(user: User, path: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) throw new Error("Nitip service is unavailable");
  const token = await user.getIdToken();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  const body = (await response.json()) as ApiBody<T>;
  if (!response.ok) {
    throw new FavoritesApiError(
      body.message ?? body.error ?? "Favorites request failed",
      response.status,
    );
  }
  if (body.data !== undefined) return body.data;
  return body as unknown as T;
}

export const listFavoriteProducts = (user: User) =>
  favoriteRequest<FavoriteProductRecord[]>(user, "/me/favorites");

export const addFavoriteProduct = (user: User, productId: string) =>
  favoriteRequest<FavoriteProductRecord>(
    user,
    `/me/favorites/${encodeURIComponent(productId)}`,
    { method: "POST" },
  );

export const removeFavoriteProduct = (user: User, productId: string) =>
  favoriteRequest<{ ok: boolean }>(
    user,
    `/me/favorites/${encodeURIComponent(productId)}`,
    { method: "DELETE" },
  );
