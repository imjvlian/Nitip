import type { NitipDriverOrder } from "@nitip/domain/driver";
import { useNitipLanguage } from "@nitip/i18n";
import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getCurrentDriverOrder } from "../lib/api";
import { NitipIcon } from "./NitipIcon";

export function LiveTrackingShortcut({ bottom }: { bottom: number }) {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const pathname = usePathname();
  const [order, setOrder] = useState<NitipDriverOrder | null>(null);

  useEffect(() => {
    if (!user) {
      setOrder(null);
      return;
    }

    let mounted = true;
    const load = async () => {
      try {
        const next = await getCurrentDriverOrder(user);
        if (mounted) setOrder(next?.status === "on_delivery" ? next : null);
      } catch {
        // Keep the shortcut quiet when connectivity is temporarily unavailable.
      }
    };

    void load();
    const timer = setInterval(() => { void load(); }, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [user]);

  if (!order || pathname === "/tracking") return null;

  const label = language === "id" ? "Live Route" : "Live Route";
  const detail = language === "id" ? "Rute realtime aktif" : "Real-time route active";

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => {
        if (pathname.startsWith("/order/")) router.replace("/tracking");
        else router.push("/tracking");
      }}
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.primary,
          bottom,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <View style={styles.iconWrap}>
        <NitipIcon color="#FFFFFF" name="location" size={17} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <View style={styles.liveDot} />
          <Text style={styles.title}>{label}</Text>
        </View>
        <Text numberOfLines={1} style={styles.detail}>{detail}</Text>
      </View>
      <NitipIcon color="#FFFFFF" name="next" size={15} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    borderRadius: 18,
    elevation: 8,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: 14,
    position: "absolute",
    right: 16,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    width: 190,
    zIndex: 90,
  },
  iconWrap: { alignItems: "center", height: 34, justifyContent: "center", width: 34 },
  copy: { flex: 1, paddingHorizontal: 7 },
  titleRow: { alignItems: "center", flexDirection: "row" },
  liveDot: { backgroundColor: "#73F29A", borderRadius: 4, height: 7, marginRight: 6, width: 7 },
  title: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  detail: { color: "rgba(255,255,255,0.76)", fontSize: 7, marginTop: 2 },
});
