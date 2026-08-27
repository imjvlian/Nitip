import { useNitipLanguage } from "@nitip/i18n";
import { Redirect } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { getMerchantCopy } from "../constants/merchantCopy";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

export default function LoginScreen() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { configured, loading, signIn, signUp, user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
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
      setError(nextError instanceof Error ? nextError.message : c.login.authError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: insets.top + 28, paddingBottom: Math.max(insets.bottom + 28, 40) }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text className="text-[27px] font-black tracking-tighter" style={{ color: theme.colors.primaryStrong }}>nitip mitra.</Text>
        <View className="mt-10">
          <Text className="text-[9px] font-black tracking-[1.2px]" style={{ color: theme.colors.primary }}>{c.login.portal}</Text>
          <Text className="mt-2 text-[34px] font-black leading-[38px] tracking-tighter" style={{ color: theme.colors.text }}>{mode === "login" ? c.login.titleLogin : c.login.titleRegister}</Text>
          <Text className="mt-2 max-w-[330px] text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>{c.login.subtitle}</Text>
        </View>

        {!configured ? <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.warningSurface }}><Text className="text-[11px] font-black" style={{ color: theme.colors.warning }}>{c.login.firebaseTitle}</Text><Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{c.login.firebaseDescription}</Text></View> : null}

        <View className="mt-6 rounded-[24px] p-4" style={{ backgroundColor: theme.colors.surface }}>
          {mode === "register" ? <Field label={c.login.ownerName}><TextInput value={displayName} onChangeText={setDisplayName} placeholder={c.login.ownerPlaceholder} placeholderTextColor={theme.colors.textMuted} className="min-h-[48px] rounded-[16px] px-4 text-[12px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} /></Field> : null}
          <Field label={c.login.email}><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="nama@email.com" placeholderTextColor={theme.colors.textMuted} className="min-h-[48px] rounded-[16px] px-4 text-[12px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} /></Field>
          <Field label={c.login.password}><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder={c.login.passwordPlaceholder} placeholderTextColor={theme.colors.textMuted} className="min-h-[48px] rounded-[16px] px-4 text-[12px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} /></Field>

          {error ? <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}><Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text></View> : null}

          <Pressable className="mt-5 min-h-[50px] items-center justify-center rounded-[16px]" disabled={!configured || submitting} onPress={() => void submit()} style={{ backgroundColor: theme.colors.primary, opacity: !configured || submitting ? 0.5 : 1 }}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[12px] font-black text-white">{mode === "login" ? c.login.signIn : c.login.createAccount}</Text>}
          </Pressable>
          <Pressable className="min-h-[46px] items-center justify-center" onPress={() => setMode((current) => current === "login" ? "register" : "login")}><Text className="text-[10px] font-extrabold" style={{ color: theme.colors.primary }}>{mode === "login" ? c.login.switchRegister : c.login.switchLogin}</Text></Pressable>
        </View>
        <View className="mt-4"><LanguageSwitcher /></View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  function Field({ label, children }: { label: string; children: ReactNode }) {
    return <View className="mt-3"><Text className="mb-2 text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>{label}</Text>{children}</View>;
  }
}
