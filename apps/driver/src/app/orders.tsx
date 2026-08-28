import { formatRupiah } from "@nitip/domain";
import type { NitipDriverOrder } from "@nitip/domain/driver";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getCurrentDriverOrder } from "../lib/api";

function statusLabel(status: NitipDriverOrder["status"], language: "id" | "en") {
  const id = { driver_assigned: "ORDER DITUGASKAN", picked_up: "SUDAH DIAMBIL", on_delivery: "SEDANG DIANTAR", delivered: "SELESAI" } as const;
  const en = { driver_assigned: "ASSIGNED", picked_up: "PICKED UP", on_delivery: "ON DELIVERY", delivered: "COMPLETED" } as const;
  return (language === "id" ? id : en)[status];
}

export default function DriverOrdersScreen() {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<NitipDriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const c = language === "id"
    ? { title: "Pesanan", heading: "Perjalanan aktif.", subtitle: "Assignment yang sedang berjalan tampil di sini. Buka detail untuk memperbarui status perjalanan.", loading: "Memuat assignment...", error: "Pesanan belum dapat dimuat", empty: "Belum ada perjalanan aktif", emptyBody: "Aktifkan status online dari Beranda untuk menerima order siap pickup.", home: "Kembali ke Beranda", pickup: "PICKUP", destination: "TUJUAN", detail: "Buka detail perjalanan" }
    : { title: "Orders", heading: "Active trip.", subtitle: "Your current assignment appears here. Open details to update delivery progress.", loading: "Loading assignment...", error: "Order is unavailable", empty: "No active trip", emptyBody: "Go online from Home to receive pickup-ready orders.", home: "Back to Home", pickup: "PICKUP", destination: "DESTINATION", detail: "Open trip details" };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setOrder(await getCurrentDriverOrder(user));
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

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
        <AppHeader title={c.title} showBack={false} />
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{c.heading}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text>
        </View>

        {loading ? (
          <StateCard loading title={c.loading} />
        ) : error ? (
          <View style={[styles.errorCard, { backgroundColor: theme.colors.dangerSurface }]}> 
            <Text style={[styles.errorTitle, { color: theme.colors.danger }]}>{c.error}</Text>
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
          </View>
        ) : order ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/order/[id]", params: { id: order.id } })}
            style={[styles.orderCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}
          >
            <View style={styles.orderTop}>
              <View style={styles.orderIdentity}>
                <Text style={[styles.status, { color: theme.colors.primary }]}>{statusLabel(order.status, language)}</Text>
                <Text style={[styles.orderCode, { color: theme.colors.text }]}>{order.orderCode}</Text>
              </View>
              <Text style={[styles.fare, { color: theme.colors.primary }]}>{formatRupiah(order.deliveryFare)}</Text>
            </View>

            <RouteBlock icon="store" label={c.pickup} title={`${order.pickup.businessName} · ${order.pickup.outletName}`} address={order.pickup.addressLine} />
            <RouteBlock icon="location" label={c.destination} title={order.destination.recipientName} address={order.destination.addressLine} />

            <View style={styles.detailRow}>
              <Text style={[styles.detailText, { color: theme.colors.primary }]}>{c.detail}</Text>
              <NitipIcon color={theme.colors.primary} name="next" size={15} />
            </View>
          </Pressable>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <View style={[styles.emptyBadge, { backgroundColor: theme.colors.surfaceAccent }]}> 
              <NitipIcon color={theme.colors.primary} name="delivery" size={23} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{c.empty}</Text>
            <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{c.emptyBody}</Text>
            <Pressable onPress={() => router.replace("/home")} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}> 
              <Text style={styles.primaryText}>{c.home}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );

  function RouteBlock({ icon, label, title, address }: { icon: "store" | "location"; label: string; title: string; address: string }) {
    return (
      <View style={[styles.routeBlock, { backgroundColor: theme.colors.surfaceAccent }]}> 
        <View style={[styles.routeBadge, { backgroundColor: theme.colors.surface }]}> 
          <NitipIcon color={theme.colors.primary} name={icon} size={15} />
        </View>
        <View style={styles.routeCopy}>
          <Text style={[styles.routeLabel, { color: theme.colors.primary }]}>{label}</Text>
          <Text numberOfLines={1} style={[styles.routeTitle, { color: theme.colors.text }]}>{title}</Text>
          <Text numberOfLines={2} style={[styles.routeAddress, { color: theme.colors.textMuted }]}>{address}</Text>
        </View>
      </View>
    );
  }

  function StateCard({ loading, title }: { loading?: boolean; title: string }) {
    return <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>{loading ? <ActivityIndicator color={theme.colors.primary} /> : null}<Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{title}</Text></View>;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 36, paddingHorizontal: 20 }, hero: { marginTop: 24 }, heroTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8 }, heroSubtitle: { fontSize: 10, lineHeight: 17, marginTop: 6, maxWidth: 340 },
  orderCard: { borderRadius: 20, borderWidth: 1, elevation: 2, marginTop: 20, padding: 15, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 7 }, orderTop: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" }, orderIdentity: { flex: 1 }, status: { fontSize: 7, fontWeight: "900", letterSpacing: 0.8 }, orderCode: { fontSize: 17, fontWeight: "900", marginTop: 4 }, fare: { fontSize: 14, fontWeight: "900" },
  routeBlock: { alignItems: "flex-start", borderRadius: 16, flexDirection: "row", marginTop: 12, padding: 12 }, routeBadge: { alignItems: "center", borderRadius: 18, height: 36, justifyContent: "center", width: 36 }, routeCopy: { flex: 1, minWidth: 0, paddingLeft: 10 }, routeLabel: { fontSize: 7, fontWeight: "900", letterSpacing: 0.7 }, routeTitle: { fontSize: 10, fontWeight: "900", marginTop: 2 }, routeAddress: { fontSize: 8, lineHeight: 12, marginTop: 2 }, detailRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 14 }, detailText: { fontSize: 9, fontWeight: "900" },
  emptyCard: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 20, padding: 27 }, emptyBadge: { alignItems: "center", borderRadius: 26, height: 52, justifyContent: "center", width: 52 }, emptyTitle: { fontSize: 13, fontWeight: "900", marginTop: 13 }, emptyBody: { fontSize: 9, lineHeight: 15, marginTop: 6, textAlign: "center" }, primaryButton: { alignItems: "center", borderRadius: 14, justifyContent: "center", marginTop: 16, minHeight: 46, paddingHorizontal: 18 }, primaryText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  errorCard: { borderRadius: 18, marginTop: 20, padding: 15 }, errorTitle: { fontSize: 12, fontWeight: "900" }, errorText: { fontSize: 9, lineHeight: 14, marginTop: 4 },
});
