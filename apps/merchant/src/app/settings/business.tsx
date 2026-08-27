import type { NitipMerchantProfile } from "@nitip/domain";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { getMerchantCopy, merchantStatusLabel } from "../../constants/merchantCopy";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { createMerchant, getMerchantMe, submitMerchant, updateMerchant } from "../../lib/api";

export default function BusinessSettingsScreen() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [merchant, setMerchant] = useState<NitipMerchantProfile | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState(user?.displayName ?? "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const next = await getMerchantMe(user);
      setMerchant(next);
      if (next) {
        setBusinessName(next.businessName);
        setContactName(next.contactName);
        setPhoneNumber(next.phoneNumber);
        setDescription(next.description ?? "");
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.home.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [user, language]);

  if (!user) return <Redirect href="/login" />;

  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      const input = {
        businessName: businessName.trim(),
        contactName: contactName.trim(),
        phoneNumber: phoneNumber.trim(),
        description: description.trim() || null,
      };
      const next = merchant ? await updateMerchant(user, input) : await createMerchant(user, input);
      setMerchant(next);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.home.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function submitProfile() {
    setSaving(true);
    setError(null);
    try {
      setMerchant(await submitMerchant(user));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.home.submitError);
    } finally {
      setSaving(false);
    }
  }

  const editable = !merchant || merchant.status === "draft" || merchant.status === "rejected";
  const statusDescription = merchant?.status === "approved"
    ? c.home.approved
    : merchant?.status === "pending_review"
      ? c.home.pending
      : merchant?.status === "rejected"
        ? c.home.rejected
        : c.home.draft;

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 30, 42) }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      <AppHeader title={c.home.businessProfile} onBack={() => router.back()} />

      {loading ? (
        <View className="mt-6 items-center rounded-[22px] p-7" style={{ backgroundColor: theme.colors.surface }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>{c.home.loading}</Text>
        </View>
      ) : (
        <>
          {merchant ? (
            <View
              className="mt-6 rounded-[22px] p-4"
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

          <View className="mt-6 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
            <Field label={c.home.businessName}>
              <TextInput
                editable={editable}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder={c.home.businessPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                className="min-h-[48px] rounded-[16px] px-4 text-[11px]"
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text, opacity: editable ? 1 : 0.65 }}
              />
            </Field>

            <Field label={c.home.contactName}>
              <TextInput
                editable={editable}
                value={contactName}
                onChangeText={setContactName}
                placeholder={c.home.contactPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                className="min-h-[48px] rounded-[16px] px-4 text-[11px]"
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text, opacity: editable ? 1 : 0.65 }}
              />
            </Field>

            <Field label={c.home.phone}>
              <TextInput
                editable={editable}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholder="08xxxxxxxxxx"
                placeholderTextColor={theme.colors.textMuted}
                className="min-h-[48px] rounded-[16px] px-4 text-[11px]"
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text, opacity: editable ? 1 : 0.65 }}
              />
            </Field>

            <Field label={c.home.description}>
              <TextInput
                editable={editable}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                placeholder={c.home.descriptionPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                className="min-h-[86px] rounded-[16px] px-4 py-3 text-[11px]"
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text, opacity: editable ? 1 : 0.65 }}
              />
            </Field>

            {editable ? (
              <Pressable
                className="mt-5 min-h-[48px] items-center justify-center rounded-[16px]"
                disabled={saving}
                onPress={() => void saveProfile()}
                style={{ backgroundColor: theme.colors.primary, opacity: saving ? 0.5 : 1 }}
              >
                <Text className="text-[11px] font-black text-white">
                  {saving ? c.common.saving : merchant ? c.home.saveChanges : c.home.createProfile}
                </Text>
              </Pressable>
            ) : null}

            {merchant && (merchant.status === "draft" || merchant.status === "rejected") ? (
              <Pressable
                className="mt-2 min-h-[46px] items-center justify-center rounded-[16px]"
                disabled={saving}
                onPress={() => void submitProfile()}
                style={{ backgroundColor: theme.colors.surfaceAccent, opacity: saving ? 0.5 : 1 }}
              >
                <Text className="text-[11px] font-black" style={{ color: theme.colors.primary }}>{c.home.submitReview}</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}

      {error ? (
        <View className="mt-4 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );

  function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
      <View className="mt-3">
        <Text className="mb-2 text-[9px] font-extrabold" style={{ color: theme.colors.textMuted }}>{label}</Text>
        {children}
      </View>
    );
  }
}
