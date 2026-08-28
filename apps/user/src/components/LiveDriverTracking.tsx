import type { NitipOrderTracking } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getOrderTracking } from "../lib/api";
import LiveRouteMap, { type RouteSummary } from "./LiveRouteMap";
import { NitipIcon } from "./NitipIcon";

function summaryLabel(summary: RouteSummary | null, language: "id" | "en") {
  if (!summary) return null;
  const parts: string[] = [];
  if (summary.distanceMeters != null) {
    const km = summary.distanceMeters / 1000;
    parts.push(`${km < 10 ? km.toFixed(1) : Math.round(km)} km`);
  }
  if (summary.durationSeconds != null) {
    parts.push(`${Math.max(1, Math.round(summary.durationSeconds / 60))} ${language === "id" ? "menit" : "min"}`);
  }
  return parts.join(" • ") || null;
}

function ageLabel(value: string, language: "id" | "en") {
  const ageSeconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (ageSeconds < 15) return language === "id" ? "baru saja" : "just now";
  if (ageSeconds < 60) return language === "id" ? `${ageSeconds} dtk lalu` : `${ageSeconds}s ago`;
  const minutes = Math.round(ageSeconds / 60);
  return language === "id" ? `${minutes} mnt lalu` : `${minutes}m ago`;
}

export function LiveDriverTracking({ orderId, active }: { orderId: string; active: boolean }) {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const [tracking, setTracking] = useState<NitipOrderTracking | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const c = language === "id" ? {
    title: "Lacak driver",
    waiting: "Menunggu lokasi driver...",
    waitingBody: "Tracking akan muncul setelah GPS driver aktif saat pengantaran.",
    live: "LIVE",
    toward: "Driver menuju lokasimu",
    remaining: "Sisa perjalanan",
    updated: "Diperbarui",
    stale: "Lokasi driver belum dapat diperbarui. Mencoba kembali...",
    mapUnavailable: "Koordinat tujuan belum tersedia untuk menampilkan rute.",
  } : {
    title: "Track driver",
    waiting: "Waiting for driver location...",
    waitingBody: "Tracking appears after the driver's GPS becomes active during delivery.",
    live: "LIVE",
    toward: "Driver is heading to you",
    remaining: "Remaining trip",
    updated: "Updated",
    stale: "Driver location could not be refreshed yet. Retrying...",
    mapUnavailable: "Destination coordinates are unavailable for route display.",
  };

  useEffect(() => {
    if (!active || !user) {
      setTracking(null);
      setRouteSummary(null);
      setLoading(false);
      setLastError(null);
      return;
    }

    let mounted = true;
    const load = async (initial = false) => {
      if (initial) setLoading(true);
      try {
        const next = await getOrderTracking(user, orderId);
        if (!mounted) return;
        setTracking(next);
        setLastError(null);
        setTick((value) => value + 1);
      } catch (error) {
        if (!mounted) return;
        setLastError(error instanceof Error ? error.message : c.stale);
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
  }, [active, c.stale, orderId, user]);

  const summary = useMemo(() => summaryLabel(routeSummary, language), [language, routeSummary]);
  const locationAge = tracking?.driver?.locationUpdatedAt
    ? ageLabel(tracking.driver.locationUpdatedAt, language)
    : null;
  void tick;

  if (!active) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: theme.colors.surfaceAccent }]}>
          <NitipIcon color={theme.colors.primary} name="location" size={18} />
        </View>
        <View style={styles.headerCopy}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{c.title}</Text>
            {tracking?.active ? (
              <View style={[styles.livePill, { backgroundColor: theme.colors.successSurface }]}>
                <View style={[styles.liveDot, { backgroundColor: theme.colors.success }]} />
                <Text style={[styles.liveText, { color: theme.colors.success }]}>{c.live}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            {tracking?.driver ? c.toward : c.waiting}
          </Text>
        </View>
      </View>

      {loading && !tracking ? (
        <View style={styles.waiting}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.waitingText, { color: theme.colors.textMuted }]}>{c.waiting}</Text>
        </View>
      ) : tracking?.driver ? (
        <>
          <View style={[styles.driverRow, { backgroundColor: theme.colors.surfaceAccent }]}>
            <View style={styles.driverCopy}>
              <Text style={[styles.driverName, { color: theme.colors.text }]}>{tracking.driver.fullName}</Text>
              <Text style={[styles.vehicle, { color: theme.colors.textMuted }]}>
                {tracking.driver.vehicleBrandModel} · {tracking.driver.vehiclePlate}
              </Text>
            </View>
            {summary ? (
              <View style={styles.summaryCopy}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>{c.remaining}</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>{summary}</Text>
              </View>
            ) : null}
          </View>

          {tracking.destination.latitude != null && tracking.destination.longitude != null ? (
            <View style={[styles.map, { borderColor: theme.colors.border }]}>
              <LiveRouteMap
                pickup={{ latitude: null, longitude: null, label: "" }}
                destination={{
                  latitude: tracking.destination.latitude,
                  longitude: tracking.destination.longitude,
                  label: tracking.destination.recipientName,
                }}
                liveOrigin={{
                  latitude: tracking.driver.latitude,
                  longitude: tracking.driver.longitude,
                  label: tracking.driver.fullName,
                }}
                onRouteSummary={setRouteSummary}
              />
            </View>
          ) : (
            <Text style={[styles.unavailable, { color: theme.colors.textMuted }]}>{c.mapUnavailable}</Text>
          )}

          {locationAge ? (
            <Text style={[styles.updated, { color: theme.colors.textMuted }]}>
              {c.updated} {locationAge}
            </Text>
          ) : null}
        </>
      ) : (
        <View style={[styles.waitingPanel, { backgroundColor: theme.colors.surfaceAccent }]}>
          <ActivityIndicator color={theme.colors.primary} />
          <View style={styles.waitingCopy}>
            <Text style={[styles.waitingTitle, { color: theme.colors.text }]}>{c.waiting}</Text>
            <Text style={[styles.waitingBody, { color: theme.colors.textMuted }]}>{c.waitingBody}</Text>
          </View>
        </View>
      )}

      {lastError ? <Text style={[styles.error, { color: theme.colors.warning }]}>{c.stale}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, marginTop: 14, padding: 15 },
  header: { alignItems: "center", flexDirection: "row" },
  icon: { alignItems: "center", borderRadius: 21, height: 42, justifyContent: "center", width: 42 },
  headerCopy: { flex: 1, paddingLeft: 11 },
  titleRow: { alignItems: "center", flexDirection: "row" },
  title: { flex: 1, fontSize: 12, fontWeight: "900" },
  subtitle: { fontSize: 8, lineHeight: 13, marginTop: 3 },
  livePill: { alignItems: "center", borderRadius: 999, flexDirection: "row", paddingHorizontal: 8, paddingVertical: 5 },
  liveDot: { borderRadius: 4, height: 7, marginRight: 5, width: 7 },
  liveText: { fontSize: 7, fontWeight: "900", letterSpacing: 0.5 },
  waiting: { alignItems: "center", paddingVertical: 24 },
  waitingText: { fontSize: 8, marginTop: 8 },
  driverRow: { alignItems: "center", borderRadius: 16, flexDirection: "row", marginTop: 14, padding: 12 },
  driverCopy: { flex: 1 },
  driverName: { fontSize: 10, fontWeight: "900" },
  vehicle: { fontSize: 8, marginTop: 3 },
  summaryCopy: { alignItems: "flex-end", marginLeft: 10 },
  summaryLabel: { fontSize: 7, fontWeight: "800" },
  summaryValue: { fontSize: 10, fontWeight: "900", marginTop: 2 },
  map: { borderRadius: 18, borderWidth: 1, height: 260, marginTop: 12, overflow: "hidden" },
  updated: { fontSize: 7, marginTop: 8, textAlign: "right" },
  unavailable: { fontSize: 8, lineHeight: 13, marginTop: 12 },
  waitingPanel: { alignItems: "center", borderRadius: 16, flexDirection: "row", marginTop: 14, padding: 14 },
  waitingCopy: { flex: 1, paddingLeft: 12 },
  waitingTitle: { fontSize: 9, fontWeight: "900" },
  waitingBody: { fontSize: 8, lineHeight: 13, marginTop: 3 },
  error: { fontSize: 7, lineHeight: 12, marginTop: 8 },
});
