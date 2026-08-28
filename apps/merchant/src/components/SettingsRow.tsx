import { Pressable, StyleSheet, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon, type NitipIconName } from "./NitipIcon";

export function SettingsRow({
  icon,
  title,
  description,
  value,
  onPress,
  danger = false,
  showChevron = true,
}: {
  icon: NitipIconName;
  title: string;
  description?: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
  showChevron?: boolean;
}) {
  const theme = useNitipTheme();
  const isDark = theme.mode === "dark";
  const titleColor = danger ? theme.colors.danger : theme.colors.text;
  const cardBackground = danger
    ? theme.colors.dangerSurface
    : isDark
      ? theme.colors.surfaceRaised
      : "#FFFFFF";
  const badgeBackground = danger
    ? theme.colors.dangerSurface
    : isDark
      ? theme.colors.surfaceAccent
      : "#EEF1FF";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: cardBackground,
          borderColor: danger ? theme.colors.dangerSurface : theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: badgeBackground }]}> 
        <NitipIcon
          color={danger ? theme.colors.danger : theme.colors.primary}
          name={icon}
          size={18}
        />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: titleColor }]}>{title}</Text>
        {description ? (
          <Text numberOfLines={2} style={[styles.description, { color: theme.colors.textMuted }]}> 
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text numberOfLines={1} style={[styles.value, { color: theme.colors.textMuted }]}> 
          {value}
        </Text>
      ) : null}
      {!danger && showChevron ? (
        <View style={styles.chevron}>
          <NitipIcon color={theme.colors.textMuted} name="next" size={14} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    flexDirection: "row",
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
    width: "100%",
  },
  badge: {
    alignItems: "center",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  copy: { flex: 1, minWidth: 0, paddingHorizontal: 12 },
  title: { fontSize: 11, fontWeight: "800" },
  description: { fontSize: 9, fontWeight: "500", lineHeight: 13, marginTop: 2 },
  value: { fontSize: 9, fontWeight: "700", marginRight: 8, maxWidth: 92 },
  chevron: { alignItems: "center", justifyContent: "center", width: 18 },
});
