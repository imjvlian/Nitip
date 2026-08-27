import type { NitipMerchantProfile, NitipOutlet } from "@nitip/domain";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NitipIcon } from "../components/NitipIcon";
import { getMerchantCopy, merchantStatusLabel } from "../constants/merchantCopy";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getMerchantMe, listMerchantOrders, listOutlets } from "../lib/api";
import {
  buildMerchantNotifications,
  getMerchantNotificationReadIds,
} from "../lib/merchantNotifications";

export default function MerchantHomeScreen() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [merchant, setMerchant] = useState<NitipMerchantProfile | null>(null);
  const [outlets, setOutlets] = useState<NitipOutlet[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const next = await getMerchantMe(user);
      setMerchant(next);

      if (!next) {
        setOutlets([]);
        setNotificationCount(0);
        return;
      }

      const [nextOutlets, nextOrders, readIds] = await Promise.all([
        listOutlets(user),
        next.status === "approved" ? listMerchantOrders(user) : Promise.resolve([]),
        getMerchantNotificationReadIds(user.uid),
      ]);

      setOutlets(nextOutlets);
      const notifications = buildMerchantNotifications(next, nextOrders, language);
      setNotificationCount(
        notifications.filter((notification) => !readIds.has(notification.id)).length,
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.home.loadError);
    } finally {
      setLoading(false);
    }
  }, [c.home.loadError, language, user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!user) return <Redirect href="/login" />;

  const acceptingCount = outlets.filter((outlet) => outlet.acceptingOrders).length;
  const statusDescription = merchant?.status === "approved"
    ? c.home.approved
    : merchant?.status === "pending_review"
      ? c.home.pending
      : merchant?.status === "rejected"
        ? c.home.rejected
        : c.home.draft;

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 14, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[25px] font-black tracking-tighter" style={{ color: theme.colors.primaryStrong }}>nitip mitra.</Text>
          <Text className="mt-0.5 text-[9px]" style={{ color: theme.colors.textMuted }}>{user.email ?? "Merchant"}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable
            accessibilityLabel={language === "id" ? "Notifikasi" : "Notifications"}
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center"
            onPress={() => router.push("/notifications")}
          >
            <NitipIcon color={theme.colors.textMuted} name="notification" size={19} />
            {notificationCount > 0 ? (
              <View
                className="absolute right-0.5 top-0.5 min-w-[17px] items-center justify-center rounded-full px-1"
                style={{ backgroundColor: theme.colors.primary, minHeight: 17 }}
              >
                <Text className="text-[7px] font-black text-white">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityLabel={c.navigation.settings}
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center"
            onPress={() => router.push("/settings")}
          >
            <NitipIcon color={theme.colors.textMuted} name="settings" size={19} />
          </Pressable>
        </View>
      </View>

      <View className="mt-8">
        <Text className="text-[9px] font-black tracking-[1.2px]" style={{ color: theme.colors.primary }}>{c.home.center}</Text>
        <Text className="mt-2 text-[30px] font-black leading-[34px] tracking-tighter" style={{ color: theme.colors.text }}>
          {merchant ? merchant.businessName : c.home.registerTitle}
        </Text>
        <Text className="mt-2 max-w-[330px] text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{c.home.subtitle}</Text>
      </View>

      {loading ? (
        <View className="mt-6 items-center rounded-[22px] p-7" style={{ backgroundColor: theme.colors.surface }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>{c.home.loading}</Text>
        </View>
      ) : (
        <>
          {!merchant ? (
            <Pressable
              className="mt-5 flex-row items-center rounded-[22px] p-4"
              onPress={() => router.push("/settings/business")}
              style={{ backgroundColor: theme.colors.surfaceAccent }}
            >
              <View className="w-9 items-center">
                <NitipIcon color={theme.colors.primary} name="profile" size={20} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[12px] font-black" style={{ color: theme.colors.text }}>{c.home.createProfile}</Text>
                <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{c.home.draft}</Text>
              </View>
              <NitipIcon color={theme.colors.primary} name="next" size={16} />
            </Pressable>
          ) : (
            <Pressable
              className="mt-5 rounded-[22px] p-4"
              disabled={merchant.status === "approved"}
              onPress={() => router.push("/settings/business")}
              style={{
                backgroundColor: merchant.status === "approved"
                  ? theme.colors.successSurface
                  : merchant.status === "rejected"
                    ? theme.colors.dangerSurface
                    : theme.colors.surfaceAccent,
              }}
            >
              <View className="flex-row items-center">
                <View className="flex-1">
                  <Text
                    className="text-[8px] font-black tracking-[1px]"
                    style={{
                      color: merchant.status === "approved"
                        ? theme.colors.success
                        : merchant.status === "rejected"
                          ? theme.colors.danger
                          : theme.colors.primary,
                    }}
                  >
                    {c.home.statusTitle}
                  </Text>
                  <Text className="mt-1 text-[16px] font-black" style={{ color: theme.colors.text }}>
                    {merchantStatusLabel(merchant.status, language)}
                  </Text>
                  <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{statusDescription}</Text>
                </View>
                {merchant.status !== "approved" ? <NitipIcon color={theme.colors.textMuted} name="next" size={16} /> : null}
              </View>
            </Pressable>
          )}

          {merchant?.status === "approved" ? (
            <>
              <Text className="mt-7 text-[15px] font-black" style={{ color: theme.colors.text }}>{c.home.overview}</Text>
              <View className="mt-3 flex-row gap-2">
                <MetricCard icon="store" label={c.home.totalOutlets} value={String(outlets.length)} />
                <MetricCard icon="power" label={c.home.acceptingOutlets} value={String(acceptingCount)} />
              </View>
              <Pressable
                className="mt-3 flex-row items-center rounded-[22px] p-4"
                onPress={() => router.push("/orders")}
                style={{ backgroundColor: theme.colors.primary }}
              >
                <View className="w-9 items-center">
                  <NitipIcon color="#FFFFFF" name="orders" size={21} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[8px] font-black tracking-[1px]" style={{ color: "rgba(255,255,255,0.72)" }}>{c.home.orderCenter}</Text>
                  <Text className="mt-1 text-[15px] font-black text-white">{c.home.incomingOrders}</Text>
                  <Text className="mt-1 text-[9px] leading-4" style={{ color: "rgba(255,255,255,0.72)" }}>{c.home.incomingDescription}</Text>
                </View>
                <NitipIcon color="#FFFFFF" name="next" size={17} />
              </Pressable>
            </>
          ) : null}

          {merchant ? (
            <>
              <View className="mt-8 flex-row items-end justify-between">
                <View>
                  <Text className="text-[15px] font-black" style={{ color: theme.colors.text }}>{c.home.outlets}</Text>
                  <Text className="mt-1 text-[9px]" style={{ color: theme.colors.textMuted }}>
                    {c.home.outletCount.replace("{{count}}", String(outlets.length))}
                  </Text>
                </View>
                <Pressable
                  className="min-h-[38px] flex-row items-center rounded-full px-3"
                  onPress={() => router.push("/outlet/new")}
                  style={{ backgroundColor: theme.colors.surfaceAccent }}
                >
                  <NitipIcon color={theme.colors.primary} name="plus" size={14} />
                  <Text className="ml-1.5 text-[10px] font-black" style={{ color: theme.colors.primary }}>{c.home.addOutlet}</Text>
                </Pressable>
              </View>

              {outlets.length === 0 ? (
                <View className="mt-3 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.surface }}>
                  <Text className="text-[12px] font-black" style={{ color: theme.colors.text }}>{c.home.noOutlet}</Text>
                  <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{c.home.noOutletDescription}</Text>
                </View>
              ) : outlets.map((outlet) => (
                <Pressable
                  accessibilityRole="button"
                  className="mt-3 flex-row items-center rounded-[22px] p-4"
                  key={outlet.id}
                  onPress={() => router.push({ pathname: "/outlet/[id]", params: { id: outlet.id } })}
                  style={{ backgroundColor: theme.colors.surface }}
                >
                  <View className="w-9 items-center">
                    <NitipIcon color={theme.colors.primary} name="store" size={19} />
                  </View>
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="flex-1 text-[12px] font-black" numberOfLines={1} style={{ color: theme.colors.text }}>{outlet.name}</Text>
                      <View
                        className="rounded-full px-2.5 py-1.5"
                        style={{ backgroundColor: outlet.acceptingOrders ? theme.colors.successSurface : theme.colors.surfaceRaised }}
                      >
                        <Text className="text-[8px] font-black" style={{ color: outlet.acceptingOrders ? theme.colors.success : theme.colors.textMuted }}>
                          {outlet.acceptingOrders ? c.home.open : c.home.closed}
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-1 text-[9px] leading-4" numberOfLines={2} style={{ color: theme.colors.textMuted }}>{outlet.addressLine}</Text>
                    <View className="mt-2 flex-row items-center">
                      <NitipIcon color={theme.colors.primary} name="location" size={12} />
                      <Text className="ml-1.5 flex-1 text-[8px] font-extrabold" numberOfLines={1} style={{ color: theme.colors.primary }}>
                        {outlet.latitude != null && outlet.longitude != null
                          ? `${outlet.latitude.toFixed(5)}, ${outlet.longitude.toFixed(5)}`
                          : c.home.locationMissing}
                      </Text>
                    </View>
                  </View>
                  <View className="ml-2">
                    <NitipIcon color={theme.colors.textMuted} name="next" size={16} />
                  </View>
                </Pressable>
              ))}
            </>
          ) : null}
        </>
      )}

      {error ? (
        <View className="mt-4 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );

  function MetricCard({ icon, label, value }: { icon: "store" | "power"; label: string; value: string }) {
    return (
      <View className="flex-1 rounded-[20px] p-4" style={{ backgroundColor: theme.colors.surface }}>
        <NitipIcon color={theme.colors.primary} name={icon} size={18} />
        <Text className="mt-4 text-[24px] font-black tracking-tighter" style={{ color: theme.colors.text }}>{value}</Text>
        <Text className="mt-1 text-[9px]" style={{ color: theme.colors.textMuted }}>{label}</Text>
      </View>
    );
  }
}
