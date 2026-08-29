import type { NitipOrder } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { listOrders } from "../lib/api";
import { cancelPendingOrder } from "../lib/cancelOrder";
import { buildUserNotifications, getUserNotificationReadIds, markUserNotificationRead, markUserNotificationsRead, type UserNotification } from "../lib/userNotifications";

type Filter = "all" | "unread";

function relativeTime(value: string, language: "id" | "en") {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "";
  const diff = Math.max(0, Date.now() - time);
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return language === "id" ? "Baru saja" : "Just now";
  if (min < 60) return language === "id" ? `${min} mnt lalu` : `${min}m ago`;
  if (hour < 24) return language === "id" ? `${hour} jam lalu` : `${hour}h ago`;
  if (day < 7) return language === "id" ? `${day} hari lalu` : `${day}d ago`;
  return new Date(time).toLocaleDateString(language === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short" });
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { language } = useNitipLanguage();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<NitipOrder[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const c = language === "id"
    ? {
        title: "Notifikasi",
        all: "Semua",
        unread: "Belum dibaca",
        mark: "Tandai semua dibaca",
        loading: "Memuat notifikasi...",
        empty: "Belum ada notifikasi",
        emptyBody: "Update pesanan akan muncul di sini.",
        caught: "Semua sudah dibaca",
        retry: "Coba lagi",
        cancelOrder: "Batalkan pesanan",
        cancelTitle: "Batalkan pesanan ini?",
        cancelBody: "Pesanan belum dibayar. Stok yang direservasi akan langsung dilepas.",
        cancelConfirm: "Ya, batalkan",
        cancelBack: "Kembali",
        cancelSuccess: "Pesanan dibatalkan",
        cancelSuccessBody: "Reservasi stok sudah dilepas.",
        cancelFailed: "Pembatalan gagal",
      }
    : {
        title: "Notifications",
        all: "All",
        unread: "Unread",
        mark: "Mark all as read",
        loading: "Loading notifications...",
        empty: "No notifications yet",
        emptyBody: "Order updates will appear here.",
        caught: "You're all caught up",
        retry: "Try again",
        cancelOrder: "Cancel order",
        cancelTitle: "Cancel this order?",
        cancelBody: "The order has not been paid. Reserved stock will be released immediately.",
        cancelConfirm: "Yes, cancel",
        cancelBack: "Go back",
        cancelSuccess: "Order cancelled",
        cancelSuccessBody: "The stock reservation has been released.",
        cancelFailed: "Cancellation failed",
      };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [nextOrders, nextRead] = await Promise.all([listOrders(user), getUserNotificationReadIds(user.uid)]);
      setOrders(nextOrders);
      setReadIds(nextRead);
    } catch (e) {
      setError(e instanceof Error ? e.message : c.loading);
    } finally {
      setLoading(false);
    }
  }, [c.loading, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const notifications = useMemo(() => buildUserNotifications(orders, language), [language, orders]);
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;
  const visible = filter === "unread" ? notifications.filter((n) => !readIds.has(n.id)) : notifications;

  if (!user) return <Redirect href="/login" />;

  async function openNotification(notification: UserNotification) {
    try {
      setReadIds(new Set(await markUserNotificationRead(user!.uid, notification.id)));
    } catch {}
    router.push({ pathname: "/order/[id]", params: { id: notification.orderId } });
  }

  async function markAll() {
    setReadIds(new Set(await markUserNotificationsRead(user!.uid, notifications.map((n) => n.id))));
  }

  function tone(n: UserNotification) {
    if (n.tone === "success") return theme.colors.success;
    if (n.tone === "danger") return theme.colors.danger;
    return theme.colors.primary;
  }

  function askCancel(order: NitipOrder) {
    Alert.alert(c.cancelTitle, c.cancelBody, [
      { text: c.cancelBack, style: "cancel" },
      { text: c.cancelConfirm, style: "destructive", onPress: () => void performCancel(order) },
    ]);
  }

  async function performCancel(order: NitipOrder) {
    setCancellingId(order.id);
    try {
      await cancelPendingOrder(user, order.id);
      await load();
      Alert.alert(c.cancelSuccess, c.cancelSuccessBody);
    } catch (e) {
      Alert.alert(c.cancelFailed, e instanceof Error ? e.message : c.cancelFailed);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
        <AppHeader title={c.title} onBack={() => router.back()} />

        {unreadCount > 0 ? (
          <View style={styles.markRow}>
            <Pressable onPress={() => void markAll()} style={[styles.mark, { backgroundColor: theme.colors.surfaceAccent }]}>
              <Text style={[styles.markText, { color: theme.colors.primary }]}>{c.mark}</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading ? (
          <View style={styles.filters}>
            {([
              { key: "all" as const, label: c.all, count: notifications.length },
              { key: "unread" as const, label: c.unread, count: unreadCount },
            ]).map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[styles.filter, { backgroundColor: filter === item.key ? theme.colors.primary : theme.colors.surface }]}
              >
                <Text style={[styles.filterText, { color: filter === item.key ? "#FFFFFF" : theme.colors.textMuted }]}>
                  {item.label} · {item.count}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>{c.loading}</Text>
          </View>
        ) : error ? (
          <View style={[styles.state, { backgroundColor: theme.colors.dangerSurface }]}>
            <Text style={[styles.stateBody, { color: theme.colors.danger }]}>{error}</Text>
            <Pressable onPress={() => void load()}>
              <Text style={[styles.retry, { color: theme.colors.danger }]}>{c.retry}</Text>
            </Pressable>
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.state}>
            <NitipIcon color={theme.colors.textMuted} name="notification" size={25} />
            <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{filter === "unread" ? c.caught : c.empty}</Text>
            {filter === "all" ? <Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>{c.emptyBody}</Text> : null}
          </View>
        ) : (
          <View style={styles.list}>
            {visible.map((n) => {
              const unread = !readIds.has(n.id);
              const color = tone(n);
              const sourceOrder = orders.find((order) => order.id === n.orderId);
              const cancellable = sourceOrder?.status === "pending_payment";
              return (
                <View
                  key={n.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: n.tone === "danger" ? theme.colors.dangerSurface : n.tone === "action" ? theme.colors.surfaceAccent : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Pressable onPress={() => void openNotification(n)} style={styles.cardMain}>
                    <View style={[styles.icon, { backgroundColor: theme.colors.surfaceRaised }]}>
                      <NitipIcon color={color} name={n.tone === "action" ? "location" : n.tone === "success" ? "check" : "orders"} size={17} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.row}>
                        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{n.title}</Text>
                        {unread ? <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} /> : null}
                      </View>
                      <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>{n.body}</Text>
                      <Text style={[styles.time, { color }]}>{relativeTime(n.timestamp, language)}</Text>
                    </View>
                    <NitipIcon color={theme.colors.textMuted} name="next" size={14} />
                  </Pressable>
                  {cancellable ? (
                    <Pressable disabled={cancellingId === sourceOrder.id} onPress={() => askCancel(sourceOrder)} style={[styles.cancel, { borderColor: theme.colors.danger }]}>
                      {cancellingId === sourceOrder.id ? <ActivityIndicator color={theme.colors.danger} size="small" /> : <Text style={[styles.cancelText, { color: theme.colors.danger }]}>{c.cancelOrder}</Text>}
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 40, paddingHorizontal: 20 },
  markRow: { alignItems: "flex-end", marginTop: 14 },
  mark: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  markText: { fontSize: 8, fontWeight: "900", textAlign: "center" },
  filters: { flexDirection: "row", gap: 8, marginTop: 14 },
  filter: { alignItems: "center", borderRadius: 15, flex: 1, justifyContent: "center", minHeight: 42 },
  filterText: { fontSize: 9, fontWeight: "900" },
  state: { alignItems: "center", borderRadius: 22, marginTop: 20, padding: 28 },
  stateTitle: { fontSize: 13, fontWeight: "900", marginTop: 12 },
  stateBody: { fontSize: 9, lineHeight: 15, marginTop: 7, textAlign: "center" },
  retry: { fontSize: 9, fontWeight: "900", marginTop: 10 },
  list: { gap: 9, marginTop: 16 },
  card: { borderRadius: 20, borderWidth: 1, overflow: "hidden", padding: 13 },
  cardMain: { alignItems: "center", flexDirection: "row", gap: 11, minHeight: 62 },
  icon: { alignItems: "center", borderRadius: 18, height: 38, justifyContent: "center", width: 38 },
  row: { alignItems: "flex-start", flexDirection: "row", gap: 6 },
  cardTitle: { flex: 1, fontSize: 10, fontWeight: "900", lineHeight: 14 },
  dot: { borderRadius: 4, height: 7, marginTop: 4, width: 7 },
  cardBody: { fontSize: 8, lineHeight: 13, marginTop: 3 },
  time: { fontSize: 7, fontWeight: "800", marginTop: 7 },
  cancel: { alignItems: "center", borderRadius: 13, borderWidth: 1, justifyContent: "center", marginTop: 11, minHeight: 38 },
  cancelText: { fontSize: 8, fontWeight: "900" },
});
