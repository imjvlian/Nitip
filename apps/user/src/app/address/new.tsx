import type { AddressLabel } from "@nitip/domain";
import { useNitipTranslation } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NitipIcon, type NitipIconName } from "../../components/NitipIcon";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { createAddress } from "../../lib/api";

const labels: { value: AddressLabel; icon: NitipIconName }[] = [
  { value: "home", icon: "home" },
  { value: "office", icon: "office" },
  { value: "other", icon: "location" },
];

export default function NewAddressScreen() {
  const { t } = useNitipTranslation();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState<AddressLabel>("home");
  const [customLabel, setCustomLabel] = useState("");
  const [recipientName, setRecipientName] = useState(user?.displayName ?? "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [notes, setNotes] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return <Redirect href="/login" />;

  function labelText(value: AddressLabel) {
    if (value === "home") return t("address.home");
    if (value === "office") return t("address.office");
    return t("address.other");
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await createAddress(user, {
        label,
        customLabel: label === "other" ? customLabel.trim() || null : null,
        recipientName: recipientName.trim(),
        phoneNumber: phoneNumber.trim(),
        addressLine: addressLine.trim(),
        notes: notes.trim() || null,
        latitude: null,
        longitude: null,
        isDefault,
      });
      router.replace("/profile");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("address.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    color: theme.colors.text,
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: insets.top + 14,
        paddingBottom: Math.max(insets.bottom + 24, 40),
        backgroundColor: theme.colors.background,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center justify-between">
        <Pressable className="min-h-10 flex-row items-center justify-center pr-4" onPress={() => router.back()}>
          <NitipIcon color={theme.colors.primary} name="back" size={18} />
          <Text className="ml-1 text-xs font-black" style={{ color: theme.colors.primary }}>
            {t("common.back")}
          </Text>
        </Pressable>
        <Text className="text-2xl font-black tracking-tighter" style={{ color: theme.colors.primaryStrong }}>
          nitip.
        </Text>
      </View>

      <View className="mt-8">
        <Text className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: theme.colors.primary }}>
          {t("address.eyebrow")}
        </Text>
        <Text className="mt-2 text-3xl font-black tracking-tighter" style={{ color: theme.colors.text }}>
          {t("address.title")}
        </Text>
        <Text className="mt-2 text-sm leading-6" style={{ color: theme.colors.textMuted }}>
          {t("address.subtitle")}
        </Text>
      </View>

      <View
        className="mt-6 rounded-3xl border p-5"
        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
      >
        <Text className="mb-2 text-xs font-extrabold" style={{ color: theme.colors.textMuted }}>
          {t("address.label")}
        </Text>
        <View className="flex-row gap-2">
          {labels.map((item) => {
            const selected = label === item.value;
            const color = selected ? "#FFFFFF" : theme.colors.text;
            return (
              <Pressable
                className="flex-1 items-center rounded-2xl border px-2 py-3"
                key={item.value}
                onPress={() => setLabel(item.value)}
                style={{
                  backgroundColor: selected ? theme.colors.primary : "transparent",
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                }}
              >
                <NitipIcon color={color} name={item.icon} size={18} />
                <Text
                  className="mt-1.5 text-center text-xs font-black"
                  style={{ color }}
                >
                  {labelText(item.value)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {label === "other" ? (
          <View className="mt-5">
            <Text className="mb-2 text-xs font-extrabold" style={{ color: theme.colors.textMuted }}>
              {t("address.customLabel")}
            </Text>
            <TextInput
              className="rounded-2xl border px-4 py-3.5 text-sm"
              maxLength={30}
              onChangeText={setCustomLabel}
              placeholder={t("address.customLabelPlaceholder")}
              placeholderTextColor={theme.colors.textMuted}
              style={inputStyle}
              value={customLabel}
            />
          </View>
        ) : null}

        <View className="mt-5">
          <Text className="mb-2 text-xs font-extrabold" style={{ color: theme.colors.textMuted }}>
            {t("address.recipient")}
          </Text>
          <TextInput
            className="rounded-2xl border px-4 py-3.5 text-sm"
            maxLength={80}
            onChangeText={setRecipientName}
            placeholder={t("address.recipientPlaceholder")}
            placeholderTextColor={theme.colors.textMuted}
            style={inputStyle}
            value={recipientName}
          />
        </View>

        <View className="mt-5">
          <Text className="mb-2 text-xs font-extrabold" style={{ color: theme.colors.textMuted }}>
            {t("address.recipientPhone")}
          </Text>
          <TextInput
            className="rounded-2xl border px-4 py-3.5 text-sm"
            keyboardType="phone-pad"
            maxLength={30}
            onChangeText={setPhoneNumber}
            placeholder="08xxxxxxxxxx"
            placeholderTextColor={theme.colors.textMuted}
            style={inputStyle}
            value={phoneNumber}
          />
        </View>

        <View className="mt-5">
          <Text className="mb-2 text-xs font-extrabold" style={{ color: theme.colors.textMuted }}>
            {t("address.fullAddress")}
          </Text>
          <TextInput
            className="min-h-28 rounded-2xl border px-4 py-3.5 text-sm"
            maxLength={300}
            multiline
            onChangeText={setAddressLine}
            placeholder={t("address.fullAddressPlaceholder")}
            placeholderTextColor={theme.colors.textMuted}
            style={inputStyle}
            textAlignVertical="top"
            value={addressLine}
          />
        </View>

        <View className="mt-5">
          <Text className="mb-2 text-xs font-extrabold" style={{ color: theme.colors.textMuted }}>
            {t("address.addressNotes")}
          </Text>
          <TextInput
            className="min-h-20 rounded-2xl border px-4 py-3.5 text-sm"
            maxLength={300}
            multiline
            onChangeText={setNotes}
            placeholder={t("address.addressNotesPlaceholder")}
            placeholderTextColor={theme.colors.textMuted}
            style={inputStyle}
            textAlignVertical="top"
            value={notes}
          />
        </View>

        <Pressable className="mt-6 flex-row items-center" onPress={() => setIsDefault((value) => !value)}>
          <View
            className="h-6 w-6 items-center justify-center rounded-lg border"
            style={{
              backgroundColor: isDefault ? theme.colors.primary : "transparent",
              borderColor: isDefault ? theme.colors.primary : theme.colors.border,
            }}
          >
            {isDefault ? <NitipIcon color="#FFFFFF" name="check" size={15} /> : null}
          </View>
          <View className="flex-1 pl-3">
            <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
              {t("address.makeDefault")}
            </Text>
            <Text className="mt-0.5 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
              {t("address.makeDefaultDescription")}
            </Text>
          </View>
        </Pressable>

        {error ? (
          <View className="mt-5 rounded-2xl p-3" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="text-xs leading-5" style={{ color: theme.colors.danger }}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          className="mt-6 min-h-[52px] items-center justify-center rounded-2xl"
          disabled={saving}
          onPress={() => void save()}
          style={{ backgroundColor: theme.colors.primary, opacity: saving ? 0.55 : 1 }}
        >
          <Text className="text-sm font-black text-white">
            {saving ? t("common.saving") : t("address.saveAddress")}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
