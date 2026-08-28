import { WEEKDAYS, type OutletOpeningHour, type Weekday } from "@nitip/domain";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import LocationPicker from "../../components/LocationPicker";
import { NitipIcon } from "../../components/NitipIcon";
import { getMerchantCopy } from "../../constants/merchantCopy";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { createOutlet } from "../../lib/api";

export default function NewOutletScreen() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [openDays, setOpenDays] = useState<Weekday[]>([...WEEKDAYS]);
  const [opensAt, setOpensAt] = useState("08:00");
  const [closesAt, setClosesAt] = useState("20:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return <Redirect href="/login" />;

  function toggleDay(day: Weekday) {
    setOpenDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const openingHours: OutletOpeningHour[] = WEEKDAYS.map((day) => {
      const isOpen = openDays.includes(day);
      return { day, isOpen, opensAt: isOpen ? opensAt : null, closesAt: isOpen ? closesAt : null };
    });
    try {
      await createOutlet(user, {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        addressLine: addressLine.trim(),
        latitude,
        longitude,
        isActive: true,
        acceptingOrders: false,
        openingHours,
      });
      router.replace("/home");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.outlet.saveError);
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
      <AppHeader title={c.home.addOutlet} onBack={() => router.back()} />
      <View className="mt-7">
        <Text className="text-[9px] font-black tracking-[1.2px]" style={{ color: theme.colors.primary }}>{c.outlet.eyebrow}</Text>
        <Text className="mt-2 text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>{c.outlet.title}</Text>
        <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{c.outlet.subtitle}</Text>
      </View>

      <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
        <Field label={c.outlet.name}>
          <TextInput value={name} onChangeText={setName} placeholder={c.outlet.namePlaceholder} placeholderTextColor={theme.colors.textMuted} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} />
        </Field>
        <Field label={c.outlet.contact}>
          <TextInput value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholder="08xxxxxxxxxx" placeholderTextColor={theme.colors.textMuted} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} />
        </Field>
        <Field label={c.outlet.address}>
          <TextInput value={addressLine} onChangeText={setAddressLine} multiline textAlignVertical="top" placeholder={c.outlet.addressPlaceholder} placeholderTextColor={theme.colors.textMuted} className="min-h-[88px] rounded-[16px] px-4 py-3 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} />
        </Field>

        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          onChange={(nextLatitude, nextLongitude) => {
            setLatitude(nextLatitude);
            setLongitude(nextLongitude);
          }}
          onPlaceSelected={(place) => {
            if (!addressLine.trim()) {
              setAddressLine(place.address === place.name ? place.name : `${place.name}, ${place.address}`);
            }
          }}
        />

        <Text className="mb-3 mt-5 text-[11px] font-black" style={{ color: theme.colors.text }}>{c.outlet.openDays}</Text>
        <View className="flex-row flex-wrap gap-2">
          {WEEKDAYS.map((day) => {
            const active = openDays.includes(day);
            return (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                className="min-w-[42px] items-center rounded-full px-3 py-2.5"
                style={{ backgroundColor: active ? theme.colors.primary : theme.colors.surfaceRaised }}
              >
                <Text className="text-[9px] font-black" style={{ color: active ? theme.colors.onPrimary : theme.colors.textMuted }}>{c.outlet.days[day]}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-2 flex-row gap-2">
          <View className="flex-1">
            <Field label={c.outlet.openAt}>
              <TextInput value={opensAt} onChangeText={setOpensAt} placeholder="08:00" placeholderTextColor={theme.colors.textMuted} maxLength={5} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} />
            </Field>
          </View>
          <View className="flex-1">
            <Field label={c.outlet.closeAt}>
              <TextInput value={closesAt} onChangeText={setClosesAt} placeholder="20:00" placeholderTextColor={theme.colors.textMuted} maxLength={5} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} />
            </Field>
          </View>
        </View>
        <View className="mt-3 flex-row items-start gap-2">
          <NitipIcon color={theme.colors.textMuted} name="clock" size={14} />
          <Text className="flex-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{c.outlet.timeHint}</Text>
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
          <Text className="text-[11px] font-black text-white">{saving ? c.common.saving : c.outlet.save}</Text>
        </Pressable>
      </View>
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
