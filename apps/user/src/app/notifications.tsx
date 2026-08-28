import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

const COPY = {
  id: {
    title: "Notifikasi",
    emptyTitle: "Belum ada notifikasi",
    emptyBody: "Update pesanan dan informasi penting dari Nitip akan muncul di sini.",
  },
  en: {
    title: "Notifications",
    emptyTitle: "No notifications yet",
    emptyBody: "Order updates and important information from Nitip will appear here.",
  },
} as const;

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { language } = useNitipLanguage();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const copy = COPY[language];

  if (!user) return <Redirect href="/login" />;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 18,
          paddingTop: insets.top + 10,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={copy.title} onBack={() => router.back()} />

        <View className="flex-1 items-center justify-center px-6 pb-16 pt-10">
          <View
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.colors.surfaceAccent }}
          >
            <NitipIcon color={theme.colors.primary} name="notification" size={27} />
          </View>
          <Text
            className="mt-5 text-center text-[17px] font-black"
            style={{ color: theme.colors.text }}
          >
            {copy.emptyTitle}
          </Text>
          <Text
            className="mt-2 max-w-[280px] text-center text-[11px] leading-5"
            style={{ color: theme.colors.textMuted }}
          >
            {copy.emptyBody}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
