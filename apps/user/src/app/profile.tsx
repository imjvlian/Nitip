import type { NitipAddress, NitipUserProfile } from "@nitip/domain";
import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon, type NitipIconName } from "../components/NitipIcon";
import { UserAvatar } from "../components/UserAvatar";
import { SETTINGS_COPY } from "../constants/settingsCopy";
import { useAuth } from "../context/AuthContext";
import { useUserTheme } from "../context/ThemeContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getMe, listAddresses } from "../lib/api";

type ProfileMenuCardProps = {
  danger?: boolean;
  icon: NitipIconName;
  onPress: () => void;
  title: string;
  value?: string;
};

function ProfileMenuCard({
  danger = false,
  icon,
  onPress,
  title,
  value,
}: ProfileMenuCardProps) {
  const theme = useNitipTheme();
  const isDark = theme.mode === "dark";
  const cardBackground = danger
    ? theme.colors.dangerSurface
    : isDark
      ? theme.colors.surfaceRaised
      : "#FFFFFF";
  const badgeBackground = danger
    ? theme.colors.dangerSurface
    : isDark
      ? theme.colors.surfaceAccent
      : "#EEF1FF";
  const titleColor = danger ? theme.colors.danger : theme.colors.text;
  const iconColor = danger ? theme.colors.danger : theme.colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.menuCard,
        {
          backgroundColor: cardBackground,
          borderColor: danger
            ? theme.colors.dangerSurface
            : isDark
              ? theme.colors.border
              : "#E8E9ED",
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <View style={[styles.iconBadge, { backgroundColor: badgeBackground }]}>
        <NitipIcon color={iconColor} name={icon} size={18} />
      </View>

      <View style={styles.menuCopy}>
        <Text numberOfLines={1} style={[styles.menuTitle, { color: titleColor }]}>
          {title}
        </Text>
      </View>

      {value ? (
        <Text numberOfLines={1} style={[styles.menuValue, { color: theme.colors.textMuted }]}>
          {value}
        </Text>
      ) : null}

      <View style={styles.chevronWrap}>
        <NitipIcon
          color={danger ? theme.colors.danger : theme.colors.textMuted}
          name="next"
          size={14}
        />
      </View>
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
          if (!active) return;
          setError(nextError instanceof Error ? nextError.message : t("profile.loadError"));
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

  const isDark = theme.mode === "dark";
  const pageBackground = isDark ? theme.colors.background : "#F2F3F5";
  const headerSurface = isDark ? theme.colors.surfaceRaised : "#FFFFFF";
  const avatarLabel =
    profile?.displayName || profile?.email || user.displayName || user.email || "Nitip";
  const displayName = profile?.displayName || user.displayName || t("home.fallbackName");
  const email = profile?.email || user.email || "";
  const profileTitle = language === "en" ? "Profile" : "Profil";
  const editLabel = language === "en" ? "Edit Profile" : "Edit Profil";
  const orderHistory = language === "en" ? "Order History" : "Riwayat Pesanan";
  const addressValue = language === "en" ? `${addresses.length} saved` : `${addresses.length} tersimpan`;
  const languageValue = language === "id" ? t("common.indonesia") : t("common.english");
  const appearanceValue = t(`common.${preference}`);

  return (
    <View style={[styles.screen, { backgroundColor: pageBackground }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 10,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={profileTitle} showBack={false} />

        <View style={styles.profileHero}>
          <View
            style={[
              styles.avatarFrame,
              {
                backgroundColor: headerSurface,
                borderColor: isDark ? theme.colors.border : "#FFFFFF",
                shadowColor: theme.colors.shadow,
              },
            ]}
          >
            <UserAvatar label={avatarLabel} photoUrl={profile?.photoUrl} size={88} />
          </View>

          <Text style={[styles.name, { color: theme.colors.text }]}>{displayName}</Text>
          {email ? <Text style={[styles.email, { color: theme.colors.textMuted }]}>{email}</Text> : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/settings/account")}
            style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.editButtonText}>{editLabel}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={[styles.loadingCard, { backgroundColor: headerSurface }]}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
              {t("profile.loading")}
            </Text>
          </View>
        ) : (
          <View style={styles.menuList}>
            <ProfileMenuCard icon="orders" onPress={() => router.push("/orders")} title={orderHistory} />
            <ProfileMenuCard
              icon="profile"
              onPress={() => router.push("/settings/account")}
              title={copy.accountInformation}
              value={profile?.displayName ?? undefined}
            />
            <ProfileMenuCard
              icon="location"
              onPress={() => router.push("/settings/addresses")}
              title={copy.addresses}
              value={addressValue}
            />
            <ProfileMenuCard icon="password" onPress={() => router.push("/settings/password")} title={copy.password} />
            <ProfileMenuCard
              icon="language"
              onPress={() => router.push("/settings/language")}
              title={copy.language}
              value={languageValue}
            />
            <ProfileMenuCard
              icon="theme"
              onPress={() => router.push("/settings/appearance")}
              title={copy.appearance}
              value={appearanceValue}
            />
            <ProfileMenuCard icon="help" onPress={() => router.push("/support")} title={copy.helpReport} />
            <ProfileMenuCard icon="document" onPress={() => router.push("/legal/terms")} title={copy.terms} />
            <ProfileMenuCard icon="privacy" onPress={() => router.push("/legal/privacy")} title={copy.privacy} />
            <ProfileMenuCard danger icon="logout" onPress={() => void signOut()} title={t("common.signOut")} />
          </View>
        )}

        {error ? (
          <View style={[styles.errorCard, { backgroundColor: theme.colors.dangerSurface }]}>
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 112, paddingHorizontal: 20 },
  profileHero: { alignItems: "center", paddingBottom: 18, paddingTop: 18 },
  avatarFrame: {
    borderRadius: 52,
    borderWidth: 4,
    elevation: 5,
    padding: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  name: { fontSize: 21, fontWeight: "900", letterSpacing: -0.4, marginTop: 14 },
  email: { fontSize: 10, fontWeight: "500", marginTop: 3 },
  editButton: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    marginTop: 15,
    minHeight: 40,
    paddingHorizontal: 28,
  },
  editButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  loadingCard: { alignItems: "center", borderRadius: 18, marginTop: 10, padding: 24 },
  loadingText: { fontSize: 10, marginTop: 10 },
  menuList: { gap: 10, marginTop: 8 },
  menuCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    flexDirection: "row",
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 7,
    width: "100%",
  },
  iconBadge: { alignItems: "center", borderRadius: 21, height: 42, justifyContent: "center", width: 42 },
  menuCopy: { flex: 1, minWidth: 0, paddingHorizontal: 12 },
  menuTitle: { fontSize: 11, fontWeight: "800" },
  menuValue: { fontSize: 9, fontWeight: "700", marginRight: 8, maxWidth: 88 },
  chevronWrap: { alignItems: "center", justifyContent: "center", width: 18 },
  errorCard: { borderRadius: 16, marginTop: 12, padding: 14 },
  errorText: { fontSize: 10, lineHeight: 15 },
});
