import type { PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNitipTheme } from "../hooks/useNitipTheme";

type BridgeButton = {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type BridgeDialog = {
  title: string;
  message?: string;
  buttons: BridgeButton[];
  cancelable: boolean;
  onDismiss?: () => void;
};

type BridgeNotice = {
  id: number;
  title: string;
  message?: string;
  tone: "info" | "success" | "warning" | "error";
  onDone?: () => void;
};

function inferTone(title: string, message?: string): BridgeNotice["tone"] {
  const value = `${title} ${message ?? ""}`.toLowerCase();
  if (/gagal|error|failed|salah|wrong|ditolak|rejected|tidak dapat|unable/.test(value)) return "error";
  if (/peringatan|warning|izin|permission|perlu|required|stok|stock/.test(value)) return "warning";
  if (/berhasil|success|tersimpan|saved|selesai|completed|confirmed|dikonfirmasi/.test(value)) return "success";
  return "info";
}

function toneColor(tone: BridgeNotice["tone"], colors: ReturnType<typeof useNitipTheme>["colors"]) {
  if (tone === "success") return colors.success;
  if (tone === "warning") return colors.warning;
  if (tone === "error") return colors.danger;
  return colors.primary;
}

export function AlertPopupProvider({ children }: PropsWithChildren) {
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<BridgeNotice | null>(null);
  const [dialog, setDialog] = useState<BridgeDialog | null>(null);
  const noticeOpacity = useRef(new Animated.Value(0)).current;
  const noticeY = useRef(new Animated.Value(-18)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const original = Alert.alert;
    const bridge: typeof Alert.alert = (title, message, buttons, options) => {
      const nextButtons = (buttons?.length ? buttons : [{ text: "OK" }]) as BridgeButton[];
      if (nextButtons.length <= 1) {
        setDialog(null);
        setNotice({
          id: Date.now(),
          title,
          message,
          tone: inferTone(title, message),
          onDone: nextButtons[0]?.onPress,
        });
        return;
      }
      setNotice(null);
      setDialog({
        title,
        message,
        buttons: nextButtons,
        cancelable: options?.cancelable ?? true,
        onDismiss: options?.onDismiss,
      });
    };

    (Alert as { alert: typeof Alert.alert }).alert = bridge;
    return () => {
      if (Alert.alert === bridge) (Alert as { alert: typeof Alert.alert }).alert = original;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    noticeOpacity.stopAnimation();
    noticeY.stopAnimation();
    noticeOpacity.setValue(0);
    noticeY.setValue(-18);
    Animated.parallel([
      Animated.timing(noticeOpacity, { toValue: 1, duration: 170, useNativeDriver: true }),
      Animated.spring(noticeY, { toValue: 0, damping: 17, stiffness: 230, mass: 0.8, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(noticeOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(noticeY, { toValue: -12, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        const callback = notice.onDone;
        setNotice((current) => current?.id === notice.id ? null : current);
        callback?.();
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [notice, noticeOpacity, noticeY]);

  useEffect(() => {
    if (!dialog) return;
    modalOpacity.setValue(0);
    modalScale.setValue(0.95);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(modalOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(modalScale, { toValue: 1, damping: 18, stiffness: 230, mass: 0.8, useNativeDriver: true }),
      ]).start();
    });
  }, [dialog, modalOpacity, modalScale]);

  function closeDialog(button?: BridgeButton) {
    Animated.parallel([
      Animated.timing(modalOpacity, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(modalScale, { toValue: 0.97, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      setDialog(null);
      button?.onPress?.();
    });
  }

  function cancelDialog() {
    if (!dialog?.cancelable) return;
    const cancel = dialog.buttons.find((button) => button.style === "cancel");
    Animated.timing(modalOpacity, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
      setDialog(null);
      cancel?.onPress?.();
      dialog.onDismiss?.();
    });
  }

  const noticeTone = notice ? toneColor(notice.tone, theme.colors) : theme.colors.primary;

  return (
    <View style={styles.root}>
      {children}

      {notice ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.notice,
            {
              top: insets.top + 10,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: noticeOpacity,
              transform: [{ translateY: noticeY }],
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          <View style={[styles.noticeIcon, { backgroundColor: noticeTone }]}>
            <Text style={styles.noticeGlyph}>{notice.tone === "success" ? "✓" : notice.tone === "info" ? "i" : "!"}</Text>
          </View>
          <View style={styles.noticeCopy}>
            <Text style={[styles.noticeTitle, { color: theme.colors.text }]}>{notice.title}</Text>
            {notice.message ? <Text style={[styles.noticeMessage, { color: theme.colors.textMuted }]}>{notice.message}</Text> : null}
          </View>
        </Animated.View>
      ) : null}

      <Modal
        animationType="none"
        onRequestClose={cancelDialog}
        transparent
        visible={Boolean(dialog)}
      >
        <Animated.View style={[styles.backdrop, { opacity: modalOpacity }]}>
          <Animated.View
            style={[
              styles.dialog,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                transform: [{ scale: modalScale }],
              },
            ]}
          >
            <View style={[styles.dialogIcon, { backgroundColor: dialog?.buttons.some((button) => button.style === "destructive") ? theme.colors.dangerSurface : theme.colors.surfaceAccent }]}>
              <Text style={[styles.dialogGlyph, { color: dialog?.buttons.some((button) => button.style === "destructive") ? theme.colors.danger : theme.colors.primary }]}>!</Text>
            </View>
            <Text style={[styles.dialogTitle, { color: theme.colors.text }]}>{dialog?.title ?? ""}</Text>
            {dialog?.message ? <Text style={[styles.dialogMessage, { color: theme.colors.textMuted }]}>{dialog.message}</Text> : null}
            <View style={styles.actions}>
              {dialog?.buttons.map((button, index) => {
                const destructive = button.style === "destructive";
                const cancel = button.style === "cancel";
                return (
                  <Pressable
                    key={`${button.text ?? "action"}-${index}`}
                    onPress={() => closeDialog(button)}
                    style={[
                      styles.action,
                      {
                        backgroundColor: destructive ? theme.colors.danger : cancel ? theme.colors.surfaceAccent : theme.colors.primary,
                        borderColor: cancel ? theme.colors.border : "transparent",
                      },
                    ]}
                  >
                    <Text style={[styles.actionText, { color: cancel ? theme.colors.text : "#FFFFFF" }]}>{button.text ?? "OK"}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  notice: { alignItems: "center", alignSelf: "center", borderRadius: 18, borderWidth: 1, elevation: 14, flexDirection: "row", left: 18, maxWidth: 560, minHeight: 62, paddingHorizontal: 13, paddingVertical: 11, position: "absolute", right: 18, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.16, shadowRadius: 14, zIndex: 9999 },
  noticeIcon: { alignItems: "center", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  noticeGlyph: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  noticeCopy: { flex: 1, paddingLeft: 11 },
  noticeTitle: { fontSize: 11, fontWeight: "900" },
  noticeMessage: { fontSize: 9, lineHeight: 14, marginTop: 2 },
  backdrop: { alignItems: "center", backgroundColor: "rgba(8,10,16,.45)", flex: 1, justifyContent: "center", paddingHorizontal: 22 },
  dialog: { alignItems: "center", borderRadius: 24, borderWidth: 1, maxWidth: 440, padding: 20, width: "100%" },
  dialogIcon: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  dialogGlyph: { fontSize: 21, fontWeight: "900" },
  dialogTitle: { fontSize: 16, fontWeight: "900", marginTop: 14, textAlign: "center" },
  dialogMessage: { fontSize: 10, lineHeight: 16, marginTop: 7, textAlign: "center" },
  actions: { gap: 8, marginTop: 20, width: "100%" },
  action: { alignItems: "center", borderRadius: 15, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 12 },
  actionText: { fontSize: 10, fontWeight: "900" },
});
