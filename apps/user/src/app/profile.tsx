import type { NitipAddress, NitipUserProfile } from "@nitip/domain";
import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon, type NitipIconName } from "../components/NitipIcon";
import { UserAvatar } from "../components/UserAvatar";
import { SETTINGS_COPY } from "../constants/settingsCopy";
import { useAuth } from "../context/AuthContext";
import { useUserTheme } from "../context/ThemeContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getMe, listAddresses } from "../lib/api";

function ProfileRow({
  danger = false,
  icon,
  onPress,
  subtitle,
  title,
  value,
}: {
  danger?: boolean;
  icon: NitipIconName;
  onPress: () => void;
  subtitle?: string;
  title: string;
  value?: string;
}) {
  const theme = useNitipTheme();
  const foreground = danger ? theme.colors.danger : theme.colors.text;
  const rowBackground = danger
    ? theme.colors.dangerSurface
    : theme.mode === "dark"
      ? theme.colors.surfaceRaised
      : "#FFFFFF";
  const rowBorder = danger
    ? theme.colors.dangerSurface
    : theme.mode === "dark"
      ? theme.colors.border
      : "#E7E9EE";
  const iconBackground = danger
    ? theme.colors.dangerSurface
    : theme.mode === "dark"
      ? theme.colors.surfaceAccent
      : "#EEF1FF";

  return (
    <Pressable
      accessibilityRole="button"
      className="mb-2.5 flex-row items-center rounded-[20px] px-4 py-3.5"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: rowBackground,
        borderColor: rowBorder,
        borderWidth: 1,
        elevation: 2,
        opacity: pressed ? 0.72 : 1,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.mode === "dark" ? 0.16 : 0.06,
        shadowRadius: 8,
      })}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBackground }}
      >
        <NitipIcon color={danger ? theme.colors.danger : theme.colors.primary} name={icon} size={17} />
      </View>

      <View className="min-w-0 flex-1 px-3">
        <Text className="text-[11px] font-black" numberOfLines={1} style={{ color: foreground }}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-[9px] leading-4" numberOfLines={2} style={{ color: theme.colors.textMuted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text className="mr-2 max-w-[92px] text-right text-[9px] font-bold" numberOfLines={1} style={{ color: theme.colors.textMuted }}>
          {value}
        </Text>
      ) : null}
      <NitipIcon color={danger ? theme.colors.danger : theme.colors.textMuted} name="next" size={14} />
    </Pressable>
  );
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return undefined;
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
          if (active) {
            setError(nextError instanceof Error ? nextError.message : t("profile.loadError"));
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [t, user]),
  );

  if (!user) return <Redirect href="/login" />;

  const avatarLabel = profile?.displayName || profile?.email || user.displayName || user.email || "Nitip";
  const displayName = profile?.displayName || user.displayName || t("home.fallbackName");
  const email = profile?.email || user.email || "";
  const profileTitle = language === "en" ? "Profile" : "Profil";
  const editLabel = language === "en" ? "Edit Profile" : "Edit Profil";
  const orderHistory = language === "en" ? "Order History" : "Riwayat Pesanan";
  const orderHistoryDescription = language === "en" ? "Track active and completed orders" : "Lihat pesanan aktif dan yang sudah selesai";
  const addressDescription = language === "en" ? `${addresses.length} saved delivery locations` : `${addresses.length} alamat pengantaran tersimpan`;
  const languageValue = language === "id" ? t("common.indonesia") : t("common.english");
  const appearanceValue = t(`common.${preference}`);
  const pageBackground = theme.mode === "dark" ? theme.colors.background : "#F2F3F5";

  return (
    <View className="flex-1" style={{ backgroundColor: pageBackground }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: insets.top + 10,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={profileTitle} onBack={() => router.replace("/home")} />

        <View className="items-center pb-3 pt-5">
          <View
            className="rounded-full p-1.5"
            style={{
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.border,
              borderWidth: 1,
              elevation: 5,
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: theme.mode === "dark" ? 0.25 : 0.1,
              shadowRadius: 12,
            }}
          >
            <UserAvatar label={avatarLabel} photoUrl={profile?.photoUrl} size={86} />
          </View>
          <Text className="mt-4 text-[19px] font-black tracking-[-0.4px]" style={{ color: theme.colors.text }}>
            {displayName}
          </Text>
          {email ? (
            <Text className="mt-1 text-[10px]" style={{ color: theme.colors.textMuted }}>
              {email}
            </Text>
          ) : null}
          <Pressable
            className="mt-4 min-h-10 items-center justify-center rounded-full px-6"
            onPress={() => router.push("/settings/account")}
            style={({ pressed }) => ({
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.78 : 1,
            })}
          >
            <Text className="text-[10px] font-black text-white">{editLabel}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View className="mt-4 items-center rounded-[22px] p-6" style={{ backgroundColor: theme.colors.surfaceRaised }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>
              {t("profile.loading")}
            </Text>
          </View>
        ) : (
          <>
            <Text className="mb-3 mt-6 text-[12px] font-black" style={{ color: theme.colors.text }}>
              {copy.account}
            </Text>
            <ProfileRow
              icon="orders"
              onPress={() => router.push("/orders")}
              subtitle={orderHistoryDescription}
              title={orderHistory}
            />
            <ProfileRow
              icon="profile"
              onPress={() => router.push("/settings/account")}
              subtitle={copy.accountInformationDescription}
              title={copy.accountInformation}
              value={profile?.displayName ?? undefined}
            />
            <ProfileRow
              icon="location"
              onPress={() => router.push("/settings/addresses")}
              subtitle={addressDescription}
              title={copy.addresses}
            />
            <ProfileRow
              icon="password"
              onPress={() => router.push("/settings/password")}
              subtitle={copy.passwordDescription}
              title={copy.password}
            />

            <Text className="mb-3 mt-6 text-[12px] font-black" style={{ color: theme.colors.text }}>
              {copy.preferences}
            </Text>
            <ProfileRow
              icon="language"
              onPress={() => router.push("/settings/language")}
              subtitle={copy.languageDescription}
              title={copy.language}
              value={languageValue}
            />
            <ProfileRow
              icon="theme"
              onPress={() => router.push("/settings/appearance")}
              subtitle={copy.appearanceDescription}
              title={copy.appearance}
              value={appearanceValue}
            />

            <Text className="mb-3 mt-6 text-[12px] font-black" style={{ color: theme.colors.text }}>
              {copy.helpLegal}
            </Text>
            <ProfileRow
              icon="help"
              onPress={() => router.push("/support")}
              subtitle={copy.helpReportDescription}
              title={copy.helpReport}
            />
            <ProfileRow
              icon="document"
              onPress={() => router.push("/legal/terms")}
              subtitle={copy.termsDescription}
              title={copy.terms}
            />
            <ProfileRow
              icon="privacy"
              onPress={() => router.push("/legal/privacy")}
              subtitle={copy.privacyDescription}
              title={copy.privacy}
            />

            <Text className="mb-3 mt-6 text-[12px] font-black" style={{ color: theme.colors.text }}>
              {copy.session}
            </Text>
            <ProfileRow
              danger
              icon="logout"
              onPress={() => void signOut()}
              subtitle={t("profile.signOutDescription")}
              title={t("common.signOut")}
            />
          </>
        )}

        {error ? (
          <View className="mt-4 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
