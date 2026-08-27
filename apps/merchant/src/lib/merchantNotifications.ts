import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NitipMerchantProfile } from "@nitip/domain";
import type { NitipMerchantOrder } from "@nitip/domain/commerce";
import type { NitipLanguage } from "@nitip/i18n";

const READ_KEY_PREFIX = "@nitip/merchant-notifications/read";
const TERMINAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type MerchantNotificationTone = "action" | "info" | "success" | "danger";

export type MerchantNotificationTarget =
  | { type: "order"; orderId: string }
  | { type: "business" };

export interface MerchantNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  tone: MerchantNotificationTone;
  target: MerchantNotificationTarget;
}

function isRecentTerminalOrder(order: NitipMerchantOrder) {
  if (
    order.status !== "delivered" &&
    order.status !== "cancelled" &&
    order.status !== "refunded"
  ) {
    return true;
  }

  const updatedAt = Date.parse(order.updatedAt);
  if (!Number.isFinite(updatedAt)) return false;
  return Date.now() - updatedAt <= TERMINAL_WINDOW_MS;
}

function orderCopy(order: NitipMerchantOrder, language: NitipLanguage) {
  const prefix = `${order.orderCode} · ${order.outletName}`;

  if (language === "id") {
    switch (order.status) {
      case "paid":
        return {
          title: "Pesanan baru perlu dikonfirmasi",
          body: `${prefix}. Periksa item dan alamat customer lalu terima atau tolak pesanan.`,
          tone: "action" as const,
        };
      case "merchant_confirmed":
        return {
          title: "Pesanan siap mulai disiapkan",
          body: `${prefix}. Mulai proses saat dapur atau toko benar-benar menyiapkan order.`,
          tone: "action" as const,
        };
      case "preparing":
        return {
          title: "Pesanan sedang disiapkan",
          body: `${prefix}. Tandai siap diambil setelah paket benar-benar selesai.`,
          tone: "action" as const,
        };
      case "ready_for_pickup":
        return {
          title: "Pesanan menunggu driver",
          body: `${prefix}. Paket sudah siap dan menunggu driver menerima assignment.`,
          tone: "info" as const,
        };
      case "driver_assigned":
        return {
          title: "Driver sudah ditemukan",
          body: `${prefix}. Driver sedang menuju outlet untuk pickup.`,
          tone: "info" as const,
        };
      case "picked_up":
      case "on_delivery":
        return {
          title: "Pesanan sedang diantar",
          body: `${prefix}. Pesanan sudah berada dalam proses pengantaran ke customer.`,
          tone: "info" as const,
        };
      case "delivered":
        return {
          title: "Pesanan selesai",
          body: `${prefix}. Pesanan sudah diterima customer.`,
          tone: "success" as const,
        };
      case "cancelled":
        return {
          title: "Pesanan dibatalkan",
          body: `${prefix}. Buka detail untuk melihat informasi pembatalan.`,
          tone: "danger" as const,
        };
      case "refunded":
        return {
          title: "Refund pesanan diproses",
          body: `${prefix}. Status pesanan sudah berubah menjadi refund.`,
          tone: "danger" as const,
        };
      case "pending_payment":
        return null;
    }
  }

  switch (order.status) {
    case "paid":
      return {
        title: "New order needs confirmation",
        body: `${prefix}. Review the items and delivery address, then accept or reject the order.`,
        tone: "action" as const,
      };
    case "merchant_confirmed":
      return {
        title: "Order is ready to be prepared",
        body: `${prefix}. Start preparing when your kitchen or store actually begins the order.`,
        tone: "action" as const,
      };
    case "preparing":
      return {
        title: "Order is being prepared",
        body: `${prefix}. Mark it ready only after the package is complete.`,
        tone: "action" as const,
      };
    case "ready_for_pickup":
      return {
        title: "Order is waiting for a driver",
        body: `${prefix}. The package is ready and waiting for a driver assignment.`,
        tone: "info" as const,
      };
    case "driver_assigned":
      return {
        title: "Driver found",
        body: `${prefix}. The driver is heading to the outlet for pickup.`,
        tone: "info" as const,
      };
    case "picked_up":
    case "on_delivery":
      return {
        title: "Order is on the way",
        body: `${prefix}. The order is currently being delivered to the customer.`,
        tone: "info" as const,
      };
    case "delivered":
      return {
        title: "Order completed",
        body: `${prefix}. The customer has received the order.`,
        tone: "success" as const,
      };
    case "cancelled":
      return {
        title: "Order cancelled",
        body: `${prefix}. Open the order details for cancellation information.`,
        tone: "danger" as const,
      };
    case "refunded":
      return {
        title: "Order refund processed",
        body: `${prefix}. The order status has changed to refunded.`,
        tone: "danger" as const,
      };
    case "pending_payment":
      return null;
  }
}

function merchantCopy(merchant: NitipMerchantProfile, language: NitipLanguage) {
  if (language === "id") {
    switch (merchant.status) {
      case "draft":
        return {
          title: "Lengkapi profil usaha",
          body: "Lengkapi data merchant, outlet, dan menu sebelum mengirim usaha untuk review Ops.",
          tone: "action" as const,
        };
      case "pending_review":
        return {
          title: "Profil usaha sedang direview",
          body: "Data merchant sudah dikirim dan sedang menunggu review dari tim Ops Nitip.",
          tone: "info" as const,
        };
      case "approved":
        return {
          title: "Merchant sudah aktif",
          body: "Usaha sudah disetujui Ops dan dapat menerima pesanan customer.",
          tone: "success" as const,
        };
      case "rejected":
        return {
          title: "Profil usaha perlu diperbarui",
          body: merchant.rejectionReason
            ? `Review ditolak: ${merchant.rejectionReason}`
            : "Perbarui data yang diperlukan lalu kirim ulang untuk review.",
          tone: "danger" as const,
        };
    }
  }

  switch (merchant.status) {
    case "draft":
      return {
        title: "Complete your business profile",
        body: "Complete your merchant, outlet, and menu details before submitting for Ops review.",
        tone: "action" as const,
      };
    case "pending_review":
      return {
        title: "Business profile is under review",
        body: "Your merchant profile has been submitted and is waiting for Nitip Ops review.",
        tone: "info" as const,
      };
    case "approved":
      return {
        title: "Merchant is active",
        body: "Your business has been approved and can accept customer orders.",
        tone: "success" as const,
      };
    case "rejected":
      return {
        title: "Business profile needs an update",
        body: merchant.rejectionReason
          ? `Review rejected: ${merchant.rejectionReason}`
          : "Update the required information and submit it for review again.",
        tone: "danger" as const,
      };
  }
}

export function buildMerchantNotifications(
  merchant: NitipMerchantProfile | null,
  orders: NitipMerchantOrder[],
  language: NitipLanguage,
): MerchantNotification[] {
  const notifications: MerchantNotification[] = [];

  if (merchant) {
    const copy = merchantCopy(merchant, language);
    notifications.push({
      id: `merchant:${merchant.id}:${merchant.status}`,
      title: copy.title,
      body: copy.body,
      timestamp: merchant.updatedAt,
      tone: copy.tone,
      target: { type: "business" },
    });
  }

  for (const order of orders) {
    if (!isRecentTerminalOrder(order)) continue;
    const copy = orderCopy(order, language);
    if (!copy) continue;

    notifications.push({
      id: `order:${order.id}:${order.status}`,
      title: copy.title,
      body: copy.body,
      timestamp: order.updatedAt,
      tone: copy.tone,
      target: { type: "order", orderId: order.id },
    });
  }

  return notifications
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, 60);
}

function readKey(userId: string) {
  return `${READ_KEY_PREFIX}:${userId}`;
}

export async function getMerchantNotificationReadIds(userId: string) {
  try {
    const raw = await AsyncStorage.getItem(readKey(userId));
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}

async function saveReadIds(userId: string, ids: Set<string>) {
  const values = Array.from(ids).slice(-500);
  await AsyncStorage.setItem(readKey(userId), JSON.stringify(values));
}

export async function markMerchantNotificationRead(userId: string, id: string) {
  const ids = await getMerchantNotificationReadIds(userId);
  ids.add(id);
  await saveReadIds(userId, ids);
  return ids;
}

export async function markMerchantNotificationsRead(userId: string, notificationIds: string[]) {
  const ids = await getMerchantNotificationReadIds(userId);
  for (const id of notificationIds) ids.add(id);
  await saveReadIds(userId, ids);
  return ids;
}
