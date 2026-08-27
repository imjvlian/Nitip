import type { NitipAddress, NitipUserProfile } from "@nitip/domain";
import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNavigation } from "../components/BottomNavigation";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { NitipIcon, type NitipIconName } from "../components/NitipIcon";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { useAuth } from "../context/AuthContext";
import { useUserTheme } from "../context/ThemeContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import {
  deleteAddress,
  getMe,
  listAddresses,
  updateAddress,
  updateMe,
} from "../lib/api";

type ExpandedSetting = "account" | "addresses" | "language" | "appearance" | null;

const SETTINGS_COPY = {
  id: {
    title: "Pengaturan",
    search: "Cari pengaturan",
    accountDescription: "Perbarui informasi akun dan alamat pengantaran.",
    accountInformation: "Informasi akun",
    accountInformationDescription: "Nama, email, dan nomor HP",
    addressesDescription: "{{count}} alamat tersimpan",
    preferencesDescription: "Sesuaikan bahasa dan tampilan aplikasi.",
    languageDescription: "Bahasa yang digunakan di aplikasi",
    appearanceDescription: "Sistem, terang, atau gelap",
    session: "Akun",
    sessionDescription: "Kelola sesi akun Nitip di perangkat ini.",
    noResults: "Pengaturan tidak ditemukan",
  },
  en: {
    title: "Settings",
    search: "Search settings",
    accountDescription: "Update your account details and delivery addresses.",
    accountInformation: "Account information",
    accountInformationDescription: "Name, email, and phone number",
    addressesDescription: "{{count}} saved addresses",
    preferencesDescription: "Customize app language and appearance.",
    languageDescription: "Language used throughout the app",
    appearanceDescription: "System, light, or dark",
    session: "Account",
    sessionDescription: "Manage your Nitip session on this device.",
    noResults: "No settings found",
  },
} as const;

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{{${key}}}`, String(value)),
    template,
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  value,
  expanded,
  onPress,
  textColor,
  mutedColor,
  iconColor,
  iconBackground,
}: {
  icon: NitipIconName;
  title: string;
  subtitle: string;
  value?: string;
  expanded?: boolean;
  onPress: () => void;
  textColor: string;
  mutedColor: string;
  iconColor: string;
  iconBackground: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-[64px] flex-row items-center px-4 py-3"
      onPress={onPress}
    >
      <View
        className="h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBackground }}
      >
        <NitipIcon color={iconColor} name={icon} size={15} />
      </View>
      <View className="ml-3 flex-1 pr-3">
        <Text className="text-[12px] font-black" style={{ color: textColor }}>
          {title}
        </Text>
        <Text className="mt-0.5 text-[9px] leading-4" numberOfLines={1} style={{ color: mutedColor }}>
          {subtitle}
        </Text>
      </View>
      {value ? (
        <Text className="mr-2 max-w-[96px] text-right text-[9px] font-extrabold" numberOfLines={1} style={{ color: mutedColor }}>
          {value}
        </Text>
      ) : null}
      <View style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}>
        <NitipIcon color={mutedColor} name="next" size={15} />
      </View>
    </Pressable>
  );
}

function SettingsGroup({ children, backgroundColor }: { children: ReactNode; backgroundColor: string }) {
  return (
    <View className="overflow-hidden rounded-[20px]" style={{ backgroundColor }}>
      {children}
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View className="ml-[60px] h-px" style={{ backgroundColor: color }} />;
}

export default function ProfileScreen() {
  const { t } = useNitipTranslation();
  const { language } = useNitipLanguage();
  const { preference } = useUserTheme();
  const copy = SETTINGS_COPY[language];
  const { signOut, user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<NitipUserProfile | null>(null);
  const [addresses, setAddresses] = useState<NitipAddress[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<ExpandedSetting>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [nextProfile, nextAddresses] = await Promise.all([
        getMe(user),
        listAddresses(user),
      ]);
      setProfile(nextProfile);
      setDisplayName(nextProfile.displayName ?? "");
      setPhoneNumber(nextProfile.phoneNumber ?? "");
      setAddresses(nextAddresses);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("profile.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return <Redirect href="/login" />;

  function toggle(setting: Exclude<ExpandedSetting, null>) {
    setExpanded((current) => (current === setting ? null : setting));
  }

  function addressLabel(address: NitipAddress) {
    if (address.label === "home") return t("address.home");
    if (address.label === "office") return t("address.office");
    return address.customLabel || t("address.other");
  }

  async function saveProfile() {
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

  async function makeDefault(address: NitipAddress) {
    setError(null);
    try {
      await updateAddress(user, address.id, { isDefault: true });
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("profile.defaultError"));
    }
  }

  function confirmDelete(address: NitipAddress) {
    Alert.alert(
      t("profile.deleteAddressTitle"),
      t("profile.deleteAddressDescription", { label: addressLabel(address) }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteAddress(user, address.id);
                await load();
              } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : t("profile.deleteError"));
              }
            })();
          },
        },
      ],
    );
  }

  const initial = (displayName || profile?.email || user.email || "N").trim().slice(0, 1).toUpperCase();
  const normalizedQuery = query.trim().toLowerCase();
  const languageValue = language === "id" ? t("common.indonesia") : t("common.english");
  const appearanceValue = t(`common.${preference}`);

  const visibility = useMemo(() => {
    function matches(...parts: string[]) {
      if (!normalizedQuery) return true;
      return parts.join(" ").toLowerCase().includes(normalizedQuery);
    }

    return {
      account: matches(copy.accountInformation, copy.accountInformationDescription, t("profile.account")),
      addresses: matches(
        t("profile.savedAddresses"),
        interpolate(copy.addressesDescription, { count: addresses.length }),
        t("profile.account"),
      ),
      language: matches(t("common.language"), copy.languageDescription, t("profile.preferences")),
      appearance: matches(t("common.appearance"), copy.appearanceDescription, t("profile.preferences")),
      signOut: matches(t("common.signOut"), t("profile.signOutDescription"), copy.session),
    };
  }, [addresses.length, copy, normalizedQuery, t]);

  const hasResults = Object.values(visibility).some(Boolean);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: insets.top + 10,
          paddingBottom: 28,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center">
          <Pressable
            accessibilityRole="button"
            className="h-9 w-9 items-center justify-center rounded-full"
            onPress={() => router.replace("/home")}
            style={{ backgroundColor: theme.colors.surface }}
          >
            <NitipIcon color={theme.colors.text} name="back" size={16} />
          </Pressable>
          <Text className="flex-1 text-center text-sm font-black" style={{ color: theme.colors.text }}>
            {copy.title}
          </Text>
          <View
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <Text className="text-xs font-black" style={{ color: theme.colors.primary }}>
              {initial}
            </Text>
          </View>
        </View>

        <View
          className="mt-5 min-h-[44px] flex-row items-center rounded-[18px] px-4"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <NitipIcon color={theme.colors.textMuted} name="search" size={15} />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            className="ml-2.5 flex-1 py-3 text-[11px]"
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
        ) : !hasResults ? (
          <View className="mt-6 items-center rounded-[20px] p-6" style={{ backgroundColor: theme.colors.surface }}>
            <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
              <NitipIcon color={theme.colors.textMuted} name="search" size={18} />
            </View>
            <Text className="mt-3 text-xs font-black" style={{ color: theme.colors.text }}>
              {copy.noResults}
            </Text>
          </View>
        ) : (
          <>
            {visibility.account || visibility.addresses ? (
              <View className="mt-7">
                <Text className="text-base font-black" style={{ color: theme.colors.text }}>
                  {t("profile.account")}
                </Text>
                <Text className="mt-0.5 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                  {copy.accountDescription}
                </Text>

                <View className="mt-3">
                  <SettingsGroup backgroundColor={theme.colors.surface}>
                    {visibility.account ? (
                      <>
                        <SettingRow
                          expanded={expanded === "account"}
                          icon="profile"
                          iconBackground={theme.colors.surfaceRaised}
                          iconColor={theme.colors.text}
                          mutedColor={theme.colors.textMuted}
                          onPress={() => toggle("account")}
                          subtitle={copy.accountInformationDescription}
                          textColor={theme.colors.text}
                          title={copy.accountInformation}
                        />
                        {expanded === "account" ? (
                          <View className="border-t px-4 pb-4 pt-4" style={{ borderTopColor: theme.colors.border }}>
                            <Text className="mb-1.5 text-[9px] font-extrabold" style={{ color: theme.colors.textMuted }}>
                              {t("common.email")}
                            </Text>
                            <View className="rounded-[14px] px-3.5 py-3" style={{ backgroundColor: theme.colors.surfaceRaised }}>
                              <Text className="text-[11px]" numberOfLines={1} style={{ color: theme.colors.textMuted }}>
                                {profile?.email ?? user.email ?? "-"}
                              </Text>
                            </View>

                            <Text className="mb-1.5 mt-3 text-[9px] font-extrabold" style={{ color: theme.colors.textMuted }}>
                              {t("profile.displayName")}
                            </Text>
                            <TextInput
                              className="rounded-[14px] px-3.5 py-3 text-[11px]"
                              maxLength={80}
                              onChangeText={setDisplayName}
                              placeholder={t("profile.displayNamePlaceholder")}
                              placeholderTextColor={theme.colors.textMuted}
                              style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
                              value={displayName}
                            />

                            <Text className="mb-1.5 mt-3 text-[9px] font-extrabold" style={{ color: theme.colors.textMuted }}>
                              {t("profile.phone")}
                            </Text>
                            <TextInput
                              className="rounded-[14px] px-3.5 py-3 text-[11px]"
                              keyboardType="phone-pad"
                              maxLength={30}
                              onChangeText={setPhoneNumber}
                              placeholder="08xxxxxxxxxx"
                              placeholderTextColor={theme.colors.textMuted}
                              style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
                              value={phoneNumber}
                            />

                            <Pressable
                              className="mt-4 min-h-[44px] items-center justify-center rounded-[14px]"
                              disabled={saving}
                              onPress={() => void saveProfile()}
                              style={{ backgroundColor: theme.colors.primary, opacity: saving ? 0.6 : 1 }}
                            >
                              <Text className="text-[10px] font-black text-white">
                                {saving ? t("common.saving") : t("profile.saveProfile")}
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </>
                    ) : null}

                    {visibility.account && visibility.addresses ? <Divider color={theme.colors.border} /> : null}

                    {visibility.addresses ? (
                      <>
                        <SettingRow
                          expanded={expanded === "addresses"}
                          icon="location"
                          iconBackground={theme.colors.surfaceRaised}
                          iconColor={theme.colors.text}
                          mutedColor={theme.colors.textMuted}
                          onPress={() => toggle("addresses")}
                          subtitle={interpolate(copy.addressesDescription, { count: addresses.length })}
                          textColor={theme.colors.text}
                          title={t("profile.savedAddresses")}
                        />
                        {expanded === "addresses" ? (
                          <View className="border-t px-4 pb-4 pt-4" style={{ borderTopColor: theme.colors.border }}>
                            <Pressable
                              className="mb-3 min-h-[42px] flex-row items-center justify-center gap-2 rounded-[14px]"
                              onPress={() => router.push("/address/new")}
                              style={{ backgroundColor: theme.colors.primary }}
                            >
                              <NitipIcon color="#FFFFFF" name="plus" size={14} />
                              <Text className="text-[10px] font-black text-white">{t("profile.addAddress")}</Text>
                            </Pressable>

                            {addresses.length === 0 ? (
                              <View className="rounded-[14px] p-4" style={{ backgroundColor: theme.colors.surfaceRaised }}>
                                <Text className="text-[11px] font-black" style={{ color: theme.colors.text }}>
                                  {t("profile.noAddressTitle")}
                                </Text>
                                <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                                  {t("profile.noAddressDescription")}
                                </Text>
                              </View>
                            ) : (
                              <View className="gap-2.5">
                                {addresses.map((address) => (
                                  <View className="rounded-[16px] p-3.5" key={address.id} style={{ backgroundColor: theme.colors.surfaceRaised }}>
                                    <View className="flex-row items-start">
                                      <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surface }}>
                                        <NitipIcon
                                          color={theme.colors.primary}
                                          name={address.label === "home" ? "home" : address.label === "office" ? "office" : "location"}
                                          size={14}
                                        />
                                      </View>
                                      <View className="ml-2.5 flex-1">
                                        <View className="flex-row items-center gap-2">
                                          <Text className="flex-1 text-[11px] font-black" style={{ color: theme.colors.text }}>
                                            {addressLabel(address)}
                                          </Text>
                                          {address.isDefault ? (
                                            <Text className="text-[8px] font-black" style={{ color: theme.colors.success }}>
                                              {t("profile.main")}
                                            </Text>
                                          ) : null}
                                        </View>
                                        <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                                          {address.addressLine}
                                        </Text>
                                        <Text className="mt-0.5 text-[9px]" style={{ color: theme.colors.textMuted }}>
                                          {address.recipientName} · {address.phoneNumber}
                                        </Text>
                                      </View>
                                    </View>

                                    <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-2.5 pl-[42px]">
                                      <Pressable
                                        className="flex-row items-center gap-1"
                                        onPress={() =>
                                          router.push({
                                            pathname: "/address/[id]/location",
                                            params: { id: address.id },
                                          })
                                        }
                                      >
                                        <NitipIcon color={theme.colors.primary} name="location" size={12} />
                                        <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>
                                          {address.latitude != null ? t("profile.changeMap") : t("profile.setMap")}
                                        </Text>
                                      </Pressable>
                                      {!address.isDefault ? (
                                        <Pressable className="flex-row items-center gap-1" onPress={() => void makeDefault(address)}>
                                          <NitipIcon color={theme.colors.primary} name="check" size={12} />
                                          <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>
                                            {t("profile.makeDefault")}
                                          </Text>
                                        </Pressable>
                                      ) : null}
                                      <Pressable className="flex-row items-center gap-1" onPress={() => confirmDelete(address)}>
                                        <NitipIcon color={theme.colors.danger} name="trash" size={12} />
                                        <Text className="text-[9px] font-black" style={{ color: theme.colors.danger }}>
                                          {t("common.delete")}
                                        </Text>
                                      </Pressable>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        ) : null}
                      </>
                    ) : null}
                  </SettingsGroup>
                </View>
              </View>
            ) : null}

            {visibility.language || visibility.appearance ? (
              <View className="mt-7">
                <Text className="text-base font-black" style={{ color: theme.colors.text }}>
                  {t("profile.preferences")}
                </Text>
                <Text className="mt-0.5 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                  {copy.preferencesDescription}
                </Text>

                <View className="mt-3">
                  <SettingsGroup backgroundColor={theme.colors.surface}>
                    {visibility.language ? (
                      <>
                        <SettingRow
                          expanded={expanded === "language"}
                          icon="language"
                          iconBackground={theme.colors.surfaceRaised}
                          iconColor={theme.colors.text}
                          mutedColor={theme.colors.textMuted}
                          onPress={() => toggle("language")}
                          subtitle={copy.languageDescription}
                          textColor={theme.colors.text}
                          title={t("common.language")}
                          value={languageValue}
                        />
                        {expanded === "language" ? (
                          <View className="border-t px-4 pb-4 pt-4" style={{ borderTopColor: theme.colors.border }}>
                            <LanguageSwitcher compact />
                          </View>
                        ) : null}
                      </>
                    ) : null}

                    {visibility.language && visibility.appearance ? <Divider color={theme.colors.border} /> : null}

                    {visibility.appearance ? (
                      <>
                        <SettingRow
                          expanded={expanded === "appearance"}
                          icon="theme"
                          iconBackground={theme.colors.surfaceRaised}
                          iconColor={theme.colors.text}
                          mutedColor={theme.colors.textMuted}
                          onPress={() => toggle("appearance")}
                          subtitle={copy.appearanceDescription}
                          textColor={theme.colors.text}
                          title={t("common.appearance")}
                          value={appearanceValue}
                        />
                        {expanded === "appearance" ? (
                          <View className="border-t px-4 pb-4 pt-4" style={{ borderTopColor: theme.colors.border }}>
                            <ThemeSwitcher />
                          </View>
                        ) : null}
                      </>
                    ) : null}
                  </SettingsGroup>
                </View>
              </View>
            ) : null}

            {visibility.signOut ? (
              <View className="mt-7">
                <Text className="text-base font-black" style={{ color: theme.colors.text }}>
                  {copy.session}
                </Text>
                <Text className="mt-0.5 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                  {copy.sessionDescription}
                </Text>
                <Pressable
                  className="mt-3 min-h-[64px] flex-row items-center rounded-[20px] px-4"
                  onPress={() => void signOut()}
                  style={{ backgroundColor: theme.colors.surface }}
                >
                  <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.dangerSurface }}>
                    <NitipIcon color={theme.colors.danger} name="logout" size={15} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[12px] font-black" style={{ color: theme.colors.danger }}>
                      {t("common.signOut")}
                    </Text>
                    <Text className="mt-0.5 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                      {t("profile.signOutDescription")}
                    </Text>
                  </View>
                  <NitipIcon color={theme.colors.textMuted} name="next" size={15} />
                </Pressable>
              </View>
            ) : null}
          </>
        )}

        {error ? (
          <View className="mt-5 rounded-[16px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="text-[10px] leading-5" style={{ color: theme.colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <BottomNavigation active="profile" />
    </View>
  );
}
