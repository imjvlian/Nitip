import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NitipOrder } from "@nitip/domain/commerce";
import type { NitipLanguage } from "@nitip/i18n";

const READ_KEY_PREFIX = "@nitip/user-notifications/read";
const TERMINAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type UserNotificationTone = "action" | "info" | "success" | "danger";

export interface UserNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  tone: UserNotificationTone;
  orderId: string;
}

function recent(order: NitipOrder) {
  if (!["delivered", "cancelled", "refunded"].includes(order.status)) return true;
  const time = Date.parse(order.updatedAt);
  return Number.isFinite(time) && Date.now() - time <= TERMINAL_WINDOW_MS;
}

function copy(order: NitipOrder, language: NitipLanguage) {
  const prefix = `${order.orderCode} · ${order.outletName}`;
  if (language === "id") {
    switch (order.status) {
      case "pending_payment": return { title: "Selesaikan pembayaran", body: `${prefix}. Pembayaran masih menunggu sebelum batas waktu berakhir.`, tone: "action" as const };
      case "paid": return { title: "Pembayaran berhasil", body: `${prefix}. Pesanan sedang menunggu konfirmasi merchant.`, tone: "success" as const };
      case "merchant_confirmed": return { title: "Pesanan diterima merchant", body: `${prefix}. Merchant akan mulai menyiapkan pesananmu.`, tone: "info" as const };
      case "preparing": return { title: "Pesanan sedang disiapkan", body: `${prefix}. Merchant sedang menyiapkan pesanan.`, tone: "info" as const };
      case "ready_for_pickup": return { title: "Pesanan siap diambil", body: `${prefix}. Sistem sedang menunggu driver untuk pickup.`, tone: "info" as const };
      case "driver_assigned": return { title: "Driver sudah ditemukan", body: `${prefix}. Driver sedang menuju merchant.`, tone: "info" as const };
      case "picked_up": return { title: "Pesanan sudah diambil driver", body: `${prefix}. Driver sudah membawa pesananmu.`, tone: "info" as const };
      case "on_delivery": return { title: "Driver menuju lokasimu", body: `${prefix}. Buka live tracking untuk melihat posisi driver.`, tone: "action" as const };
      case "delivered": return { title: "Pesanan sudah diterima", body: `${prefix}. Pengantaran selesai. Kamu bisa memberikan rating.`, tone: "success" as const };
      case "cancelled": return { title: "Pesanan dibatalkan", body: `${prefix}. Buka detail untuk melihat alasan pembatalan.`, tone: "danger" as const };
      case "refunded": return { title: "Pesanan direfund", body: `${prefix}. Status pembayaran telah berubah menjadi refund.`, tone: "danger" as const };
    }
  }
  switch (order.status) {
    case "pending_payment": return { title: "Complete payment", body: `${prefix}. Payment is still pending before the time limit expires.`, tone: "action" as const };
    case "paid": return { title: "Payment successful", body: `${prefix}. The order is waiting for merchant confirmation.`, tone: "success" as const };
    case "merchant_confirmed": return { title: "Merchant accepted your order", body: `${prefix}. The merchant will begin preparing it.`, tone: "info" as const };
    case "preparing": return { title: "Order is being prepared", body: `${prefix}. The merchant is preparing your order.`, tone: "info" as const };
    case "ready_for_pickup": return { title: "Order ready for pickup", body: `${prefix}. Nitip is waiting for a driver.`, tone: "info" as const };
    case "driver_assigned": return { title: "Driver found", body: `${prefix}. The driver is heading to the merchant.`, tone: "info" as const };
    case "picked_up": return { title: "Driver picked up your order", body: `${prefix}. Your order is with the driver.`, tone: "info" as const };
    case "on_delivery": return { title: "Driver is heading to you", body: `${prefix}. Open live tracking to follow the driver.`, tone: "action" as const };
    case "delivered": return { title: "Order delivered", body: `${prefix}. Delivery is complete. You can leave a rating.`, tone: "success" as const };
    case "cancelled": return { title: "Order cancelled", body: `${prefix}. Open the details to see the cancellation reason.`, tone: "danger" as const };
    case "refunded": return { title: "Order refunded", body: `${prefix}. The payment status has changed to refunded.`, tone: "danger" as const };
  }
}

export function buildUserNotifications(orders: NitipOrder[], language: NitipLanguage): UserNotification[] {
  return orders.filter(recent).map((order) => {
    const c = copy(order, language);
    return { id: `order:${order.id}:${order.status}`, title: c.title, body: c.body, timestamp: order.updatedAt, tone: c.tone, orderId: order.id };
  }).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 60);
}

function key(userId: string) { return `${READ_KEY_PREFIX}:${userId}`; }
export async function getUserNotificationReadIds(userId: string) {
  try { const raw = await AsyncStorage.getItem(key(userId)); const parsed = raw ? JSON.parse(raw) as unknown : []; return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []); } catch { return new Set<string>(); }
}
async function save(userId: string, ids: Set<string>) { await AsyncStorage.setItem(key(userId), JSON.stringify(Array.from(ids).slice(-500))); }
export async function markUserNotificationRead(userId: string, id: string) { const ids = await getUserNotificationReadIds(userId); ids.add(id); await save(userId, ids); return ids; }
export async function markUserNotificationsRead(userId: string, values: string[]) { const ids = await getUserNotificationReadIds(userId); values.forEach((id) => ids.add(id)); await save(userId, ids); return ids; }
