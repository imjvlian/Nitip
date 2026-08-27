import { useNitipLanguage } from "@nitip/i18n";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

const COPY = {
  id: {
    title: "Lupa kata sandi",
    heading: "Pulihkan akses akun",
    description: "Masukkan email akun Nitip. Kami akan mengirim tautan reset kata sandi melalui Firebase Authentication.",
    email: "Email",
    placeholder: "nama@email.com",
    send: "Kirim tautan reset",
    sending: "Mengirim...",
    sent: "Tautan reset sudah dikirim. Periksa inbox dan folder spam.",
    required: "Masukkan email terlebih dahulu.",
    error: "Gagal mengirim tautan reset",
    backLogin: "Kembali ke halaman masuk",
  },
  en: {
    title: "Forgot password",
    heading: "Recover account access",
    description: "Enter your Nitip account email. We will send a password-reset link through Firebase Authentication.",
    email: "Email",
    placeholder: "name@email.com",
    send: "Send reset link",
    sending: "Sending...",
    sent: "The reset link has been sent. Check your inbox and spam folder.",
    required: "Enter your email first.",
    error: "Failed to send reset link",
    backLogin: "Back to sign in",
  },
} as const;

export default function ForgotPasswordScreen() {
  const { language } = useNitipLanguage();
  const copy = COPY[language];
  const { configured, resetPassword } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!email.trim()) {
      setError(copy.required);
      return;
    }
    if (!configured || sending) return;
    setSending(true);
    setSent(false);
    setError(null);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.error);
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 18,
        paddingTop: insets.top + 10,
        paddingBottom: Math.max(insets.bottom + 28, 40),
        backgroundColor: theme.colors.background,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AppHeader title={copy.title} onBack={() => router.replace("/login")} />

      <View className="mt-10">
        <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surface }}>
          <NitipIcon color={theme.colors.primary} name="password" size={21} />
        </View>
        <Text className="mt-5 text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
          {copy.heading}
        </Text>
        <Text className="mt-2 text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>
          {copy.description}
        </Text>
      </View>

      <View className="mt-6 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="mb-2 text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>
          {copy.email}
        </Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-[16px] px-4 py-4 text-sm"
          editable={!sending}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder={copy.placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
          value={email}
        />

        {sent ? (
          <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.successSurface }}>
            <Text className="text-[10px] leading-4" style={{ color: theme.colors.success }}>{copy.sent}</Text>
          </View>
        ) : null}
        {error ? (
          <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}>
            <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          className="mt-5 min-h-[50px] flex-row items-center justify-center gap-2 rounded-[16px]"
          disabled={!configured || sending}
          onPress={() => void send()}
          style={{ backgroundColor: theme.colors.primary, opacity: !configured || sending ? 0.45 : 1 }}
        >
          {sending ? <ActivityIndicator color="#FFFFFF" /> : <NitipIcon color="#FFFFFF" name="password" size={17} />}
          <Text className="text-xs font-black text-white">{sending ? copy.sending : copy.send}</Text>
        </Pressable>
      </View>

      <Pressable className="mt-4 items-center py-3" onPress={() => router.replace("/login")}>
        <Text className="text-[10px] font-black" style={{ color: theme.colors.primary }}>{copy.backLogin}</Text>
      </Pressable>
    </ScrollView>
  );
}
