import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { SettingsRow } from "../components/SettingsRow";
import { getMerchantCopy } from "../constants/merchantCopy";
import { useAuth } from "../context/AuthContext";
import { useMerchantTheme } from "../context/ThemeContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

export default function SettingsScreen() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { signOut, user } = useAuth();
  const { preference } = useMerchantTheme();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  if (!user) return <Redirect href="/login" />;

  const themeLabel = c.settings[preference];
  const languageLabel = language === "id" ? c.settings.indonesia : c.settings.english;
  const labels = language === "id"
    ? {
        subtitle: "Kelola bisnis, laporan, preferensi, dan akun mitra dari satu tempat.",
        business: "Bisnis & operasional",
        insights: "Laporan & aktivitas",
        preferences: "Preferensi",
        account: "Akun",
        menu: "Kelola menu",
        menuDescription: "Produk, kategori, stok, dan ketersediaan",
        earnings: "Pendapatan",
        earningsDescription: "Ringkasan penjualan bersih dari order selesai",
        analytics: "Analitik",
        analyticsDescription: "Tren order, outlet, dan produk terlaris",
        notifications: "Notifikasi",
        notificationsDescription: "Status order dan aktivitas akun",
      }
    : {
        subtitle: "Manage operations, reports, preferences, and your merchant account in one place.",
        business: "Business & operations",
        insights: "Reports & activity",
        preferences: "Preferences",
        account: "Account",
        menu: "Manage menu",
        menuDescription: "Products, categories, stock, and availability",
        earnings: "Earnings",
        earningsDescription: "Net sales summary from completed orders",
        analytics: "Analytics",
        analyticsDescription: "Order trends, outlets, and best-selling products",
        notifications: "Notifications",
        notificationsDescription: "Order status and account activity",
      };

  const normalized = query.trim().toLowerCase();
  const matches = (values: string[]) => !normalized || values.join(" ").toLowerCase().includes(normalized);

  const sections = useMemo(() => [
    {
      key: "business",
      title: labels.business,
      rows: [
        {
          icon: "store" as const,
          title: c.home.businessProfile,
          description: c.home.subtitle,
          onPress: () => router.push("/settings/business"),
        },
        {
          icon: "menu" as const,
          title: labels.menu,
          description: labels.menuDescription,
          onPress: () => router.push("/menu"),
        },
      ],
    },
    {
      key: "insights",
      title: labels.insights,
      rows: [
        {
          icon: "earnings" as const,
          title: labels.earnings,
          description: labels.earningsDescription,
          onPress: () => router.push("/earnings"),
        },
        {
          icon: "analytics" as const,
          title: labels.analytics,
          description: labels.analyticsDescription,
          onPress: () => router.push("/analytics"),
        },
        {
          icon: "notification" as const,
          title: labels.notifications,
          description: labels.notificationsDescription,
          onPress: () => router.push("/notifications"),
        },
      ],
    },
    {
      key: "preferences",
      title: labels.preferences,
      rows: [
        {
          icon: "language" as const,
          title: c.settings.language,
          description: c.settings.languageDescription,
          value: languageLabel,
          onPress: () => router.push("/settings/language"),
        },
        {
          icon: "theme" as const,
          title: c.settings.appearance,
          description: c.settings.appearanceDescription,
          value: themeLabel,
          onPress: () => router.push("/settings/appearance"),
        },
      ],
    },
  ], [c, labels, languageLabel, themeLabel]);

  const visibleSections = sections
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => matches([row.title, row.description ?? "", row.value ?? ""])),
    }))
    .filter((section) => section.rows.length > 0);
  const accountVisible = matches([c.settings.accountInfo, c.settings.accountInfoDescription, user.email ?? "", c.settings.signOut]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={c.settings.title} showBack={false} />

        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{c.settings.title}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{labels.subtitle}</Text>
        </View>

        <View style={[styles.search, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
          <NitipIcon color={theme.colors.textMuted} name="settings" size={16} />
          <TextInput
            onChangeText={setQuery}
            placeholder={c.settings.searchPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={query}
          />
        </View>

        {visibleSections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{section.title}</Text>
            <View style={styles.rows}>
              {section.rows.map((row) => (
                <SettingsRow
                  description={row.description}
                  icon={row.icon}
                  key={row.title}
                  onPress={row.onPress}
                  title={row.title}
                  value={row.value}
                />
              ))}
            </View>
          </View>
        ))}

        {accountVisible ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{labels.account}</Text>
            <View style={styles.rows}>
              <SettingsRow
                description={c.settings.accountInfoDescription}
                icon="profile"
                onPress={() => undefined}
                showChevron={false}
                title={c.settings.accountInfo}
                value={user.email ?? "—"}
              />
              <SettingsRow
                danger
                description={c.settings.signOutDescription}
                icon="logout"
                onPress={() => void signOut()}
                title={c.settings.signOut}
              />
            </View>
          </View>
        ) : null}

        {visibleSections.length === 0 && !accountVisible ? (
          <View style={[styles.empty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <NitipIcon color={theme.colors.textMuted} name="settings" size={22} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{c.settings.noResult}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 34, paddingHorizontal: 20 },
  hero: { marginTop: 24 },
  heroTitle: { fontSize: 27, fontWeight: "900", letterSpacing: -0.7 },
  heroSubtitle: { fontSize: 10, lineHeight: 17, marginTop: 6, maxWidth: 330 },
  search: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 11, marginLeft: 10, minHeight: 46 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 12, fontWeight: "900", marginBottom: 10 },
  rows: { gap: 10 },
  empty: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 26, padding: 28 },
  emptyTitle: { fontSize: 11, fontWeight: "900", marginTop: 10 },
});
