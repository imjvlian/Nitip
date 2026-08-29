import type { NitipOrder } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { router, usePathname } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getOrder, reconcileDokuOrderPayment, startDokuOrderPayment } from "../lib/api";
import { cancelPendingOrder } from "../lib/cancelOrder";
import { NitipIcon } from "./NitipIcon";

const CHAT_STATUSES: NitipOrder["status"][] = ["driver_assigned", "picked_up", "on_delivery", "delivered"];

function orderIdFromPath(pathname: string) {
  const match = /^\/order\/([^/]+)$/.exec(pathname);
  return match?.[1] ?? null;
}

export function OrderActionDock() {
  const pathname = usePathname();
  const orderId = orderIdFromPath(pathname);
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<NitipOrder | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const c = language === "id" ? {
    chat: "Chat driver", pay: "Bayar", opening: "Membuka...", check: "Cek status", checking: "Mengecek...",
    paymentFailed: "Pembayaran belum dapat dibuka",
    checkFailed: "Status pembayaran belum dapat dicek", paid: "Pembayaran terkonfirmasi", paidBody: "DOKU mengonfirmasi pembayaran berhasil. Pesanan sekarang menunggu merchant.", pending: "Pembayaran masih diproses", pendingBody: "DOKU belum mengirim status final. Kamu dapat mencoba cek lagi setelah sekitar 60 detik.", expired: "Sesi pembayaran berakhir", expiredBody: "DOKU mengonfirmasi sesi sudah kedaluwarsa dan reservasi stok dilepas.",
    cancel: "Batalkan", cancelTitle: "Batalkan pesanan?", cancelBody: "Pesanan belum memiliki sesi pembayaran DOKU. Stok yang ditahan akan langsung dilepas.", keep: "Kembali", confirm: "Batalkan pesanan", cancelled: "Pesanan dibatalkan", cancelledBody: "Reservasi stok sudah dilepas dan pesanan tidak akan diproses.", failed: "Tidak dapat membatalkan",
  } : {
    chat: "Driver chat", pay: "Pay", opening: "Opening...", check: "Check status", checking: "Checking...",
    paymentFailed: "Payment could not be opened",
    checkFailed: "Payment status could not be checked", paid: "Payment confirmed", paidBody: "DOKU confirmed the payment. The order is now waiting for the merchant.", pending: "Payment is still processing", pendingBody: "DOKU has not returned a final status yet. Try checking again after about 60 seconds.", expired: "Payment session expired", expiredBody: "DOKU confirmed the checkout expired and reserved stock was released.",
    cancel: "Cancel", cancelTitle: "Cancel this order?", cancelBody: "No DOKU payment session has been created yet. Reserved stock will be released immediately.", keep: "Keep order", confirm: "Cancel order", cancelled: "Order cancelled", cancelledBody: "The stock reservation was released and the order will not be processed.", failed: "Unable to cancel",
  };

  const load = useCallback(async () => {
    if (!user || !orderId) { setOrder(null); return; }
    try { setOrder(await getOrder(user, orderId)); } catch { setOrder(null); }
  }, [orderId, user]);

  useEffect(() => {
    void load();
    if (!orderId || !user) return;
    const timer = setInterval(() => void load(), 7000);
    return () => clearInterval(timer);
  }, [load, orderId, user]);

  if (!orderId || !user || !order) return null;

  const canChat = CHAT_STATUSES.includes(order.status);
  const canPay = order.status === "pending_payment";
  const hasDokuSession = canPay && order.payment?.provider === "doku" && Boolean(order.payment.checkoutUrl);
  const canCancel = canPay && !hasDokuSession;
  if (!canChat && !canPay && !canCancel) return null;

  async function payWithDoku() {
    if (!order || paying) return;
    setPaying(true);
    try {
      const next = await startDokuOrderPayment(user, order.id);
      setOrder(next);
      if (!next.payment?.checkoutUrl) throw new Error("DOKU Checkout URL tidak tersedia");
      router.push({ pathname: "/payment/[orderId]", params: { orderId: order.id } });
    } catch (error) {
      Alert.alert(c.paymentFailed, error instanceof Error ? error.message : c.paymentFailed);
    } finally {
      setPaying(false);
    }
  }

  async function checkDokuStatus() {
    if (!order || reconciling) return;
    setReconciling(true);
    try {
      const next = await reconcileDokuOrderPayment(user, order.id);
      setOrder(next);
      if (next.status === "paid") Alert.alert(c.paid, c.paidBody);
      else if (next.status === "cancelled" || next.payment?.status === "expired") Alert.alert(c.expired, c.expiredBody);
      else Alert.alert(c.pending, c.pendingBody);
    } catch (error) {
      Alert.alert(c.checkFailed, error instanceof Error ? error.message : c.checkFailed);
    } finally {
      setReconciling(false);
    }
  }

  async function performCancel() {
    if (!order || cancelling) return;
    setCancelling(true);
    try {
      const next = await cancelPendingOrder(user, order.id, "Dibatalkan customer dari detail pesanan");
      setOrder(next);
      Alert.alert(c.cancelled, c.cancelledBody);
    } catch (error) {
      Alert.alert(c.failed, error instanceof Error ? error.message : c.failed);
    } finally {
      setCancelling(false);
    }
  }

  function confirmCancel() {
    Alert.alert(c.cancelTitle, c.cancelBody, [
      { text: c.keep, style: "cancel" },
      { text: c.confirm, style: "destructive", onPress: () => void performCancel() },
    ]);
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View style={styles.dock}>
        {canChat ? <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/chat/[orderId]", params: { orderId } })} style={[styles.action, { backgroundColor: theme.colors.primary }]}><NitipIcon color="#FFFFFF" name="chat" size={16} /><Text style={styles.primaryText}>{c.chat}</Text></Pressable> : null}
        {canPay ? <Pressable accessibilityRole="button" disabled={paying} onPress={() => void payWithDoku()} style={[styles.action, { backgroundColor: theme.colors.primary, opacity: paying ? 0.55 : 1 }]}>{paying ? <ActivityIndicator color="#FFFFFF" size="small" /> : <NitipIcon color="#FFFFFF" name="receipt" size={16} />}<Text style={styles.primaryText}>{paying ? c.opening : c.pay}</Text></Pressable> : null}
        {hasDokuSession ? <Pressable accessibilityRole="button" disabled={reconciling} onPress={() => void checkDokuStatus()} style={[styles.action, styles.secondaryAction, { backgroundColor: theme.colors.surfaceAccent, borderColor: theme.colors.border, opacity: reconciling ? 0.55 : 1 }]}>{reconciling ? <ActivityIndicator color={theme.colors.primary} size="small" /> : <NitipIcon color={theme.colors.primary} name="refresh" size={16} />}<Text style={[styles.secondaryText, { color: theme.colors.primary }]}>{reconciling ? c.checking : c.check}</Text></Pressable> : null}
        {canCancel ? <Pressable accessibilityRole="button" disabled={cancelling} onPress={confirmCancel} style={[styles.action, styles.secondaryAction, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.border, opacity: cancelling ? 0.55 : 1 }]}>{cancelling ? <ActivityIndicator color={theme.colors.danger} size="small" /> : <NitipIcon color={theme.colors.danger} name="trash" size={16} />}<Text style={[styles.secondaryText, { color: theme.colors.danger }]}>{c.cancel}</Text></Pressable> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, paddingHorizontal: 18, paddingTop: 9 },
  dock: { flexDirection: "row", gap: 8 },
  action: { alignItems: "center", borderRadius: 14, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 48, paddingHorizontal: 10 },
  secondaryAction: { borderWidth: 1 },
  primaryText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  secondaryText: { fontSize: 10, fontWeight: "900" },
});
