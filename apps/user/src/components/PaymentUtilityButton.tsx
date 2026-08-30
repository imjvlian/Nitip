import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Linking, Pressable, StyleSheet, Text } from "react-native";

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
      <NitipIcon color={theme.colors.primary} name="document" size={14} />
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

  if (!url) return null;

  let saving = false;

  async function saveImage() {
    if (saving) return;
    saving = true;
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
      saving = false;
    }
  }

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => void saveImage()}
      style={({ pressed }) => [
        styles.primaryButton,
        {
          backgroundColor: theme.colors.primary,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <NitipIcon color="#FFFFFF" name="receipt" size={14} />
      <Text style={styles.primaryText}>{saving ? savingLabel : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 42,
    paddingHorizontal: 14,
  },
  secondaryText: {
    fontSize: 9,
    fontWeight: "900",
  },
});
