import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

export default function LoginScreen() {
  const { language } = useNitipLanguage();
  const { configured, loading, signIn, signUp, user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const c = language === "id" ? {
    loginTitle: "Siap mulai jalan?",
    registerTitle: "Daftar jadi driver Nitip.",
    firebase: "Firebase belum dikonfigurasi",
    firebaseBody: "Isi apps/driver/.env dengan konfigurasi Firebase dan API yang sama dengan ekosistem Nitip.",
    name: "Nama lengkap",
    namePlaceholder: "Nama lengkap",
    email: "Email",
    password: "Kata sandi",
    passwordPlaceholder: "Minimal 6 karakter",
    forgot: "Lupa kata sandi?",
    signIn: "Masuk",
    register: "Buat akun driver",
    switchRegister: "Belum punya akun? Daftar",
    switchLogin: "Sudah punya akun? Masuk",
    required: "Lengkapi data akun",
    requiredBody: "Email dan kata sandi wajib diisi.",
    nameRequired: "Nama lengkap wajib diisi untuk membuat akun driver.",
    failed: "Autentikasi gagal",
  } : {
    loginTitle: "Ready to get moving?",
    registerTitle: "Join Nitip as a driver.",
    firebase: "Firebase is not configured",
    firebaseBody: "Set apps/driver/.env with the same Firebase and API configuration used by the Nitip ecosystem.",
    name: "Full name",
    namePlaceholder: "Full name",
    email: "Email",
    password: "Password",
    passwordPlaceholder: "Minimum 6 characters",
    forgot: "Forgot password?",
    signIn: "Sign in",
    register: "Create driver account",
    switchRegister: "New driver? Create account",
    switchLogin: "Already have an account? Sign in",
    required: "Complete account details",
    requiredBody: "Email and password are required.",
    nameRequired: "Full name is required to create a driver account.",
    failed: "Authentication failed",
  };

  if (!loading && user) return <Redirect href="/home" />;

  async function submit() {
    if (!configured || submitting) return;
    if (!email.trim() || !password) {
      Alert.alert(c.required, c.requiredBody);
      return;
    }
    if (mode === "register" && !displayName.trim()) {
      Alert.alert(c.required, c.nameRequired);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "register") await signUp(displayName, email, password);
      else await signIn(email, password);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : c.failed;
      setError(message);
      Alert.alert(c.failed, message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom + 30, 42) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.brand, { color: theme.colors.primaryStrong }]}>nitip driver.</Text>
        <View style={styles.language}><LanguageSwitcher /></View>

        <View style={styles.hero}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{mode === "login" ? c.loginTitle : c.registerTitle}</Text>
        </View>

        {!configured ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.warningSurface }]}>
            <Text style={[styles.noticeTitle, { color: theme.colors.warning }]}>{c.firebase}</Text>
            <Text style={[styles.noticeText, { color: theme.colors.textMuted }]}>{c.firebaseBody}</Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {mode === "register" ? (
            <Field label={c.name}>
              <TextInput editable={!submitting} onChangeText={setDisplayName} placeholder={c.namePlaceholder} placeholderTextColor={theme.colors.textMuted} style={[styles.input, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, color: theme.colors.text }]} value={displayName} />
            </Field>
          ) : null}
          <Field label={c.email}>
            <TextInput autoCapitalize="none" autoCorrect={false} editable={!submitting} keyboardType="email-address" onChangeText={setEmail} placeholder="nama@email.com" placeholderTextColor={theme.colors.textMuted} style={[styles.input, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, color: theme.colors.text }]} value={email} />
          </Field>
          <Field label={c.password}>
            <TextInput autoCapitalize="none" editable={!submitting} onChangeText={setPassword} placeholder={c.passwordPlaceholder} placeholderTextColor={theme.colors.textMuted} secureTextEntry style={[styles.input, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, color: theme.colors.text }]} value={password} />
          </Field>

          {mode === "login" ? (
            <Pressable onPress={() => router.push("/forgot-password")} style={styles.forgot}>
              <Text style={[styles.forgotText, { color: theme.colors.primary }]}>{c.forgot}</Text>
            </Pressable>
          ) : null}

          {error ? <View style={[styles.errorCard, { backgroundColor: theme.colors.dangerSurface }]}><Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text></View> : null}

          <Pressable disabled={!configured || submitting} onPress={() => void submit()} style={[styles.primaryButton, { backgroundColor: theme.colors.primary, opacity: !configured || submitting ? 0.45 : 1 }]}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{mode === "login" ? c.signIn : c.register}</Text>}
          </Pressable>

          <Pressable onPress={() => { setMode((current) => current === "login" ? "register" : "login"); setError(null); }} style={styles.switchButton}>
            <Text style={[styles.switchText, { color: theme.colors.primary }]}>{mode === "login" ? c.switchRegister : c.switchLogin}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <View style={styles.field}><Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>{children}</View>;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20 },
  brand: { fontSize: 27, fontWeight: "900", letterSpacing: -1 },
  language: { marginTop: 12 },
  hero: { marginTop: 30 },
  title: { fontSize: 32, fontWeight: "900", letterSpacing: -1, lineHeight: 37 },
  notice: { borderRadius: 18, marginTop: 18, padding: 14 },
  noticeTitle: { fontSize: 10, fontWeight: "900" },
  noticeText: { fontSize: 8, lineHeight: 13, marginTop: 4 },
  card: { borderRadius: 24, borderWidth: 1, marginTop: 22, padding: 16 },
  field: { marginTop: 12 },
  label: { fontSize: 8, fontWeight: "900", marginBottom: 7 },
  input: { borderRadius: 16, borderWidth: 1, fontSize: 11, minHeight: 50, paddingHorizontal: 14 },
  forgot: { alignSelf: "flex-end", marginTop: 10, padding: 3 },
  forgotText: { fontSize: 8, fontWeight: "900" },
  errorCard: { borderRadius: 14, marginTop: 14, padding: 11 },
  errorText: { fontSize: 8, lineHeight: 13 },
  primaryButton: { alignItems: "center", borderRadius: 16, justifyContent: "center", marginTop: 18, minHeight: 50 },
  primaryText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  switchButton: { alignItems: "center", minHeight: 44, justifyContent: "center" },
  switchText: { fontSize: 8, fontWeight: "900" },
});
