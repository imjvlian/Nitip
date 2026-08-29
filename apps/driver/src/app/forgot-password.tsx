import { useNitipLanguage } from "@nitip/i18n";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

export default function DriverForgotPasswordScreen() {
  const { language } = useNitipLanguage();
  const { configured, resetPassword } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const c = language === "id" ? {
    title: "Lupa kata sandi",
    heading: "Pulihkan akses driver.",
    body: "Masukkan email akun Nitip Driver. Kami akan mengirim tautan reset kata sandi ke email tersebut.",
    email: "Email akun",
    placeholder: "nama@email.com",
    send: "Kirim tautan reset",
    sending: "Mengirim...",
    required: "Email wajib diisi",
    requiredBody: "Masukkan email akun Nitip Driver terlebih dahulu.",
    sent: "Tautan reset dikirim",
    sentBody: "Periksa inbox dan folder spam pada email tersebut.",
    failed: "Tautan reset belum dapat dikirim",
    failedBody: "Coba lagi beberapa saat.",
    serviceUnavailable: "Layanan sementara tidak tersedia",
    serviceUnavailableBody: "Pemulihan akun sedang tidak dapat digunakan. Coba lagi beberapa saat.",
  } : {
    title: "Forgot password",
    heading: "Recover driver access.",
    body: "Enter your Nitip Driver email. We will send a password-reset link to that address.",
    email: "Account email",
    placeholder: "name@email.com",
    send: "Send reset link",
    sending: "Sending...",
    required: "Email is required",
    requiredBody: "Enter your Nitip Driver account email first.",
    sent: "Reset link sent",
    sentBody: "Check the inbox and spam folder for that email address.",
    failed: "Reset link could not be sent",
    failedBody: "Please try again shortly.",
    serviceUnavailable: "Service temporarily unavailable",
    serviceUnavailableBody: "Account recovery is currently unavailable. Please try again shortly.",
  };

  async function submit() {
    const normalized = email.trim();
    if (!normalized) {
      Alert.alert(c.required, c.requiredBody);
      return;
    }
    if (!configured || sending) return;
    setSending(true);
    try {
      await resetPassword(normalized);
      Alert.alert(c.sent, c.sentBody);
    } catch {
      Alert.alert(c.failed, c.failedBody);
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { backgroundColor: theme.colors.background, paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 30, 42) }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AppHeader title={c.title} onBack={() => router.replace("/login")} />
      <View style={styles.hero}>
        <Text style={[styles.heading, { color: theme.colors.text }]}>{c.heading}</Text>
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>{c.body}</Text>
      </View>
      {!configured ? (
        <View style={[styles.notice, { backgroundColor: theme.colors.warningSurface }]}>
          <Text style={[styles.noticeTitle, { color: theme.colors.warning }]}>{c.serviceUnavailable}</Text>
          <Text style={[styles.noticeBody, { color: theme.colors.textMuted }]}>{c.serviceUnavailableBody}</Text>
        </View>
      ) : null}
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{c.email}</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!sending}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder={c.placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, color: theme.colors.text }]}
          value={email}
        />
        <Pressable
          disabled={!configured || sending}
          onPress={() => void submit()}
          style={[styles.button, { backgroundColor: theme.colors.primary, opacity: !configured || sending ? 0.45 : 1 }]}
        >
          {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{c.send}</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 20 },
  hero: { marginTop: 36 },
  heading: { fontSize: 29, fontWeight: "900", letterSpacing: -0.9 },
  body: { fontSize: 10, lineHeight: 17, marginTop: 8, maxWidth: 350 },
  notice: { borderRadius: 18, marginTop: 18, padding: 14 },
  noticeTitle: { fontSize: 10, fontWeight: "900" },
  noticeBody: { fontSize: 8, lineHeight: 13, marginTop: 4 },
  card: { borderRadius: 22, borderWidth: 1, marginTop: 24, padding: 16 },
  label: { fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  input: { borderRadius: 16, borderWidth: 1, fontSize: 12, marginTop: 8, minHeight: 50, paddingHorizontal: 14 },
  button: { alignItems: "center", borderRadius: 16, justifyContent: "center", marginTop: 15, minHeight: 50 },
  buttonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
});
