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
import { listDriverOrderHistory } from "../lib/api";

export default function DriverEarningsScreen() {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<NitipDriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const c = language === "id"
    ? { title: "Pendapatan", heading: "Hasil pengantaran.", subtitle: "Ringkasan fee delivery dari perjalanan yang sudah selesai.", total: "Total pendapatan", trips: "Perjalanan selesai", today: "Hari ini", recent: "Riwayat terbaru", empty: "Belum ada pendapatan", emptyBody: "Fee delivery akan tercatat setelah perjalanan selesai.", loading: "Memuat pendapatan...", error: "Pendapatan belum dapat dimuat", detail: "Detail" }
    : { title: "Earnings", heading: "Delivery earnings.", subtitle: "A summary of delivery fees from completed trips.", total: "Total earnings", trips: "Completed trips", today: "Today", recent: "Recent history", empty: "No earnings yet", emptyBody: "Delivery fees are recorded after a trip is completed.", loading: "Loading earnings...", error: "Earnings are unavailable", detail: "Details" };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setOrders(await listDriverOrderHistory(user));
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

  const today = new Date().toDateString();
  const summary = useMemo(() => {
    const total = orders.reduce((sum, order) => sum + order.deliveryFare, 0);
    const todayOrders = orders.filter((order) => new Date(order.createdAt).toDateString() === today);
    return {
      total,
      trips: orders.length,
      today: todayOrders.reduce((sum, order) => sum + order.deliveryFare, 0),
    };
  }, [orders, today]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
        <AppHeader title={c.title} />
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{c.heading}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text>
        </View>

        {loading ? (
          <View style={[styles.state, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><ActivityIndicator color={theme.colors.primary} /><Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>{c.loading}</Text></View>
        ) : error ? (
          <View style={[styles.state, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerSurface }]}><Text style={[styles.stateTitle, { color: theme.colors.danger }]}>{c.error}</Text><Text style={[styles.stateBody, { color: theme.colors.danger }]}>{error}</Text></View>
        ) : (
          <>
            <View style={[styles.totalCard, { backgroundColor: theme.colors.primary }]}> 
              <View style={styles.totalTop}><View style={styles.totalBadge}><NitipIcon color="#FFFFFF" name="earnings" size={20} /></View><Text style={styles.totalLabel}>{c.total}</Text></View>
              <Text style={styles.totalValue}>{formatRupiah(summary.total)}</Text>
            </View>
            <View style={styles.metrics}>
              <View style={[styles.metric, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[styles.metricValue, { color: theme.colors.text }]}>{summary.trips}</Text><Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>{c.trips}</Text></View>
              <View style={[styles.metric, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[styles.metricValue, { color: theme.colors.primary }]}>{formatRupiah(summary.today)}</Text><Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>{c.today}</Text></View>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{c.recent}</Text>
            {orders.length === 0 ? (
              <View style={[styles.state, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><View style={[styles.emptyBadge, { backgroundColor: theme.colors.surfaceAccent }]}><NitipIcon color={theme.colors.primary} name="earnings" size={22} /></View><Text style={[styles.stateTitle, { color: theme.colors.text }]}>{c.empty}</Text><Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>{c.emptyBody}</Text></View>
            ) : (
              <View style={styles.list}>
                {orders.map((order) => (
                  <Pressable key={order.id} onPress={() => router.push({ pathname: "/order/[id]", params: { id: order.id } })} style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
                    <View style={[styles.rowBadge, { backgroundColor: theme.colors.surfaceAccent }]}><NitipIcon color={theme.colors.primary} name="check" size={15} /></View>
                    <View style={styles.rowCopy}><Text style={[styles.code, { color: theme.colors.text }]}>{order.orderCode}</Text><Text numberOfLines={1} style={[styles.meta, { color: theme.colors.textMuted }]}>{order.pickup.businessName} · {new Date(order.createdAt).toLocaleDateString(language === "id" ? "id-ID" : "en-US")}</Text></View>
                    <View style={styles.rowRight}><Text style={[styles.fare, { color: theme.colors.primary }]}>{formatRupiah(order.deliveryFare)}</Text><Text style={[styles.detail, { color: theme.colors.textMuted }]}>{c.detail}</Text></View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 38, paddingHorizontal: 20 }, hero: { marginTop: 25 }, heroTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8 }, heroSubtitle: { fontSize: 10, lineHeight: 17, marginTop: 6 }, totalCard: { borderRadius: 22, marginTop: 20, padding: 17 }, totalTop: { alignItems: "center", flexDirection: "row" }, totalBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 20, height: 40, justifyContent: "center", width: 40 }, totalLabel: { color: "rgba(255,255,255,0.75)", fontSize: 9, fontWeight: "800", marginLeft: 10 }, totalValue: { color: "#FFFFFF", fontSize: 26, fontWeight: "900", letterSpacing: -0.7, marginTop: 16 }, metrics: { flexDirection: "row", gap: 8, marginTop: 10 }, metric: { borderRadius: 18, borderWidth: 1, flex: 1, minHeight: 90, padding: 13 }, metricValue: { fontSize: 16, fontWeight: "900" }, metricLabel: { fontSize: 8, marginTop: 5 }, sectionTitle: { fontSize: 12, fontWeight: "900", marginTop: 24 }, list: { gap: 9, marginTop: 10 }, row: { alignItems: "center", borderRadius: 18, borderWidth: 1, flexDirection: "row", minHeight: 68, padding: 11 }, rowBadge: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 }, rowCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 }, code: { fontSize: 10, fontWeight: "900" }, meta: { fontSize: 8, marginTop: 3 }, rowRight: { alignItems: "flex-end" }, fare: { fontSize: 10, fontWeight: "900" }, detail: { fontSize: 7, marginTop: 3 }, state: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 20, padding: 26 }, emptyBadge: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 }, stateTitle: { fontSize: 12, fontWeight: "900", marginTop: 10 }, stateBody: { fontSize: 9, lineHeight: 15, marginTop: 5, textAlign: "center" },
});
