import type { NitipDriverOffer, NitipDriverOrder, NitipDriverProfile } from "@nitip/domain/driver";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getCurrentDriverOrder, getDriverMe, listDriverOffers, listDriverOrderHistory } from "../lib/api";
import { buildDriverNotifications, getDriverNotificationReadIds, markDriverNotificationRead, markDriverNotificationsRead, type DriverNotification } from "../lib/driverNotifications";

type Filter = "all" | "unread";

function ago(value: string, language: "id" | "en") {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return "";
  const d = Math.max(0, Date.now() - t);
  const m = Math.floor(d / 60000);
  const h = Math.floor(d / 3600000);
  const day = Math.floor(d / 86400000);
  if (m < 1) return language === "id" ? "Baru saja" : "Just now";
  if (m < 60) return language === "id" ? `${m} mnt lalu` : `${m}m ago`;
  if (h < 24) return language === "id" ? `${h} jam lalu` : `${h}h ago`;
  if (day < 7) return language === "id" ? `${day} hari lalu` : `${day}d ago`;
  return new Date(t).toLocaleDateString(language === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short" });
}

export default function DriverNotificationsScreen() {
  const { user } = useAuth();
  const { language } = useNitipLanguage();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<NitipDriverProfile | null>(null);
  const [offers, setOffers] = useState<NitipDriverOffer[]>([]);
  const [current, setCurrent] = useState<NitipDriverOrder | null>(null);
  const [history, setHistory] = useState<NitipDriverOrder[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const c = language === "id"
    ? { title: "Notifikasi", all: "Semua", unread: "Belum dibaca", mark: "Tandai semua dibaca", loading: "Memuat notifikasi...", empty: "Belum ada notifikasi", caught: "Semua sudah dibaca", body: "Perubahan akun dan aktivitas order akan muncul di sini.", retry: "Coba lagi" }
    : { title: "Notifications", all: "All", unread: "Unread", mark: "Mark all as read", loading: "Loading notifications...", empty: "No notifications yet", caught: "You're all caught up", body: "Account and order activity will appear here.", retry: "Try again" };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const nextProfile = await getDriverMe(user);
      setProfile(nextProfile);
      let nextCurrent: NitipDriverOrder | null = null;
      let nextOffers: NitipDriverOffer[] = [];
      let nextHistory: NitipDriverOrder[] = [];
      if (nextProfile?.status === "approved") {
        nextCurrent = await getCurrentDriverOrder(user);
        nextHistory = await listDriverOrderHistory(user);
        if (!nextCurrent && nextProfile.isOnline) nextOffers = await listDriverOffers(user);
      }
      const nextRead = await getDriverNotificationReadIds(user.uid);
      setCurrent(nextCurrent);
      setOffers(nextOffers);
      setHistory(nextHistory);
      setReadIds(nextRead);
    } catch (e) {
      setError(e instanceof Error ? e.message : c.loading);
    } finally {
      setLoading(false);
    }
  }, [c.loading, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const notifications = useMemo(
    () => buildDriverNotifications(profile, offers, current, history, language),
    [current, history, language, offers, profile],
  );
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;
  const visible = filter === "unread" ? notifications.filter((n) => !readIds.has(n.id)) : notifications;

  if (!user) return <Redirect href="/login" />;

  async function open(n: DriverNotification) {
    try {
      setReadIds(new Set(await markDriverNotificationRead(user!.uid, n.id)));
    } catch {}
    if (n.target.type === "order") router.push({ pathname: "/order/[id]", params: { id: n.target.orderId } });
    else if (n.target.type === "profile") router.push("/settings");
    else router.push("/home");
  }

  async function markAll() {
    setReadIds(new Set(await markDriverNotificationsRead(user!.uid, notifications.map((n) => n.id))));
  }

  function color(n: DriverNotification) {
    if (n.tone === "success") return theme.colors.success;
    if (n.tone === "danger") return theme.colors.danger;
    return theme.colors.primary;
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
              <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filter, { backgroundColor: filter === item.key ? theme.colors.primary : theme.colors.surface }]}>
                <Text style={[styles.filterText, { color: filter === item.key ? "#FFF" : theme.colors.textMuted }]}>{item.label} · {item.count}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {loading ? (
          <State>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.body, { color: theme.colors.textMuted }]}>{c.loading}</Text>
          </State>
        ) : error ? (
          <State danger>
            <Text style={[styles.body, { color: theme.colors.danger }]}>{error}</Text>
            <Pressable onPress={() => void load()}><Text style={[styles.retry, { color: theme.colors.danger }]}>{c.retry}</Text></Pressable>
          </State>
        ) : visible.length === 0 ? (
          <State>
            <NitipIcon color={theme.colors.textMuted} name="notification" size={25} />
            <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{filter === "unread" ? c.caught : c.empty}</Text>
            {filter === "all" ? <Text style={[styles.body, { color: theme.colors.textMuted }]}>{c.body}</Text> : null}
          </State>
        ) : (
          <View style={styles.list}>
            {visible.map((n) => {
              const unread = !readIds.has(n.id);
              const fg = color(n);
              return (
                <Pressable
                  key={n.id}
                  onPress={() => void open(n)}
                  style={[
                    styles.card,
                    {
                      backgroundColor: n.tone === "danger" ? theme.colors.dangerSurface : n.tone === "action" ? theme.colors.surfaceAccent : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={[styles.icon, { backgroundColor: theme.colors.surfaceRaised }]}>
                    <NitipIcon color={fg} name={n.target.type === "order" ? "delivery" : n.target.type === "profile" ? "profile" : "orders"} size={17} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.row}>
                      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{n.title}</Text>
                      {unread ? <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} /> : null}
                    </View>
                    <Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>{n.body}</Text>
                    <Text style={[styles.time, { color: fg }]}>{ago(n.timestamp, language)}</Text>
                  </View>
                  <NitipIcon color={theme.colors.textMuted} name="next" size={14} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );

  function State({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
    return <View style={[styles.state, { backgroundColor: danger ? theme.colors.dangerSurface : theme.colors.surface }]}>{children}</View>;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 40, paddingHorizontal: 20 },
  markRow: { alignItems: "flex-end", marginTop: 14 },
  mark: { borderRadius: 14, padding: 10 },
  markText: { fontSize: 8, fontWeight: "900", textAlign: "center" },
  filters: { flexDirection: "row", gap: 8, marginTop: 14 },
  filter: { alignItems: "center", borderRadius: 15, flex: 1, justifyContent: "center", minHeight: 42 },
  filterText: { fontSize: 9, fontWeight: "900" },
  state: { alignItems: "center", borderRadius: 22, marginTop: 20, padding: 28 },
  stateTitle: { fontSize: 13, fontWeight: "900", marginTop: 12 },
  body: { fontSize: 9, lineHeight: 15, marginTop: 7, textAlign: "center" },
  retry: { fontSize: 9, fontWeight: "900", marginTop: 10 },
  list: { gap: 9, marginTop: 16 },
  card: { alignItems: "center", borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 11, minHeight: 88, padding: 13 },
  icon: { alignItems: "center", borderRadius: 18, height: 38, justifyContent: "center", width: 38 },
  row: { alignItems: "flex-start", flexDirection: "row", gap: 6 },
  cardTitle: { flex: 1, fontSize: 10, fontWeight: "900", lineHeight: 14 },
  dot: { borderRadius: 4, height: 7, marginTop: 4, width: 7 },
  cardBody: { fontSize: 8, lineHeight: 13, marginTop: 3 },
  time: { fontSize: 7, fontWeight: "800", marginTop: 7 },
});
