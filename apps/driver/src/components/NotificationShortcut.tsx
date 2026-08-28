import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon } from "./NitipIcon";

export function NotificationShortcut({ visible }: { visible: boolean }) {
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}><Pressable accessibilityLabel="Notifications" accessibilityRole="button" onPress={() => router.push("/notifications")} style={[styles.button, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}><NitipIcon color={theme.colors.primary} name="notification" size={18} /></Pressable></View>;
}
const styles = StyleSheet.create({ wrap: { position: "absolute", right: 18, zIndex: 80 }, button: { alignItems: "center", borderRadius: 20, borderWidth: 1, elevation: 4, height: 40, justifyContent: "center", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, width: 40 } });
