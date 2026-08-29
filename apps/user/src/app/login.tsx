import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

function getErrorMessage(error: unknown, t: (key: string) => string) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return t("auth.invalidCredential");
    case "auth/email-already-in-use":
      return t("auth.emailInUse");
    case "auth/invalid-email":
      return t("auth.invalidEmail");
    case "auth/weak-password":
      return t("auth.weakPassword");
    case "auth/network-request-failed":
      return t("auth.networkError");
    default:
      return t("auth.genericError");
  }
}

export default function LoginScreen() {
  const { t } = useNitipTranslation();
  const { language } = useNitipLanguage();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const { configured, signIn, signUp, user } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serviceCopy = language === "id"
    ? {
        title: "Layanan sementara tidak tersedia",
        body: "Akses akun sedang tidak dapat digunakan. Coba lagi beberapa saat.",
      }
    : {
        title: "Service temporarily unavailable",
        body: "Account access is currently unavailable. Please try again shortly.",
      };

  if (user) return <Redirect href="/home" />;

  async function submit() {
    if (!configured || submitting) return;

    if (!email.trim() || !password) {
      setError(t("auth.requiredCredentials"));
      return;
    }
    if (mode === "register" && !displayName.trim()) {
      setError(t("auth.requiredName"));
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
      setError(getErrorMessage(submitError, t));
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
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom + 24, 36),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between gap-4">
          <Text className="text-[26px] font-black tracking-tighter" style={{ color: theme.colors.primaryStrong }}>
            nitip.
          </Text>
          <View className="w-40">
            <LanguageSwitcher compact />
          </View>
        </View>

        <View className="mt-12">
          <Text className="text-[28px] font-black leading-[34px] tracking-tighter" style={{ color: theme.colors.text }}>
            {mode === "login" ? t("auth.titleLogin") : t("auth.titleRegister")}
          </Text>
        </View>

        {!configured ? (
          <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.warningSurface }}>
            <Text className="text-sm font-black" style={{ color: theme.colors.warning }}>
              {serviceCopy.title}
            </Text>
            <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {serviceCopy.body}
            </Text>
          </View>
        ) : null}

        <View className="mt-7 rounded-[26px] p-4" style={{ backgroundColor: theme.colors.surface }}>
          {mode === "register" ? (
            <View>
              <Text className="mb-2 text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>
                {t("auth.nameLabel")}
              </Text>
              <TextInput
                autoCapitalize="words"
                className="rounded-2xl px-4 py-4 text-sm"
                editable={!submitting}
                onChangeText={setDisplayName}
                placeholder={t("auth.namePlaceholder")}
                placeholderTextColor={theme.colors.textMuted}
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
                value={displayName}
              />
            </View>
          ) : null}

          <View className={mode === "register" ? "mt-4" : ""}>
            <Text className="mb-2 text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>
              {t("auth.emailLabel")}
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-2xl px-4 py-4 text-sm"
              editable={!submitting}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="nama@email.com"
              placeholderTextColor={theme.colors.textMuted}
              style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              value={email}
            />
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>
              {t("auth.passwordLabel")}
            </Text>
            <TextInput
              autoCapitalize="none"
              className="rounded-2xl px-4 py-4 text-sm"
              editable={!submitting}
              onChangeText={setPassword}
              placeholder={t("auth.passwordPlaceholder")}
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              value={password}
            />
          </View>

          {mode === "login" ? (
            <Pressable className="mt-3 self-end py-1" onPress={() => router.push("/forgot-password")}>
              <Text className="text-[10px] font-black" style={{ color: theme.colors.primary }}>
                {language === "id" ? "Lupa kata sandi?" : "Forgot password?"}
              </Text>
            </Pressable>
          ) : null}

          {error ? (
            <View className="mt-4 rounded-2xl p-3" style={{ backgroundColor: theme.colors.dangerSurface }}>
              <Text className="text-xs leading-5" style={{ color: theme.colors.danger }}>
                {error}
              </Text>
            </View>
          ) : null}

          <Pressable
            className="mt-5 min-h-[52px] items-center justify-center rounded-2xl px-4"
            disabled={!configured || submitting}
            onPress={() => void submit()}
            style={{ backgroundColor: theme.colors.primary, opacity: !configured || submitting ? 0.45 : 1 }}
          >
            <Text className="text-xs font-black text-white">
              {submitting
                ? t("common.processing")
                : mode === "login"
                  ? t("auth.signIn")
                  : t("auth.createAccount")}
            </Text>
          </Pressable>
        </View>

        <Pressable className="mt-5 items-center py-3" onPress={switchMode}>
          <Text className="text-xs" style={{ color: theme.colors.textMuted }}>
            {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")} {" "}
            <Text className="font-black" style={{ color: theme.colors.primary }}>
              {mode === "login" ? t("auth.register") : t("auth.login")}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
