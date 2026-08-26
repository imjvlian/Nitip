import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
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

import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

export default function LoginScreen() {
  const { configured, loading, signIn, signUp, user } = useAuth();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) return <Redirect href="/home" />;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "register") await signUp(displayName, email, password);
      else await signIn(email, password);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Authentication gagal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>nitip mitra.</Text>
        <Text style={styles.eyebrow}>PORTAL MERCHANT</Text>
        <Text style={styles.title}>{mode === "login" ? "Kelola usahamu." : "Mulai jadi mitra Nitip."}</Text>
        <Text style={styles.subtitle}>Masuk dengan akun Firebase Nitip. Status merchant tetap ditentukan server, bukan aplikasi.</Text>

        {!configured && (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Firebase belum dikonfigurasi</Text>
            <Text style={styles.noticeText}>Copy apps/merchant/.env.example menjadi apps/merchant/.env dan isi Firebase config yang sama dengan User App.</Text>
          </View>
        )}

        <View style={styles.card}>
          {mode === "register" && (
            <>
              <Text style={styles.label}>Nama pemilik</Text>
              <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Nama lengkap" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
            </>
          )}
          <Text style={styles.label}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="nama@email.com" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
          <Text style={styles.label}>Password</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Minimal 6 karakter" placeholderTextColor={theme.colors.textMuted} style={styles.input} />

          {error && <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View>}

          <Pressable disabled={!configured || submitting} onPress={() => void submit()} style={({ pressed }) => [styles.primaryButton, (!configured || submitting || pressed) && styles.disabled]}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{mode === "login" ? "Masuk" : "Buat akun"}</Text>}
          </Pressable>
          <Pressable onPress={() => setMode((current) => current === "login" ? "register" : "login")} style={styles.switchButton}>
            <Text style={styles.switchText}>{mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: { background: string; surface: string; surfaceAccent: string; primary: string; primaryStrong: string; secondary: string; text: string; textMuted: string; border: string; onPrimary: string }) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: { flexGrow: 1, backgroundColor: colors.background, paddingHorizontal: 22, paddingTop: 72, paddingBottom: 40 },
    brand: { color: colors.primaryStrong, fontWeight: "900", fontSize: 28, letterSpacing: -1.2 },
    eyebrow: { marginTop: 32, color: colors.primary, fontWeight: "900", fontSize: 10, letterSpacing: 1.4 },
    title: { marginTop: 7, color: colors.text, fontWeight: "900", fontSize: 34, letterSpacing: -1.2 },
    subtitle: { marginTop: 9, color: colors.textMuted, lineHeight: 20, fontSize: 13 },
    notice: { marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceAccent },
    noticeTitle: { color: colors.text, fontWeight: "900", fontSize: 13 },
    noticeText: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 },
    card: { marginTop: 24, padding: 18, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    label: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 13, marginBottom: 7 },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12, color: colors.text },
    errorCard: { marginTop: 14, borderRadius: 13, padding: 12, backgroundColor: colors.surfaceAccent },
    errorText: { color: colors.text, fontSize: 11, lineHeight: 17 },
    primaryButton: { marginTop: 20, minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.primaryStrong, borderRadius: 15 },
    primaryText: { color: "#FFFFFF", fontWeight: "900" },
    disabled: { opacity: 0.55 },
    switchButton: { paddingVertical: 15, alignItems: "center" },
    switchText: { color: colors.primary, fontWeight: "800", fontSize: 12 },
  });
}
