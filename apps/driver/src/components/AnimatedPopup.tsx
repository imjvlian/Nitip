import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type PopupTone = "success" | "error" | "warning" | "info";

export type PopupNotice = {
  id: number;
  tone: PopupTone;
  title: string;
  message?: string | null;
  durationMs?: number;
};

export type PopupConfirmation = {
  visible: boolean;
  tone?: PopupTone;
  title: string;
  message?: string | null;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  busy?: boolean;
};

type PopupColors = {
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  success: string;
  danger: string;
  warning: string;
};

function toneColor(tone: PopupTone, colors: PopupColors) {
  if (tone === "success") return colors.success;
  if (tone === "error") return colors.danger;
  if (tone === "warning") return colors.warning;
  return colors.primary;
}

function toneGlyph(tone: PopupTone) {
  if (tone === "success") return "✓";
  if (tone === "error") return "!";
  if (tone === "warning") return "!";
  return "i";
}

export function AnimatedPopup({
  colors,
  notice,
  confirmation,
  top = 12,
  onNoticeDismiss,
  onCancel,
  onConfirm,
}: {
  colors: PopupColors;
  notice?: PopupNotice | null;
  confirmation?: PopupConfirmation | null;
  top?: number;
  onNoticeDismiss?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
}) {
  const noticeOpacity = useRef(new Animated.Value(0)).current;
  const noticeTranslate = useRef(new Animated.Value(-18)).current;
  const confirmOpacity = useRef(new Animated.Value(0)).current;
  const confirmScale = useRef(new Animated.Value(0.94)).current;
  const [confirmMounted, setConfirmMounted] = useState(Boolean(confirmation?.visible));

  useEffect(() => {
    if (!notice) return;

    noticeOpacity.stopAnimation();
    noticeTranslate.stopAnimation();
    noticeOpacity.setValue(0);
    noticeTranslate.setValue(-18);

    Animated.parallel([
      Animated.spring(noticeTranslate, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 220,
        mass: 0.8,
      }),
      Animated.timing(noticeOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(noticeTranslate, {
          toValue: -12,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(noticeOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => onNoticeDismiss?.());
    }, notice.durationMs ?? 2400);

    return () => clearTimeout(timeout);
  }, [notice, noticeOpacity, noticeTranslate, onNoticeDismiss]);

  useEffect(() => {
    if (confirmation?.visible) {
      setConfirmMounted(true);
      confirmOpacity.setValue(0);
      confirmScale.setValue(0.94);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(confirmOpacity, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.spring(confirmScale, {
            toValue: 1,
            useNativeDriver: true,
            damping: 17,
            stiffness: 230,
            mass: 0.75,
          }),
        ]).start();
      });
      return;
    }

    if (confirmMounted) {
      Animated.parallel([
        Animated.timing(confirmOpacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(confirmScale, {
          toValue: 0.97,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => setConfirmMounted(false));
    }
  }, [confirmation?.visible, confirmMounted, confirmOpacity, confirmScale]);

  const noticeTone = notice ? toneColor(notice.tone, colors) : colors.primary;
  const confirmationTone = toneColor(confirmation?.tone ?? "info", colors);

  return (
    <>
      {notice ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.notice,
            {
              top,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: noticeOpacity,
              transform: [{ translateY: noticeTranslate }],
            },
          ]}
        >
          <View style={[styles.glyph, { backgroundColor: noticeTone }]}>
            <Text style={styles.glyphText}>{toneGlyph(notice.tone)}</Text>
          </View>
          <View style={styles.copy}>
            <Text style={[styles.noticeTitle, { color: colors.text }]}>{notice.title}</Text>
            {notice.message ? (
              <Text style={[styles.noticeMessage, { color: colors.textMuted }]}>
                {notice.message}
              </Text>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      <Modal
        animationType="none"
        onRequestClose={() => {
          if (!confirmation?.busy) onCancel?.();
        }}
        transparent
        visible={confirmMounted}
      >
        <Animated.View style={[styles.backdrop, { opacity: confirmOpacity }]}>
          <Animated.View
            style={[
              styles.confirmCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                transform: [{ scale: confirmScale }],
              },
            ]}
          >
            <View style={[styles.confirmGlyph, { backgroundColor: confirmationTone }]}>
              <Text style={styles.confirmGlyphText}>{toneGlyph(confirmation?.tone ?? "info")}</Text>
            </View>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>
              {confirmation?.title ?? ""}
            </Text>
            {confirmation?.message ? (
              <Text style={[styles.confirmMessage, { color: colors.textMuted }]}>
                {confirmation.message}
              </Text>
            ) : null}
            <View style={styles.buttons}>
              <Pressable
                disabled={confirmation?.busy}
                onPress={onCancel}
                style={[styles.button, { backgroundColor: colors.border }]}
              >
                <Text style={[styles.cancelText, { color: colors.text }]}>
                  {confirmation?.cancelLabel ?? "Cancel"}
                </Text>
              </Pressable>
              <Pressable
                disabled={confirmation?.busy}
                onPress={onConfirm}
                style={[
                  styles.button,
                  {
                    backgroundColor: confirmation?.destructive
                      ? colors.danger
                      : colors.primary,
                    opacity: confirmation?.busy ? 0.55 : 1,
                  },
                ]}
              >
                <Text style={styles.confirmText}>
                  {confirmation?.busy ? "…" : confirmation?.confirmLabel ?? "Continue"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  notice: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 18,
    borderWidth: 1,
    elevation: 12,
    flexDirection: "row",
    left: 18,
    maxWidth: 560,
    minHeight: 62,
    paddingHorizontal: 13,
    paddingVertical: 11,
    position: "absolute",
    right: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    zIndex: 999,
  },
  glyph: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  glyphText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  copy: { flex: 1, paddingLeft: 11 },
  noticeTitle: { fontSize: 11, fontWeight: "900" },
  noticeMessage: { fontSize: 9, lineHeight: 14, marginTop: 2 },
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(8, 10, 16, .42)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  confirmCard: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 440,
    padding: 20,
    width: "100%",
  },
  confirmGlyph: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  confirmGlyphText: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 14,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 10,
    lineHeight: 16,
    marginTop: 7,
    textAlign: "center",
  },
  buttons: { flexDirection: "row", gap: 9, marginTop: 20, width: "100%" },
  button: {
    alignItems: "center",
    borderRadius: 15,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 10,
  },
  cancelText: { fontSize: 10, fontWeight: "900" },
  confirmText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
});
