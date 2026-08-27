import { Redirect } from "expo-router";
import { useState } from "react";
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

export default function LoginScreen() {
  const { configured, loading, signIn, signUp, user } = useAuth();
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>nitip driver.</Text>
        <Text style={styles.eyebrow}>DRIVER ACCESS</Text>
        <Text style={styles.title}>
          {mode === "login" ? "Siap mulai jalan?" : "Daftar jadi driver Nitip."}
        </Text>
        <Text style={styles.subtitle}>
          Login memakai Firebase yang sama dengan ekosistem Nitip. Approval driver tetap ditentukan server dan Ops.
        </Text>

        {!configured ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Firebase belum dikonfigurasi</Text>
            <Text style={styles.noticeText}>
              Copy apps/driver/.env.example menjadi apps/driver/.env lalu gunakan Firebase config yang sama dengan User App.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          {mode === "register" ? (
            <>
              <Text style={styles.label}>Nama lengkap</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Nama lengkap"
                placeholderTextColor="#52607F"
                style={styles.input}
              />
            </>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="nama@email.com"
            placeholderTextColor="#52607F"
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Minimal 6 karakter"
            placeholderTextColor="#52607F"
            style={styles.input}
          />

          {error ? <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View> : null}

          <Pressable
            disabled={!configured || submitting}
            onPress={() => void submit()}
            style={[styles.primaryButton, (!configured || submitting) && styles.disabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>{mode === "login" ? "Masuk" : "Buat akun"}</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setMode((current) => current === "login" ? "register" : "login")}
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#F7FFF9" },
  container: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 72, paddingBottom: 40, backgroundColor: "#F7FFF9" },
  brand: { color: "#14216D", fontWeight: "900", fontSize: 28, letterSpacing: -1.2 },
  eyebrow: { marginTop: 32, color: "#08349C", fontWeight: "900", fontSize: 10, letterSpacing: 1.4 },
  title: { marginTop: 7, color: "#14216D", fontWeight: "900", fontSize: 34, letterSpacing: -1.2 },
  subtitle: { marginTop: 9, color: "#52607F", lineHeight: 20, fontSize: 13 },
  notice: { marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: "#CEFCD9" },
  noticeTitle: { color: "#14216D", fontWeight: "900", fontSize: 13 },
  noticeText: { color: "#52607F", fontSize: 11, lineHeight: 17, marginTop: 4 },
  card: { marginTop: 24, padding: 18, borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#A1DCD9" },
  label: { color: "#52607F", fontSize: 11, fontWeight: "800", marginTop: 13, marginBottom: 7 },
  input: { backgroundColor: "#F7FFF9", borderWidth: 1, borderColor: "#A1DCD9", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12, color: "#14216D" },
  errorCard: { marginTop: 14, borderRadius: 13, padding: 12, backgroundColor: "#FFF1F0" },
  errorText: { color: "#B42318", fontSize: 11, lineHeight: 17 },
  primaryButton: { marginTop: 20, minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#14216D", borderRadius: 15 },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  disabled: { opacity: 0.55 },
  switchButton: { paddingVertical: 15, alignItems: "center" },
  switchText: { color: "#08349C", fontWeight: "800", fontSize: 12 },
});
