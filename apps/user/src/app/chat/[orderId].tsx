import type { NitipOrderChatThread } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPopup, type PopupNotice } from "../../components/AnimatedPopup";
import { AppHeader } from "../../components/AppHeader";
import { NitipIcon } from "../../components/NitipIcon";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { getOrderChat, sendOrderChatMessage } from "../../lib/api";

function formatTime(value: string, language: "id" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(language === "id" ? "id-ID" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CustomerOrderChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [thread, setThread] = useState<NitipOrderChatThread | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<PopupNotice | null>(null);

  const c = language === "id" ? {
    title: "Chat driver",
    subtitle: "Gunakan chat ini hanya untuk koordinasi pengantaran pesanan.",
    loading: "Membuka percakapan...",
    unavailable: "Chat belum tersedia",
    retry: "Coba lagi",
    placeholder: "Tulis pesan untuk driver...",
    send: "Kirim",
    readonly: "Pengantaran sudah selesai. Percakapan ini sekarang hanya dapat dibaca.",
    empty: "Belum ada pesan",
    emptyBody: "Kirim pesan singkat jika driver perlu detail lokasi atau instruksi tambahan.",
    failed: "Pesan gagal dikirim",
    live: "Pembaruan otomatis",
  } : {
    title: "Driver chat",
    subtitle: "Use this chat only to coordinate this delivery.",
    loading: "Opening conversation...",
    unavailable: "Chat is not available yet",
    retry: "Try again",
    placeholder: "Message your driver...",
    send: "Send",
    readonly: "The delivery is complete. This conversation is now read-only.",
    empty: "No messages yet",
    emptyBody: "Send a short message when the driver needs extra location details or instructions.",
    failed: "Message failed to send",
    live: "Auto refresh",
  };

  const load = useCallback(async (showLoader = false) => {
    if (!user || !orderId) return;
    if (showLoader) setLoading(true);
    try {
      const next = await getOrderChat(user, orderId);
      setThread(next);
      setError(null);
    } catch (nextError) {
      if (showLoader || !thread) {
        setError(nextError instanceof Error ? nextError.message : c.unavailable);
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [c.unavailable, orderId, thread, user]);

  useEffect(() => {
    void load(true);
  }, [orderId, user]);

  useEffect(() => {
    if (!thread) return;
    const timer = setInterval(() => void load(false), 4000);
    return () => clearInterval(timer);
  }, [load, thread?.orderId]);

  if (!user) return <Redirect href="/login" />;

  async function send() {
    const message = text.trim();
    if (!thread?.writable || !message || sending) return;
    setSending(true);
    try {
      const created = await sendOrderChatMessage(user, thread.orderId, message);
      setThread((current) => current ? { ...current, messages: [...current.messages, created] } : current);
      setText("");
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch (nextError) {
      setNotice({
        id: Date.now(),
        tone: "error",
        title: c.failed,
        message: nextError instanceof Error ? nextError.message : c.failed,
        durationMs: 3200,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <AnimatedPopup
        colors={theme.colors}
        notice={notice}
        onNoticeDismiss={() => setNotice(null)}
        top={insets.top + 8}
      />

      <View style={[styles.headerWrap, { paddingTop: insets.top + 10 }]}>
        <AppHeader title={c.title} onBack={() => router.back()} />
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>{c.loading}</Text>
        </View>
      ) : error && !thread ? (
        <View style={styles.state}>
          <View style={[styles.stateIcon, { backgroundColor: theme.colors.surfaceAccent }]}>
            <NitipIcon color={theme.colors.primary} name="help" size={20} />
          </View>
          <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{c.unavailable}</Text>
          <Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>{error}</Text>
          <Pressable onPress={() => void load(true)} style={[styles.retry, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.retryText}>{c.retry}</Text>
          </Pressable>
        </View>
      ) : thread ? (
        <>
          <View style={[styles.threadHeader, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceAccent }]}>
              <NitipIcon color={theme.colors.primary} name="delivery" size={18} />
            </View>
            <View style={styles.headerCopy}>
              <Text numberOfLines={1} style={[styles.counterpart, { color: theme.colors.text }]}>{thread.counterpartName}</Text>
              <Text style={[styles.orderCode, { color: theme.colors.primary }]}>{thread.orderCode}</Text>
            </View>
            <View style={[styles.liveBadge, { backgroundColor: theme.colors.successSurface }]}>
              <Text style={[styles.liveText, { color: theme.colors.success }]}>{c.live}</Text>
            </View>
          </View>

          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
          >
            {thread.messages.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <NitipIcon color={theme.colors.textMuted} name="help" size={22} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{c.empty}</Text>
                <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{c.emptyBody}</Text>
              </View>
            ) : thread.messages.map((message) => {
              const own = message.senderRole === "customer";
              return (
                <View key={message.id} style={[styles.messageRow, own ? styles.ownRow : styles.otherRow]}>
                  <View style={[
                    styles.bubble,
                    {
                      backgroundColor: own ? theme.colors.primary : theme.colors.surface,
                      borderColor: own ? theme.colors.primary : theme.colors.border,
                    },
                  ]}>
                    {!own ? <Text style={[styles.sender, { color: theme.colors.primary }]}>{message.senderName}</Text> : null}
                    <Text style={[styles.messageText, { color: own ? "#FFFFFF" : theme.colors.text }]}>{message.text}</Text>
                    <Text style={[styles.time, { color: own ? "rgba(255,255,255,0.72)" : theme.colors.textMuted }]}>{formatTime(message.createdAt, language)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {thread.writable ? (
            <View style={[styles.composerWrap, { borderTopColor: theme.colors.border, paddingBottom: Math.max(insets.bottom + 8, 14) }]}>
              <View style={[styles.composer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <TextInput
                  maxLength={700}
                  multiline
                  onChangeText={setText}
                  placeholder={c.placeholder}
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.input, { color: theme.colors.text }]}
                  value={text}
                />
                <Pressable
                  disabled={!text.trim() || sending}
                  onPress={() => void send()}
                  style={[styles.sendButton, { backgroundColor: theme.colors.primary, opacity: !text.trim() || sending ? 0.45 : 1 }]}
                >
                  {sending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.sendText}>{c.send}</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={[styles.readonly, { backgroundColor: theme.colors.surfaceAccent, paddingBottom: Math.max(insets.bottom + 12, 18) }]}>
              <Text style={[styles.readonlyText, { color: theme.colors.textMuted }]}>{c.readonly}</Text>
            </View>
          )}
        </>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerWrap: { paddingHorizontal: 18 },
  threadHeader: { alignItems: "center", borderRadius: 20, borderWidth: 1, flexDirection: "row", marginHorizontal: 18, marginTop: 14, padding: 12 },
  avatar: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  headerCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  counterpart: { fontSize: 11, fontWeight: "900" },
  orderCode: { fontSize: 8, fontWeight: "900", marginTop: 2 },
  liveBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6 },
  liveText: { fontSize: 6, fontWeight: "900" },
  subtitle: { fontSize: 8, lineHeight: 13, marginHorizontal: 22, marginTop: 9 },
  messages: { flexGrow: 1, paddingBottom: 16, paddingHorizontal: 18, paddingTop: 14 },
  messageRow: { marginBottom: 9, width: "100%" },
  ownRow: { alignItems: "flex-end" },
  otherRow: { alignItems: "flex-start" },
  bubble: { borderRadius: 18, borderWidth: 1, maxWidth: "82%", minWidth: 72, paddingHorizontal: 12, paddingVertical: 9 },
  sender: { fontSize: 7, fontWeight: "900", marginBottom: 3 },
  messageText: { fontSize: 10, lineHeight: 15 },
  time: { fontSize: 6, fontWeight: "700", marginTop: 5, textAlign: "right" },
  composerWrap: { borderTopWidth: 1, paddingHorizontal: 14, paddingTop: 9 },
  composer: { alignItems: "flex-end", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 8, padding: 7 },
  input: { flex: 1, fontSize: 10, lineHeight: 15, maxHeight: 94, minHeight: 40, paddingHorizontal: 8, paddingVertical: 10 },
  sendButton: { alignItems: "center", borderRadius: 13, justifyContent: "center", minHeight: 40, minWidth: 58, paddingHorizontal: 12 },
  sendText: { color: "#FFFFFF", fontSize: 8, fontWeight: "900" },
  readonly: { marginTop: "auto", paddingHorizontal: 20, paddingTop: 14 },
  readonlyText: { fontSize: 8, lineHeight: 13, textAlign: "center" },
  empty: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 36, padding: 24 },
  emptyTitle: { fontSize: 11, fontWeight: "900", marginTop: 9 },
  emptyBody: { fontSize: 8, lineHeight: 13, marginTop: 4, maxWidth: 260, textAlign: "center" },
  state: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  stateIcon: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  stateTitle: { fontSize: 12, fontWeight: "900", marginTop: 10 },
  stateBody: { fontSize: 9, lineHeight: 14, marginTop: 5, textAlign: "center" },
  retry: { borderRadius: 14, marginTop: 14, paddingHorizontal: 18, paddingVertical: 11 },
  retryText: { color: "#FFFFFF", fontSize: 8, fontWeight: "900" },
});
