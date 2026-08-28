import type { NitipDriverProfile } from "@nitip/domain/driver";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { SettingsRow } from "../components/SettingsRow";
import { useAuth } from "../context/AuthContext";
import { useDriverTheme } from "../context/ThemeContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getDriverMe } from "../lib/api";

export default function DriverSettingsScreen() {
  const { language } = useNitipLanguage();
  const { signOut, user } = useAuth();
  const { preference } = useDriverTheme();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<NitipDriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const c = language === "id" ? {
    title: "Pengaturan", heading: "Akun & preferensi.", subtitle: "Kelola profil driver, pendapatan, keselamatan, bahasa, tampilan, lokasi, dan sesi akun.",
    driver: "Profil driver", driverBody: "Informasi identitas dan kendaraan", earnings: "Pendapatan", earningsBody: "Ringkasan fee dan riwayat perjalanan selesai", safety: "Safety Center", safetyBody: "SOS 112, berbagi perjalanan, telepon customer, dan laporan insiden", language: "Bahasa", languageBody: "Pilih bahasa aplikasi", appearance: "Tampilan", appearanceBody: "System, terang, atau gelap", location: "Lokasi driver", locationBody: "Lokasi diperbarui saat online dan dispatch dimuat", account: "Akun", signOut: "Keluar", signOutBody: "Keluar dari akun driver di perangkat ini", system: "System", light: "Terang", dark: "Gelap", notReady: "Belum ada profil",
  } : {
    title: "Settings", heading: "Account & preferences.", subtitle: "Manage driver profile, earnings, safety, language, appearance, location, and account session.",
    driver: "Driver profile", driverBody: "Identity and vehicle information", earnings: "Earnings", earningsBody: "Delivery fee summary and completed trip history", safety: "Safety Center", safetyBody: "SOS 112, trip sharing, customer call, and incident reporting", language: "Language", languageBody: "Choose app language", appearance: "Appearance", appearanceBody: "System, light, or dark", location: "Driver location", locationBody: "Location refreshes while online and when dispatch loads", account: "Account", signOut: "Sign out", signOutBody: "Sign out of this driver account", system: "System", light: "Light", dark: "Dark", notReady: "No profile yet",
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { setProfile(await getDriverMe(user)); } catch { setProfile(null); } finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!user) return <Redirect href="/login" />;

  const appearance = preference === "system" ? c.system : preference === "light" ? c.light : c.dark;
  const languageValue = language === "id" ? "Indonesia" : "English";
  const vehicleValue = profile ? `${profile.vehicleBrandModel} · ${profile.vehiclePlate}` : c.notReady;
  const locationValue = profile?.latitude != null && profile.longitude != null ? `${profile.latitude.toFixed(4)}, ${profile.longitude.toFixed(4)}` : "—";

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
        <AppHeader title={c.title} showBack={false} />
        <View style={styles.hero}><Text style={[styles.heroTitle, { color: theme.colors.text }]}>{c.heading}</Text><Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text></View>
        {loading ? <View style={[styles.loading, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><ActivityIndicator color={theme.colors.primary} /></View> : <>
          <View style={styles.profileHero}><View style={[styles.avatar, { backgroundColor: theme.colors.surfaceAccent }]}><NitipIcon color={theme.colors.primary} name="profile" size={25} /></View><View style={styles.profileCopy}><Text numberOfLines={1} style={[styles.profileName, { color: theme.colors.text }]}>{profile?.fullName ?? user.displayName ?? "Driver"}</Text><Text numberOfLines={1} style={[styles.profileEmail, { color: theme.colors.textMuted }]}>{user.email ?? ""}</Text></View>{profile?.isOnline ? <View style={[styles.online, { backgroundColor: theme.colors.primary }]}><Text style={styles.onlineText}>ONLINE</Text></View> : null}</View>
          <View style={styles.rows}>
            <SettingsRow icon="vehicle" title={c.driver} description={c.driverBody} value={vehicleValue} onPress={() => router.replace("/home")} />
            {profile?.status === "approved" ? <SettingsRow icon="earnings" title={c.earnings} description={c.earningsBody} onPress={() => router.push("/earnings")} /> : null}
            <SettingsRow icon="safety" title={c.safety} description={c.safetyBody} onPress={() => router.push("/safety")} />
            <SettingsRow icon="language" title={c.language} description={c.languageBody} value={languageValue} onPress={() => router.push("/language")} />
            <SettingsRow icon="theme" title={c.appearance} description={c.appearanceBody} value={appearance} onPress={() => router.push("/appearance")} />
            <SettingsRow icon="location" title={c.location} description={c.locationBody} value={locationValue} onPress={() => router.replace("/home")} />
          </View>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{c.account}</Text>
          <View style={styles.rows}><SettingsRow icon="profile" title={user.email ?? "Driver"} description={c.account} showChevron={false} onPress={() => undefined} /><SettingsRow danger icon="logout" title={c.signOut} description={c.signOutBody} onPress={() => void signOut()} /></View>
        </>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 36, paddingHorizontal: 20 }, hero: { marginTop: 24 }, heroTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8 }, heroSubtitle: { fontSize: 10, lineHeight: 17, marginTop: 6, maxWidth: 340 }, loading: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 20, padding: 28 }, profileHero: { alignItems: "center", flexDirection: "row", marginTop: 20, paddingVertical: 5 }, avatar: { alignItems: "center", borderRadius: 25, height: 50, justifyContent: "center", width: 50 }, profileCopy: { flex: 1, minWidth: 0, paddingHorizontal: 12 }, profileName: { fontSize: 13, fontWeight: "900" }, profileEmail: { fontSize: 8, marginTop: 3 }, online: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 }, onlineText: { color: "#FFFFFF", fontSize: 7, fontWeight: "900" }, rows: { gap: 10, marginTop: 18 }, sectionTitle: { fontSize: 12, fontWeight: "900", marginTop: 25 },
});
