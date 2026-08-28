import type { NitipOrderTracking } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getOrderTracking } from "../lib/api";
import { NitipIcon } from "./NitipIcon";

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
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const c = language === "id" ? {
    title: "Lacak driver realtime",
    waiting: "Menunggu posisi driver...",
    waitingBody: "Posisi akan muncul saat GPS driver mulai mengirim update pengantaran.",
    live: "LIVE",
    toward: "Driver sedang menuju lokasimu",
    open: "Buka live tracking",
    updated: "Update",
    retrying: "Tracking sedang mencoba tersambung kembali.",
  } : {
    title: "Track driver in real time",
    waiting: "Waiting for driver position...",
    waitingBody: "The position appears when the driver's GPS starts sending delivery updates.",
    live: "LIVE",
    toward: "Driver is heading to your location",
    open: "Open live tracking",
    updated: "Updated",
    retrying: "Tracking is trying to reconnect.",
  };

  useEffect(() => {
    if (!active || !user) {
      setTracking(null);
      setLoading(false);
      setFailed(false);
      return;
    }

    let mounted = true;
    const load = async (initial = false) => {
      if (initial) setLoading(true);
      try {
        const next = await getOrderTracking(user, orderId);
        if (!mounted) return;
        setTracking(next);
        setFailed(false);
      } catch {
        if (mounted) setFailed(true);
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
  }, [active, orderId, user]);

  if (!active) return null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/tracking/[id]", params: { id: orderId } })}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <View style={[styles.icon, { backgroundColor: theme.colors.surfaceAccent }]}>
        <NitipIcon color={theme.colors.primary} name="location" size={19} />
      </View>

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{c.title}</Text>
          {tracking?.active ? (
            <View style={[styles.livePill, { backgroundColor: theme.colors.successSurface }]}> 
              <View style={[styles.liveDot, { backgroundColor: theme.colors.success }]} />
              <Text style={[styles.liveText, { color: theme.colors.success }]}>{c.live}</Text>
            </View>
          ) : null}
        </View>

        {loading && !tracking ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
            <Text style={[styles.body, { color: theme.colors.textMuted }]}>{c.waiting}</Text>
          </View>
        ) : tracking?.driver ? (
          <>
            <Text style={[styles.body, { color: theme.colors.textMuted }]}>{c.toward}</Text>
            <Text style={[styles.driver, { color: theme.colors.text }]}>{tracking.driver.fullName} · {tracking.driver.vehiclePlate}</Text>
            <Text style={[styles.updated, { color: theme.colors.textMuted }]}>{c.updated} {ageLabel(tracking.driver.locationUpdatedAt, language)}</Text>
          </>
        ) : (
          <>
            <Text style={[styles.body, { color: theme.colors.textMuted }]}>{failed ? c.retrying : c.waiting}</Text>
            <Text style={[styles.updated, { color: theme.colors.textMuted }]}>{c.waitingBody}</Text>
          </>
        )}

        <View style={styles.openRow}>
          <Text style={[styles.openText, { color: theme.colors.primary }]}>{c.open}</Text>
          <NitipIcon color={theme.colors.primary} name="next" size={14} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "flex-start", borderRadius: 20, borderWidth: 1, flexDirection: "row", marginTop: 14, padding: 14 },
  icon: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  copy: { flex: 1, paddingLeft: 12 },
  titleRow: { alignItems: "center", flexDirection: "row" },
  title: { flex: 1, fontSize: 11, fontWeight: "900" },
  livePill: { alignItems: "center", borderRadius: 999, flexDirection: "row", paddingHorizontal: 8, paddingVertical: 5 },
  liveDot: { borderRadius: 4, height: 7, marginRight: 5, width: 7 },
  liveText: { fontSize: 7, fontWeight: "900", letterSpacing: 0.5 },
  loadingRow: { alignItems: "center", flexDirection: "row", gap: 7, marginTop: 5 },
  body: { fontSize: 8, lineHeight: 13, marginTop: 4 },
  driver: { fontSize: 9, fontWeight: "900", marginTop: 6 },
  updated: { fontSize: 7, lineHeight: 11, marginTop: 3 },
  openRow: { alignItems: "center", flexDirection: "row", marginTop: 10 },
  openText: { flex: 1, fontSize: 8, fontWeight: "900" },
});
