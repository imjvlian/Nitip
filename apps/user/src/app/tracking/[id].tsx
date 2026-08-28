import type { NitipOrder, NitipOrderTracking } from "@nitip/domain/commerce";
import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import LiveRouteMap, { type RouteSummary } from "../../components/LiveRouteMap";
import { NitipIcon } from "../../components/NitipIcon";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { getOrder, getOrderTracking } from "../../lib/api";

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

function ageLabel(value: string | null, language: "id" | "en", now: number) {
  if (!value) return "—";
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return "—";
  const seconds = Math.max(0, Math.round((now - parsed) / 1000));
  if (seconds < 10) return language === "id" ? "baru saja" : "just now";
  if (seconds < 60) return language === "id" ? `${seconds} detik lalu` : `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return language === "id" ? `${minutes} menit lalu` : `${minutes}m ago`;
}

export default function UserTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useNitipLanguage();
  const { t } = useNitipTranslation();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<NitipOrder | null>(null);
  const [tracking, setTracking] = useState<NitipOrderTracking | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const c = language === "id"
    ? {
        title: "Lacak Driver",
        loading: "Menyiapkan live tracking...",
        unavailable: "Tracking belum tersedia",
        unavailableBody: "Live tracking aktif saat driver sudah memulai pengantaran.",
        live: "LIVE",
        toward: "Driver sedang menuju lokasimu",
        waiting: "Menunggu posisi driver...",
        remaining: "Sisa perjalanan",
        eta: "ETA & jarak",
        driver: "Driver",
        vehicle: "Kendaraan",
        destination: "Tujuan",
        updated: "Lokasi diperbarui",
        accuracy: "Akurasi GPS",
        status: "Status pesanan",
        backToOrder: "Kembali ke detail pesanan",
        ended: "Live tracking selesai",
        endedBody: "Posisi driver tidak lagi dibagikan setelah pengantaran selesai atau dibatalkan.",
        retrying: "Koneksi tracking terputus sementara. Mencoba kembali otomatis...",
      }
    : {
        title: "Track Driver",
        loading: "Preparing live tracking...",
        unavailable: "Tracking is not available yet",
        unavailableBody: "Live tracking starts after the driver begins the delivery.",
        live: "LIVE",
        toward: "Driver is heading to your location",
        waiting: "Waiting for driver position...",
        remaining: "Remaining trip",
        eta: "ETA & distance",
        driver: "Driver",
        vehicle: "Vehicle",
        destination: "Destination",
        updated: "Location updated",
        accuracy: "GPS accuracy",
        status: "Order status",
        backToOrder: "Back to order details",
        ended: "Live tracking ended",
        endedBody: "Driver location is no longer shared after the delivery is completed or cancelled.",
        retrying: "Tracking connection is temporarily unavailable. Retrying automatically...",
      };

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user || !id) return;
    let mounted = true;

    const load = async (initial = false) => {
      if (initial) setLoading(true);
      try {
        const [nextOrder, nextTracking] = await Promise.all([
          initial || !order ? getOrder(user, id) : Promise.resolve(order),
          getOrderTracking(user, id),
        ]);
        if (!mounted) return;
        setOrder(nextOrder);
        setTracking(nextTracking);
        setError(null);
      } catch (nextError) {
        if (!mounted) return;
        setError(nextError instanceof Error ? nextError.message : c.retrying);
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
  }, [c.retrying, id, user]);

  if (!user) return <Redirect href="/login" />;

  const destination = tracking?.destination ?? (order ? {
    recipientName: order.address.recipientName,
    addressLine: order.address.addressLine,
    latitude: order.address.latitude,
    longitude: order.address.longitude,
  } : null);
  const hasDestination = destination?.latitude != null && destination.longitude != null;
  const remaining = useMemo(() => summaryLabel(routeSummary, language), [language, routeSummary]);
  const updatedAgo = ageLabel(tracking?.driver?.locationUpdatedAt ?? null, language, now);
  const trackingEnded = Boolean(tracking && ["delivered", "cancelled", "refunded"].includes(tracking.status));

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <View style={[styles.headerWrap, { paddingTop: insets.top + 10 }]}> 
        <AppHeader title={c.title} onBack={() => router.back()} />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>{c.loading}</Text>
        </View>
      ) : !order ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{c.unavailable}</Text>
          <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>{error ?? c.unavailableBody}</Text>
        </View>
      ) : (
        <>
          <View style={[styles.mapShell, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            {hasDestination ? (
              <LiveRouteMap
                pickup={{ latitude: null, longitude: null, label: "" }}
                destination={{
                  latitude: destination.latitude,
                  longitude: destination.longitude,
                  label: destination.recipientName,
                }}
                liveOrigin={tracking?.driver ? {
                  latitude: tracking.driver.latitude,
                  longitude: tracking.driver.longitude,
                  label: tracking.driver.fullName,
                } : null}
                onRouteSummary={setRouteSummary}
              />
            ) : (
              <View style={styles.mapState}>
                <NitipIcon color={theme.colors.textMuted} name="location" size={24} />
                <Text style={[styles.mapStateText, { color: theme.colors.textMuted }]}>{c.unavailableBody}</Text>
              </View>
            )}
          </View>

          <ScrollView
            contentContainerStyle={[styles.infoContent, { paddingBottom: Math.max(insets.bottom + 28, 40) }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.liveCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
              <View style={[
                styles.liveBadge,
                { backgroundColor: tracking?.active ? theme.colors.successSurface : theme.colors.surfaceAccent },
              ]}>
                <View style={[styles.liveDot, { backgroundColor: tracking?.active ? theme.colors.success : theme.colors.textMuted }]} />
                <Text style={[styles.liveText, { color: tracking?.active ? theme.colors.success : theme.colors.textMuted }]}>{c.live}</Text>
              </View>
              <View style={styles.liveCopy}>
                <Text style={[styles.liveTitle, { color: theme.colors.text }]}>
                  {trackingEnded ? c.ended : tracking?.driver ? c.toward : c.waiting}
                </Text>
                <Text style={[styles.liveBody, { color: theme.colors.textMuted }]}>
                  {trackingEnded ? c.endedBody : `${c.remaining}: ${remaining}`}
                </Text>
              </View>
            </View>

            {error ? (
              <View style={[styles.warningCard, { backgroundColor: theme.colors.warningSurface }]}> 
                <NitipIcon color={theme.colors.warning} name="refresh" size={16} />
                <Text style={[styles.warningText, { color: theme.colors.warning }]}>{c.retrying}</Text>
              </View>
            ) : null}

            <View style={styles.metricsRow}>
              <Metric label={c.eta} value={remaining} />
              <Metric label={c.status} value={t(`orders.status.${tracking?.status ?? order.status}`)} />
            </View>

            {tracking?.driver ? (
              <>
                <InfoCard icon="profile" label={c.driver} title={tracking.driver.fullName} body={`${c.updated} ${updatedAgo}`} />
                <InfoCard icon="delivery" label={c.vehicle} title={tracking.driver.vehicleBrandModel} body={`${tracking.driver.vehiclePlate} · ${c.accuracy} ${tracking.driver.accuracyMeters == null ? "—" : `±${Math.round(tracking.driver.accuracyMeters)} m`}`} />
              </>
            ) : null}

            {destination ? (
              <InfoCard icon="location" label={c.destination} title={destination.recipientName} body={destination.addressLine} />
            ) : null}

            <View style={[styles.orderCard, { backgroundColor: theme.colors.surfaceAccent }]}> 
              <Text style={[styles.orderEyebrow, { color: theme.colors.primary }]}>{order.orderCode}</Text>
              <Text style={[styles.orderTitle, { color: theme.colors.text }]}>{order.businessName}</Text>
              <Text style={[styles.orderBody, { color: theme.colors.textMuted }]}>{order.outletName}</Text>
            </View>

            <Pressable
              onPress={() => router.replace({ pathname: "/order/[id]", params: { id: order.id } })}
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            >
              <NitipIcon color="#FFFFFF" name="orders" size={16} />
              <Text style={styles.primaryText}>{c.backToOrder}</Text>
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
        <Text numberOfLines={2} style={[styles.metricValue, { color: theme.colors.text }]}>{value}</Text>
      </View>
    );
  }

  function InfoCard({ icon, label, title, body }: { icon: "profile" | "delivery" | "location"; label: string; title: string; body: string }) {
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
  headerWrap: { paddingBottom: 10, paddingHorizontal: 18 },
  mapShell: { borderBottomWidth: 1, borderTopWidth: 1, height: 340, overflow: "hidden" },
  mapState: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  mapStateText: { fontSize: 9, lineHeight: 14, marginTop: 8, textAlign: "center" },
  infoContent: { paddingHorizontal: 18, paddingTop: 16 },
  centerState: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  stateTitle: { fontSize: 18, fontWeight: "900", textAlign: "center" },
  stateText: { fontSize: 10, lineHeight: 16, marginTop: 7, textAlign: "center" },
  liveCard: { alignItems: "center", borderRadius: 20, borderWidth: 1, flexDirection: "row", padding: 14 },
  liveBadge: { alignItems: "center", borderRadius: 999, flexDirection: "row", paddingHorizontal: 10, paddingVertical: 7 },
  liveDot: { borderRadius: 4, height: 7, marginRight: 6, width: 7 },
  liveText: { fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  liveCopy: { flex: 1, paddingLeft: 12 },
  liveTitle: { fontSize: 11, fontWeight: "900" },
  liveBody: { fontSize: 8, lineHeight: 13, marginTop: 4 },
  warningCard: { alignItems: "center", borderRadius: 16, flexDirection: "row", marginTop: 10, padding: 12 },
  warningText: { flex: 1, fontSize: 8, lineHeight: 13, paddingLeft: 9 },
  metricsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  metric: { borderRadius: 18, borderWidth: 1, flex: 1, minHeight: 74, padding: 13 },
  metricLabel: { fontSize: 7, fontWeight: "800" },
  metricValue: { fontSize: 12, fontWeight: "900", lineHeight: 16, marginTop: 5 },
  infoCard: { alignItems: "flex-start", borderRadius: 18, borderWidth: 1, flexDirection: "row", marginTop: 10, padding: 13 },
  infoIcon: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  infoCopy: { flex: 1, paddingLeft: 11 },
  infoLabel: { fontSize: 7, fontWeight: "900", letterSpacing: 0.5 },
  infoTitle: { fontSize: 10, fontWeight: "900", marginTop: 3 },
  infoBody: { fontSize: 8, lineHeight: 13, marginTop: 4 },
  orderCard: { borderRadius: 18, marginTop: 10, padding: 14 },
  orderEyebrow: { fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  orderTitle: { fontSize: 12, fontWeight: "900", marginTop: 4 },
  orderBody: { fontSize: 8, marginTop: 3 },
  primaryButton: { alignItems: "center", borderRadius: 16, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 14, minHeight: 50 },
  primaryText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
});
