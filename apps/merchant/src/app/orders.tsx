import { formatRupiah } from "@nitip/domain";
import type { NitipMerchantOrder } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NitipIcon } from "../components/NitipIcon";
import { getMerchantCopy, merchantOrderStatusLabel } from "../constants/merchantCopy";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { listMerchantOrders } from "../lib/api";

function isActionable(status: NitipMerchantOrder["status"]) {
  return status === "paid" || status === "merchant_confirmed" || status === "preparing";
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

  const load = useCallback(() => {
    if (!user) return () => undefined;
    let active = true;
    setLoading(true);
    setError(null);
    void listMerchantOrders(user)
      .then((items) => { if (active) setOrders(items); })
      .catch((nextError: unknown) => { if (active) setError(nextError instanceof Error ? nextError.message : c.orders.loadError); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [c.orders.loadError, user]);

  useFocusEffect(load);
  if (!user) return <Redirect href="/login" />;

  const actionableCount = orders.filter((order) => isActionable(order.status)).length;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 14, paddingBottom: 32 }} showsVerticalScrollIndicator={false} style={{ backgroundColor: theme.colors.background }}>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[25px] font-black tracking-tighter" style={{ color: theme.colors.primaryStrong }}>nitip mitra.</Text>
          <Text className="mt-0.5 text-[9px]" style={{ color: theme.colors.textMuted }}>{c.orders.center}</Text>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: actionableCount > 0 ? theme.colors.surfaceAccent : theme.colors.surface }}>
          <NitipIcon color={actionableCount > 0 ? theme.colors.primary : theme.colors.textMuted} name="orders" size={18} />
        </View>
      </View>

      <View className="mt-8">
        <Text className="text-[30px] font-black tracking-tighter" style={{ color: theme.colors.text }}>{c.orders.title}</Text>
        <Text className="mt-2 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{c.orders.actionable.replace("{{count}}", String(actionableCount))}</Text>
      </View>

      {loading ? (
        <View className="mt-6 items-center rounded-[22px] p-7" style={{ backgroundColor: theme.colors.surface }}><ActivityIndicator color={theme.colors.primary} /><Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>{c.orders.loading}</Text></View>
      ) : error ? (
        <View className="mt-6 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}><Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text></View>
      ) : orders.length === 0 ? (
        <View className="mt-6 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.surface }}><NitipIcon color={theme.colors.textMuted} name="orders" size={22} /><Text className="mt-4 text-[13px] font-black" style={{ color: theme.colors.text }}>{c.orders.empty}</Text><Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{c.orders.emptyDescription}</Text></View>
      ) : (
        <View className="mt-5 gap-3">
          {orders.map((order) => {
            const actionable = isActionable(order.status);
            return (
              <Pressable key={order.id} onPress={() => router.push({ pathname: "/order/[id]", params: { id: order.id } })} className="rounded-[22px] p-4" style={{ backgroundColor: actionable ? theme.colors.surfaceAccent : theme.colors.surface }}>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>{order.orderCode}</Text>
                    <Text className="mt-1 text-[13px] font-black" style={{ color: theme.colors.text }}>{order.outletName}</Text>
                  </View>
                  <View className="max-w-[145px] rounded-full px-2.5 py-1.5" style={{ backgroundColor: theme.colors.surfaceRaised }}><Text className="text-center text-[7px] font-black" style={{ color: actionable ? theme.colors.primary : theme.colors.textMuted }}>{merchantOrderStatusLabel(order.status, language)}</Text></View>
                </View>
                <View className="mt-3 flex-row items-center gap-2"><NitipIcon color={theme.colors.primary} name="profile" size={14} /><Text className="text-[9px] font-extrabold" style={{ color: theme.colors.text }}>{order.address.recipientName}</Text></View>
                <Text className="mt-1 text-[9px] leading-4" numberOfLines={2} style={{ color: theme.colors.textMuted }}>{order.address.addressLine}</Text>
                <View className="mt-3 flex-row items-center justify-between border-t pt-3" style={{ borderTopColor: theme.colors.border }}><Text className="text-[9px]" style={{ color: theme.colors.textMuted }}>{c.orders.itemKinds.replace("{{count}}", String(order.items.length))}</Text><Text className="text-[12px] font-black" style={{ color: theme.colors.primary }}>{formatRupiah(order.customerTotal)}</Text></View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
