import { useNitipLanguage } from "@nitip/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useDriverTheme, type DriverThemePreference } from "../context/ThemeContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

export default function AppearanceScreen() {
  const { language } = useNitipLanguage();
  const { preference, setPreference } = useDriverTheme();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const c = language === "id"
    ? { title: "Tampilan", heading: "Pilih tampilan.", subtitle: "Gunakan tema perangkat atau pilih mode terang/gelap secara manual.", system: "System", systemBody: "Ikuti pengaturan perangkat", light: "Terang", lightBody: "Gunakan tampilan terang", dark: "Gelap", darkBody: "Gunakan tampilan gelap" }
    : { title: "Appearance", heading: "Choose appearance.", subtitle: "Follow the device theme or select light/dark mode manually.", system: "System", systemBody: "Follow device settings", light: "Light", lightBody: "Use light appearance", dark: "Dark", darkBody: "Use dark appearance" };

  const options: { key: DriverThemePreference; icon: "system" | "sun" | "moon"; title: string; body: string }[] = [
    { key: "system", icon: "system", title: c.system, body: c.systemBody },
    { key: "light", icon: "sun", title: c.light, body: c.lightBody },
    { key: "dark", icon: "moon", title: c.dark, body: c.darkBody },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top + 10 }]}> 
      <View style={styles.content}>
        <AppHeader title={c.title} />
        <Text style={[styles.heading, { color: theme.colors.text }]}>{c.heading}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text>
        <View style={styles.list}>
          {options.map((option) => {
            const selected = preference === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => void setPreference(option.key)}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <View style={[styles.badge, { backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAccent }]}> 
                  <NitipIcon color={selected ? "#FFFFFF" : theme.colors.primary} name={option.icon} size={19} />
                </View>
                <View style={styles.copy}>
                  <Text style={[styles.title, { color: theme.colors.text }]}>{option.title}</Text>
                  <Text style={[styles.body, { color: theme.colors.textMuted }]}>{option.body}</Text>
                </View>
                {selected ? <NitipIcon color={theme.colors.primary} name="check" size={16} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { flex: 1, paddingHorizontal: 20 }, heading: { fontSize: 27, fontWeight: "900", letterSpacing: -0.7, marginTop: 26 }, subtitle: { fontSize: 10, lineHeight: 17, marginTop: 6 }, list: { gap: 10, marginTop: 20 }, card: { alignItems: "center", borderRadius: 18, borderWidth: 1, flexDirection: "row", minHeight: 72, padding: 12 }, badge: { alignItems: "center", borderRadius: 21, height: 42, justifyContent: "center", width: 42 }, copy: { flex: 1, paddingHorizontal: 12 }, title: { fontSize: 11, fontWeight: "900" }, body: { fontSize: 9, marginTop: 2 },
});
