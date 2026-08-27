import type { NitipAddress, NitipUserProfile } from "@nitip/domain";
import { useNitipTranslation } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
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
import { NitipIcon } from "../components/NitipIcon";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import {
  deleteAddress,
  getMe,
  listAddresses,
  updateAddress,
  updateMe,
} from "../lib/api";

export default function ProfileScreen() {
  const { t } = useNitipTranslation();
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
    // The authenticated user identity is the only trigger required here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return <Redirect href="/login" />;

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

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 14,
          paddingBottom: 30,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-[26px] font-black tracking-tighter" style={{ color: theme.colors.primaryStrong }}>
            nitip.
          </Text>
          <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.primary }}>
              {initial}
            </Text>
          </View>
        </View>

        <View className="mt-7">
          <Text className="text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
            {t("profile.title")}
          </Text>
          <Text className="mt-1.5 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
            {t("profile.subtitle")}
          </Text>
        </View>

        {loading ? (
          <View className="mt-5 items-center rounded-[24px] p-6" style={{ backgroundColor: theme.colors.surface }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-xs" style={{ color: theme.colors.textMuted }}>
              {t("profile.loading")}
            </Text>
          </View>
        ) : (
          <>
            <View className="mt-5">
              <Text className="mb-2 text-sm font-black" style={{ color: theme.colors.text }}>
                {t("profile.account")}
              </Text>
              <View className="rounded-[24px] p-4" style={{ backgroundColor: theme.colors.surface }}>
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
                    <NitipIcon color={theme.colors.primary} name="profile" size={18} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>
                      {t("common.email")}
                    </Text>
                    <Text className="mt-0.5 text-xs font-black" numberOfLines={1} style={{ color: theme.colors.text }}>
                      {profile?.email ?? user.email ?? "-"}
                    </Text>
                  </View>
                </View>

                <View className="my-4 h-px" style={{ backgroundColor: theme.colors.border }} />

                <Text className="mb-2 text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>
                  {t("profile.displayName")}
                </Text>
                <TextInput
                  className="rounded-2xl px-4 py-3.5 text-sm"
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
                  className="rounded-2xl px-4 py-3.5 text-sm"
                  keyboardType="phone-pad"
                  maxLength={30}
                  onChangeText={setPhoneNumber}
                  placeholder="08xxxxxxxxxx"
                  placeholderTextColor={theme.colors.textMuted}
                  style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
                  value={phoneNumber}
                />

                <Pressable
                  className="mt-4 min-h-12 items-center justify-center rounded-2xl"
                  disabled={saving}
                  onPress={() => void saveProfile()}
                  style={{ backgroundColor: theme.colors.primary, opacity: saving ? 0.6 : 1 }}
                >
                  <Text className="text-xs font-black text-white">
                    {saving ? t("common.saving") : t("profile.saveProfile")}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View className="mt-7 flex-row items-end justify-between">
              <View>
                <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
                  {t("profile.savedAddresses")}
                </Text>
                <Text className="mt-1 text-[10px]" style={{ color: theme.colors.textMuted }}>
                  {t("profile.addressCount", { count: addresses.length })}
                </Text>
              </View>
              <Pressable
                className="h-9 flex-row items-center gap-1.5 rounded-full px-3.5"
                onPress={() => router.push("/address/new")}
                style={{ backgroundColor: theme.colors.surface }}
              >
                <NitipIcon color={theme.colors.primary} name="plus" size={14} />
                <Text className="text-[10px] font-black" style={{ color: theme.colors.primary }}>
                  {t("common.add")}
                </Text>
              </Pressable>
            </View>

            {addresses.length === 0 ? (
              <View className="mt-3 rounded-[24px] p-5" style={{ backgroundColor: theme.colors.surface }}>
                <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
                  {t("profile.noAddressTitle")}
                </Text>
                <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
                  {t("profile.noAddressDescription")}
                </Text>
              </View>
            ) : (
              <View className="mt-3 gap-2.5">
                {addresses.map((address) => (
                  <View className="rounded-[24px] p-4" key={address.id} style={{ backgroundColor: theme.colors.surface }}>
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
                          <NitipIcon
                            color={theme.colors.primary}
                            name={address.label === "home" ? "home" : address.label === "office" ? "office" : "location"}
                            size={16}
                          />
                        </View>
                        <View>
                          <Text className="text-xs font-black" style={{ color: theme.colors.text }}>
                            {addressLabel(address)}
                          </Text>
                          <Text className="mt-0.5 text-[10px]" style={{ color: theme.colors.textMuted }}>
                            {address.recipientName}
                          </Text>
                        </View>
                      </View>
                      {address.isDefault ? (
                        <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1.5" style={{ backgroundColor: theme.colors.successSurface }}>
                          <NitipIcon color={theme.colors.success} name="check" size={12} />
                          <Text className="text-[8px] font-black" style={{ color: theme.colors.success }}>
                            {t("profile.main")}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text className="mt-3 text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>
                      {address.addressLine}
                    </Text>
                    <Text className="mt-1 text-[10px]" style={{ color: theme.colors.textMuted }}>
                      {address.phoneNumber}
                    </Text>
                    {address.notes ? (
                      <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
                        {t("profile.notesPrefix", { notes: address.notes })}
                      </Text>
                    ) : null}

                    <View className="mt-3 flex-row items-center gap-1.5">
                      <NitipIcon color={theme.colors.primary} name="location" size={13} />
                      <Text className="flex-1 text-[9px] font-extrabold" numberOfLines={1} style={{ color: theme.colors.primary }}>
                        {address.latitude != null && address.longitude != null
                          ? `${address.latitude.toFixed(6)}, ${address.longitude.toFixed(6)}`
                          : t("profile.mapMissing")}
                      </Text>
                    </View>

                    <View className="mt-4 flex-row flex-wrap gap-x-4 gap-y-3">
                      <Pressable
                        className="flex-row items-center gap-1.5"
                        onPress={() =>
                          router.push({
                            pathname: "/address/[id]/location",
                            params: { id: address.id },
                          })
                        }
                      >
                        <NitipIcon color={theme.colors.primary} name="location" size={14} />
                        <Text className="text-[10px] font-black" style={{ color: theme.colors.primary }}>
                          {address.latitude != null ? t("profile.changeMap") : t("profile.setMap")}
                        </Text>
                      </Pressable>
                      {!address.isDefault ? (
                        <Pressable className="flex-row items-center gap-1.5" onPress={() => void makeDefault(address)}>
                          <NitipIcon color={theme.colors.primary} name="check" size={14} />
                          <Text className="text-[10px] font-black" style={{ color: theme.colors.primary }}>
                            {t("profile.makeDefault")}
                          </Text>
                        </Pressable>
                      ) : null}
                      <Pressable className="flex-row items-center gap-1.5" onPress={() => confirmDelete(address)}>
                        <NitipIcon color={theme.colors.danger} name="trash" size={14} />
                        <Text className="text-[10px] font-black" style={{ color: theme.colors.danger }}>
                          {t("common.delete")}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View className="mt-7">
              <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
                {t("profile.preferences")}
              </Text>
              <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
                {t("profile.preferencesDescription")}
              </Text>
              <View className="mt-3 rounded-[24px] p-4" style={{ backgroundColor: theme.colors.surface }}>
                <LanguageSwitcher />
                <View className="my-4 h-px" style={{ backgroundColor: theme.colors.border }} />
                <ThemeSwitcher />
                <Text className="mt-2 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                  {t("profile.appearanceDescription")}
                </Text>
              </View>
            </View>

            <View className="mt-7 rounded-[24px] p-4" style={{ backgroundColor: theme.colors.surface }}>
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.dangerSurface }}>
                  <NitipIcon color={theme.colors.danger} name="logout" size={16} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-black" style={{ color: theme.colors.text }}>
                    {t("common.signOut")}
                  </Text>
                  <Text className="mt-0.5 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
                    {t("profile.signOutDescription")}
                  </Text>
                </View>
                <Pressable className="h-9 items-center justify-center rounded-full px-3" onPress={() => void signOut()} style={{ backgroundColor: theme.colors.dangerSurface }}>
                  <Text className="text-[10px] font-black" style={{ color: theme.colors.danger }}>
                    {t("common.signOut")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        {error ? (
          <View className="mt-4 rounded-2xl p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="text-xs leading-5" style={{ color: theme.colors.danger }}>
              {error}
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <BottomNavigation active="profile" />
    </View>
  );
}
