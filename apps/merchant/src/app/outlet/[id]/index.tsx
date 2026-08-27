import { WEEKDAYS, type NitipOutlet } from "@nitip/domain";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../../components/AppHeader";
import { NitipIcon } from "../../../components/NitipIcon";
import { SettingsRow } from "../../../components/SettingsRow";
import { getMerchantCopy } from "../../../constants/merchantCopy";
import { useAuth } from "../../../context/AuthContext";
import { useNitipTheme } from "../../../hooks/useNitipTheme";
import { deleteOutlet, listOutlets, updateOutlet } from "../../../lib/api";

export default function OutletDetailScreen() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const detailCopy = language === "id"
    ? {
        edit: "Edit outlet",
        editDescription: "Ubah nama, kontak, alamat, dan jam operasional.",
      }
    : {
        edit: "Edit outlet",
        editDescription: "Update name, contact, address, and opening hours.",
      };
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [outlet, setOutlet] = useState<NitipOutlet | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user || !id) return undefined;
      let active = true;
      setLoading(true);
      setError(null);

      listOutlets(user)
        .then((items) => {
          if (!active) return;
          setOutlet(items.find((item) => item.id === id) ?? null);
        })
        .catch((nextError: unknown) => {
          if (active) setError(nextError instanceof Error ? nextError.message : c.location.loadError);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [c.location.loadError, id, user]),
  );

  if (!user) return <Redirect href="/login" />;

  async function toggleOrders() {
    if (!outlet) return;
    setWorking(true);
    setError(null);
    try {
      const next = await updateOutlet(user, outlet.id, { acceptingOrders: !outlet.acceptingOrders });
      setOutlet(next);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.home.toggleError);
    } finally {
      setWorking(false);
    }
  }

  function confirmDelete() {
    if (!outlet) return;
    Alert.alert(
      c.home.deleteOutletTitle,
      c.home.deleteOutletDescription.replace("{{name}}", outlet.name),
      [
        { text: c.common.cancel, style: "cancel" },
        {
          text: c.common.delete,
          style: "destructive",
          onPress: () => void (async () => {
            setWorking(true);
            setError(null);
            try {
              await deleteOutlet(user, outlet.id);
              router.replace("/home");
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : c.home.deleteOutletError);
              setWorking(false);
            }
          })(),
        },
      ],
    );
  }

  const locationValue = outlet?.latitude != null && outlet.longitude != null
    ? `${outlet.latitude.toFixed(5)}, ${outlet.longitude.toFixed(5)}`
    : c.home.locationMissing;

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 30, 42) }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      <AppHeader title={outlet?.name ?? c.common.outletFallback} onBack={() => router.back()} />

      {loading ? (
        <View className="mt-6 items-center rounded-[22px] p-7" style={{ backgroundColor: theme.colors.surface }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>{c.location.loading}</Text>
        </View>
      ) : !outlet ? (
        <View className="mt-6 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-[12px] font-black" style={{ color: theme.colors.danger }}>{c.location.notFound}</Text>
          <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{error ?? c.location.notFoundDescription}</Text>
        </View>
      ) : (
        <>
          <View className="mt-6 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
            <View className="flex-row items-start">
              <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
                <NitipIcon color={theme.colors.primary} name="store" size={19} />
              </View>
              <View className="ml-3 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="flex-1 text-[15px] font-black" style={{ color: theme.colors.text }}>{outlet.name}</Text>
                  <View
                    className="rounded-full px-2.5 py-1.5"
                    style={{ backgroundColor: outlet.acceptingOrders ? theme.colors.successSurface : theme.colors.surfaceRaised }}
                  >
                    <Text className="text-[8px] font-black" style={{ color: outlet.acceptingOrders ? theme.colors.success : theme.colors.textMuted }}>
                      {outlet.acceptingOrders ? c.home.open : c.home.closed}
                    </Text>
                  </View>
                </View>
                <Text className="mt-1 text-[9px] font-extrabold" style={{ color: theme.colors.primary }}>
                  {outlet.isActive ? c.home.activeOutlet : c.home.inactiveOutlet}
                </Text>
              </View>
            </View>

            <InfoRow label={c.outlet.contact} value={outlet.phoneNumber || "—"} />
            <InfoRow label={c.outlet.address} value={outlet.addressLine || "—"} />
          </View>

          <View className="mt-4 rounded-[22px] p-4" style={{ backgroundColor: outlet.acceptingOrders ? theme.colors.successSurface : theme.colors.surface }}>
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: outlet.acceptingOrders ? theme.colors.surfaceRaised : theme.colors.surfaceAccent }}>
                <NitipIcon color={outlet.acceptingOrders ? theme.colors.success : theme.colors.primary} name="power" size={18} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[11px] font-black" style={{ color: theme.colors.text }}>{c.home.acceptingOutlets}</Text>
                <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                  {outlet.acceptingOrders ? c.home.open : c.home.closed}
                </Text>
              </View>
            </View>
            <Pressable
              className="mt-4 min-h-[46px] items-center justify-center rounded-[16px]"
              disabled={working}
              onPress={() => void toggleOrders()}
              style={{
                backgroundColor: outlet.acceptingOrders ? theme.colors.surfaceRaised : theme.colors.primary,
                opacity: working ? 0.5 : 1,
              }}
            >
              <Text
                className="text-[10px] font-black"
                style={{ color: outlet.acceptingOrders ? theme.colors.primary : theme.colors.onPrimary }}
              >
                {working ? c.common.processing : outlet.acceptingOrders ? c.home.pauseOrders : c.home.openOrders}
              </Text>
            </Pressable>
          </View>

          <Text className="mt-7 text-[15px] font-black" style={{ color: theme.colors.text }}>{c.outlet.openDays}</Text>
          <View className="mt-3 overflow-hidden rounded-[22px]" style={{ backgroundColor: theme.colors.surface }}>
            {WEEKDAYS.map((day, index) => {
              const schedule = outlet.openingHours.find((item) => item.day === day);
              const scheduleValue = schedule?.isOpen
                ? `${schedule.opensAt ?? "—"} – ${schedule.closesAt ?? "—"}`
                : c.home.closed;
              return (
                <View
                  className={`min-h-[48px] flex-row items-center justify-between px-4 py-3 ${index === WEEKDAYS.length - 1 ? "" : "border-b"}`}
                  key={day}
                  style={{ borderBottomColor: theme.colors.border }}
                >
                  <Text className="text-[10px] font-extrabold" style={{ color: theme.colors.text }}>{c.outlet.days[day]}</Text>
                  <Text className="text-[9px] font-black" style={{ color: schedule?.isOpen ? theme.colors.primary : theme.colors.textMuted }}>
                    {scheduleValue}
                  </Text>
                </View>
              );
            })}
          </View>

          <View className="mt-7 overflow-hidden rounded-[22px]" style={{ backgroundColor: theme.colors.surface }}>
            <SettingsRow
              icon="store"
              title={detailCopy.edit}
              description={detailCopy.editDescription}
              onPress={() => router.push({ pathname: "/outlet/[id]/edit", params: { id: outlet.id } })}
            />
            <SettingsRow
              icon="location"
              title={outlet.latitude != null ? c.home.changeLocation : c.home.setLocation}
              value={locationValue}
              onPress={() => router.push({ pathname: "/outlet/[id]/location", params: { id: outlet.id } })}
            />
            <SettingsRow
              icon="menu"
              title={c.home.manageMenu}
              onPress={() => router.push({ pathname: "/menu", params: { outletId: outlet.id, outletName: outlet.name } })}
            />
            <SettingsRow
              icon="trash"
              title={c.common.delete}
              description={c.home.deleteOutletDescription.replace("{{name}}", outlet.name)}
              danger
              last
              onPress={confirmDelete}
            />
          </View>
        </>
      )}

      {error && outlet ? (
        <View className="mt-4 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );

  function InfoRow({ label, value }: { label: string; value: string }) {
    return (
      <View className="mt-4">
        <Text className="text-[8px] font-extrabold" style={{ color: theme.colors.textMuted }}>{label}</Text>
        <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.text }}>{value}</Text>
      </View>
    );
  }
}
