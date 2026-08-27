import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";

export default function DriverSettingsScreen() {
  const { language } = useNitipLanguage();
  const { signOut, user } = useAuth();
  const insets = useSafeAreaInsets();
  const copy = language === "id"
    ? {
        eyebrow: "PENGATURAN",
        title: "Akun & preferensi.",
        subtitle: "Kelola bahasa aplikasi dan sesi akun driver.",
        account: "Akun",
        language: "Bahasa",
        languageDescription: "Pilih bahasa aplikasi Nitip Driver.",
        logout: "Keluar",
        logoutDescription: "Keluar dari akun driver di perangkat ini.",
      }
    : {
        eyebrow: "SETTINGS",
        title: "Account & preferences.",
        subtitle: "Manage the app language and your driver session.",
        account: "Account",
        language: "Language",
        languageDescription: "Choose the Nitip Driver app language.",
        logout: "Sign out",
        logoutDescription: "Sign out of the driver account on this device.",
      };

  if (!user) return <Redirect href="/login" />;

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: "#F7FFF9",
        paddingHorizontal: 20,
        paddingTop: insets.top + 24,
        paddingBottom: 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-[10px] font-black tracking-[1.2px] text-primary">{copy.eyebrow}</Text>
      <Text className="mt-2 text-[30px] font-black tracking-[-1px] text-foreground">{copy.title}</Text>
      <Text className="mt-1 text-[11px] leading-5 text-muted">{copy.subtitle}</Text>

      <Text className="mb-2 mt-7 text-sm font-black text-foreground">{copy.account}</Text>
      <View className="rounded-[20px] border border-border bg-surface px-4 py-4">
        <Text className="text-[9px] font-black tracking-[0.8px] text-primary">EMAIL</Text>
        <Text className="mt-1 text-sm font-black text-foreground">{user.email ?? "Driver"}</Text>
      </View>

      <Pressable
        className="mt-3 flex-row items-center justify-between rounded-[20px] border border-border bg-surface px-4 py-4"
        onPress={() => router.push("/language")}
      >
        <View className="flex-1 pr-4">
          <Text className="text-sm font-black text-foreground">{copy.language}</Text>
          <Text className="mt-1 text-[10px] leading-4 text-muted">{copy.languageDescription}</Text>
        </View>
        <Text className="text-base font-black text-primary">›</Text>
      </Pressable>

      <Pressable
        className="mt-3 flex-row items-center justify-between rounded-[20px] border border-border bg-surface px-4 py-4"
        onPress={() => void signOut()}
      >
        <View className="flex-1 pr-4">
          <Text className="text-sm font-black text-[#B42318]">{copy.logout}</Text>
          <Text className="mt-1 text-[10px] leading-4 text-muted">{copy.logoutDescription}</Text>
        </View>
        <Text className="text-base font-black text-[#B42318]">›</Text>
      </Pressable>
    </ScrollView>
  );
}
