import { formatRupiah } from "@nitip/domain";
import type { NitipDriverOrder } from "@nitip/domain/driver";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { getCurrentDriverOrder } from "../lib/api";

function statusLabel(status: NitipDriverOrder["status"]) {
  switch (status) {
    case "driver_assigned": return "ORDER DITUGASKAN";
    case "picked_up": return "SUDAH DIAMBIL";
    case "on_delivery": return "SEDANG DIANTAR";
    case "delivered": return "SELESAI";
  }
}

export default function DriverOrdersScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<NitipDriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError(null);
    getCurrentDriverOrder(user)
      .then((next) => {
        if (active) setOrder(next);
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : "Gagal memuat pesanan driver");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return <Redirect href="/login" />;

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: "#F7FFF9",
        paddingHorizontal: 20,
        paddingTop: insets.top + 24,
        paddingBottom: 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-[10px] font-black tracking-[1.2px] text-primary">PESANAN DRIVER</Text>
      <Text className="mt-2 text-[30px] font-black tracking-[-1px] text-foreground">Perjalanan aktif.</Text>
      <Text className="mt-1 text-[11px] leading-5 text-muted">
        Assignment yang sedang berjalan ditampilkan di sini. Buka detail untuk memperbarui status perjalanan.
      </Text>

      {loading ? (
        <View className="mt-6 items-center rounded-[20px] border border-border bg-surface p-6">
          <ActivityIndicator color="#08349C" />
          <Text className="mt-3 text-[11px] text-muted">Memuat assignment...</Text>
        </View>
      ) : error ? (
        <View className="mt-6 rounded-[20px] bg-[#FFF1F0] p-5">
          <Text className="text-sm font-black text-[#B42318]">Pesanan belum dapat dimuat</Text>
          <Text className="mt-1 text-[11px] leading-5 text-[#B42318]">{error}</Text>
        </View>
      ) : order ? (
        <Pressable
          className="mt-6 rounded-[22px] border border-border bg-surface p-5"
          onPress={() => router.push({ pathname: "/order/[id]", params: { id: order.id } })}
        >
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-[9px] font-black tracking-[1px] text-primary">{statusLabel(order.status)}</Text>
              <Text className="mt-1 text-xl font-black text-foreground">{order.orderCode}</Text>
            </View>
            <Text className="text-sm font-black text-primary">{formatRupiah(order.deliveryFare)}</Text>
          </View>

          <View className="mt-5 rounded-[16px] bg-accent p-4">
            <Text className="text-[9px] font-black tracking-[0.8px] text-primary">PICKUP</Text>
            <Text className="mt-1 text-sm font-black text-foreground">
              {order.pickup.businessName} · {order.pickup.outletName}
            </Text>
            <Text className="mt-1 text-[10px] leading-4 text-muted">{order.pickup.addressLine}</Text>
          </View>

          <View className="mt-3 rounded-[16px] bg-accent p-4">
            <Text className="text-[9px] font-black tracking-[0.8px] text-primary">TUJUAN</Text>
            <Text className="mt-1 text-sm font-black text-foreground">{order.destination.recipientName}</Text>
            <Text className="mt-1 text-[10px] leading-4 text-muted">{order.destination.addressLine}</Text>
          </View>

          <Text className="mt-4 text-[10px] font-black text-primary">Buka detail pesanan →</Text>
        </Pressable>
      ) : (
        <View className="mt-6 rounded-[22px] border border-border bg-surface p-6">
          <Text className="text-base font-black text-foreground">Belum ada perjalanan aktif</Text>
          <Text className="mt-2 text-[11px] leading-5 text-muted">
            Aktifkan status online dari Beranda untuk menerima penawaran order siap pickup.
          </Text>
          <Pressable className="mt-5 min-h-[48px] items-center justify-center rounded-[15px] bg-primary" onPress={() => router.replace("/home")}>
            <Text className="text-xs font-black text-white">Kembali ke Beranda</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
