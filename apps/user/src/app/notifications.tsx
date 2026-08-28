import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={copy.title} onBack={() => router.back()} />

        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          <View style={[styles.iconBadge, { backgroundColor: theme.colors.surfaceAccent }]}>
            <NitipIcon color={theme.colors.primary} name="notification" size={25} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>{copy.emptyTitle}</Text>
          <Text style={[styles.body, { color: theme.colors.textMuted }]}>{copy.emptyBody}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 30, paddingHorizontal: 20 },
  emptyCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 36,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
  },
  iconBadge: { alignItems: "center", borderRadius: 29, height: 58, justifyContent: "center", width: 58 },
  title: { fontSize: 16, fontWeight: "900", marginTop: 16, textAlign: "center" },
  body: { fontSize: 10, lineHeight: 17, marginTop: 8, maxWidth: 280, textAlign: "center" },
});
