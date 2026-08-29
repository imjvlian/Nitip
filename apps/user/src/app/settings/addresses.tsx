import type { NitipAddress } from "@nitip/domain";
import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { NitipIcon } from "../../components/NitipIcon";
import { SETTINGS_COPY } from "../../constants/settingsCopy";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { deleteAddress, listAddresses, updateAddress } from "../../lib/api";

export default function AddressSettingsScreen() {
  const { t } = useNitipTranslation();
  const { language } = useNitipLanguage();
  const copy = SETTINGS_COPY[language];
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState<NitipAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setAddresses(await listAddresses(user));
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

  function addressLabel(address: NitipAddress) {
    if (address.label === "home") return t("address.home");
    if (address.label === "office") return t("address.office");
    return address.customLabel || t("address.other");
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

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 18,
        paddingTop: insets.top + 10,
        paddingBottom: Math.max(insets.bottom + 28, 40),
        backgroundColor: theme.colors.background,
      }}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader
        title={copy.addresses}
        right={
          <Pressable
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center rounded-full"
            onPress={() => router.push("/address/new")}
            style={{ backgroundColor: theme.colors.primary }}
          >
            <NitipIcon color="#FFFFFF" name="plus" size={17} />
          </Pressable>
        }
      />

      {loading ? (
        <View className="mt-5 items-center rounded-[22px] p-6" style={{ backgroundColor: theme.colors.surface }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>{t("common.loading")}</Text>
        </View>
      ) : addresses.length === 0 ? (
        <View className="mt-5 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.surface }}>
          <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
            <NitipIcon color={theme.colors.primary} name="location" size={18} />
          </View>
          <Text className="mt-4 text-sm font-black" style={{ color: theme.colors.text }}>{t("profile.noAddressTitle")}</Text>
          <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{t("profile.noAddressDescription")}</Text>
          <Pressable
            className="mt-5 min-h-[48px] flex-row items-center justify-center gap-2 rounded-[16px]"
            onPress={() => router.push("/address/new")}
            style={{ backgroundColor: theme.colors.primary }}
          >
            <NitipIcon color="#FFFFFF" name="plus" size={16} />
            <Text className="text-xs font-black text-white">{t("profile.addAddress")}</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-5 gap-3">
          {addresses.map((address) => (
            <View className="rounded-[22px] p-4" key={address.id} style={{ backgroundColor: theme.colors.surface }}>
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1 flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
                    <NitipIcon
                      color={theme.colors.primary}
                      name={address.label === "home" ? "home" : address.label === "office" ? "office" : "location"}
                      size={16}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-black" style={{ color: theme.colors.text }}>{addressLabel(address)}</Text>
                    <Text className="mt-0.5 text-[9px]" style={{ color: theme.colors.textMuted }}>{address.recipientName} · {address.phoneNumber}</Text>
                  </View>
                </View>
                {address.isDefault ? (
                  <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1.5" style={{ backgroundColor: theme.colors.successSurface }}>
                    <NitipIcon color={theme.colors.success} name="check" size={11} />
                    <Text className="text-[8px] font-black" style={{ color: theme.colors.success }}>{t("profile.main")}</Text>
                  </View>
                ) : null}
              </View>

              <Text className="mt-3 text-[10px] leading-5" style={{ color: theme.colors.textMuted }}>{address.addressLine}</Text>
              {address.notes ? <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{t("profile.notesPrefix", { notes: address.notes })}</Text> : null}

              <View className="mt-4 flex-row flex-wrap gap-x-4 gap-y-3">
                <Pressable className="flex-row items-center gap-1.5" onPress={() => router.push({ pathname: "/address/[id]/location", params: { id: address.id } })}>
                  <NitipIcon color={theme.colors.primary} name="location" size={14} />
                  <Text className="text-[10px] font-black" style={{ color: theme.colors.primary }}>{address.latitude != null ? t("profile.changeMap") : t("profile.setMap")}</Text>
                </Pressable>
                {!address.isDefault ? (
                  <Pressable className="flex-row items-center gap-1.5" onPress={() => void makeDefault(address)}>
                    <NitipIcon color={theme.colors.primary} name="check" size={14} />
                    <Text className="text-[10px] font-black" style={{ color: theme.colors.primary }}>{t("profile.makeDefault")}</Text>
                  </Pressable>
                ) : null}
                <Pressable className="flex-row items-center gap-1.5" onPress={() => confirmDelete(address)}>
                  <NitipIcon color={theme.colors.danger} name="trash" size={14} />
                  <Text className="text-[10px] font-black" style={{ color: theme.colors.danger }}>{t("common.delete")}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {error ? (
        <View className="mt-5 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
