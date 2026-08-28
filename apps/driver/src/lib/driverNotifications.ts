import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NitipDriverOffer, NitipDriverOrder, NitipDriverProfile } from "@nitip/domain/driver";
import type { NitipLanguage } from "@nitip/i18n";

const READ_KEY_PREFIX = "@nitip/driver-notifications/read";
const HISTORY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type DriverNotificationTone = "action" | "info" | "success" | "danger";
export type DriverNotificationTarget = { type: "order"; orderId: string } | { type: "home" } | { type: "profile" };
export interface DriverNotification { id: string; title: string; body: string; timestamp: string; tone: DriverNotificationTone; target: DriverNotificationTarget; }

function profileCopy(profile: NitipDriverProfile, language: NitipLanguage) {
  if (language === "id") {
    if (profile.status === "draft") return { title: "Lengkapi profil driver", body: "Lengkapi identitas dan kendaraan lalu kirim untuk verifikasi.", tone: "action" as const };
    if (profile.status === "pending_review") return { title: "Profil sedang direview", body: "Tim Nitip sedang memeriksa data driver kamu.", tone: "info" as const };
    if (profile.status === "rejected") return { title: "Profil perlu diperbaiki", body: profile.rejectionReason ? `Catatan review: ${profile.rejectionReason}` : "Perbarui data lalu kirim ulang untuk review.", tone: "danger" as const };
    return { title: "Akun driver aktif", body: profile.isOnline ? "Kamu sedang online dan siap menerima order." : "Akun terverifikasi. Aktifkan mode online untuk menerima order.", tone: "success" as const };
  }
  if (profile.status === "draft") return { title: "Complete driver profile", body: "Complete identity and vehicle details, then submit for verification.", tone: "action" as const };
  if (profile.status === "pending_review") return { title: "Profile under review", body: "Nitip is reviewing your driver details.", tone: "info" as const };
  if (profile.status === "rejected") return { title: "Profile needs changes", body: profile.rejectionReason ? `Review note: ${profile.rejectionReason}` : "Update the requested details and submit again.", tone: "danger" as const };
  return { title: "Driver account active", body: profile.isOnline ? "You are online and ready for orders." : "Your account is verified. Go online to receive orders.", tone: "success" as const };
}

function activeCopy(order: NitipDriverOrder, language: NitipLanguage) {
  if (language === "id") {
    if (order.status === "driver_assigned") return { title: "Order baru ditugaskan", body: `${order.orderCode}. Menuju ${order.pickup.outletName} untuk pickup.`, tone: "action" as const };
    if (order.status === "picked_up") return { title: "Pesanan sudah diambil", body: `${order.orderCode}. Mulai pengantaran saat siap menuju customer.`, tone: "action" as const };
    if (order.status === "on_delivery") return { title: "Pengantaran sedang berjalan", body: `${order.orderCode}. Live location sedang dibagikan ke customer.`, tone: "action" as const };
    return { title: "Pengantaran selesai", body: `${order.orderCode}. Fee pengantaran telah masuk ke riwayat.`, tone: "success" as const };
  }
  if (order.status === "driver_assigned") return { title: "New assigned order", body: `${order.orderCode}. Head to ${order.pickup.outletName} for pickup.`, tone: "action" as const };
  if (order.status === "picked_up") return { title: "Order picked up", body: `${order.orderCode}. Start delivery when you're ready to head to the customer.`, tone: "action" as const };
  if (order.status === "on_delivery") return { title: "Delivery in progress", body: `${order.orderCode}. Live location is being shared with the customer.`, tone: "action" as const };
  return { title: "Delivery completed", body: `${order.orderCode}. Delivery earnings are now in your history.`, tone: "success" as const };
}

export function buildDriverNotifications(profile: NitipDriverProfile | null, offers: NitipDriverOffer[], current: NitipDriverOrder | null, history: NitipDriverOrder[], language: NitipLanguage): DriverNotification[] {
  const result: DriverNotification[] = [];
  if (profile) { const c = profileCopy(profile, language); result.push({ id: `profile:${profile.id}:${profile.status}:${profile.isOnline}`, title: c.title, body: c.body, timestamp: profile.updatedAt, tone: c.tone, target: { type: "profile" } }); }
  if (!current && profile?.status === "approved" && profile.isOnline && offers.length > 0) {
    const newest = offers[0]; result.push({ id: `offers:${offers.map((o) => o.id).sort().join("-")}`, title: language === "id" ? `${offers.length} order tersedia` : `${offers.length} orders available`, body: language === "id" ? `Order pickup siap tersedia. Terdekat: ${newest?.pickup.outletName ?? "merchant"}.` : `Pickup-ready orders are available. Nearest: ${newest?.pickup.outletName ?? "merchant"}.`, timestamp: newest?.createdAt ?? new Date().toISOString(), tone: "action", target: { type: "home" } });
  }
  if (current) { const c = activeCopy(current, language); result.push({ id: `order:${current.id}:${current.status}`, title: c.title, body: c.body, timestamp: current.assignedAt, tone: c.tone, target: { type: "order", orderId: current.id } }); }
  for (const order of history) { const time = Date.parse(order.createdAt); if (!Number.isFinite(time) || Date.now() - time > HISTORY_WINDOW_MS) continue; const c = activeCopy(order, language); result.push({ id: `history:${order.id}:${order.status}`, title: c.title, body: c.body, timestamp: order.createdAt, tone: "success", target: { type: "order", orderId: order.id } }); }
  return result.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 60);
}

function key(userId: string) { return `${READ_KEY_PREFIX}:${userId}`; }
export async function getDriverNotificationReadIds(userId: string) { try { const raw = await AsyncStorage.getItem(key(userId)); const parsed = raw ? JSON.parse(raw) as unknown : []; return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []); } catch { return new Set<string>(); } }
async function save(userId: string, ids: Set<string>) { await AsyncStorage.setItem(key(userId), JSON.stringify(Array.from(ids).slice(-500))); }
export async function markDriverNotificationRead(userId: string, id: string) { const ids = await getDriverNotificationReadIds(userId); ids.add(id); await save(userId, ids); return ids; }
export async function markDriverNotificationsRead(userId: string, values: string[]) { const ids = await getDriverNotificationReadIds(userId); values.forEach((id) => ids.add(id)); await save(userId, ids); return ids; }
