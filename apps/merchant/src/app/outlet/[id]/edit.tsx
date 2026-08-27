import {
  WEEKDAYS,
  createDefaultOutletOpeningHours,
  type NitipOutlet,
  type OutletOpeningHour,
  type Weekday,
} from "@nitip/domain";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../../components/AppHeader";
import { NitipIcon } from "../../../components/NitipIcon";
import { getMerchantCopy } from "../../../constants/merchantCopy";
import { useAuth } from "../../../context/AuthContext";
import { useNitipTheme } from "../../../hooks/useNitipTheme";
import { listOutlets, updateOutlet } from "../../../lib/api";

export default function EditOutletScreen() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const copy = language === "id"
    ? {
        header: "Edit outlet",
        eyebrow: "DATA OUTLET",
        title: "Perbarui outlet.",
        subtitle: "Ubah informasi outlet dan atur jam operasional untuk setiap hari.",
        save: "Simpan perubahan",
        saveError: "Gagal memperbarui outlet",
        schedule: "Jam operasional",
        closed: "Tutup",
      }
    : {
        header: "Edit outlet",
        eyebrow: "OUTLET DETAILS",
        title: "Update outlet.",
        subtitle: "Update outlet information and set opening hours for each day.",
        save: "Save changes",
        saveError: "Failed to update outlet",
        schedule: "Opening hours",
        closed: "Closed",
      };
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [outlet, setOutlet] = useState<NitipOutlet | null>(null);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [openingHours, setOpeningHours] = useState<OutletOpeningHour[]>(
    createDefaultOutletOpeningHours(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
          const found = items.find((item) => item.id === id) ?? null;
          setOutlet(found);
          if (!found) return;

          setName(found.name);
          setPhoneNumber(found.phoneNumber);
          setAddressLine(found.addressLine);
          setOpeningHours(
            createDefaultOutletOpeningHours().map((fallback) => {
              const existing = found.openingHours.find((item) => item.day === fallback.day);
              return existing ? { ...existing } : fallback;
            }),
          );
        })
        .catch((nextError: unknown) => {
          if (active) {
            setError(nextError instanceof Error ? nextError.message : c.location.loadError);
          }
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

  function toggleDay(day: Weekday) {
    setOpeningHours((current) =>
      current.map((item) => {
        if (item.day !== day) return item;
        const isOpen = !item.isOpen;
        return {
          ...item,
          isOpen,
          opensAt: isOpen ? item.opensAt ?? "08:00" : null,
          closesAt: isOpen ? item.closesAt ?? "20:00" : null,
        };
      }),
    );
  }

  function updateTime(day: Weekday, key: "opensAt" | "closesAt", value: string) {
    setOpeningHours((current) =>
      current.map((item) => item.day === day ? { ...item, [key]: value } : item),
    );
  }

  async function save() {
    if (!outlet || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateOutlet(user, outlet.id, {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        addressLine: addressLine.trim(),
        openingHours,
      });
      router.back();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: insets.top + 10,
        paddingBottom: Math.max(insets.bottom + 30, 42),
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      <AppHeader title={copy.header} onBack={() => router.back()} />

      {loading ? (
        <View className="mt-6 items-center rounded-[22px] p-7" style={{ backgroundColor: theme.colors.surface }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>
            {c.location.loading}
          </Text>
        </View>
      ) : !outlet ? (
        <View className="mt-6 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-[12px] font-black" style={{ color: theme.colors.danger }}>
            {c.location.notFound}
          </Text>
          <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
            {error ?? c.location.notFoundDescription}
          </Text>
        </View>
      ) : (
        <>
          <View className="mt-7">
            <Text className="text-[9px] font-black tracking-[1.2px]" style={{ color: theme.colors.primary }}>
              {copy.eyebrow}
            </Text>
            <Text className="mt-2 text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
              {copy.title}
            </Text>
            <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
              {copy.subtitle}
            </Text>
          </View>

          <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
            <Field label={c.outlet.name}>
              <TextInput
                className="min-h-[48px] rounded-[16px] px-4 text-[11px]"
                onChangeText={setName}
                placeholder={c.outlet.namePlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
                value={name}
              />
            </Field>
            <Field label={c.outlet.contact}>
              <TextInput
                className="min-h-[48px] rounded-[16px] px-4 text-[11px]"
                keyboardType="phone-pad"
                onChangeText={setPhoneNumber}
                placeholder="08xxxxxxxxxx"
                placeholderTextColor={theme.colors.textMuted}
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
                value={phoneNumber}
              />
            </Field>
            <Field label={c.outlet.address}>
              <TextInput
                className="min-h-[88px] rounded-[16px] px-4 py-3 text-[11px]"
                multiline
                onChangeText={setAddressLine}
                placeholder={c.outlet.addressPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
                textAlignVertical="top"
                value={addressLine}
              />
            </Field>
          </View>

          <Text className="mt-7 text-[15px] font-black" style={{ color: theme.colors.text }}>
            {copy.schedule}
          </Text>
          <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
            {c.outlet.timeHint}
          </Text>

          <View className="mt-3 overflow-hidden rounded-[22px]" style={{ backgroundColor: theme.colors.surface }}>
            {WEEKDAYS.map((day, index) => {
              const schedule = openingHours.find((item) => item.day === day);
              const isOpen = schedule?.isOpen ?? false;
              return (
                <View
                  className={`px-4 py-4 ${index === WEEKDAYS.length - 1 ? "" : "border-b"}`}
                  key={day}
                  style={{ borderBottomColor: theme.colors.border }}
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-row items-center gap-3">
                      <Pressable
                        className="min-w-[52px] items-center rounded-full px-3 py-2.5"
                        onPress={() => toggleDay(day)}
                        style={{ backgroundColor: isOpen ? theme.colors.primary : theme.colors.surfaceRaised }}
                      >
                        <Text className="text-[9px] font-black" style={{ color: isOpen ? theme.colors.onPrimary : theme.colors.textMuted }}>
                          {c.outlet.days[day]}
                        </Text>
                      </Pressable>
                      <Text className="text-[9px] font-extrabold" style={{ color: isOpen ? theme.colors.primary : theme.colors.textMuted }}>
                        {isOpen ? `${schedule?.opensAt ?? "—"} – ${schedule?.closesAt ?? "—"}` : copy.closed}
                      </Text>
                    </View>
                    <NitipIcon color={isOpen ? theme.colors.primary : theme.colors.textMuted} name="clock" size={14} />
                  </View>

                  {isOpen ? (
                    <View className="mt-3 flex-row gap-2">
                      <View className="flex-1">
                        <Text className="mb-2 text-[8px] font-extrabold" style={{ color: theme.colors.textMuted }}>
                          {c.outlet.openAt}
                        </Text>
                        <TextInput
                          className="min-h-[44px] rounded-[14px] px-3 text-[10px]"
                          maxLength={5}
                          onChangeText={(value) => updateTime(day, "opensAt", value)}
                          placeholder="08:00"
                          placeholderTextColor={theme.colors.textMuted}
                          style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
                          value={schedule?.opensAt ?? ""}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="mb-2 text-[8px] font-extrabold" style={{ color: theme.colors.textMuted }}>
                          {c.outlet.closeAt}
                        </Text>
                        <TextInput
                          className="min-h-[44px] rounded-[14px] px-3 text-[10px]"
                          maxLength={5}
                          onChangeText={(value) => updateTime(day, "closesAt", value)}
                          placeholder="20:00"
                          placeholderTextColor={theme.colors.textMuted}
                          style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
                          value={schedule?.closesAt ?? ""}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          {error ? (
            <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}>
              <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            className="mt-5 min-h-[50px] items-center justify-center rounded-[16px]"
            disabled={saving}
            onPress={() => void save()}
            style={{ backgroundColor: theme.colors.primary, opacity: saving ? 0.5 : 1 }}
          >
            <Text className="text-[11px] font-black text-white">
              {saving ? c.common.saving : copy.save}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <View className="mt-3">
        <Text className="mb-2 text-[9px] font-extrabold" style={{ color: theme.colors.textMuted }}>{label}</Text>
        {children}
      </View>
    );
  }
}
