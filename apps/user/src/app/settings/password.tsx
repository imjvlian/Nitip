import { useNitipLanguage } from "@nitip/i18n";
import { Redirect } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { NitipIcon } from "../../components/NitipIcon";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";

const COPY = {
  id: {
    title: "Reset kata sandi",
    heading: "Amankan akses akunmu",
    description: "Nitip akan mengirim tautan reset kata sandi melalui Firebase Authentication ke email akunmu.",
    email: "Email akun",
    send: "Kirim tautan reset",
    sending: "Mengirim...",
    sent: "Tautan reset sudah dikirim. Periksa inbox dan folder spam emailmu.",
    unavailable: "Akun ini tidak memiliki email yang dapat digunakan untuk reset kata sandi.",
    error: "Gagal mengirim tautan reset kata sandi",
  },
  en: {
    title: "Reset password",
    heading: "Secure your account access",
    description: "Nitip will send a password-reset link through Firebase Authentication to your account email.",
    email: "Account email",
    send: "Send reset link",
    sending: "Sending...",
    sent: "The reset link has been sent. Check your inbox and spam folder.",
    unavailable: "This account does not have an email that can be used for password reset.",
    error: "Failed to send password reset link",
  },
} as const;

export default function PasswordSettingsScreen() {
  const { language } = useNitipLanguage();
  const copy = COPY[language];
  const { resetPassword, user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return <Redirect href="/login" />;

  async function send() {
    if (!user.email || sending) return;
    setSending(true);
    setSent(false);
    setError(null);
    try {
      await resetPassword(user.email);
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
      showsVerticalScrollIndicator={false}
    >
      <AppHeader title={copy.title} />

      <View className="mt-7">
        <Text className="text-[26px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
          {copy.heading}
        </Text>
        <Text className="mt-1.5 text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>
          {copy.description}
        </Text>
      </View>

      <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
        <View className="flex-row items-center rounded-[18px] p-4" style={{ backgroundColor: theme.colors.surfaceRaised }}>
          <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surface }}>
            <NitipIcon color={theme.colors.primary} name="password" size={17} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[9px] font-extrabold" style={{ color: theme.colors.textMuted }}>
              {copy.email}
            </Text>
            <Text className="mt-0.5 text-[11px] font-black" style={{ color: theme.colors.text }}>
              {user.email ?? copy.unavailable}
            </Text>
          </View>
        </View>

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
          disabled={!user.email || sending}
          onPress={() => void send()}
          style={{ backgroundColor: theme.colors.primary, opacity: !user.email || sending ? 0.45 : 1 }}
        >
          {sending ? <ActivityIndicator color="#FFFFFF" /> : <NitipIcon color="#FFFFFF" name="password" size={17} />}
          <Text className="text-xs font-black text-white">{sending ? copy.sending : copy.send}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
