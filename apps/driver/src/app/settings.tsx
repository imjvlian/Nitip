import type { NitipDriverProfile } from "@nitip/domain/driver";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { SettingsRow } from "../components/SettingsRow";
import { useAuth } from "../context/AuthContext";
import { useDriverTheme } from "../context/ThemeContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getDriverMe } from "../lib/api";

function statusMeta(status: NitipDriverProfile["status"] | undefined, language: "id" | "en") {
  const id = {
    draft: ["DRAFT", "Lengkapi profil lalu kirim untuk verifikasi."],
    pending_review: ["DALAM REVIEW", "Tim Nitip sedang memeriksa data driver."],
    approved: ["AKUN AKTIF", "Profil terverifikasi dan siap menerima order."],
    rejected: ["PERLU DIPERBAIKI", "Perbarui data sesuai catatan lalu kirim ulang."],
  } as const;
  const en = {
    draft: ["DRAFT", "Complete your profile and submit it for verification."],
    pending_review: ["UNDER REVIEW", "Nitip is reviewing your driver details."],
    approved: ["ACTIVE ACCOUNT", "Your profile is verified and ready for orders."],
    rejected: ["ACTION REQUIRED", "Update the requested details and submit again."],
  } as const;
  return (language === "id" ? id : en)[status ?? "draft"];
}

export default function DriverSettingsScreen() {
  const { language } = useNitipLanguage();
  const { signOut, user } = useAuth();
  const { preference } = useDriverTheme();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<NitipDriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const c = language === "id" ? {
    title: "Profil",
    heading: "Driver Center.",
    subtitle: "Kelola identitas, kendaraan, lokasi, penghasilan, keselamatan, bantuan, dan preferensi aplikasi.",
    profileSection: "PROFIL & VERIFIKASI",
    personal: "Profil & identitas",
    personalBody: "Foto profil, nama, nomor HP, dan status verifikasi",
    vehicle: "Kendaraan",
    vehicleBody: "Jenis kendaraan, model, dan nomor polisi",
    location: "Lokasi & GPS",
    locationBody: "Izin lokasi, akurasi, dan pembaruan posisi terakhir",
    workSection: "AKTIVITAS & PENGHASILAN",
    earnings: "Pendapatan",
    earningsBody: "Ringkasan fee dan penghasilan perjalanan",
    history: "Riwayat perjalanan",
    historyBody: "Lihat pengantaran yang telah selesai",
    safetySection: "KESELAMATAN & BANTUAN",
    safety: "Safety Center",
    safetyBody: "SOS, berbagi perjalanan, telepon customer, dan laporan insiden",
    support: "Pusat bantuan",
    supportBody: "Buat laporan dan pantau status tiket bantuan",
    appSection: "APLIKASI",
    language: "Bahasa",
    languageBody: "Pilih bahasa aplikasi",
    appearance: "Tampilan",
    appearanceBody: "System, terang, atau gelap",
    accountSection: "AKUN",
    account: "Akun login",
    signOut: "Keluar",
    signOutBody: "Keluar dari akun driver di perangkat ini",
    system: "System",
    light: "Terang",
    dark: "Gelap",
    notReady: "Belum diatur",
    online: "ONLINE",
    offline: "OFFLINE",
    driverId: "DRIVER ID",
    complete: "Kelengkapan profil",
  } : {
    title: "Profile",
    heading: "Driver Center.",
    subtitle: "Manage identity, vehicle, location, earnings, safety, support, and app preferences.",
    profileSection: "PROFILE & VERIFICATION",
    personal: "Profile & identity",
    personalBody: "Profile photo, name, phone number, and verification status",
    vehicle: "Vehicle",
    vehicleBody: "Vehicle type, model, and license plate",
    location: "Location & GPS",
    locationBody: "Location permission, accuracy, and latest position update",
    workSection: "ACTIVITY & EARNINGS",
    earnings: "Earnings",
    earningsBody: "Delivery fees and trip earnings summary",
    history: "Trip history",
    historyBody: "Review completed deliveries",
    safetySection: "SAFETY & SUPPORT",
    safety: "Safety Center",
    safetyBody: "SOS, trip sharing, customer call, and incident report",
    support: "Help Center",
    supportBody: "Create reports and track support ticket status",
    appSection: "APP",
    language: "Language",
    languageBody: "Choose app language",
    appearance: "Appearance",
    appearanceBody: "System, light, or dark",
    accountSection: "ACCOUNT",
    account: "Signed-in account",
    signOut: "Sign out",
    signOutBody: "Sign out of this driver account",
    system: "System",
    light: "Light",
    dark: "Dark",
    notReady: "Not set",
    online: "ONLINE",
    offline: "OFFLINE",
    driverId: "DRIVER ID",
    complete: "Profile completeness",
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setProfile(await getDriverMe(user));
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!user) return <Redirect href="/login" />;

  const appearance = preference === "system" ? c.system : preference === "light" ? c.light : c.dark;
  const languageValue = language === "id" ? "Indonesia" : "English";
  const vehicleValue = profile?.vehiclePlate || c.notReady;
  const [statusTitle, statusBody] = statusMeta(profile?.status, language);
  const completedFields = useMemo(() => {
    if (!profile) return 0;
    return [
      profile.fullName,
      profile.phoneNumber,
      profile.vehicleBrandModel,
      profile.vehiclePlate,
    ].filter((value) => value.trim().length > 0).length;
  }, [profile]);
  const completion = profile ? Math.round((completedFields / 4) * 100) : 0;
  const driverId = profile?.id ? profile.id.slice(-8).toUpperCase() : "—";
  const statusColor = profile?.status === "approved"
    ? theme.colors.success
    : profile?.status === "rejected"
      ? theme.colors.danger
      : theme.colors.primary;
  const statusSurface = profile?.status === "rejected"
    ? theme.colors.dangerSurface
    : profile?.status === "approved"
      ? theme.colors.successSurface
      : theme.colors.surfaceAccent;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={c.title} showBack={false} />

        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{c.heading}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text>
        </View>

        {loading ? (
          <View style={[styles.loading, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <>
            <View style={[styles.profileHero, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceAccent }]}>
                <NitipIcon color={theme.colors.primary} name="profile" size={25} />
              </View>
              <View style={styles.profileCopy}>
                <Text numberOfLines={1} style={[styles.profileName, { color: theme.colors.text }]}>
                  {profile?.fullName ?? user.displayName ?? "Driver"}
                </Text>
                <Text numberOfLines={1} style={[styles.profileEmail, { color: theme.colors.textMuted }]}>
                  {profile?.phoneNumber || user.email || ""}
                </Text>
                <View style={styles.profileMeta}>
                  <Text style={[styles.profileMetaText, { color: theme.colors.textMuted }]}>{c.driverId} {driverId}</Text>
                  <Text style={[styles.profileMetaText, { color: theme.colors.textMuted }]}>•</Text>
                  <Text style={[styles.profileMetaText, { color: profile?.isOnline ? theme.colors.success : theme.colors.textMuted }]}>
                    {profile?.isOnline ? c.online : c.offline}
                  </Text>
                </View>
              </View>
              <View style={[styles.completionBadge, { backgroundColor: theme.colors.surfaceAccent }]}>
                <Text style={[styles.completionValue, { color: theme.colors.primary }]}>{completion}%</Text>
                <Text style={[styles.completionLabel, { color: theme.colors.textMuted }]}>{c.complete}</Text>
              </View>
            </View>

            <View style={[styles.statusCard, { backgroundColor: statusSurface, borderColor: statusColor }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <View style={styles.statusCopy}>
                <Text style={[styles.statusTitle, { color: statusColor }]}>{statusTitle}</Text>
                <Text style={[styles.statusBody, { color: theme.colors.textMuted }]}>{statusBody}</Text>
                {profile?.rejectionReason ? (
                  <Text style={[styles.rejection, { color: theme.colors.danger }]}>{profile.rejectionReason}</Text>
                ) : null}
              </View>
            </View>

            <SectionLabel text={c.profileSection} color={theme.colors.textMuted} />
            <View style={styles.rows}>
              <SettingsRow icon="profile" title={c.personal} description={c.personalBody} value={statusTitle} onPress={() => router.push("/profile")} />
              <SettingsRow icon="vehicle" title={c.vehicle} description={c.vehicleBody} value={vehicleValue} onPress={() => router.push("/vehicle")} />
              <SettingsRow icon="location" title={c.location} description={c.locationBody} onPress={() => router.push("/location")} />
            </View>

            <SectionLabel text={c.workSection} color={theme.colors.textMuted} />
            <View style={styles.rows}>
              <SettingsRow icon="earnings" title={c.earnings} description={c.earningsBody} onPress={() => router.push("/earnings")} />
              <SettingsRow icon="orders" title={c.history} description={c.historyBody} onPress={() => router.replace("/orders")} />
            </View>

            <SectionLabel text={c.safetySection} color={theme.colors.textMuted} />
            <View style={styles.rows}>
              <SettingsRow icon="safety" title={c.safety} description={c.safetyBody} onPress={() => router.push("/safety")} />
              <SettingsRow icon="help" title={c.support} description={c.supportBody} onPress={() => router.push("/support")} />
            </View>

            <SectionLabel text={c.appSection} color={theme.colors.textMuted} />
            <View style={styles.rows}>
              <SettingsRow icon="language" title={c.language} description={c.languageBody} value={languageValue} onPress={() => router.push("/language")} />
              <SettingsRow icon="theme" title={c.appearance} description={c.appearanceBody} value={appearance} onPress={() => router.push("/appearance")} />
            </View>

            <SectionLabel text={c.accountSection} color={theme.colors.textMuted} />
            <View style={styles.rows}>
              <SettingsRow icon="profile" title={user.email ?? "Driver"} description={c.account} showChevron={false} onPress={() => undefined} />
              <SettingsRow danger icon="logout" title={c.signOut} description={c.signOutBody} onPress={() => void signOut()} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionLabel({ text, color }: { text: string; color: string }) {
  return <Text style={[styles.sectionTitle, { color }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 38, paddingHorizontal: 20 },
  hero: { marginTop: 24 },
  heroTitle: { fontSize: 29, fontWeight: "900", letterSpacing: -0.9 },
  heroSubtitle: { fontSize: 10, lineHeight: 17, marginTop: 6, maxWidth: 345 },
  loading: { alignItems: "center", borderRadius: 22, borderWidth: 1, marginTop: 20, padding: 30 },
  profileHero: { alignItems: "center", borderRadius: 24, borderWidth: 1, elevation: 2, flexDirection: "row", marginTop: 20, padding: 14, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 9 },
  avatar: { alignItems: "center", borderRadius: 27, height: 54, justifyContent: "center", width: 54 },
  profileCopy: { flex: 1, minWidth: 0, paddingHorizontal: 12 },
  profileName: { fontSize: 14, fontWeight: "900" },
  profileEmail: { fontSize: 9, marginTop: 3 },
  profileMeta: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: 7 },
  profileMetaText: { fontSize: 7, fontWeight: "800" },
  completionBadge: { alignItems: "center", borderRadius: 17, minWidth: 60, paddingHorizontal: 8, paddingVertical: 8 },
  completionValue: { fontSize: 12, fontWeight: "900" },
  completionLabel: { fontSize: 6, fontWeight: "700", marginTop: 2, textAlign: "center" },
  statusCard: { alignItems: "flex-start", borderRadius: 19, borderWidth: 1, flexDirection: "row", marginTop: 12, padding: 13 },
  statusDot: { borderRadius: 5, height: 9, marginTop: 4, width: 9 },
  statusCopy: { flex: 1, paddingLeft: 10 },
  statusTitle: { fontSize: 9, fontWeight: "900" },
  statusBody: { fontSize: 9, lineHeight: 14, marginTop: 3 },
  rejection: { fontSize: 8, fontWeight: "800", lineHeight: 13, marginTop: 7 },
  rows: { gap: 9, marginTop: 10 },
  sectionTitle: { fontSize: 8, fontWeight: "900", letterSpacing: 1.1, marginTop: 26 },
});
