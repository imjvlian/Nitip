import { formatRupiah } from "@nitip/domain";
import type { NitipDriverOrder } from "@nitip/domain/driver";
import { useNitipLanguage } from "@nitip/i18n";
import * as Location from "expo-location";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import RouteMap, { type RouteSummary } from "../components/RouteMap";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getCurrentDriverOrder, updateDriverLocation } from "../lib/api";

type LivePosition = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  updatedAt: string;
};

function summaryLabel(summary: RouteSummary | null, language: "id" | "en") {
  if (!summary) return "—";
  const parts: string[] = [];
  if (summary.distanceMeters != null) {
    const km = summary.distanceMeters / 1000;
    parts.push(`${km < 10 ? km.toFixed(1) : Math.round(km)} km`);
  }
  if (summary.durationSeconds != null) {
    parts.push(`${Math.max(1, Math.round(summary.durationSeconds / 60))} ${language === "id" ? "menit" : "min"}`);
  }
  return parts.join(" • ") || "—";
}

function timeLabel(value: string | null, language: "id" | "en") {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(language === "id" ? "id-ID" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function DriverTrackingScreen() {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<NitipDriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const c = language === "id"
    ? {
        title: "Live Route",
        loading: "Memuat perjalanan aktif...",
        unavailable: "Tidak ada pengantaran aktif",
        unavailableBody: "Live Route tersedia setelah kamu memulai pengantaran ke customer.",
        live: "LIVE",
        sharing: "Lokasi dibagikan ke customer",
        acquiring: "Mengambil posisi GPS...",
        remaining: "Sisa perjalanan",
        destination: "Tujuan customer",
        customer: "Customer",
        gps: "Status GPS",
        updated: "Update terakhir",
        accuracy: "Akurasi",
        navigation: "Buka navigasi",
        detail: "Detail & OTP",
        safety: "Safety Center",
        retry: "Coba lagi",
        permission: "Izin lokasi diperlukan untuk live tracking.",
        syncFailed: "Lokasi belum dapat dikirim ke server. Mencoba lagi pada update berikutnya.",
        order: "ORDER AKTIF",
        fare: "Fee pengantaran",
      }
    : {
        title: "Live Route",
        loading: "Loading active delivery...",
        unavailable: "No active delivery",
        unavailableBody: "Live Route is available after you start delivering to the customer.",
        live: "LIVE",
        sharing: "Location is shared with the customer",
        acquiring: "Acquiring GPS position...",
        remaining: "Remaining trip",
        destination: "Customer destination",
        customer: "Customer",
        gps: "GPS status",
        updated: "Last update",
        accuracy: "Accuracy",
        navigation: "Open navigation",
        detail: "Details & OTP",
        safety: "Safety Center",
        retry: "Try again",
        permission: "Location permission is required for live tracking.",
        syncFailed: "Location could not be synced yet. Retrying on the next update.",
        order: "ACTIVE ORDER",
        fare: "Delivery fee",
      };

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const load = async (initial = false) => {
      if (initial) setLoading(true);
      try {
        const next = await getCurrentDriverOrder(user);
        if (!mounted) return;
        setOrder(next);
        setLoadError(null);
      } catch (error) {
        if (!mounted) return;
        setLoadError(error instanceof Error ? error.message : c.unavailable);
      } finally {
        if (mounted && initial) setLoading(false);
      }
    };

    void load(true);
    const timer = setInterval(() => { void load(false); }, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [c.unavailable, user]);

  useEffect(() => {
    if (!user || order?.status !== "on_delivery") {
      setPosition(null);
      setRouteSummary(null);
      return;
    }

    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const publish = async (coords: Location.LocationObjectCoords) => {
      if (!mounted) return;
      const next: LivePosition = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyMeters: coords.accuracy ?? null,
        updatedAt: new Date().toISOString(),
      };
      setPosition(next);
      try {
        await updateDriverLocation(user, {
          latitude: next.latitude,
          longitude: next.longitude,
          accuracyMeters: next.accuracyMeters,
        });
        if (mounted) setGpsError(null);
      } catch {
        if (mounted) setGpsError(c.syncFailed);
      }
    };

    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!mounted) return;
      if (permission.status !== "granted") {
        setGpsError(c.permission);
        return;
      }

      try {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        await publish(current.coords);
      } catch {
        if (mounted) setGpsError(c.acquiring);
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 8,
        },
        (next) => { void publish(next.coords); },
      );
    })().catch(() => {
      if (mounted) setGpsError(c.permission);
    });

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [c.acquiring, c.permission, c.syncFailed, order?.status, user]);

  if (!user) return <Redirect href="/login" />;

  async function openNavigation() {
    if (!order || order.destination.latitude == null || order.destination.longitude == null) return;
    const latitude = order.destination.latitude;
    const longitude = order.destination.longitude;
    const label = order.destination.recipientName;
    const nativeUrl = Platform.OS === "ios"
      ? `maps://?daddr=${latitude},${longitude}&q=${encodeURIComponent(label)}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label)})`;
    try {
      await Linking.openURL(nativeUrl);
    } catch {
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`);
    }
  }

  const remaining = useMemo(() => summaryLabel(routeSummary, language), [language, routeSummary]);
  const hasDestination = order?.destination.latitude != null && order.destination.longitude != null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <View style={[styles.headerWrap, { paddingTop: insets.top + 10 }]}> 
        <AppHeader title={c.title} />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>{c.loading}</Text>
        </View>
      ) : !order || order.status !== "on_delivery" ? (
        <View style={styles.centerState}>
          <View style={[styles.stateIcon, { backgroundColor: theme.colors.surfaceAccent }]}>
            <NitipIcon color={theme.colors.primary} name="location" size={24} />
          </View>
          <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{c.unavailable}</Text>
          <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>{loadError ?? c.unavailableBody}</Text>
          <Pressable onPress={() => router.replace("/home")} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.primaryText}>{language === "id" ? "Kembali ke Home" : "Back to Home"}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={[styles.mapShell, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <RouteMap
              pickup={{
                latitude: order.pickup.latitude,
                longitude: order.pickup.longitude,
                label: `${order.pickup.businessName} · ${order.pickup.outletName}`,
              }}
              destination={{
                latitude: order.destination.latitude,
                longitude: order.destination.longitude,
                label: order.destination.recipientName,
              }}
              liveOrigin={position ? {
                latitude: position.latitude,
                longitude: position.longitude,
                label: language === "id" ? "Posisi kamu" : "Your position",
              } : null}
              onRouteSummary={setRouteSummary}
            />
          </View>

          <ScrollView
            contentContainerStyle={[styles.infoContent, { paddingBottom: Math.max(insets.bottom + 28, 38) }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.liveCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
              <View style={[styles.liveBadge, { backgroundColor: position ? theme.colors.successSurface : theme.colors.warningSurface }]}> 
                <View style={[styles.liveDot, { backgroundColor: position ? theme.colors.success : theme.colors.warning }]} />
                <Text style={[styles.liveText, { color: position ? theme.colors.success : theme.colors.warning }]}>{c.live}</Text>
              </View>
              <View style={styles.liveCopy}>
                <Text style={[styles.liveTitle, { color: theme.colors.text }]}>{position ? c.sharing : c.acquiring}</Text>
                <Text style={[styles.liveBody, { color: theme.colors.textMuted }]}>{c.remaining}: <Text style={{ color: theme.colors.primary, fontWeight: "900" }}>{remaining}</Text></Text>
              </View>
            </View>

            {gpsError ? (
              <View style={[styles.warningCard, { backgroundColor: theme.colors.warningSurface }]}> 
                <NitipIcon color={theme.colors.warning} name="location" size={17} />
                <Text style={[styles.warningText, { color: theme.colors.warning }]}>{gpsError}</Text>
                {gpsError === c.permission ? (
                  <Pressable onPress={() => void Linking.openSettings()}>
                    <Text style={[styles.settingsLink, { color: theme.colors.warning }]}>{c.retry}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View style={styles.metricsRow}>
              <Metric label={c.remaining} value={remaining} />
              <Metric label={c.fare} value={formatRupiah(order.deliveryFare)} />
            </View>

            <InfoCard icon="location" label={c.destination} title={order.destination.recipientName} body={order.destination.addressLine} />
            <InfoCard icon="profile" label={c.customer} title={order.destination.recipientName} body={order.destination.phoneNumber || "—"} />
            <InfoCard
              icon="location"
              label={c.gps}
              title={`${c.updated}: ${timeLabel(position?.updatedAt ?? null, language)}`}
              body={`${c.accuracy}: ${position?.accuracyMeters == null ? "—" : `±${Math.round(position.accuracyMeters)} m`}`}
            />

            <View style={styles.actions}>
              <Pressable disabled={!hasDestination} onPress={() => void openNavigation()} style={[styles.actionButton, { backgroundColor: theme.colors.primary, opacity: hasDestination ? 1 : 0.45 }]}> 
                <NitipIcon color="#FFFFFF" name="location" size={16} />
                <Text style={styles.actionPrimaryText}>{c.navigation}</Text>
              </Pressable>
              <Pressable
                onPress={() => router.replace({ pathname: "/order/[id]", params: { id: order.id } })}
                style={[styles.actionButton, { backgroundColor: theme.colors.surfaceAccent }]}
              >
                <NitipIcon color={theme.colors.primary} name="orders" size={16} />
                <Text style={[styles.actionSecondaryText, { color: theme.colors.primary }]}>{c.detail}</Text>
              </Pressable>
            </View>

            <Pressable onPress={() => router.push("/safety")} style={[styles.safetyButton, { borderColor: theme.colors.border }]}> 
              <NitipIcon color={theme.colors.danger} name="safety" size={17} />
              <Text style={[styles.safetyText, { color: theme.colors.text }]}>{c.safety}</Text>
              <NitipIcon color={theme.colors.textMuted} name="next" size={14} />
            </Pressable>
          </ScrollView>
        </>
      )}
    </View>
  );

  function Metric({ label, value }: { label: string; value: string }) {
    return (
      <View style={[styles.metric, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
        <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>{label}</Text>
        <Text numberOfLines={1} style={[styles.metricValue, { color: theme.colors.text }]}>{value}</Text>
      </View>
    );
  }

  function InfoCard({ icon, label, title, body }: { icon: "location" | "profile"; label: string; title: string; body: string }) {
    return (
      <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
        <View style={[styles.infoIcon, { backgroundColor: theme.colors.surfaceAccent }]}>
          <NitipIcon color={theme.colors.primary} name={icon} size={17} />
        </View>
        <View style={styles.infoCopy}>
          <Text style={[styles.infoLabel, { color: theme.colors.primary }]}>{label}</Text>
          <Text style={[styles.infoTitle, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.infoBody, { color: theme.colors.textMuted }]}>{body}</Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerWrap: { paddingHorizontal: 18, paddingBottom: 10 },
  mapShell: { borderBottomWidth: 1, borderTopWidth: 1, height: 340, overflow: "hidden" },
  infoContent: { paddingHorizontal: 18, paddingTop: 16 },
  centerState: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  stateIcon: { alignItems: "center", borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
  stateTitle: { fontSize: 18, fontWeight: "900", marginTop: 14, textAlign: "center" },
  stateText: { fontSize: 10, lineHeight: 16, marginTop: 7, textAlign: "center" },
  primaryButton: { alignItems: "center", borderRadius: 16, justifyContent: "center", marginTop: 18, minHeight: 48, paddingHorizontal: 20 },
  primaryText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  liveCard: { alignItems: "center", borderRadius: 20, borderWidth: 1, flexDirection: "row", padding: 14 },
  liveBadge: { alignItems: "center", borderRadius: 999, flexDirection: "row", paddingHorizontal: 10, paddingVertical: 7 },
  liveDot: { borderRadius: 4, height: 7, marginRight: 6, width: 7 },
  liveText: { fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  liveCopy: { flex: 1, paddingLeft: 12 },
  liveTitle: { fontSize: 11, fontWeight: "900" },
  liveBody: { fontSize: 8, marginTop: 4 },
  warningCard: { alignItems: "center", borderRadius: 16, flexDirection: "row", marginTop: 10, padding: 12 },
  warningText: { flex: 1, fontSize: 8, lineHeight: 13, paddingHorizontal: 9 },
  settingsLink: { fontSize: 8, fontWeight: "900" },
  metricsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  metric: { borderRadius: 18, borderWidth: 1, flex: 1, padding: 13 },
  metricLabel: { fontSize: 7, fontWeight: "800" },
  metricValue: { fontSize: 13, fontWeight: "900", marginTop: 4 },
  infoCard: { alignItems: "flex-start", borderRadius: 18, borderWidth: 1, flexDirection: "row", marginTop: 10, padding: 13 },
  infoIcon: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  infoCopy: { flex: 1, paddingLeft: 11 },
  infoLabel: { fontSize: 7, fontWeight: "900", letterSpacing: 0.5 },
  infoTitle: { fontSize: 10, fontWeight: "900", marginTop: 3 },
  infoBody: { fontSize: 8, lineHeight: 13, marginTop: 4 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionButton: { alignItems: "center", borderRadius: 16, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 50, paddingHorizontal: 10 },
  actionPrimaryText: { color: "#FFFFFF", fontSize: 8, fontWeight: "900" },
  actionSecondaryText: { fontSize: 8, fontWeight: "900" },
  safetyButton: { alignItems: "center", borderRadius: 17, borderWidth: 1, flexDirection: "row", marginTop: 10, minHeight: 50, paddingHorizontal: 14 },
  safetyText: { flex: 1, fontSize: 9, fontWeight: "900", paddingHorizontal: 10 },
});
