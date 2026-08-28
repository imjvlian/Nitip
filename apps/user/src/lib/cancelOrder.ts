import type { NitipOrder } from "@nitip/domain/commerce";
import type { User } from "firebase/auth";

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export async function cancelPendingOrder(user: User | null, orderId: string, reason?: string | null) {
  if (!apiBaseUrl) throw new Error("EXPO_PUBLIC_API_URL is not configured");
  if (!user) throw new Error("Authentication is required");
  const token = await user.getIdToken();
  const response = await fetch(`${apiBaseUrl}/orders/${orderId}/cancel`, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason?.trim() || null }),
  });
  const body = await response.json() as { data?: NitipOrder; message?: string; error?: string };
  if (!response.ok || !body.data) throw new Error(body.message ?? body.error ?? "Gagal membatalkan pesanan");
  return body.data;
}
