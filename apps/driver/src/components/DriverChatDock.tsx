import { useNitipLanguage } from "@nitip/i18n";
import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon } from "./NitipIcon";

function orderIdFromPath(pathname: string) {
  const match = /^\/order\/([^/]+)$/.exec(pathname);
  return match?.[1] ?? null;
}

export function DriverChatDock() {
  const pathname = usePathname();
  const orderId = orderIdFromPath(pathname);
  const { language } = useNitipLanguage();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();

  if (!orderId) return null;

  const label = language === "id" ? "Chat customer" : "Customer chat";
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom + 14, 20) }]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: "/chat/[orderId]", params: { orderId } })}
        style={[styles.button, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.shadow }]}
      >
        <NitipIcon color="#FFFFFF" name="chat" size={17} />
        <Text style={styles.text}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { left: 20, position: "absolute", right: 20, zIndex: 90 },
  button: { alignItems: "center", borderRadius: 17, elevation: 8, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 50, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 12 },
  text: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
});
