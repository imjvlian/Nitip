import { formatRupiah } from "@nitip/domain";
import type { NitipMerchantOrder } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { merchantOrderStatusLabel } from "../constants/merchantCopy";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { listMerchantOrders } from "../lib/api";

type OrderFilter = "all" | "actionable" | "delivery" | "finished";

function isActionable(status: NitipMerchantOrder["status"]) {
  return status === "paid" || status === "merchant_confirmed" || status === "preparing";
}

function isDelivery(status: NitipMerchantOrder["status"]) {
  return ["ready_for_pickup", "driver_assigned", "picked_up", "on_delivery"].includes(status);
}

function isFinished(status: NitipMerchantOrder["status"]) {
  return status === "delivered" || status === "cancelled" || status === "refunded";
}

export default function MerchantOrdersScreen() {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<NitipMerchantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [query, setQuery] = useState("");

  const copy = language === "id"
    ? {
        title: "Pesanan",
        heading: "Pusat pesanan.",
        subtitle: "Prioritaskan order yang perlu tindakan, lalu pantau proses pengantaran sampai selesai.",
        all: "Semua",
        actionable: "Perlu tindakan",
        delivery: "Pengantaran",
        finished: "Selesai",
        search: "Cari nomor order, outlet, atau customer",
        loading: "Memuat pesanan...",
        empty: "Belum ada pesanan",
        emptyBody: "Pesanan customer akan muncul di sini setelah pembayaran berhasil.",
        noResult: "Pesanan tidak ditemukan",
        noResultBody: "Coba kata kunci atau filter yang berbeda.",
        customer: "Customer",
        items: "jenis item",
        action: "Proses sekarang",
        detail: "Lihat detail",
        loadError: "Gagal memuat pesanan",
      }
    : {
        title: "Orders",
        heading: "Order center.",
        subtitle: "Prioritize orders that need action, then track delivery until completion.",
        all: "All",
        actionable: "Needs action",
        delivery: "Delivery",
        finished: "Finished",
        search: "Search order number, outlet, or customer",
        loading: "Loading orders...",
        empty: "No orders yet",
        emptyBody: "Customer orders will appear here after successful payment.",
        noResult: "No orders found",
        noResultBody: "Try a different keyword or filter.",
        customer: "Customer",
        items: "item types",
        action: "Process now",
        detail: "View details",
        loadError: "Failed to load orders",
      };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setOrders(await listMerchantOrders(user));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, user]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  if (!user) return <Redirect href="/login" />;

  const counts = useMemo(() => ({
    actionable: orders.filter((order) => isActionable(order.status)).length,
    delivery: orders.filter((order) => isDelivery(order.status)).length,
    finished: orders.filter((order) => isFinished(order.status)).length,
  }), [orders]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders
      .filter((order) => {
        if (filter === "actionable" && !isActionable(order.status)) return false;
        if (filter === "delivery" && !isDelivery(order.status)) return false;
        if (filter === "finished" && !isFinished(order.status)) return false;
        if (!needle) return true;
        return `${order.orderCode} ${order.outletName} ${order.address.recipientName}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => {
        const priorityA = isActionable(a.status) ? 0 : 1;
        const priorityB = isActionable(b.status) ? 0 : 1;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [filter, orders, query]);

  const filters: { key: OrderFilter; label: string; count: number }[] = [
    { key: "all", label: copy.all, count: orders.length },
    { key: "actionable", label: copy.actionable, count: counts.actionable },
    { key: "delivery", label: copy.delivery, count: counts.delivery },
    { key: "finished", label: copy.finished, count: counts.finished },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={copy.title} showBack={false} />

        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{copy.heading}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{copy.subtitle}</Text>
        </View>

        {!loading && orders.length > 0 ? (
          <View style={styles.metrics}>
            <Metric icon="orders" label={copy.actionable} value={counts.actionable} emphasized={counts.actionable > 0} />
            <Metric icon="clock" label={copy.delivery} value={counts.delivery} />
            <Metric icon="check" label={copy.finished} value={counts.finished} />
          </View>
        ) : null}

        <View style={[styles.search, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
          <NitipIcon color={theme.colors.textMuted} name="orders" size={15} />
          <TextInput
            onChangeText={setQuery}
            placeholder={copy.search}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={query}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((item) => {
            const selected = item.key === filter;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[
                  styles.filter,
                  {
                    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.filterText, { color: selected ? "#FFFFFF" : theme.colors.textMuted }]}>{item.label} · {item.count}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <StateCard loading title={copy.loading} />
        ) : error ? (
          <View style={[styles.error, { backgroundColor: theme.colors.dangerSurface }]}> 
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
          </View>
        ) : orders.length === 0 ? (
          <StateCard title={copy.empty} body={copy.emptyBody} />
        ) : filtered.length === 0 ? (
          <StateCard title={copy.noResult} body={copy.noResultBody} />
        ) : (
          <View style={styles.list}>
            {filtered.map((order) => {
              const actionable = isActionable(order.status);
              const cancelled = order.status === "cancelled" || order.status === "refunded";
              const delivered = order.status === "delivered";
              const statusBackground = cancelled
                ? theme.colors.dangerSurface
                : delivered
                  ? theme.colors.successSurface
                  : actionable
                    ? theme.colors.surfaceAccent
                    : theme.colors.secondary;
              const statusColor = cancelled
                ? theme.colors.danger
                : delivered
                  ? theme.colors.success
                  : actionable
                    ? theme.colors.primary
                    : theme.colors.textMuted;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={order.id}
                  onPress={() => router.push({ pathname: "/order/[id]", params: { id: order.id } })}
                  style={[
                    styles.orderCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: actionable ? theme.colors.primary : theme.colors.border,
                      shadowColor: theme.colors.shadow,
                    },
                  ]}
                >
                  <View style={styles.orderTop}>
                    <View style={styles.identity}>
                      <Text style={[styles.orderCode, { color: theme.colors.primary }]}>{order.orderCode}</Text>
                      <Text numberOfLines={1} style={[styles.outletName, { color: theme.colors.text }]}>{order.outletName}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusBackground }]}> 
                      <Text style={[styles.statusText, { color: statusColor }]}>{merchantOrderStatusLabel(order.status, language)}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                  <View style={styles.customerRow}>
                    <View style={[styles.customerBadge, { backgroundColor: theme.colors.surfaceAccent }]}> 
                      <NitipIcon color={theme.colors.primary} name="profile" size={14} />
                    </View>
                    <View style={styles.customerCopy}>
                      <Text style={[styles.customerLabel, { color: theme.colors.textMuted }]}>{copy.customer}</Text>
                      <Text numberOfLines={1} style={[styles.customerName, { color: theme.colors.text }]}>{order.address.recipientName}</Text>
                    </View>
                    <Text style={[styles.total, { color: theme.colors.text }]}>{formatRupiah(order.customerTotal)}</Text>
                  </View>
                  <Text numberOfLines={2} style={[styles.address, { color: theme.colors.textMuted }]}>{order.address.addressLine}</Text>

                  <View style={styles.footer}>
                    <Text style={[styles.items, { color: theme.colors.textMuted }]}>{order.items.length} {copy.items}</Text>
                    <View style={styles.detailLink}>
                      <Text style={[styles.detailText, { color: actionable ? theme.colors.primary : theme.colors.textMuted }]}>{actionable ? copy.action : copy.detail}</Text>
                      <NitipIcon color={actionable ? theme.colors.primary : theme.colors.textMuted} name="next" size={14} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );

  function Metric({ icon, label, value, emphasized = false }: { icon: "orders" | "clock" | "check"; label: string; value: number; emphasized?: boolean }) {
    return (
      <View style={[styles.metric, { backgroundColor: emphasized ? theme.colors.surfaceAccent : theme.colors.surface, borderColor: theme.colors.border }]}> 
        <NitipIcon color={emphasized ? theme.colors.primary : theme.colors.textMuted} name={icon} size={15} />
        <Text style={[styles.metricValue, { color: emphasized ? theme.colors.primary : theme.colors.text }]}>{value}</Text>
        <Text numberOfLines={1} style={[styles.metricLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      </View>
    );
  }

  function StateCard({ loading = false, title, body }: { loading?: boolean; title: string; body?: string }) {
    return (
      <View style={[styles.state, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
        {loading ? <ActivityIndicator color={theme.colors.primary} /> : <NitipIcon color={theme.colors.primary} name="orders" size={23} />}
        <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{title}</Text>
        {body ? <Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>{body}</Text> : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 36, paddingHorizontal: 20 },
  hero: { marginTop: 24 },
  heroTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8 },
  heroSubtitle: { fontSize: 10, lineHeight: 17, marginTop: 6, maxWidth: 340 },
  metrics: { flexDirection: "row", gap: 8, marginTop: 18 },
  metric: { borderRadius: 18, borderWidth: 1, flex: 1, minHeight: 92, padding: 12 },
  metricValue: { fontSize: 19, fontWeight: "900", marginTop: 8 },
  metricLabel: { fontSize: 8, fontWeight: "700", marginTop: 2 },
  search: { alignItems: "center", borderRadius: 18, borderWidth: 1, flexDirection: "row", marginTop: 16, minHeight: 48, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 10, marginLeft: 10, minHeight: 46 },
  filters: { gap: 8, paddingRight: 20, paddingTop: 11 },
  filter: { borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: 14 },
  filterText: { fontSize: 9, fontWeight: "800" },
  list: { gap: 10, marginTop: 16 },
  orderCard: { borderRadius: 20, borderWidth: 1, elevation: 2, padding: 15, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 7 },
  orderTop: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  identity: { flex: 1, minWidth: 0 },
  orderCode: { fontSize: 8, fontWeight: "900", letterSpacing: 0.2 },
  outletName: { fontSize: 13, fontWeight: "900", marginTop: 4 },
  statusBadge: { borderRadius: 999, maxWidth: 135, paddingHorizontal: 9, paddingVertical: 6 },
  statusText: { fontSize: 7, fontWeight: "900", lineHeight: 10, textAlign: "center" },
  divider: { height: 1, marginVertical: 13 },
  customerRow: { alignItems: "center", flexDirection: "row" },
  customerBadge: { alignItems: "center", borderRadius: 17, height: 34, justifyContent: "center", width: 34 },
  customerCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  customerLabel: { fontSize: 7, fontWeight: "700" },
  customerName: { fontSize: 10, fontWeight: "900", marginTop: 2 },
  total: { fontSize: 12, fontWeight: "900" },
  address: { fontSize: 8, lineHeight: 13, marginTop: 8 },
  footer: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  items: { fontSize: 8 },
  detailLink: { alignItems: "center", flexDirection: "row", gap: 4 },
  detailText: { fontSize: 8, fontWeight: "900" },
  state: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 18, padding: 28 },
  stateTitle: { fontSize: 12, fontWeight: "900", marginTop: 10, textAlign: "center" },
  stateBody: { fontSize: 9, lineHeight: 15, marginTop: 5, textAlign: "center" },
  error: { borderRadius: 16, marginTop: 18, padding: 13 },
  errorText: { fontSize: 9, lineHeight: 14 },
});
