import type { NitipDriverProfile } from "@nitip/domain/driver";
import { useNitipLanguage } from "@nitip/i18n";
import * as Location from "expo-location";
import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPopup, type PopupNotice } from "../components/AnimatedPopup";
import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getDriverMe, refreshDriverLocation } from "../lib/api";

function formatUpdatedAt(value: string | null, language: "id" | "en") {
  if (!value) return language === "id" ? "Belum pernah" : "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(language === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DriverLocationScreen() {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<NitipDriverProfile | null>(null);
  const [permission, setPermission] = useState<Location.PermissionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<PopupNotice | null>(null);

  const c = language === "id" ? {
    title: "Lokasi & GPS",
    heading: "Status lokasi.",
    subtitle: "Lokasi membantu Nitip mengurutkan order terdekat dan membagikan posisi ke customer selama pengantaran aktif.",
    live: "STATUS GPS",
    permission: "Izin lokasi",
    allowed: "Diizinkan",
    denied: "Belum diizinkan",
    online: "Mode driver",
    onlineValue: "Online",
    offlineValue: "Offline",
    lastUpdate: "Pembaruan terakhir",
    accuracy: "Akurasi GPS",
    coordinates: "Koordinat terakhir",
    refresh: "Perbarui lokasi sekarang",
    refreshing: "Mengambil GPS...",
    settings: "Buka pengaturan perangkat",
    privacy: "PRIVASI LOKASI",
    privacyTitle: "Lokasi dibagikan hanya saat diperlukan.",
    privacyBody: "Customer hanya menerima posisi driver selama order berstatus sedang diantar. Setelah order selesai atau dibatalkan, endpoint tracking tidak lagi mengirim koordinat driver.",
    backgroundTitle: "Tracking saat ini menggunakan foreground location.",
    backgroundBody: "Halaman ini mengelola izin, refresh manual, dan posisi yang dipakai dispatch. Background tracking penuh saat aplikasi diminimalkan tetap membutuhkan foreground service terpisah sebelum produksi.",
    refreshOk: "Lokasi diperbarui",
    refreshOkBody: "Posisi terbaru sudah tersimpan di Nitip.",
    permissionNeeded: "Izin lokasi diperlukan",
    permissionNeededBody: "Izinkan akses lokasi agar Nitip dapat memperbarui posisi driver.",
    notApproved: "Profil belum aktif",
    notApprovedBody: "Lokasi backend hanya dapat diperbarui setelah profil driver disetujui.",
    failed: "Lokasi tidak dapat diperbarui",
  } : {
    title: "Location & GPS",
    heading: "Location status.",
    subtitle: "Location helps Nitip rank nearby orders and share your position with the customer during an active delivery.",
    live: "GPS STATUS",
    permission: "Location permission",
    allowed: "Allowed",
    denied: "Not allowed",
    online: "Driver mode",
    onlineValue: "Online",
    offlineValue: "Offline",
    lastUpdate: "Last update",
    accuracy: "GPS accuracy",
    coordinates: "Last coordinates",
    refresh: "Refresh location now",
    refreshing: "Acquiring GPS...",
    settings: "Open device settings",
    privacy: "LOCATION PRIVACY",
    privacyTitle: "Location is shared only when needed.",
    privacyBody: "Customers only receive driver coordinates while an order is on delivery. After completion or cancellation, the tracking endpoint stops returning driver coordinates.",
    backgroundTitle: "Tracking currently uses foreground location.",
    backgroundBody: "This page manages permission, manual refresh, and dispatch position. Full background tracking while the app is minimized still needs a dedicated foreground service before production.",
    refreshOk: "Location updated",
    refreshOkBody: "Your latest position has been saved to Nitip.",
    permissionNeeded: "Location permission required",
    permissionNeededBody: "Allow location access so Nitip can update your driver position.",
    notApproved: "Profile not active",
    notApprovedBody: "Backend location updates are available after the driver profile is approved.",
    failed: "Unable to update location",
  };

  const popupColors = {
    surface: theme.colors.surfaceRaised,
    border: theme.colors.border,
    text: theme.colors.text,
    textMuted: theme.colors.textMuted,
    primary: theme.colors.primary,
    success: theme.colors.success,
    danger: theme.colors.danger,
    warning: theme.colors.warning,
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [nextProfile, nextPermission] = await Promise.all([
        getDriverMe(user),
        Location.getForegroundPermissionsAsync(),
      ]);
      setProfile(nextProfile);
      setPermission(nextPermission.status);
    } catch (error) {
      setNotice({
        id: Date.now(),
        tone: "error",
        title: c.failed,
        message: error instanceof Error ? error.message : c.failed,
      });
    } finally {
      setLoading(false);
    }
  }, [c.failed, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!user) return <Redirect href="/login" />;

  const permissionGranted = permission === "granted";
  const coordinates = profile?.latitude != null && profile.longitude != null
    ? `${profile.latitude.toFixed(5)}, ${profile.longitude.toFixed(5)}`
    : "—";
  const accuracy = profile?.locationAccuracyMeters == null
    ? "—"
    : `±${Math.round(profile.locationAccuracyMeters)} m`;

  async function refresh() {
    if (!profile || refreshing) return;
    if (profile.status !== "approved") {
      setNotice({ id: Date.now(), tone: "warning", title: c.notApproved, message: c.notApprovedBody });
      return;
    }

    setRefreshing(true);
    try {
      const next = await refreshDriverLocation(user);
      const nextPermission = await Location.getForegroundPermissionsAsync();
      setPermission(nextPermission.status);
      if (!next) {
        setNotice({ id: Date.now(), tone: "warning", title: c.permissionNeeded, message: c.permissionNeededBody });
        return;
      }
      setProfile(next);
      setNotice({ id: Date.now(), tone: "success", title: c.refreshOk, message: c.refreshOkBody });
    } catch (error) {
      const nextPermission = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (nextPermission) setPermission(nextPermission.status);
      setNotice({ id: Date.now(), tone: "error", title: c.failed, message: error instanceof Error ? error.message : c.failed });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AnimatedPopup
        colors={popupColors}
        notice={notice}
        onNoticeDismiss={() => setNotice(null)}
        top={insets.top + 8}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={c.title} />
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{c.heading}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={theme.colors.primary} /></View>
        ) : (
          <>
            <View style={[styles.gpsHero, { backgroundColor: permissionGranted ? theme.colors.primary : theme.colors.surface, borderColor: permissionGranted ? theme.colors.primary : theme.colors.border, shadowColor: theme.colors.shadow }]}>
              <View style={[styles.gpsIcon, { backgroundColor: permissionGranted ? "rgba(255,255,255,.16)" : theme.colors.surfaceAccent }]}>
                <NitipIcon color={permissionGranted ? "#FFFFFF" : theme.colors.primary} name="location" size={25} />
              </View>
              <View style={styles.gpsCopy}>
                <Text style={[styles.gpsEyebrow, { color: permissionGranted ? "rgba(255,255,255,.72)" : theme.colors.textMuted }]}>{c.live}</Text>
                <Text style={[styles.gpsTitle, { color: permissionGranted ? "#FFFFFF" : theme.colors.text }]}>{permissionGranted ? c.allowed : c.denied}</Text>
                <Text style={[styles.gpsBody, { color: permissionGranted ? "rgba(255,255,255,.78)" : theme.colors.textMuted }]}>{formatUpdatedAt(profile?.locationUpdatedAt ?? null, language)}</Text>
              </View>
              <View style={[styles.modePill, { backgroundColor: permissionGranted ? "rgba(255,255,255,.16)" : theme.colors.secondary }]}>
                <Text style={[styles.modeText, { color: permissionGranted ? "#FFFFFF" : theme.colors.textMuted }]}>{profile?.isOnline ? c.onlineValue : c.offlineValue}</Text>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <InfoRow icon="location" label={c.permission} value={permissionGranted ? c.allowed : c.denied} accent={permissionGranted ? theme.colors.success : theme.colors.warning} theme={theme} />
              <Divider color={theme.colors.border} />
              <InfoRow icon="power" label={c.online} value={profile?.isOnline ? c.onlineValue : c.offlineValue} accent={profile?.isOnline ? theme.colors.success : theme.colors.textMuted} theme={theme} />
              <Divider color={theme.colors.border} />
              <InfoRow icon="clock" label={c.lastUpdate} value={formatUpdatedAt(profile?.locationUpdatedAt ?? null, language)} theme={theme} />
              <Divider color={theme.colors.border} />
              <InfoRow icon="location" label={c.accuracy} value={accuracy} theme={theme} />
              <Divider color={theme.colors.border} />
              <InfoRow icon="location" label={c.coordinates} value={coordinates} theme={theme} />
            </View>

            <Pressable disabled={refreshing} onPress={() => void refresh()} style={[styles.primaryButton, { backgroundColor: theme.colors.primary, opacity: refreshing ? 0.55 : 1 }]}>
              {refreshing ? <ActivityIndicator color="#FFFFFF" /> : <NitipIcon color="#FFFFFF" name="refresh" size={17} />}
              <Text style={styles.primaryText}>{refreshing ? c.refreshing : c.refresh}</Text>
            </Pressable>
            <Pressable onPress={() => void Linking.openSettings()} style={[styles.outlineButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <NitipIcon color={theme.colors.primary} name="settings" size={16} />
              <Text style={[styles.outlineText, { color: theme.colors.primary }]}>{c.settings}</Text>
            </Pressable>

            <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>{c.privacy}</Text>
            <View style={[styles.privacyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.privacyIcon, { backgroundColor: theme.colors.surfaceAccent }]}><NitipIcon color={theme.colors.primary} name="safety" size={20} /></View>
              <Text style={[styles.privacyTitle, { color: theme.colors.text }]}>{c.privacyTitle}</Text>
              <Text style={[styles.privacyBody, { color: theme.colors.textMuted }]}>{c.privacyBody}</Text>
              <View style={[styles.noticeBox, { backgroundColor: theme.colors.secondary }]}>
                <Text style={[styles.noticeTitle, { color: theme.colors.text }]}>{c.backgroundTitle}</Text>
                <Text style={[styles.noticeBody, { color: theme.colors.textMuted }]}>{c.backgroundBody}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={[styles.divider, { backgroundColor: color }]} />;
}

function InfoRow({ icon, label, value, accent, theme }: { icon: "location" | "power" | "clock"; label: string; value: string; accent?: string; theme: ReturnType<typeof useNitipTheme> }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: theme.colors.surfaceAccent }]}><NitipIcon color={theme.colors.primary} name={icon} size={15} /></View>
      <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text numberOfLines={2} style={[styles.infoValue, { color: accent ?? theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 42, paddingHorizontal: 20 },
  hero: { marginTop: 24 },
  heroTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8 },
  heroSubtitle: { fontSize: 10, lineHeight: 17, marginTop: 6 },
  loading: { alignItems: "center", justifyContent: "center", minHeight: 220 },
  gpsHero: { alignItems: "center", borderRadius: 24, borderWidth: 1, elevation: 3, flexDirection: "row", marginTop: 20, padding: 15, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  gpsIcon: { alignItems: "center", borderRadius: 25, height: 50, justifyContent: "center", width: 50 },
  gpsCopy: { flex: 1, minWidth: 0, paddingHorizontal: 12 },
  gpsEyebrow: { fontSize: 7, fontWeight: "900", letterSpacing: 1 },
  gpsTitle: { fontSize: 14, fontWeight: "900", marginTop: 3 },
  gpsBody: { fontSize: 8, marginTop: 3 },
  modePill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  modeText: { fontSize: 7, fontWeight: "900" },
  infoCard: { borderRadius: 22, borderWidth: 1, marginTop: 14, paddingHorizontal: 14 },
  infoRow: { alignItems: "center", flexDirection: "row", minHeight: 57 },
  infoIcon: { alignItems: "center", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  infoLabel: { flex: 1, fontSize: 9, fontWeight: "700", paddingHorizontal: 10 },
  infoValue: { fontSize: 9, fontWeight: "900", maxWidth: "46%", textAlign: "right" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 46 },
  primaryButton: { alignItems: "center", borderRadius: 17, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 16, minHeight: 52, paddingHorizontal: 16 },
  primaryText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  outlineButton: { alignItems: "center", borderRadius: 17, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 9, minHeight: 50, paddingHorizontal: 16 },
  outlineText: { fontSize: 10, fontWeight: "900" },
  sectionLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 1.1, marginTop: 26 },
  privacyCard: { borderRadius: 22, borderWidth: 1, marginTop: 10, padding: 15 },
  privacyIcon: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  privacyTitle: { fontSize: 12, fontWeight: "900", marginTop: 12 },
  privacyBody: { fontSize: 9, lineHeight: 15, marginTop: 5 },
  noticeBox: { borderRadius: 16, marginTop: 13, padding: 12 },
  noticeTitle: { fontSize: 9, fontWeight: "900" },
  noticeBody: { fontSize: 8, lineHeight: 13, marginTop: 4 },
});
