import { formatRupiah } from "@nitip/domain";
import type { NitipOrder } from "@nitip/domain/commerce";
import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { listOrders } from "../lib/api";

type OrderTab = "active" | "history";

const HISTORY_STATUSES = new Set<NitipOrder["status"]>([
  "delivered",
  "cancelled",
  "refunded",
]);

function formatOrderTime(value: string, language: "id" | "en") {
  return new Date(value).toLocaleString(language === "en" ? "en-US" : "id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrdersScreen() {
  const { t } = useNitipTranslation();
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<NitipOrder[]>([]);
  const [tab, setTab] = useState<OrderTab>("active");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (!user) return;
      refresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setOrders(await listOrders(user));
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : t("orders.loadError"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t, user],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return <Redirect href="/login" />;

  const isDark = theme.mode === "dark";
  const activeOrders = orders.filter((order) => !HISTORY_STATUSES.has(order.status));
  const historyOrders = orders.filter((order) => HISTORY_STATUSES.has(order.status));
  const visibleOrders = tab === "active" ? activeOrders : historyOrders;
  const headerTitle = language === "en" ? "Orders" : "Pesanan";

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title={headerTitle}
          showBack={false}
          right={
            <View
              style={[
                styles.headerIcon,
                {
                  backgroundColor: isDark ? theme.colors.surfaceRaised : "#FFFFFF",
                  borderColor: isDark ? theme.colors.border : "#E8E9ED",
                },
              ]}
            >
              <NitipIcon color={theme.colors.primary} name="orders" size={18} />
            </View>
          }
        />

        <View
          style={[
            styles.segment,
            {
              backgroundColor: isDark ? theme.colors.surface : "#FFFFFF",
              borderColor: isDark ? theme.colors.border : "#E8E9ED",
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: tab === "active" }}
            onPress={() => setTab("active")}
            style={[
              styles.segmentButton,
              { backgroundColor: tab === "active" ? theme.colors.primary : "transparent" },
            ]}
          >
            <NitipIcon color={tab === "active" ? "#FFFFFF" : theme.colors.textMuted} name="clock" size={15} />
            <Text style={[styles.segmentText, { color: tab === "active" ? "#FFFFFF" : theme.colors.textMuted }]}>
              {t("orders.active")} · {activeOrders.length}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: tab === "history" }}
            onPress={() => setTab("history")}
            style={[
              styles.segmentButton,
              { backgroundColor: tab === "history" ? theme.colors.primary : "transparent" },
            ]}
          >
            <NitipIcon color={tab === "history" ? "#FFFFFF" : theme.colors.textMuted} name="history" size={15} />
            <Text style={[styles.segmentText, { color: tab === "history" ? "#FFFFFF" : theme.colors.textMuted }]}>
              {t("orders.history")} · {historyOrders.length}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={[styles.stateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>{t("orders.loading")}</Text>
          </View>
        ) : error ? (
          <View style={[styles.stateCard, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerSurface }]}>
            <Text style={[styles.stateTitle, { color: theme.colors.danger }]}>{t("orders.errorTitle")}</Text>
            <Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>{error}</Text>
            <Pressable onPress={() => void load()} style={[styles.smallButton, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.smallButtonText}>{t("common.retry")}</Text>
            </Pressable>
          </View>
        ) : visibleOrders.length === 0 ? (
          <View style={[styles.stateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceAccent }]}>
              <NitipIcon color={theme.colors.primary} name={tab === "active" ? "orders" : "history"} size={22} />
            </View>
            <Text style={[styles.stateTitle, { color: theme.colors.text }]}>
              {tab === "active" ? t("orders.emptyActiveTitle") : t("orders.emptyHistoryTitle")}
            </Text>
            <Text style={[styles.stateBodyCentered, { color: theme.colors.textMuted }]}>
              {tab === "active" ? t("orders.emptyActiveDescription") : t("orders.emptyHistoryDescription")}
            </Text>
            {tab === "active" ? (
              <Pressable onPress={() => router.replace("/home")} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}>
                <NitipIcon color="#FFFFFF" name="store" size={17} />
                <Text style={styles.primaryButtonText}>{t("orders.browseMerchants")}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {visibleOrders.map((order) => {
              const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
              const isCancelled = order.status === "cancelled" || order.status === "refunded";
              const isDelivered = order.status === "delivered";
              const badgeBackground = isCancelled
                ? theme.colors.dangerSurface
                : isDelivered
                  ? theme.colors.successSurface
                  : theme.colors.surfaceAccent;
              const badgeColor = isCancelled
                ? theme.colors.danger
                : isDelivered
                  ? theme.colors.success
                  : theme.colors.primary;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={order.id}
                  onPress={() => router.push({ pathname: "/order/[id]", params: { id: order.id } })}
                  style={[
                    styles.orderCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      shadowColor: theme.colors.shadow,
                    },
                  ]}
                >
                  <View style={styles.orderTop}>
                    <View style={styles.orderIdentity}>
                      <Text style={[styles.orderCode, { color: theme.colors.primary }]}>{order.orderCode}</Text>
                      <Text numberOfLines={1} style={[styles.businessName, { color: theme.colors.text }]}>{order.businessName}</Text>
                      <Text numberOfLines={1} style={[styles.outletName, { color: theme.colors.textMuted }]}>{order.outletName}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badgeBackground }]}>
                      <Text style={[styles.statusText, { color: badgeColor }]}>{t(`orders.status.${order.status}`)}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                  <View style={styles.priceRow}>
                    <Text style={[styles.date, { color: theme.colors.textMuted }]}>{formatOrderTime(order.createdAt, language)}</Text>
                    <Text style={[styles.total, { color: theme.colors.text }]}>{formatRupiah(order.customerTotal)}</Text>
                  </View>
                  <Text numberOfLines={2} style={[styles.items, { color: theme.colors.textMuted }]}>
                    {quantity} {t("common.items")} · {order.items.slice(0, 2).map((item) => item.name).join(", ")}{order.items.length > 2 ? "…" : ""}
                  </Text>

                  {order.status === "cancelled" && order.cancellationReason ? (
                    <View style={[styles.cancelBox, { backgroundColor: theme.colors.dangerSurface }]}>
                      <Text style={[styles.cancelLabel, { color: theme.colors.danger }]}>{t("orders.cancellationReason")}</Text>
                      <Text style={[styles.cancelText, { color: theme.colors.danger }]}>{order.cancellationReason}</Text>
                    </View>
                  ) : null}

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailText, { color: theme.colors.primary }]}>{t("orders.details")}</Text>
                    <NitipIcon color={theme.colors.textMuted} name="next" size={15} />
                  </View>
                </Pressable>
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
  content: { paddingBottom: 32, paddingHorizontal: 20 },
  headerIcon: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  segment: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 18,
    padding: 4,
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 42,
  },
  segmentText: { fontSize: 10, fontWeight: "800" },
  stateCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    padding: 24,
  },
  stateTitle: { fontSize: 14, fontWeight: "900", textAlign: "center" },
  stateBody: { fontSize: 10, lineHeight: 16, marginTop: 8 },
  stateBodyCentered: { fontSize: 10, lineHeight: 17, marginTop: 8, textAlign: "center" },
  emptyIcon: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", marginBottom: 14, width: 48 },
  smallButton: { borderRadius: 999, marginTop: 15, paddingHorizontal: 18, paddingVertical: 10 },
  smallButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  primaryButton: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 48,
    width: "100%",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  list: { gap: 10, marginTop: 14 },
  orderCard: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
  },
  orderTop: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  orderIdentity: { flex: 1, minWidth: 0 },
  orderCode: { fontSize: 9, fontWeight: "900", letterSpacing: 0.3 },
  businessName: { fontSize: 13, fontWeight: "900", marginTop: 5 },
  outletName: { fontSize: 10, marginTop: 2 },
  statusBadge: { borderRadius: 999, maxWidth: 136, paddingHorizontal: 10, paddingVertical: 7 },
  statusText: { fontSize: 8, fontWeight: "900", lineHeight: 11, textAlign: "center" },
  divider: { height: 1, marginVertical: 14 },
  priceRow: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  date: { flex: 1, fontSize: 9 },
  total: { fontSize: 13, fontWeight: "900" },
  items: { fontSize: 9, lineHeight: 14, marginTop: 7 },
  cancelBox: { borderRadius: 14, marginTop: 12, padding: 11 },
  cancelLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 0.3 },
  cancelText: { fontSize: 9, lineHeight: 14, marginTop: 4 },
  detailRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  detailText: { fontSize: 10, fontWeight: "900" },
});
