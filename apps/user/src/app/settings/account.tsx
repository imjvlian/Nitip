import type { NitipUserProfile } from "@nitip/domain";
import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { SETTINGS_COPY } from "../../constants/settingsCopy";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { getMe, updateMe } from "../../lib/api";

export default function AccountSettingsScreen() {
  const { t } = useNitipTranslation();
  const { language } = useNitipLanguage();
  const copy = SETTINGS_COPY[language];
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<NitipUserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError(null);
    getMe(user)
      .then((nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setDisplayName(nextProfile.displayName ?? "");
        setPhoneNumber(nextProfile.phoneNumber ?? "");
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : t("profile.loadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t, user]);

  if (!user) return <Redirect href="/login" />;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const nextProfile = await updateMe(user, {
        displayName: displayName.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
      });
      setProfile(nextProfile);
      setDisplayName(nextProfile.displayName ?? "");
      setPhoneNumber(nextProfile.phoneNumber ?? "");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: insets.top + 10,
          paddingBottom: Math.max(insets.bottom + 28, 40),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={copy.accountInformation} />

        <View className="mt-7">
          <Text className="text-[26px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
            {copy.accountInformation}
          </Text>
          <Text className="mt-1.5 text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>
            {copy.editAccountDescription}
          </Text>
        </View>

        {loading ? (
          <View className="mt-5 items-center rounded-[22px] p-6" style={{ backgroundColor: theme.colors.surface }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>
              {t("profile.loading")}
            </Text>
          </View>
        ) : (
          <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
            <Text className="mb-2 text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>
              {t("common.email")}
            </Text>
            <View className="rounded-[16px] px-4 py-3.5" style={{ backgroundColor: theme.colors.surfaceRaised }}>
              <Text className="text-xs" style={{ color: theme.colors.textMuted }}>
                {profile?.email ?? user.email ?? "-"}
              </Text>
            </View>

            <Text className="mb-2 mt-4 text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>
              {t("profile.displayName")}
            </Text>
            <TextInput
              className="rounded-[16px] px-4 py-3.5 text-sm"
              maxLength={80}
              onChangeText={setDisplayName}
              placeholder={t("profile.displayNamePlaceholder")}
              placeholderTextColor={theme.colors.textMuted}
              style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              value={displayName}
            />

            <Text className="mb-2 mt-4 text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>
              {t("profile.phone")}
            </Text>
            <TextInput
              className="rounded-[16px] px-4 py-3.5 text-sm"
              keyboardType="phone-pad"
              maxLength={30}
              onChangeText={setPhoneNumber}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor={theme.colors.textMuted}
              style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              value={phoneNumber}
            />

            {error ? (
              <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}>
                <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>
                  {error}
                </Text>
              </View>
            ) : null}

            <Pressable
              className="mt-5 min-h-[50px] items-center justify-center rounded-[16px]"
              disabled={saving}
              onPress={() => void save()}
              style={{ backgroundColor: theme.colors.primary, opacity: saving ? 0.55 : 1 }}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                <Text className="text-xs font-black text-white">{t("profile.saveProfile")}</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
