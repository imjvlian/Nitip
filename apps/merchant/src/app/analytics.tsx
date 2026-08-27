import { formatRupiah } from "@nitip/domain";
import type { NitipMerchantOrder } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { listMerchantOrders } from "../lib/api";

type Period = "7d" | "30d" | "all";

type TrendBucket = {
  key: string;
  label: string;
  orders: number;
  sales: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const COPY = {
  id: {
    title: "Analitik",
    eyebrow: "PERFORMA BISNIS",
    subtitle: "Lihat tren order, omzet, outlet terbaik, dan produk yang paling banyak terjual.",
    sevenDays: "7 hari",
    thirtyDays: "30 hari",
    allTime: "Semua",
    paidOrders: "Order dibayar+",
    completedOrders: "Order selesai",
    completionRate: "Completion rate",
    grossSales: "Omzet produk",
    averageOrder: "Rata-rata order",
    realizedNet: "Net terealisasi",
    trend: "Tren aktivitas",
    trendHintShort: "Omzet per periode",
    trendHintAll: "6 bulan terakhir · metrik di atas tetap semua waktu",
    outlets: "Performa outlet",
    products: "Produk terlaris",
    orders: "order",
    completed: "selesai",
    sold: "terjual",
    noData: "Belum ada data order pada periode ini.",
    noProducts: "Belum ada produk terjual pada periode ini.",
    loading: "Memuat analitik...",
    loadError: "Gagal memuat analitik merchant",
  },
  en: {
    title: "Analytics",
    eyebrow: "BUSINESS PERFORMANCE",
    subtitle: "See order trends, sales, top outlets, and your best-selling products.",
    sevenDays: "7 days",
    thirtyDays: "30 days",
    allTime: "All time",
    paidOrders: "Paid+ orders",
    completedOrders: "Completed orders",
    completionRate: "Completion rate",
    grossSales: "Product sales",
    averageOrder: "Average order",
    realizedNet: "Realized net",
    trend: "Activity trend",
    trendHintShort: "Sales by period",
    trendHintAll: "Last 6 months · summary metrics above remain all time",
    outlets: "Outlet performance",
    products: "Best-selling products",
    orders: "orders",
    completed: "completed",
    sold: "sold",
    noData: "No order data in this period yet.",
    noProducts: "No product sales in this period yet.",
    loading: "Loading analytics...",
    loadError: "Failed to load merchant analytics",
  },
} as const;

function isTrackedOrder(status: NitipMerchantOrder["status"]) {
  return status !== "pending_payment" && status !== "cancelled" && status !== "refunded";
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function shortDate(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function shortMonth(timestamp: number) {
  return new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(timestamp));
}

function buildTrend(orders: NitipMerchantOrder[], period: Period): TrendBucket[] {
  if (period === "all") {
    const now = new Date();
    const buckets: TrendBucket[] = [];

    for (let offset = 5; offset >= 0; offset -= 1) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      buckets.push({
        key: `${monthStart.getFullYear()}-${monthStart.getMonth()}`,
        label: shortMonth(monthStart.getTime()),
        orders: 0,
        sales: 0,
      });
    }

    for (const order of orders) {
      const timestamp = Date.parse(order.createdAt);
      if (!Number.isFinite(timestamp)) continue;
      const date = new Date(timestamp);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const bucket = buckets.find((item) => item.key === key);
      if (!bucket) continue;
      bucket.orders += 1;
      bucket.sales += order.subtotal;
    }

    return buckets;
  }

  const spanDays = period === "7d" ? 1 : 3;
  const bucketCount = period === "7d" ? 7 : 10;
  const bucketMs = spanDays * DAY_MS;
  const start = startOfDay(Date.now() - (bucketCount * spanDays - 1) * DAY_MS);
  const buckets = Array.from({ length: bucketCount }, (_, index): TrendBucket => ({
    key: String(index),
    label: shortDate(start + index * bucketMs),
    orders: 0,
    sales: 0,
  }));

  for (const order of orders) {
    const timestamp = Date.parse(order.createdAt);
    if (!Number.isFinite(timestamp) || timestamp < start) continue;
    const index = Math.floor((timestamp - start) / bucketMs);
    if (index < 0 || index >= bucketCount) continue;
    buckets[index].orders += 1;
    buckets[index].sales += order.subtotal;
  }

  return buckets;
}

export default function MerchantAnalyticsScreen() {
  const { language } = useNitipLanguage();
  const copy = COPY[language];
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<NitipMerchantOrder[]>([]);
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const trackedOrders = useMemo(() => {
    const validOrders = orders.filter((order) => isTrackedOrder(order.status));
    if (period === "all") return validOrders;

    const days = period === "7d" ? 7 : 30;
    const cutoff = startOfDay(Date.now() - (days - 1) * DAY_MS);
    return validOrders.filter((order) => {
      const timestamp = Date.parse(order.createdAt);
      return Number.isFinite(timestamp) && timestamp >= cutoff;
    });
  }, [orders, period]);

  const completedOrders = useMemo(
    () => trackedOrders.filter((order) => order.status === "delivered"),
    [trackedOrders],
  );

  const grossSales = trackedOrders.reduce((total, order) => total + order.subtotal, 0);
  const realizedNet = completedOrders.reduce((total, order) => total + order.merchantNet, 0);
  const averageOrder = trackedOrders.length > 0 ? Math.round(grossSales / trackedOrders.length) : 0;
  const completionRate = trackedOrders.length > 0
    ? Math.round((completedOrders.length / trackedOrders.length) * 100)
    : 0;

  const trend = useMemo(() => buildTrend(trackedOrders, period), [period, trackedOrders]);
  const maxTrendSales = Math.max(1, ...trend.map((bucket) => bucket.sales));

  const outletRows = useMemo(() => {
    const rows = new Map<
      string,
      { id: string; name: string; orders: number; completed: number; sales: number; realizedNet: number }
    >();

    for (const order of trackedOrders) {
      const current = rows.get(order.outletId) ?? {
        id: order.outletId,
        name: order.outletName,
        orders: 0,
        completed: 0,
        sales: 0,
        realizedNet: 0,
      };
      current.orders += 1;
      current.sales += order.subtotal;
      if (order.status === "delivered") {
        current.completed += 1;
        current.realizedNet += order.merchantNet;
      }
      rows.set(order.outletId, current);
    }

    return Array.from(rows.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [trackedOrders]);

  const productRows = useMemo(() => {
    const rows = new Map<string, { id: string; name: string; quantity: number; sales: number }>();

    for (const order of trackedOrders) {
      for (const item of order.items) {
        const current = rows.get(item.productId) ?? {
          id: item.productId,
          name: item.name,
          quantity: 0,
          sales: 0,
        };
        current.quantity += item.quantity;
        current.sales += item.lineTotal;
        rows.set(item.productId, current);
      }
    }

    return Array.from(rows.values())
      .sort((a, b) => b.quantity - a.quantity || b.sales - a.sales)
      .slice(0, 5);
  }, [trackedOrders]);

  if (!user) return <Redirect href="/login" />;

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: insets.top + 10,
        paddingBottom: Math.max(insets.bottom + 30, 42),
      }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      <AppHeader title={copy.title} onBack={() => router.back()} />

      <View className="mt-7">
        <Text className="text-[9px] font-black tracking-[1.2px]" style={{ color: theme.colors.primary }}>
          {copy.eyebrow}
        </Text>
        <Text className="mt-2 text-[30px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
          {copy.title}.
        </Text>
        <Text className="mt-2 max-w-[340px] text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
          {copy.subtitle}
        </Text>
      </View>

      <View className="mt-5 flex-row gap-2">
        {([
          ["7d", copy.sevenDays],
          ["30d", copy.thirtyDays],
          ["all", copy.allTime],
        ] as const).map(([value, label]) => {
          const selected = period === value;
          return (
            <Pressable
              className="min-h-[38px] flex-1 items-center justify-center rounded-full px-3"
              key={value}
              onPress={() => setPeriod(value)}
              style={{ backgroundColor: selected ? theme.colors.primary : theme.colors.surface }}
            >
              <Text className="text-[9px] font-black" style={{ color: selected ? "#FFFFFF" : theme.colors.textMuted }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View className="mt-6 items-center rounded-[22px] p-7" style={{ backgroundColor: theme.colors.surface }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>{copy.loading}</Text>
        </View>
      ) : error ? (
        <View className="mt-6 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
        </View>
      ) : (
        <>
          <View className="mt-5 rounded-[24px] p-5" style={{ backgroundColor: theme.colors.primary }}>
            <View className="flex-row items-center">
              <NitipIcon color="#FFFFFF" name="analytics" size={20} />
              <Text className="ml-2 text-[9px] font-black tracking-[1px]" style={{ color: "rgba(255,255,255,0.72)" }}>
                {copy.grossSales.toUpperCase()}
              </Text>
            </View>
            <Text className="mt-4 text-[31px] font-black tracking-tighter text-white">
              {formatRupiah(grossSales)}
            </Text>
            <Text className="mt-2 text-[9px]" style={{ color: "rgba(255,255,255,0.72)" }}>
              {trackedOrders.length} {copy.orders} · {completedOrders.length} {copy.completed}
            </Text>
          </View>

          <View className="mt-3 flex-row gap-2">
            <MetricCard label={copy.paidOrders} value={String(trackedOrders.length)} />
            <MetricCard label={copy.completedOrders} value={String(completedOrders.length)} />
          </View>
          <View className="mt-2 flex-row gap-2">
            <MetricCard label={copy.averageOrder} value={formatRupiah(averageOrder)} />
            <MetricCard label={copy.completionRate} value={`${completionRate}%`} />
          </View>
          <View className="mt-2">
            <MetricCard label={copy.realizedNet} value={formatRupiah(realizedNet)} />
          </View>

          <View className="mt-7 rounded-[24px] p-5" style={{ backgroundColor: theme.colors.surface }}>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-[14px] font-black" style={{ color: theme.colors.text }}>{copy.trend}</Text>
                <Text className="mt-1 text-[8px] leading-4" style={{ color: theme.colors.textMuted }}>
                  {period === "all" ? copy.trendHintAll : copy.trendHintShort}
                </Text>
              </View>
              <NitipIcon color={theme.colors.primary} name="analytics" size={18} />
            </View>

            <View className="mt-5 h-[132px] flex-row items-end gap-1.5">
              {trend.map((bucket) => {
                const height = bucket.sales > 0 ? Math.max(8, Math.round((bucket.sales / maxTrendSales) * 94)) : 4;
                return (
                  <View className="flex-1 items-center justify-end" key={bucket.key}>
                    <View
                      className="w-full rounded-t-[7px]"
                      style={{ backgroundColor: bucket.sales > 0 ? theme.colors.primary : theme.colors.surfaceRaised, height }}
                    />
                    <Text className="mt-2 text-[6px] font-bold" numberOfLines={1} style={{ color: theme.colors.textMuted }}>
                      {bucket.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View className="mt-7 flex-row items-center">
            <NitipIcon color={theme.colors.primary} name="store" size={17} />
            <Text className="ml-2 text-[15px] font-black" style={{ color: theme.colors.text }}>{copy.outlets}</Text>
          </View>

          {outletRows.length === 0 ? (
            <EmptyCard text={copy.noData} />
          ) : (
            <View className="mt-3 gap-2">
              {outletRows.map((row, index) => (
                <View className="rounded-[22px] p-4" key={row.id} style={{ backgroundColor: theme.colors.surface }}>
                  <View className="flex-row items-center gap-3">
                    <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceAccent }}>
                      <Text className="text-[10px] font-black" style={{ color: theme.colors.primary }}>#{index + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[12px] font-black" numberOfLines={1} style={{ color: theme.colors.text }}>{row.name}</Text>
                      <Text className="mt-1 text-[8px]" style={{ color: theme.colors.textMuted }}>
                        {row.orders} {copy.orders} · {row.completed} {copy.completed}
                      </Text>
                    </View>
                    <Text className="text-[12px] font-black" style={{ color: theme.colors.primary }}>{formatRupiah(row.sales)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View className="mt-7 flex-row items-center">
            <NitipIcon color={theme.colors.primary} name="product" size={17} />
            <Text className="ml-2 text-[15px] font-black" style={{ color: theme.colors.text }}>{copy.products}</Text>
          </View>

          {productRows.length === 0 ? (
            <EmptyCard text={copy.noProducts} />
          ) : (
            <View className="mt-3 gap-2">
              {productRows.map((row, index) => (
                <View className="rounded-[22px] p-4" key={row.id} style={{ backgroundColor: theme.colors.surface }}>
                  <View className="flex-row items-center gap-3">
                    <Text className="w-7 text-[10px] font-black" style={{ color: theme.colors.primary }}>#{index + 1}</Text>
                    <View className="flex-1">
                      <Text className="text-[12px] font-black" numberOfLines={1} style={{ color: theme.colors.text }}>{row.name}</Text>
                      <Text className="mt-1 text-[8px]" style={{ color: theme.colors.textMuted }}>{row.quantity} {copy.sold}</Text>
                    </View>
                    <Text className="text-[11px] font-black" style={{ color: theme.colors.text }}>{formatRupiah(row.sales)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  function MetricCard({ label, value }: { label: string; value: string }) {
    return (
      <View className="flex-1 rounded-[20px] p-4" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="text-[8px] font-extrabold" style={{ color: theme.colors.textMuted }}>{label}</Text>
        <Text className="mt-2 text-[16px] font-black tracking-tight" numberOfLines={1} style={{ color: theme.colors.text }}>{value}</Text>
      </View>
    );
  }

  function EmptyCard({ text }: { text: string }) {
    return (
      <View className="mt-3 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{text}</Text>
      </View>
    );
  }
}
