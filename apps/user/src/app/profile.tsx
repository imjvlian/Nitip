import type { NitipAddress, NitipUserProfile } from "@nitip/domain";
import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { BottomNavigation } from "../components/BottomNavigation";
import { NitipIcon } from "../components/NitipIcon";
import { SettingsDivider, SettingsGroup, SettingsRow } from "../components/SettingsRow";
import { SETTINGS_COPY } from "../constants/settingsCopy";
import { useAuth } from "../context/AuthContext";
import { useUserTheme } from "../context/ThemeContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getMe, listAddresses } from "../lib/api";

export default function ProfileScreen() {
  const { t } = useNitipTranslation();
  const { language } = useNitipLanguage();
  const copy = SETTINGS_COPY[language];
  const { signOut, user } = useAuth();
  const { preference } = useUserTheme();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<NitipUserProfile | null>(null);
  const [addresses, setAddresses] = useState<NitipAddress[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([getMe(user), listAddresses(user)])
      .then(([nextProfile, nextAddresses]) => {
        if (!active) return;
        setProfile(nextProfile);
        setAddresses(nextAddresses);
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

  const initial = (profile?.displayName || profile?.email || user.displayName || user.email || "N")
    .trim()
    .slice(0, 1)
    .toUpperCase();
  const normalizedQuery = query.trim().toLowerCase();
  const languageValue = language === "id" ? t("common.indonesia") : t("common.english");
  const appearanceValue = t(`common.${preference}`);
  const ageStatus = profile?.ageVerificationStatus ?? "unverified";
  const ageValue =
    ageStatus === "verified_adult"
      ? copy.ageStatusVerified
      : ageStatus === "underage"
        ? copy.ageStatusUnderage
        : copy.ageStatusUnverified;

  const visible = useMemo(() => {
    const matches = (...parts: string[]) =>
      !normalizedQuery || parts.join(" ").toLowerCase().includes(normalizedQuery);

    return {
      account: matches(copy.accountInformation, copy.accountInformationDescription, copy.account),
      addresses: matches(copy.addresses, copy.addressesDescription(addresses.length), copy.account),
      age: matches(copy.ageVerification, copy.ageVerificationDescription, copy.account),
      password: matches(copy.password, copy.passwordDescription, copy.account),
      language: matches(copy.language, copy.languageDescription, copy.preferences),
      appearance: matches(copy.appearance, copy.appearanceDescription, copy.preferences),
      help: matches(copy.helpReport, copy.helpReportDescription, copy.helpLegal),
      terms: matches(copy.terms, copy.termsDescription, copy.helpLegal),
      privacy: matches(copy.privacy, copy.privacyDescription, copy.helpLegal),
      signOut: matches(t("common.signOut"), t("profile.signOutDescription"), copy.session),
    };
  }, [addresses.length, copy, normalizedQuery, t]);

  const hasResults = Object.values(visible).some(Boolean);
  const hasAccount = visible.account || visible.addresses || visible.age || visible.password;
  const hasPreferences = visible.language || visible.appearance;
  const hasHelpLegal = visible.help || visible.terms || visible.privacy;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: insets.top + 10,
          paddingBottom: 30,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title={copy.settings}
          onBack={() => router.replace("/home")}
          right={
            <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surface }}>
              <Text className="text-xs font-black" style={{ color: theme.colors.primary }}>
                {initial}
              </Text>
            </View>
          }
        />

        <View
          className="mt-5 min-h-[44px] flex-row items-center rounded-[18px] px-4"
          style={{
            backgroundColor: theme.colors.surface,
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: theme.mode === "dark" ? 0.18 : 0.05,
            shadowRadius: 7,
            elevation: 2,
          }}
        >
          <NitipIcon color={theme.colors.textMuted} name="search" size={15} />
          <TextInput
            className="ml-3 flex-1 py-3 text-[11px]"
            onChangeText={setQuery}
            placeholder={copy.search}
            placeholderTextColor={theme.colors.textMuted}
            style={{ color: theme.colors.text }}
            value={query}
          />
        </View>

        {loading ? (
          <View className="mt-6 items-center rounded-[20px] p-6" style={{ backgroundColor: theme.colors.surface }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>
              {t("profile.loading")}
            </Text>
          </View>
        ) : (
          <>
            {hasAccount ? (
              <View className="mt-7">
                <Text className="text-base font-black" style={{ color: theme.colors.text }}>
                  {copy.account}
                </Text>
                <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
                  {copy.accountDescription}
                </Text>
                <View className="mt-3">
                  <SettingsGroup>
                    {visible.account ? (
                      <SettingsRow
                        icon="profile"
                        title={copy.accountInformation}
                        subtitle={copy.accountInformationDescription}
                        value={profile?.displayName ?? undefined}
                        onPress={() => router.push("/settings/account")}
                      />
                    ) : null}
                    {visible.account && (visible.addresses || visible.age || visible.password) ? <SettingsDivider /> : null}
                    {visible.addresses ? (
                      <SettingsRow
                        icon="location"
                        title={copy.addresses}
                        subtitle={copy.addressesDescription(addresses.length)}
                        onPress={() => router.push("/settings/addresses")}
                      />
                    ) : null}
                    {visible.addresses && (visible.age || visible.password) ? <SettingsDivider /> : null}
                    {visible.age ? (
                      <SettingsRow
                        icon="age"
                        title={copy.ageVerification}
                        subtitle={copy.ageVerificationDescription}
                        value={ageValue}
                        onPress={() => router.push("/settings/age")}
                      />
                    ) : null}
                    {visible.age && visible.password ? <SettingsDivider /> : null}
                    {visible.password ? (
                      <SettingsRow
                        icon="password"
                        title={copy.password}
                        subtitle={copy.passwordDescription}
                        onPress={() => router.push("/settings/password")}
                      />
                    ) : null}
                  </SettingsGroup>
                </View>
              </View>
            ) : null}

            {hasPreferences ? (
              <View className="mt-7">
                <Text className="text-base font-black" style={{ color: theme.colors.text }}>
                  {copy.preferences}
                </Text>
                <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
                  {copy.preferencesDescription}
                </Text>
                <View className="mt-3">
                  <SettingsGroup>
                    {visible.language ? (
                      <SettingsRow
                        icon="language"
                        title={copy.language}
                        subtitle={copy.languageDescription}
                        value={languageValue}
                        onPress={() => router.push("/settings/language")}
                      />
                    ) : null}
                    {visible.language && visible.appearance ? <SettingsDivider /> : null}
                    {visible.appearance ? (
                      <SettingsRow
                        icon="theme"
                        title={copy.appearance}
                        subtitle={copy.appearanceDescription}
                        value={appearanceValue}
                        onPress={() => router.push("/settings/appearance")}
                      />
                    ) : null}
                  </SettingsGroup>
                </View>
              </View>
            ) : null}

            {hasHelpLegal ? (
              <View className="mt-7">
                <Text className="text-base font-black" style={{ color: theme.colors.text }}>
                  {copy.helpLegal}
                </Text>
                <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
                  {copy.helpLegalDescription}
                </Text>
                <View className="mt-3">
                  <SettingsGroup>
                    {visible.help ? (
                      <SettingsRow
                        icon="help"
                        title={copy.helpReport}
                        subtitle={copy.helpReportDescription}
                        onPress={() => router.push("/support")}
                      />
                    ) : null}
                    {visible.help && (visible.terms || visible.privacy) ? <SettingsDivider /> : null}
                    {visible.terms ? (
                      <SettingsRow
                        icon="document"
                        title={copy.terms}
                        subtitle={copy.termsDescription}
                        onPress={() => router.push("/legal/terms")}
                      />
                    ) : null}
                    {visible.terms && visible.privacy ? <SettingsDivider /> : null}
                    {visible.privacy ? (
                      <SettingsRow
                        icon="privacy"
                        title={copy.privacy}
                        subtitle={copy.privacyDescription}
                        onPress={() => router.push("/legal/privacy")}
                      />
                    ) : null}
                  </SettingsGroup>
                </View>
              </View>
            ) : null}

            {visible.signOut ? (
              <View className="mt-7">
                <Text className="text-base font-black" style={{ color: theme.colors.text }}>
                  {copy.session}
                </Text>
                <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
                  {copy.sessionDescription}
                </Text>
                <View className="mt-3">
                  <SettingsGroup>
                    <SettingsRow
                      danger
                      icon="logout"
                      title={t("common.signOut")}
                      subtitle={t("profile.signOutDescription")}
                      onPress={() => void signOut()}
                    />
                  </SettingsGroup>
                </View>
              </View>
            ) : null}

            {!hasResults ? (
              <View className="mt-7 items-center rounded-[20px] p-7" style={{ backgroundColor: theme.colors.surface }}>
                <NitipIcon color={theme.colors.textMuted} name="search" size={22} />
                <Text className="mt-3 text-xs font-black" style={{ color: theme.colors.text }}>
                  {copy.noResults}
                </Text>
              </View>
            ) : null}
          </>
        )}

        {error ? (
          <View className="mt-5 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <BottomNavigation active="profile" />
    </View>
  );
}
