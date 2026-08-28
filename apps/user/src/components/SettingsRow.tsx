import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon, type NitipIconName } from "./NitipIcon";

export function SettingsGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export function SettingsDivider() {
  return <View style={styles.dividerSpace} />;
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  danger = false,
}: {
  icon: NitipIconName;
  title: string;
  subtitle: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useNitipTheme();
  const isDark = theme.mode === "dark";
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
  const titleColor = danger ? theme.colors.danger : theme.colors.text;
  const iconColor = danger ? theme.colors.danger : theme.colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: cardBackground,
          borderColor: danger ? theme.colors.dangerSurface : isDark ? theme.colors.border : "#E8E9ED",
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <View style={[styles.iconBadge, { backgroundColor: badgeBackground }]}>
        <NitipIcon color={iconColor} name={icon} size={18} />
      </View>

      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: titleColor }]}>
          {title}
        </Text>
        <Text numberOfLines={2} style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          {subtitle}
        </Text>
      </View>

      {value ? (
        <Text numberOfLines={1} style={[styles.value, { color: theme.colors.textMuted }]}>
          {value}
        </Text>
      ) : null}

      <View style={styles.chevronWrap}>
        <NitipIcon color={danger ? theme.colors.danger : theme.colors.textMuted} name="next" size={14} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    width: "100%",
  },
  dividerSpace: {
    height: 10,
  },
  row: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    flexDirection: "row",
    minHeight: 66,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 7,
    width: "100%",
  },
  iconBadge: {
    alignItems: "center",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 9,
    fontWeight: "500",
    lineHeight: 13,
    marginTop: 2,
  },
  value: {
    fontSize: 9,
    fontWeight: "700",
    marginRight: 8,
    maxWidth: 92,
    textAlign: "right",
  },
  chevronWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 18,
  },
});
