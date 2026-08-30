import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { useState } from "react";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon } from "./NitipIcon";

export function CopyPaymentValueButton({
  value,
  label,
  copiedMessage,
  failedMessage,
  onStatus,
}: {
  value: string | null;
  label: string;
  copiedMessage: string;
  failedMessage: string;
  onStatus: (message: string) => void;
}) {
  const theme = useNitipTheme();

  if (!value) return null;

  async function copyValue() {
    try {
      await Clipboard.setStringAsync(value ?? "");
      onStatus(copiedMessage);
    } catch {
      onStatus(failedMessage);
    }
  }

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => void copyValue()}
      style={({ pressed }) => [
        styles.secondaryButton,
        {
          backgroundColor: theme.colors.surfaceAccent,
          borderColor: theme.colors.primary,
          opacity: pressed ? 0.68 : 1,
        },
      ]}
    >
      <NitipIcon color={theme.colors.primary} name="document" size={17} />
      <Text style={[styles.secondaryText, { color: theme.colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

export function SaveQrImageButton({
  url,
  fileStem,
  label,
  savingLabel,
  readyMessage,
  failedMessage,
  onStatus,
}: {
  url: string | null;
  fileStem: string;
  label: string;
  savingLabel: string;
  readyMessage: string;
  failedMessage: string;
  onStatus: (message: string) => void;
}) {
  const theme = useNitipTheme();
  const [saving, setSaving] = useState(false);

  if (!url) return null;

  async function saveImage() {
    if (saving) return;
    setSaving(true);
    try {
      const safeStem = fileStem.replace(/[^a-z0-9_-]/gi, "-") || "payment";
      const target = `${FileSystem.cacheDirectory ?? ""}nitip-qris-${safeStem}-${Date.now()}.png`;
      const downloaded = await FileSystem.downloadAsync(url ?? "", target);
      const sharingAvailable = await Sharing.isAvailableAsync();

      if (sharingAvailable) {
        await Sharing.shareAsync(downloaded.uri, {
          dialogTitle: label,
          mimeType: "image/png",
        });
      } else {
        await Linking.openURL(url ?? "");
      }
      onStatus(readyMessage);
    } catch {
      onStatus(failedMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={saving}
      onPress={() => void saveImage()}
      style={({ pressed }) => [
        styles.primaryButton,
        {
          backgroundColor: theme.colors.primary,
          opacity: saving ? 0.55 : pressed ? 0.72 : 1,
        },
      ]}
    >
      <NitipIcon color="#FFFFFF" name="receipt" size={17} />
      <Text style={styles.primaryText}>{saving ? savingLabel : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: 16,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryText: {
    fontSize: 11,
    fontWeight: "900",
  },
});
