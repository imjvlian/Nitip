import { formatRupiah } from "@nitip/domain";
import type { NitipDriverOrder } from "@nitip/domain/driver";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getCurrentDriverOrder, listDriverOrderHistory } from "../lib/api";

type Tab = "active" | "history";

function statusLabel(status: NitipDriverOrder["status"], language: "id" | "en") {
  const id = { driver_assigned: "DITUGASKAN", picked_up: "SUDAH DIAMBIL", on_delivery: "SEDANG DIANTAR", delivered: "SELESAI" } as const;
  const en = { driver_assigned: "ASSIGNED", picked_up: "PICKED UP", on_delivery: "ON DELIVERY", delivered: "COMPLETED" } as const;
  return (language === "id" ? id : en)[status];
}

export default function DriverOrdersScreen() {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("active");
  const [current, setCurrent] = useState<NitipDriverOrder | null>(null);
  const [history, setHistory] = useState<NitipDriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const c = language === "id"
    ? { title: "Pesanan", heading: "Perjalananmu.", subtitle: "Pantau assignment aktif dan riwayat pengantaran yang sudah selesai.", active: "Aktif", history: "Riwayat", earnings: "Total pendapatan", trips: "Perjalanan selesai", today: "Pendapatan hari ini", loading: "Memuat perjalanan...", error: "Perjalanan belum dapat dimuat", empty: "Belum ada perjalanan aktif", emptyHistory: "Belum ada riwayat pengantaran", emptyBody: "Aktifkan status online dari Beranda untuk menerima order siap pickup.", emptyHistoryBody: "Perjalanan yang selesai akan tersimpan di sini.", home: "Kembali ke Beranda", pickup: "PICKUP", destination: "ANTAR", detail: "Buka detail perjalanan" }
    : { title: "Orders", heading: "Your trips.", subtitle: "Track your active assignment and completed delivery history.", active: "Active", history: "History", earnings: "Total earnings", trips: "Completed trips", today: "Today's earnings", loading: "Loading trips...", error: "Trips are unavailable", empty: "No active trip", emptyHistory: "No delivery history yet", emptyBody: "Go online from Home to receive pickup-ready orders.", emptyHistoryBody: "Completed trips will be saved here.", home: "Back to Home", pickup: "PICKUP", destination: "DROP-OFF", detail: "Open trip details" };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [nextCurrent, nextHistory] = await Promise.all([
        getCurrentDriverOrder(user),
        listDriverOrderHistory(user),
      ]);
      setCurrent(nextCurrent);
      setHistory(nextHistory);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.error);
    } finally {
      setLoading(false);
    }
  }, [c.error, user]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  if (!user) return <Redirect href="/login" />;

  const totalEarnings = history.reduce((total, order) => total + order.deliveryFare, 0);
  const todayKey = new Date().toDateString();
  const todayEarnings = history
    .filter((order) => new Date(order.createdAt).toDateString() === todayKey)
    .reduce((total, order) => total + order.deliveryFare, 0);

  const metrics = useMemo(() => [
    { icon: "earnings" as const, label: c.earnings, value: formatRupiah(totalEarnings) },
    { icon: "check" as const, label: c.trips, value: String(history.length) },
    { icon: "clock" as const, label: c.today, value: formatRupiah(todayEarnings) },
  ], [c, history.length, todayEarnings, totalEarnings]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
        <AppHeader title={c.title} showBack={false} />
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{c.heading}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text>
        </View>

        {!loading && history.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metrics}>
            {metrics.map((metric) => (
              <View key={metric.label} style={[styles.metric, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
                <View style={[styles.metricBadge, { backgroundColor: theme.colors.surfaceAccent }]}><NitipIcon color={theme.colors.primary} name={metric.icon} size={15} /></View>
                <Text numberOfLines={1} style={[styles.metricValue, { color: theme.colors.text }]}>{metric.value}</Text>
                <Text numberOfLines={1} style={[styles.metricLabel, { color: theme.colors.textMuted }]}>{metric.label}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}

        <View style={[styles.segment, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
          {(["active", "history"] as Tab[]).map((key) => {
            const selected = tab === key;
            return (
              <Pressable key={key} onPress={() => setTab(key)} style={[styles.segmentButton, { backgroundColor: selected ? theme.colors.primary : "transparent" }]}> 
                <Text style={[styles.segmentText, { color: selected ? "#FFFFFF" : theme.colors.textMuted }]}>{key === "active" ? c.active : `${c.history} · ${history.length}`}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <StateCard loading title={c.loading} />
        ) : error ? (
          <StateCard title={c.error} body={error} danger />
        ) : tab === "active" ? (
          current ? <OrderCard order={current} /> : <EmptyState title={c.empty} body={c.emptyBody} action />
        ) : history.length > 0 ? (
          <View style={styles.list}>{history.map((order) => <OrderCard key={order.id} order={order} compact />)}</View>
        ) : (
          <EmptyState title={c.emptyHistory} body={c.emptyHistoryBody} />
        )}
      </ScrollView>
    </View>
  );

  function OrderCard({ order, compact = false }: { order: NitipDriverOrder; compact?: boolean }) {
    return (
      <Pressable
        onPress={() => router.push({ pathname: "/order/[id]", params: { id: order.id } })}
        style={[styles.orderCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}
      >
        <View style={styles.orderTop}>
          <View style={styles.identity}>
            <Text style={[styles.status, { color: order.status === "delivered" ? theme.colors.success : theme.colors.primary }]}>{statusLabel(order.status, language)}</Text>
            <Text style={[styles.orderCode, { color: theme.colors.text }]}>{order.orderCode}</Text>
          </View>
          <Text style={[styles.fare, { color: theme.colors.primary }]}>{formatRupiah(order.deliveryFare)}</Text>
        </View>
        <View style={[styles.route, { backgroundColor: theme.colors.surfaceAccent }]}> 
          <NitipIcon color={theme.colors.primary} name="store" size={15} />
          <View style={styles.routeCopy}>
            <Text style={[styles.routeLabel, { color: theme.colors.primary }]}>{c.pickup}</Text>
            <Text numberOfLines={1} style={[styles.routeTitle, { color: theme.colors.text }]}>{order.pickup.businessName} · {order.pickup.outletName}</Text>
          </View>
        </View>
        {!compact ? (
          <View style={[styles.route, { backgroundColor: theme.colors.surfaceAccent }]}> 
            <NitipIcon color={theme.colors.primary} name="location" size={15} />
            <View style={styles.routeCopy}>
              <Text style={[styles.routeLabel, { color: theme.colors.primary }]}>{c.destination}</Text>
              <Text numberOfLines={1} style={[styles.routeTitle, { color: theme.colors.text }]}>{order.destination.recipientName}</Text>
            </View>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <Text style={[styles.date, { color: theme.colors.textMuted }]}>{new Date(order.createdAt).toLocaleDateString(language === "id" ? "id-ID" : "en-US")}</Text>
          <View style={styles.detailLink}><Text style={[styles.detailText, { color: theme.colors.primary }]}>{c.detail}</Text><NitipIcon color={theme.colors.primary} name="next" size={14} /></View>
        </View>
      </Pressable>
    );
  }

  function EmptyState({ title, body, action = false }: { title: string; body: string; action?: boolean }) {
    return <View style={[styles.empty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><View style={[styles.emptyBadge, { backgroundColor: theme.colors.surfaceAccent }]}><NitipIcon color={theme.colors.primary} name="delivery" size={22} /></View><Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{title}</Text><Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{body}</Text>{action ? <Pressable onPress={() => router.replace("/home")} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}><Text style={styles.primaryText}>{c.home}</Text></Pressable> : null}</View>;
  }

  function StateCard({ loading = false, title, body, danger = false }: { loading?: boolean; title: string; body?: string; danger?: boolean }) {
    return <View style={[styles.empty, { backgroundColor: danger ? theme.colors.dangerSurface : theme.colors.surface, borderColor: danger ? theme.colors.dangerSurface : theme.colors.border }]}>{loading ? <ActivityIndicator color={theme.colors.primary} /> : null}<Text style={[styles.emptyTitle, { color: danger ? theme.colors.danger : theme.colors.text }]}>{title}</Text>{body ? <Text style={[styles.emptyBody, { color: danger ? theme.colors.danger : theme.colors.textMuted }]}>{body}</Text> : null}</View>;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 36, paddingHorizontal: 20 }, hero: { marginTop: 24 }, heroTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8 }, heroSubtitle: { fontSize: 10, lineHeight: 17, marginTop: 6, maxWidth: 340 },
  metrics: { gap: 8, paddingRight: 20, paddingTop: 18 }, metric: { borderRadius: 18, borderWidth: 1, minHeight: 102, padding: 12, width: 150 }, metricBadge: { alignItems: "center", borderRadius: 16, height: 32, justifyContent: "center", width: 32 }, metricValue: { fontSize: 14, fontWeight: "900", marginTop: 8 }, metricLabel: { fontSize: 8, marginTop: 2 },
  segment: { borderRadius: 18, borderWidth: 1, flexDirection: "row", marginTop: 18, padding: 4 }, segmentButton: { alignItems: "center", borderRadius: 14, flex: 1, justifyContent: "center", minHeight: 40 }, segmentText: { fontSize: 9, fontWeight: "900" }, list: { gap: 10, marginTop: 14 }, orderCard: { borderRadius: 20, borderWidth: 1, elevation: 2, marginTop: 14, padding: 14, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 7 }, orderTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" }, identity: { flex: 1 }, status: { fontSize: 7, fontWeight: "900", letterSpacing: 0.7 }, orderCode: { fontSize: 15, fontWeight: "900", marginTop: 3 }, fare: { fontSize: 13, fontWeight: "900" }, route: { alignItems: "center", borderRadius: 14, flexDirection: "row", marginTop: 10, minHeight: 48, paddingHorizontal: 11 }, routeCopy: { flex: 1, minWidth: 0, paddingLeft: 9 }, routeLabel: { fontSize: 7, fontWeight: "900" }, routeTitle: { fontSize: 9, fontWeight: "800", marginTop: 2 }, detailRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 11 }, date: { fontSize: 8 }, detailLink: { alignItems: "center", flexDirection: "row", gap: 4 }, detailText: { fontSize: 8, fontWeight: "900" },
  empty: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 18, padding: 27 }, emptyBadge: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 }, emptyTitle: { fontSize: 12, fontWeight: "900", marginTop: 10, textAlign: "center" }, emptyBody: { fontSize: 9, lineHeight: 15, marginTop: 5, textAlign: "center" }, primaryButton: { borderRadius: 14, justifyContent: "center", marginTop: 16, minHeight: 45, paddingHorizontal: 16 }, primaryText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
});
