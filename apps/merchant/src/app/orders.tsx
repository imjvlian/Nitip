import { formatRupiah } from "@nitip/domain";
import type { NitipMerchantOrder } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NitipIcon } from "../components/NitipIcon";
import {
  getMerchantCopy,
  merchantOrderStatusLabel,
} from "../constants/merchantCopy";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { listMerchantOrders } from "../lib/api";

type OrderFilter = "all" | "actionable" | "delivery" | "finished";

function isActionable(status: NitipMerchantOrder["status"]) {
  return status === "paid" || status === "merchant_confirmed" || status === "preparing";
}

function isDelivery(status: NitipMerchantOrder["status"]) {
  return (
    status === "ready_for_pickup"
    || status === "driver_assigned"
    || status === "picked_up"
    || status === "on_delivery"
  );
}

function isFinished(status: NitipMerchantOrder["status"]) {
  return status === "delivered" || status === "cancelled" || status === "refunded";
}

function matchesFilter(order: NitipMerchantOrder, filter: OrderFilter) {
  if (filter === "actionable") return isActionable(order.status);
  if (filter === "delivery") return isDelivery(order.status);
  if (filter === "finished") return isFinished(order.status);
  return true;
}

export default function MerchantOrdersScreen() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<NitipMerchantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    if (!user) return () => undefined;
    let active = true;
    setLoading(true);
    setError(null);
    void listMerchantOrders(user)
      .then((items) => {
        if (active) setOrders(items);
      })
      .catch((nextError: unknown) => {
        if (active) {
          setError(
            nextError instanceof Error ? nextError.message : c.orders.loadError,
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [c.orders.loadError, user]);

  useFocusEffect(load);

  const actionableCount = useMemo(
    () => orders.filter((order) => isActionable(order.status)).length,
    [orders],
  );
  const deliveryCount = useMemo(
    () => orders.filter((order) => isDelivery(order.status)).length,
    [orders],
  );
  const finishedCount = useMemo(
    () => orders.filter((order) => isFinished(order.status)).length,
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return orders
      .filter((order) => matchesFilter(order, filter))
      .filter((order) => {
        if (!normalizedQuery) return true;
        return [order.orderCode, order.outletName, order.address.recipientName]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((first, second) => {
        const firstPriority = isActionable(first.status) ? 0 : 1;
        const secondPriority = isActionable(second.status) ? 0 : 1;
        if (firstPriority !== secondPriority) return firstPriority - secondPriority;
        return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
      });
  }, [filter, orders, query]);

  if (!user) return <Redirect href="/login" />;

  const labels = language === "id"
    ? {
        all: "Semua",
        actionable: "Perlu tindakan",
        delivery: "Pengantaran",
        finished: "Selesai",
        search: "Cari nomor order, outlet, atau customer",
        activeSummary: "Aktif",
        deliverySummary: "Diantar",
        finishedSummary: "Selesai",
        process: "Proses pesanan",
        detail: "Lihat detail",
        noResult: "Pesanan tidak ditemukan",
        noResultDescription: "Coba kata kunci lain atau pilih filter yang berbeda.",
      }
    : {
        all: "All",
        actionable: "Needs action",
        delivery: "Delivery",
        finished: "Finished",
        search: "Search order number, outlet, or customer",
        activeSummary: "Action",
        deliverySummary: "Delivery",
        finishedSummary: "Finished",
        process: "Process order",
        detail: "View details",
        noResult: "No orders found",
        noResultDescription: "Try another keyword or choose a different filter.",
      };

  const filters: { key: OrderFilter; label: string; count: number }[] = [
    { key: "all", label: labels.all, count: orders.length },
    { key: "actionable", label: labels.actionable, count: actionableCount },
    { key: "delivery", label: labels.delivery, count: deliveryCount },
    { key: "finished", label: labels.finished, count: finishedCount },
  ];

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: insets.top + 14,
        paddingBottom: 32,
      }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Text
            className="text-[25px] font-black tracking-tighter"
            style={{ color: theme.colors.primaryStrong }}
          >
            nitip mitra.
          </Text>
          <Text
            className="mt-0.5 text-[9px]"
            style={{ color: theme.colors.textMuted }}
          >
            {c.orders.center}
          </Text>
        </View>
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{
            backgroundColor: actionableCount > 0
              ? theme.colors.surfaceAccent
              : theme.colors.surface,
          }}
        >
          <NitipIcon
            color={actionableCount > 0 ? theme.colors.primary : theme.colors.textMuted}
            name="orders"
            size={18}
          />
        </View>
      </View>

      <View className="mt-8">
        <Text
          className="text-[30px] font-black tracking-tighter"
          style={{ color: theme.colors.text }}
        >
          {c.orders.title}
        </Text>
        <Text
          className="mt-2 text-[10px] leading-4"
          style={{ color: theme.colors.textMuted }}
        >
          {c.orders.actionable.replace("{{count}}", String(actionableCount))}
        </Text>
      </View>

      {!loading && orders.length > 0 ? (
        <>
          <View className="mt-5 flex-row gap-2">
            <SummaryCard
              label={labels.activeSummary}
              value={actionableCount}
              emphasized={actionableCount > 0}
            />
            <SummaryCard label={labels.deliverySummary} value={deliveryCount} />
            <SummaryCard label={labels.finishedSummary} value={finishedCount} />
          </View>

          <View
            className="mt-4 flex-row items-center rounded-[16px] px-3"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <NitipIcon color={theme.colors.textMuted} name="orders" size={15} />
            <TextInput
              className="ml-2 min-h-[46px] flex-1 text-[10px] font-semibold"
              onChangeText={setQuery}
              placeholder={labels.search}
              placeholderTextColor={theme.colors.textMuted}
              value={query}
              style={{ color: theme.colors.text }}
            />
          </View>

          <ScrollView
            className="mt-3"
            contentContainerStyle={{ gap: 8 }}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {filters.map((item) => {
              const selected = item.key === filter;
              return (
                <Pressable
                  className="min-h-[36px] flex-row items-center justify-center rounded-full px-3.5"
                  key={item.key}
                  onPress={() => setFilter(item.key)}
                  style={{
                    backgroundColor: selected
                      ? theme.colors.primary
                      : theme.colors.surface,
                  }}
                >
                  <Text
                    className="text-[9px] font-black"
                    style={{
                      color: selected
                        ? theme.colors.onPrimary
                        : theme.colors.textMuted,
                    }}
                  >
                    {item.label} · {item.count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      {loading ? (
        <View
          className="mt-6 items-center rounded-[22px] p-7"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <ActivityIndicator color={theme.colors.primary} />
          <Text
            className="mt-3 text-[10px]"
            style={{ color: theme.colors.textMuted }}
          >
            {c.orders.loading}
          </Text>
        </View>
      ) : error ? (
        <View
          className="mt-6 rounded-[18px] p-4"
          style={{ backgroundColor: theme.colors.dangerSurface }}
        >
          <Text
            className="text-[10px] leading-4"
            style={{ color: theme.colors.danger }}
          >
            {error}
          </Text>
        </View>
      ) : orders.length === 0 ? (
        <View
          className="mt-6 rounded-[22px] p-5"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <NitipIcon color={theme.colors.textMuted} name="orders" size={22} />
          <Text
            className="mt-4 text-[13px] font-black"
            style={{ color: theme.colors.text }}
          >
            {c.orders.empty}
          </Text>
          <Text
            className="mt-1 text-[9px] leading-4"
            style={{ color: theme.colors.textMuted }}
          >
            {c.orders.emptyDescription}
          </Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View
          className="mt-5 rounded-[22px] p-5"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Text
            className="text-[13px] font-black"
            style={{ color: theme.colors.text }}
          >
            {labels.noResult}
          </Text>
          <Text
            className="mt-1 text-[9px] leading-4"
            style={{ color: theme.colors.textMuted }}
          >
            {labels.noResultDescription}
          </Text>
        </View>
      ) : (
        <View className="mt-5 gap-3">
          {filteredOrders.map((order) => {
            const actionable = isActionable(order.status);
            return (
              <Pressable
                key={order.id}
                onPress={() =>
                  router.push({ pathname: "/order/[id]", params: { id: order.id } })
                }
                className="rounded-[22px] p-4"
                style={{
                  backgroundColor: actionable
                    ? theme.colors.surfaceAccent
                    : theme.colors.surface,
                }}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text
                        className="text-[9px] font-black"
                        style={{ color: theme.colors.primary }}
                      >
                        {order.orderCode}
                      </Text>
                      {actionable ? (
                        <View
                          className="rounded-full px-2 py-1"
                          style={{ backgroundColor: theme.colors.primary }}
                        >
                          <Text
                            className="text-[6px] font-black"
                            style={{ color: theme.colors.onPrimary }}
                          >
                            {c.orders.needsAction}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      className="mt-1 text-[13px] font-black"
                      style={{ color: theme.colors.text }}
                    >
                      {order.outletName}
                    </Text>
                  </View>
                  <View
                    className="max-w-[145px] rounded-full px-2.5 py-1.5"
                    style={{ backgroundColor: theme.colors.surfaceRaised }}
                  >
                    <Text
                      className="text-center text-[7px] font-black"
                      style={{
                        color: actionable
                          ? theme.colors.primary
                          : theme.colors.textMuted,
                      }}
                    >
                      {merchantOrderStatusLabel(order.status, language)}
                    </Text>
                  </View>
                </View>

                <View className="mt-3 flex-row items-center gap-2">
                  <NitipIcon color={theme.colors.primary} name="profile" size={14} />
                  <Text
                    className="text-[9px] font-extrabold"
                    style={{ color: theme.colors.text }}
                  >
                    {order.address.recipientName}
                  </Text>
                </View>
                <Text
                  className="mt-1 text-[9px] leading-4"
                  numberOfLines={2}
                  style={{ color: theme.colors.textMuted }}
                >
                  {order.address.addressLine}
                </Text>

                <View
                  className="mt-3 flex-row items-center justify-between border-t pt-3"
                  style={{ borderTopColor: theme.colors.border }}
                >
                  <View>
                    <Text
                      className="text-[9px]"
                      style={{ color: theme.colors.textMuted }}
                    >
                      {c.orders.itemKinds.replace(
                        "{{count}}",
                        String(order.items.length),
                      )}
                    </Text>
                    <Text
                      className="mt-1 text-[9px] font-black"
                      style={{
                        color: actionable
                          ? theme.colors.primary
                          : theme.colors.textMuted,
                      }}
                    >
                      {actionable ? labels.process : labels.detail} →
                    </Text>
                  </View>
                  <Text
                    className="text-[12px] font-black"
                    style={{ color: theme.colors.primary }}
                  >
                    {formatRupiah(order.customerTotal)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  function SummaryCard({
    label,
    value,
    emphasized = false,
  }: {
    label: string;
    value: number;
    emphasized?: boolean;
  }) {
    return (
      <View
        className="flex-1 rounded-[18px] p-3"
        style={{
          backgroundColor: emphasized
            ? theme.colors.surfaceAccent
            : theme.colors.surface,
        }}
      >
        <Text
          className="text-[18px] font-black"
          style={{ color: emphasized ? theme.colors.primary : theme.colors.text }}
        >
          {value}
        </Text>
        <Text
          className="mt-1 text-[8px] font-extrabold"
          numberOfLines={1}
          style={{ color: theme.colors.textMuted }}
        >
          {label}
        </Text>
      </View>
    );
  }
}
