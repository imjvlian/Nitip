import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { getMerchantCopy } from "../../constants/merchantCopy";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { createCategory } from "../../lib/api";

export default function NewCategoryScreen() {
  const { outletId, outletName } = useLocalSearchParams<{ outletId: string; outletName?: string }>();
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return <Redirect href="/login" />;

  async function save() {
    if (!name.trim()) { setError(c.category.nameRequired); return; }
    if (!Number.isInteger(Number(sortOrder || 0)) || Number(sortOrder || 0) < 0) { setError(c.category.sortInvalid); return; }
    setSaving(true); setError(null);
    try {
      await createCategory(user, outletId, { name: name.trim(), description: description.trim() || null, sortOrder: Number(sortOrder || 0), isActive: true });
      router.replace({ pathname: "/menu", params: { outletId, outletName: outletName ?? "" } });
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : c.category.saveError); }
    finally { setSaving(false); }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 30, 42) }} keyboardShouldPersistTaps="handled" style={{ backgroundColor: theme.colors.background }}>
      <AppHeader title={c.category.eyebrow} onBack={() => router.back()} />
      <View className="mt-7"><Text className="text-[9px] font-black tracking-[1.2px]" style={{ color: theme.colors.primary }}>{c.category.eyebrow}</Text><Text className="mt-2 text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>{c.category.title}</Text><Text className="mt-1 text-[10px]" style={{ color: theme.colors.textMuted }}>{outletName || c.common.outletFallback}</Text></View>
      <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
        <Field label={c.category.name}><TextInput value={name} onChangeText={setName} placeholder={c.category.namePlaceholder} placeholderTextColor={theme.colors.textMuted} maxLength={80} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} /></Field>
        <Field label={c.category.description}><TextInput value={description} onChangeText={setDescription} placeholder={c.category.optional} placeholderTextColor={theme.colors.textMuted} maxLength={300} multiline textAlignVertical="top" className="min-h-[84px] rounded-[16px] px-4 py-3 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} /></Field>
        <Field label={c.category.sort}><TextInput value={sortOrder} onChangeText={setSortOrder} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.colors.textMuted} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} /></Field>
        {error ? <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}><Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text></View> : null}
        <Pressable className="mt-5 min-h-[50px] items-center justify-center rounded-[16px]" disabled={saving} onPress={() => void save()} style={{ backgroundColor: theme.colors.primary, opacity: saving ? 0.5 : 1 }}><Text className="text-[11px] font-black text-white">{saving ? c.common.saving : c.category.save}</Text></Pressable>
      </View>
    </ScrollView>
  );

  function Field({ label, children }: { label: string; children: React.ReactNode }) { return <View className="mt-3"><Text className="mb-2 text-[9px] font-extrabold" style={{ color: theme.colors.textMuted }}>{label}</Text>{children}</View>; }
}
