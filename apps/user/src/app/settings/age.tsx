import type { NitipUserProfile } from "@nitip/domain";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { NitipIcon } from "../../components/NitipIcon";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { getMe, updateMe } from "../../lib/api";

const COPY = {
  id: {
    title: "Verifikasi usia",
    dateLabel: "Tanggal lahir",
    dateHelper: "Gunakan format YYYY-MM-DD, contoh 2000-08-27.",
    verify: "Verifikasi usia",
    verifying: "Memverifikasi...",
    verified: "Usia 18+ terverifikasi",
    underage: "Usia belum mencapai 18 tahun",
    unverified: "Usia belum diverifikasi",
    disclosure: "Verifikasi ini berdasarkan tanggal lahir yang kamu berikan. Ini bukan verifikasi identitas atau KTP.",
    privacy: "Tanggal lahir disimpan pada profil Nitip untuk kebutuhan verifikasi usia dan fitur yang memerlukan batas usia.",
    loadError: "Gagal memuat status verifikasi usia",
    saveError: "Gagal memverifikasi usia",
  },
  en: {
    title: "Age verification",
    dateLabel: "Date of birth",
    dateHelper: "Use YYYY-MM-DD format, for example 2000-08-27.",
    verify: "Verify age",
    verifying: "Verifying...",
    verified: "Age 18+ verified",
    underage: "Age is under 18",
    unverified: "Age is not verified",
    disclosure: "This verification is based on the date of birth you provide. It is not an identity or government-ID verification.",
    privacy: "Your date of birth is stored on your Nitip profile for age verification and age-gated features.",
    loadError: "Failed to load age verification status",
    saveError: "Failed to verify age",
  },
} as const;

export default function AgeVerificationScreen() {
  const { language } = useNitipLanguage();
  const copy = COPY[language];
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<NitipUserProfile | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getMe(user)
      .then((next) => {
        if (!active) return;
        setProfile(next);
        setDateOfBirth(next.dateOfBirth ?? "");
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : copy.loadError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [copy.loadError, user]);

  if (!user) return <Redirect href="/login" />;

  async function verify() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const next = await updateMe(user, { dateOfBirth: dateOfBirth.trim() || null });
      setProfile(next);
      setDateOfBirth(next.dateOfBirth ?? "");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  const status = profile?.ageVerificationStatus ?? "unverified";
  const statusLabel = status === "verified_adult" ? copy.verified : status === "underage" ? copy.underage : copy.unverified;
  const statusColor = status === "verified_adult" ? theme.colors.success : status === "underage" ? theme.colors.warning : theme.colors.textMuted;
  const statusSurface = status === "verified_adult" ? theme.colors.successSurface : status === "underage" ? theme.colors.warningSurface : theme.colors.surfaceRaised;

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
      <AppHeader title={copy.title} />

      {loading ? (
        <View className="mt-5 items-center rounded-[22px] p-6" style={{ backgroundColor: theme.colors.surface }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <>
          <View className="mt-5 flex-row items-center rounded-[18px] p-4" style={{ backgroundColor: statusSurface }}>
            <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surface }}>
              <NitipIcon color={statusColor} name="age" size={17} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[11px] font-black" style={{ color: statusColor }}>{statusLabel}</Text>
              {profile?.dateOfBirth ? <Text className="mt-0.5 text-[9px]" style={{ color: theme.colors.textMuted }}>{profile.dateOfBirth}</Text> : null}
            </View>
          </View>

          <View className="mt-4 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
            <Text className="mb-2 text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>{copy.dateLabel}</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-[16px] px-4 py-4 text-sm"
              editable={!saving}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              onChangeText={setDateOfBirth}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textMuted}
              style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              value={dateOfBirth}
            />
            <Text className="mt-2 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{copy.dateHelper}</Text>

            {error ? (
              <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}>
                <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              className="mt-5 min-h-[50px] flex-row items-center justify-center gap-2 rounded-[16px]"
              disabled={saving}
              onPress={() => void verify()}
              style={{ backgroundColor: theme.colors.primary, opacity: saving ? 0.55 : 1 }}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <NitipIcon color="#FFFFFF" name="age" size={17} />}
              <Text className="text-xs font-black text-white">{saving ? copy.verifying : copy.verify}</Text>
            </Pressable>
          </View>
        </>
      )}

      <View className="mt-4 rounded-[20px] p-4" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="text-[10px] font-black" style={{ color: theme.colors.text }}>{copy.disclosure}</Text>
        <Text className="mt-2 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{copy.privacy}</Text>
      </View>
    </ScrollView>
  );
}
