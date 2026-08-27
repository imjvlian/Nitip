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

const COPY = {
  id: {
    title: "Pendapatan",
    eyebrow: "RINGKASAN PENDAPATAN",
    subtitle: "Pantau pendapatan merchant dari pesanan yang sudah dibayar hingga selesai.",
    realized: "Terealisasi",
    processing: "Dalam proses",
    grossSales: "Penjualan kotor",
    commission: "Komisi Nitip",
    completed: "Pesanan selesai",
    active: "Pesanan berjalan",
    sevenDays: "7 hari",
    thirtyDays: "30 hari",
    allTime: "Semua",
    outletBreakdown: "Per outlet",
    recentCompleted: "Pesanan selesai terbaru",
    settled: "Terealisasi",
    pending: "Dalam proses",
    noCompleted: "Belum ada pesanan selesai pada periode ini.",
    noOutlet: "Belum ada pendapatan pada periode ini.",
    loading: "Memuat pendapatan...",
    loadError: "Gagal memuat data pendapatan",
    payoutTitle: "Pencairan belum diaktifkan",
    payoutDescription: "Angka di halaman ini adalah ringkasan pendapatan order. Payout akan diaktifkan setelah settlement pembayaran tersedia di backend Nitip.",
    openOrder: "Lihat detail",
  },
  en: {
    title: "Earnings",
    eyebrow: "EARNINGS SUMMARY",
    subtitle: "Track merchant earnings from paid orders through completed delivery.",
    realized: "Realized",
    processing: "In progress",
    grossSales: "Gross sales",
    commission: "Nitip commission",
    completed: "Completed orders",
    active: "Active orders",
    sevenDays: "7 days",
    thirtyDays: "30 days",
    allTime: "All time",
    outletBreakdown: "By outlet",
    recentCompleted: "Recent completed orders",
    settled: "Realized",
    pending: "In progress",
    noCompleted: "No completed orders in this period yet.",
    noOutlet: "No earnings in this period yet.",
    loading: "Loading earnings...",
    loadError: "Failed to load earnings",
    payoutTitle: "Payout is not enabled yet",
    payoutDescription: "The figures on this page summarize order earnings. Payout will be enabled after payment settlement is available in the Nitip backend.",
    openOrder: "View details",
  },
} as const;

function isPendingEarningStatus(status: NitipMerchantOrder["status"]) {
  return (
    status === "paid" ||
    status === "merchant_confirmed" ||
    status === "preparing" ||
    status === "ready_for_pickup" ||
    status === "driver_assigned" ||
    status === "picked_up" ||
    status === "on_delivery"
  );
}

function sumBy(orders: NitipMerchantOrder[], selector: (order: NitipMerchantOrder) => number) {
  return orders.reduce((total, order) => total + selector(order), 0);
}

export default function MerchantEarningsScreen() {
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

  const periodOrders = useMemo(() => {
    if (period === "all") return orders;
    const days = period === "7d" ? 7 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return orders.filter((order) => {
      const timestamp = Date.parse(order.updatedAt);
      return Number.isFinite(timestamp) && timestamp >= cutoff;
    });
  }, [orders, period]);

  const settledOrders = useMemo(
    () => periodOrders.filter((order) => order.status === "delivered"),
    [periodOrders],
  );
  const pendingOrders = useMemo(
    () => periodOrders.filter((order) => isPendingEarningStatus(order.status)),
    [periodOrders],
  );

  const settledNet = sumBy(settledOrders, (order) => order.merchantNet);
  const pendingNet = sumBy(pendingOrders, (order) => order.merchantNet);
  const grossSales = sumBy(settledOrders, (order) => order.subtotal);
  const commission = sumBy(settledOrders, (order) => order.merchantCommission);

  const outletRows = useMemo(() => {
    const rows = new Map<
      string,
      { outletId: string; outletName: string; settled: number; pending: number; completed: number; active: number }
    >();

    for (const order of periodOrders) {
      const settled = order.status === "delivered";
      const pending = isPendingEarningStatus(order.status);
      if (!settled && !pending) continue;

      const current = rows.get(order.outletId) ?? {
        outletId: order.outletId,
        outletName: order.outletName,
        settled: 0,
        pending: 0,
        completed: 0,
        active: 0,
      };

      if (settled) {
        current.settled += order.merchantNet;
        current.completed += 1;
      }
      if (pending) {
        current.pending += order.merchantNet;
        current.active += 1;
      }
      rows.set(order.outletId, current);
    }

    return Array.from(rows.values()).sort(
      (a, b) => b.settled + b.pending - (a.settled + a.pending),
    );
  }, [periodOrders]);

  const recentCompleted = useMemo(
    () =>
      [...settledOrders]
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 10),
    [settledOrders],
  );

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
              <NitipIcon color="#FFFFFF" name="earnings" size={20} />
              <Text className="ml-2 text-[9px] font-black tracking-[1px]" style={{ color: "rgba(255,255,255,0.72)" }}>
                {copy.realized.toUpperCase()}
              </Text>
            </View>
            <Text className="mt-4 text-[31px] font-black tracking-tighter text-white">
              {formatRupiah(settledNet)}
            </Text>
            <Text className="mt-2 text-[9px]" style={{ color: "rgba(255,255,255,0.72)" }}>
              {copy.completed}: {settledOrders.length}
            </Text>
          </View>

          <View className="mt-3 flex-row gap-2">
            <MetricCard label={copy.processing} value={formatRupiah(pendingNet)} />
            <MetricCard label={copy.active} value={String(pendingOrders.length)} />
          </View>
          <View className="mt-2 flex-row gap-2">
            <MetricCard label={copy.grossSales} value={formatRupiah(grossSales)} />
            <MetricCard label={copy.commission} value={formatRupiah(commission)} />
          </View>

          <View className="mt-7 flex-row items-center">
            <NitipIcon color={theme.colors.primary} name="store" size={17} />
            <Text className="ml-2 text-[15px] font-black" style={{ color: theme.colors.text }}>{copy.outletBreakdown}</Text>
          </View>

          {outletRows.length === 0 ? (
            <View className="mt-3 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.surface }}>
              <Text className="text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{copy.noOutlet}</Text>
            </View>
          ) : (
            <View className="mt-3 gap-2">
              {outletRows.map((row) => (
                <View className="rounded-[22px] p-4" key={row.outletId} style={{ backgroundColor: theme.colors.surface }}>
                  <Text className="text-[12px] font-black" style={{ color: theme.colors.text }}>{row.outletName}</Text>
                  <View className="mt-3 flex-row gap-2">
                    <View className="flex-1">
                      <Text className="text-[8px] font-extrabold" style={{ color: theme.colors.textMuted }}>{copy.settled}</Text>
                      <Text className="mt-1 text-[13px] font-black" style={{ color: theme.colors.success }}>{formatRupiah(row.settled)}</Text>
                      <Text className="mt-1 text-[8px]" style={{ color: theme.colors.textMuted }}>{row.completed} {copy.completed.toLowerCase()}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[8px] font-extrabold" style={{ color: theme.colors.textMuted }}>{copy.pending}</Text>
                      <Text className="mt-1 text-[13px] font-black" style={{ color: theme.colors.primary }}>{formatRupiah(row.pending)}</Text>
                      <Text className="mt-1 text-[8px]" style={{ color: theme.colors.textMuted }}>{row.active} {copy.active.toLowerCase()}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View className="mt-7 flex-row items-center">
            <NitipIcon color={theme.colors.primary} name="orders" size={17} />
            <Text className="ml-2 text-[15px] font-black" style={{ color: theme.colors.text }}>{copy.recentCompleted}</Text>
          </View>

          {recentCompleted.length === 0 ? (
            <View className="mt-3 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.surface }}>
              <Text className="text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{copy.noCompleted}</Text>
            </View>
          ) : (
            <View className="mt-3 gap-2">
              {recentCompleted.map((order) => (
                <Pressable
                  className="rounded-[22px] p-4"
                  key={order.id}
                  onPress={() => router.push({ pathname: "/order/[id]", params: { id: order.id } })}
                  style={{ backgroundColor: theme.colors.surface }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>{order.orderCode}</Text>
                      <Text className="mt-1 text-[12px] font-black" style={{ color: theme.colors.text }}>{order.outletName}</Text>
                    </View>
                    <Text className="text-[12px] font-black" style={{ color: theme.colors.success }}>{formatRupiah(order.merchantNet)}</Text>
                  </View>
                  <View className="mt-3 flex-row items-center justify-between">
                    <Text className="text-[8px]" style={{ color: theme.colors.textMuted }}>{order.address.recipientName}</Text>
                    <Text className="text-[8px] font-black" style={{ color: theme.colors.primary }}>{copy.openOrder} →</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <View className="mt-7 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.surfaceAccent }}>
            <Text className="text-[12px] font-black" style={{ color: theme.colors.text }}>{copy.payoutTitle}</Text>
            <Text className="mt-2 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{copy.payoutDescription}</Text>
          </View>
        </>
      )}
    </ScrollView>
  );

  function MetricCard({ label, value }: { label: string; value: string }) {
    return (
      <View className="flex-1 rounded-[20px] p-4" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="text-[15px] font-black tracking-tight" numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.colors.text }}>
          {value}
        </Text>
        <Text className="mt-2 text-[8px] leading-3" style={{ color: theme.colors.textMuted }}>{label}</Text>
      </View>
    );
  }
}
