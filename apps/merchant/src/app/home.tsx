import type { NitipMerchantProfile, NitipOutlet } from "@nitip/domain";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NitipIcon } from "../components/NitipIcon";
import { getMerchantCopy, merchantStatusLabel } from "../constants/merchantCopy";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { deleteOutlet, getMerchantMe, listOutlets, updateOutlet } from "../lib/api";

export default function MerchantHomeScreen() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [merchant, setMerchant] = useState<NitipMerchantProfile | null>(null);
  const [outlets, setOutlets] = useState<NitipOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const next = await getMerchantMe(user);
      setMerchant(next);
      setOutlets(next ? await listOutlets(user) : []);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.home.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [user, language]);
  if (!user) return <Redirect href="/login" />;

  async function toggleOrders(outlet: NitipOutlet) {
    try {
      const next = await updateOutlet(user, outlet.id, { acceptingOrders: !outlet.acceptingOrders });
      setOutlets((current) => current.map((item) => item.id === next.id ? next : item));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.home.toggleError);
    }
  }

  function confirmDelete(outlet: NitipOutlet) {
    Alert.alert(c.home.deleteOutletTitle, c.home.deleteOutletDescription.replace("{{name}}", outlet.name), [
      { text: c.common.cancel, style: "cancel" },
      {
        text: c.common.delete,
        style: "destructive",
        onPress: () => void (async () => {
          try {
            await deleteOutlet(user, outlet.id);
            setOutlets((current) => current.filter((item) => item.id !== outlet.id));
          } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : c.home.deleteOutletError);
          }
        })(),
      },
    ]);
  }

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
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full"
          onPress={() => router.push("/settings")}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <NitipIcon color={theme.colors.text} name="settings" size={17} />
        </Pressable>
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
          {merchant ? (
            <View
              className="mt-5 rounded-[22px] p-4"
              style={{
                backgroundColor: merchant.status === "approved"
                  ? theme.colors.successSurface
                  : merchant.status === "rejected"
                    ? theme.colors.dangerSurface
                    : theme.colors.surfaceAccent,
              }}
            >
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
          ) : null}

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
                <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.14)" }}>
                  <NitipIcon color="#FFFFFF" name="orders" size={20} />
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
                <View className="mt-3 rounded-[22px] p-4" key={outlet.id} style={{ backgroundColor: theme.colors.surface }}>
                  <View className="flex-row items-start">
                    <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
                      <NitipIcon color={theme.colors.primary} name="store" size={18} />
                    </View>
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-start justify-between gap-2">
                        <View className="flex-1">
                          <Text className="text-[12px] font-black" style={{ color: theme.colors.text }}>{outlet.name}</Text>
                          <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{outlet.addressLine}</Text>
                        </View>
                        <View
                          className="rounded-full px-2.5 py-1.5"
                          style={{ backgroundColor: outlet.acceptingOrders ? theme.colors.successSurface : theme.colors.surfaceRaised }}
                        >
                          <Text className="text-[8px] font-black" style={{ color: outlet.acceptingOrders ? theme.colors.success : theme.colors.textMuted }}>
                            {outlet.acceptingOrders ? c.home.open : c.home.closed}
                          </Text>
                        </View>
                      </View>
                      <Text className="mt-2 text-[8px] font-extrabold" style={{ color: theme.colors.primary }}>
                        {outlet.isActive ? c.home.activeOutlet : c.home.inactiveOutlet} · {outlet.latitude != null && outlet.longitude != null
                          ? `${outlet.latitude.toFixed(5)}, ${outlet.longitude.toFixed(5)}`
                          : c.home.locationMissing}
                      </Text>
                      <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-3">
                        <Action
                          label={outlet.latitude != null ? c.home.changeLocation : c.home.setLocation}
                          onPress={() => router.push({ pathname: "/outlet/[id]/location", params: { id: outlet.id } })}
                        />
                        <Action
                          label={c.home.manageMenu}
                          onPress={() => router.push({ pathname: "/menu", params: { outletId: outlet.id, outletName: outlet.name } })}
                        />
                        <Action
                          label={outlet.acceptingOrders ? c.home.pauseOrders : c.home.openOrders}
                          onPress={() => void toggleOrders(outlet)}
                        />
                        <Pressable onPress={() => confirmDelete(outlet)}>
                          <Text className="text-[9px] font-black" style={{ color: theme.colors.danger }}>{c.common.delete}</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
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

  function Action({ label, onPress }: { label: string; onPress: () => void }) {
    return (
      <Pressable onPress={onPress}>
        <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>{label}</Text>
      </Pressable>
    );
  }
}
