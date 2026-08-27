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
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
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

  const activeOrders = orders.filter((order) => !HISTORY_STATUSES.has(order.status));
  const historyOrders = orders.filter((order) => HISTORY_STATUSES.has(order.status));
  const visibleOrders = tab === "active" ? activeOrders : historyOrders;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 14,
          paddingBottom: 28,
        }}
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
        <View className="flex-row items-center justify-between">
          <Text className="text-[26px] font-black tracking-tighter" style={{ color: theme.colors.primaryStrong }}>
            nitip.
          </Text>
          <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surface }}>
            <NitipIcon color={theme.colors.primary} name="orders" size={19} />
          </View>
        </View>

        <View className="mt-7">
          <Text className="text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
            {t("orders.title")}
          </Text>
          <Text className="mt-1.5 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
            {t("orders.subtitle")}
          </Text>
        </View>

        <View className="mt-5 flex-row rounded-[18px] p-1" style={{ backgroundColor: theme.colors.surface }}>
          <Pressable
            className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px] py-3"
            onPress={() => setTab("active")}
            style={{ backgroundColor: tab === "active" ? theme.colors.primary : "transparent" }}
          >
            <NitipIcon color={tab === "active" ? "#FFFFFF" : theme.colors.textMuted} name="clock" size={15} />
            <Text className="text-[11px] font-black" style={{ color: tab === "active" ? "#FFFFFF" : theme.colors.textMuted }}>
              {t("orders.active")} · {activeOrders.length}
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px] py-3"
            onPress={() => setTab("history")}
            style={{ backgroundColor: tab === "history" ? theme.colors.primary : "transparent" }}
          >
            <NitipIcon color={tab === "history" ? "#FFFFFF" : theme.colors.textMuted} name="history" size={15} />
            <Text className="text-[11px] font-black" style={{ color: tab === "history" ? "#FFFFFF" : theme.colors.textMuted }}>
              {t("orders.history")} · {historyOrders.length}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View className="mt-4 items-center rounded-[24px] p-6" style={{ backgroundColor: theme.colors.surface }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-xs" style={{ color: theme.colors.textMuted }}>
              {t("orders.loading")}
            </Text>
          </View>
        ) : error ? (
          <View className="mt-4 rounded-[24px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>
              {t("orders.errorTitle")}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {error}
            </Text>
            <Pressable className="mt-4 self-start rounded-xl px-4 py-2.5" onPress={() => void load()} style={{ backgroundColor: theme.colors.surfaceRaised }}>
              <Text className="text-xs font-black" style={{ color: theme.colors.primary }}>
                {t("common.retry")}
              </Text>
            </Pressable>
          </View>
        ) : visibleOrders.length === 0 ? (
          <View className="mt-4 items-center rounded-[24px] p-7" style={{ backgroundColor: theme.colors.surface }}>
            <View className="mb-4 h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
              <NitipIcon color={theme.colors.primary} name={tab === "active" ? "orders" : "history"} size={21} />
            </View>
            <Text className="text-center text-sm font-black" style={{ color: theme.colors.text }}>
              {tab === "active" ? t("orders.emptyActiveTitle") : t("orders.emptyHistoryTitle")}
            </Text>
            <Text className="mt-2 text-center text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>
              {tab === "active" ? t("orders.emptyActiveDescription") : t("orders.emptyHistoryDescription")}
            </Text>
            {tab === "active" ? (
              <Pressable
                className="mt-5 min-h-12 w-full flex-row items-center justify-center gap-2 rounded-2xl"
                onPress={() => router.replace("/home")}
                style={{ backgroundColor: theme.colors.primary }}
              >
                <NitipIcon color="#FFFFFF" name="store" size={17} />
                <Text className="text-xs font-black text-white">{t("orders.browseMerchants")}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View className="mt-4 gap-2.5">
            {visibleOrders.map((order) => {
              const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
              const isCancelled = order.status === "cancelled" || order.status === "refunded";
              const isDelivered = order.status === "delivered";
              const badgeBackground = isCancelled
                ? theme.colors.dangerSurface
                : isDelivered
                  ? theme.colors.successSurface
                  : theme.colors.surfaceRaised;
              const badgeColor = isCancelled
                ? theme.colors.danger
                : isDelivered
                  ? theme.colors.success
                  : theme.colors.primary;

              return (
                <Pressable
                  className="rounded-[24px] p-4"
                  key={order.id}
                  onPress={() => router.push({ pathname: "/order/[id]", params: { id: order.id } })}
                  style={{ backgroundColor: theme.colors.surface }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-[9px] font-black tracking-wide" style={{ color: theme.colors.primary }}>
                        {order.orderCode}
                      </Text>
                      <Text className="mt-1.5 text-sm font-black" numberOfLines={1} style={{ color: theme.colors.text }}>
                        {order.businessName}
                      </Text>
                      <Text className="mt-0.5 text-[11px]" numberOfLines={1} style={{ color: theme.colors.textMuted }}>
                        {order.outletName}
                      </Text>
                    </View>
                    <View className="max-w-[135px] rounded-full px-3 py-2" style={{ backgroundColor: badgeBackground }}>
                      <Text className="text-center text-[9px] font-black leading-3" style={{ color: badgeColor }}>
                        {t(`orders.status.${order.status}`)}
                      </Text>
                    </View>
                  </View>

                  <View className="my-4 h-px" style={{ backgroundColor: theme.colors.border }} />
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="flex-1 text-[10px]" style={{ color: theme.colors.textMuted }}>
                      {formatOrderTime(order.createdAt, language)}
                    </Text>
                    <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
                      {formatRupiah(order.customerTotal)}
                    </Text>
                  </View>
                  <Text className="mt-2 text-[10px] leading-4" numberOfLines={2} style={{ color: theme.colors.textMuted }}>
                    {quantity} {t("common.items")} · {order.items.slice(0, 2).map((item) => item.name).join(", ")}
                    {order.items.length > 2 ? "…" : ""}
                  </Text>

                  {order.status === "cancelled" && order.cancellationReason ? (
                    <View className="mt-3 rounded-2xl p-3" style={{ backgroundColor: theme.colors.dangerSurface }}>
                      <Text className="text-[9px] font-black tracking-wide" style={{ color: theme.colors.danger }}>
                        {t("orders.cancellationReason")}
                      </Text>
                      <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.danger }}>
                        {order.cancellationReason}
                      </Text>
                    </View>
                  ) : null}

                  <View className="mt-4 flex-row items-center justify-between">
                    <Text className="text-[11px] font-black" style={{ color: theme.colors.primary }}>
                      {t("orders.details")}
                    </Text>
                    <NitipIcon color={theme.colors.textMuted} name="next" size={16} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
      <BottomNavigation active="orders" />
    </View>
  );
}
