import type { NitipOrder } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { router, usePathname } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getOrder } from "../lib/api";
import { cancelPendingOrder } from "../lib/cancelOrder";
import { NitipIcon } from "./NitipIcon";

const CHAT_STATUSES: NitipOrder["status"][] = [
  "driver_assigned",
  "picked_up",
  "on_delivery",
  "delivered",
];

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

  const c = language === "id" ? {
    chat: "Chat driver",
    cancel: "Batalkan",
    cancelTitle: "Batalkan pesanan?",
    cancelBody: "Pesanan belum dibayar. Stok yang ditahan akan langsung dilepas.",
    keep: "Kembali",
    confirm: "Batalkan pesanan",
    cancelled: "Pesanan dibatalkan",
    cancelledBody: "Reservasi stok sudah dilepas dan pesanan tidak akan diproses.",
    failed: "Tidak dapat membatalkan",
  } : {
    chat: "Driver chat",
    cancel: "Cancel",
    cancelTitle: "Cancel this order?",
    cancelBody: "The order has not been paid. Reserved stock will be released immediately.",
    keep: "Keep order",
    confirm: "Cancel order",
    cancelled: "Order cancelled",
    cancelledBody: "The stock reservation was released and the order will not be processed.",
    failed: "Unable to cancel",
  };

  const load = useCallback(async () => {
    if (!user || !orderId) {
      setOrder(null);
      return;
    }
    try {
      setOrder(await getOrder(user, orderId));
    } catch {
      setOrder(null);
    }
  }, [orderId, user]);

  useEffect(() => {
    void load();
    if (!orderId || !user) return;
    const timer = setInterval(() => void load(), 7000);
    return () => clearInterval(timer);
  }, [load, orderId, user]);

  if (!orderId || !user || !order) return null;

  const canChat = CHAT_STATUSES.includes(order.status);
  const canCancel = order.status === "pending_payment";
  if (!canChat && !canCancel) return null;

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
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom + 14, 20) }]}>
      <View style={[styles.dock, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
        {canChat ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/chat/[orderId]", params: { orderId } })}
            style={[styles.action, { backgroundColor: theme.colors.primary }]}
          >
            <NitipIcon color="#FFFFFF" name="chat" size={16} />
            <Text style={styles.primaryText}>{c.chat}</Text>
          </Pressable>
        ) : null}
        {canCancel ? (
          <Pressable
            accessibilityRole="button"
            disabled={cancelling}
            onPress={confirmCancel}
            style={[styles.action, { backgroundColor: theme.colors.dangerSurface, opacity: cancelling ? 0.55 : 1 }]}
          >
            {cancelling ? <ActivityIndicator color={theme.colors.danger} size="small" /> : <NitipIcon color={theme.colors.danger} name="trash" size={16} />}
            <Text style={[styles.secondaryText, { color: theme.colors.danger }]}>{c.cancel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { left: 18, position: "absolute", right: 18, zIndex: 90 },
  dock: { borderRadius: 19, borderWidth: 1, elevation: 8, flexDirection: "row", gap: 8, padding: 7, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.12, shadowRadius: 12 },
  action: { alignItems: "center", borderRadius: 14, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 46, paddingHorizontal: 12 },
  primaryText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  secondaryText: { fontSize: 9, fontWeight: "900" },
});
