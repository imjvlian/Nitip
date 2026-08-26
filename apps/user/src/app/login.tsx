import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import {
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

function getErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Email atau kata sandi tidak sesuai.";
    case "auth/email-already-in-use":
      return "Email ini sudah terdaftar.";
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/weak-password":
      return "Kata sandi terlalu lemah. Gunakan minimal 6 karakter.";
    case "auth/network-request-failed":
      return "Tidak dapat terhubung ke Firebase. Periksa koneksi internet.";
    default:
      return error instanceof Error ? error.message : "Terjadi kesalahan. Coba lagi.";
  }
}

export default function LoginScreen() {
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const { configured, signIn, signUp, user } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Redirect href="/home" />;
  }

  async function submit() {
    if (!configured || submitting) return;

    if (!email.trim() || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }

    if (mode === "register" && !displayName.trim()) {
      setError("Nama wajib diisi.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (mode === "register") {
        await signUp(displayName, email, password);
      } else {
        await signIn(email, password);
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode((current) => (current === "login" ? "register" : "login"));
    setError(null);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandMark}>
          <Text style={styles.brandText}>nitip.</Text>
        </View>

        <Text style={styles.eyebrow}>SATU APLIKASI, BANYAK TITIPAN</Text>
        <Text style={styles.title}>
          {mode === "login" ? "Selamat datang kembali." : "Mulai dari sini."}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "login"
            ? "Masuk untuk mencari makanan, toko, dan titipan di sekitarmu."
            : "Buat akun pembeli Nitip. Akun merchant dan driver akan punya proses onboarding sendiri."}
        </Text>

        {!configured && (
          <View style={styles.setupCard}>
            <Text style={styles.setupTitle}>Firebase belum dikonfigurasi</Text>
            <Text style={styles.setupText}>
              Copy apps/user/.env.example menjadi apps/user/.env lalu isi konfigurasi Firebase Web App.
            </Text>
          </View>
        )}

        <View style={styles.form}>
          {mode === "register" && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nama</Text>
              <TextInput
                autoCapitalize="words"
                editable={!submitting}
                onChangeText={setDisplayName}
                placeholder="Nama kamu"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
                value={displayName}
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="nama@email.com"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              value={email}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Kata sandi</Text>
            <TextInput
              autoCapitalize="none"
              editable={!submitting}
              onChangeText={setPassword}
              placeholder="Minimal 6 karakter"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            disabled={!configured || submitting}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && configured && !submitting && styles.primaryButtonPressed,
              (!configured || submitting) && styles.primaryButtonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {submitting
                ? "Memproses..."
                : mode === "login"
                  ? "Masuk"
                  : "Buat akun"}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={switchMode} style={styles.switchButton}>
          <Text style={styles.switchText}>
            {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
            <Text style={styles.switchStrong}>
              {mode === "login" ? "Daftar" : "Masuk"}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: {
  background: string;
  surface: string;
  surfaceAccent: string;
  primary: string;
  primaryStrong: string;
  secondary: string;
  text: string;
  textMuted: string;
  border: string;
  onPrimary: string;
}) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 72,
      paddingBottom: 40,
    },
    brandMark: {
      alignSelf: "flex-start",
      borderRadius: 18,
      backgroundColor: colors.primaryStrong,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginBottom: 34,
    },
    brandText: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "900",
      letterSpacing: -1,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.5,
    },
    title: {
      color: colors.text,
      fontSize: 36,
      lineHeight: 42,
      fontWeight: "900",
      letterSpacing: -1.2,
      marginTop: 8,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 12,
      maxWidth: 500,
    },
    setupCard: {
      backgroundColor: colors.surfaceAccent,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      marginTop: 24,
    },
    setupTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 14,
    },
    setupText: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 5,
    },
    form: {
      marginTop: 32,
      gap: 18,
    },
    fieldGroup: {
      gap: 8,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
    },
    input: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16,
      color: colors.text,
      fontSize: 16,
      paddingHorizontal: 16,
      paddingVertical: 15,
    },
    errorText: {
      color: "#D44848",
      fontSize: 13,
      lineHeight: 19,
    },
    primaryButton: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderRadius: 16,
      minHeight: 54,
      paddingHorizontal: 18,
    },
    primaryButtonPressed: {
      backgroundColor: colors.primaryStrong,
    },
    primaryButtonDisabled: {
      opacity: 0.45,
    },
    primaryButtonText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: "900",
    },
    switchButton: {
      alignItems: "center",
      paddingVertical: 20,
    },
    switchText: {
      color: colors.textMuted,
      fontSize: 13,
    },
    switchStrong: {
      color: colors.primary,
      fontWeight: "900",
    },
  });
}
