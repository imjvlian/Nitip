import type { NitipCategory } from "@nitip/domain/catalog";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../../components/AppHeader";
import { getMerchantCopy } from "../../../constants/merchantCopy";
import { useAuth } from "../../../context/AuthContext";
import { useNitipTheme } from "../../../hooks/useNitipTheme";
import { listCategories, updateCategory } from "../../../lib/api";

const EDIT_COPY = {
  id: {
    header: "Edit kategori",
    eyebrow: "EDIT KATEGORI",
    title: "Perbarui kategori.",
    subtitle: "Ubah nama, deskripsi, dan urutan tampil tanpa mengubah status visibilitas kategori.",
    loading: "Memuat kategori...",
    loadError: "Gagal memuat kategori",
    notFound: "Kategori tidak ditemukan",
    notFoundDescription: "Kategori ini mungkin sudah dihapus atau tidak lagi tersedia.",
    save: "Simpan perubahan",
    saveError: "Gagal memperbarui kategori",
  },
  en: {
    header: "Edit category",
    eyebrow: "EDIT CATEGORY",
    title: "Update category.",
    subtitle: "Change the name, description, and display order without changing category visibility.",
    loading: "Loading category...",
    loadError: "Failed to load category",
    notFound: "Category not found",
    notFoundDescription: "This category may have been deleted or is no longer available.",
    save: "Save changes",
    saveError: "Failed to update category",
  },
} as const;

export default function EditCategoryScreen() {
  const { id, outletId, outletName } = useLocalSearchParams<{
    id: string;
    outletId: string;
    outletName?: string;
  }>();
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const copy = EDIT_COPY[language];
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<NitipCategory | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !outletId || !id) return;
    let active = true;
    setLoading(true);
    setError(null);

    listCategories(user, outletId)
      .then((items) => {
        if (!active) return;
        const next = items.find((item) => item.id === id) ?? null;
        setCategory(next);
        if (next) {
          setName(next.name);
          setDescription(next.description ?? "");
          setSortOrder(String(next.sortOrder));
        }
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : copy.loadError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [copy.loadError, id, outletId, user]);

  if (!user) return <Redirect href="/login" />;

  async function save() {
    if (!category) return;
    if (!name.trim()) {
      setError(c.category.nameRequired);
      return;
    }

    const parsedSortOrder = Number(sortOrder || 0);
    if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0) {
      setError(c.category.sortInvalid);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateCategory(user, outletId, category.id, {
        name: name.trim(),
        description: description.trim() || null,
        sortOrder: parsedSortOrder,
      });
      router.back();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: insets.top + 10,
        paddingBottom: Math.max(insets.bottom + 30, 42),
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      <AppHeader title={copy.header} onBack={() => router.back()} />

      {loading ? (
        <View className="mt-6 items-center rounded-[22px] p-7" style={{ backgroundColor: theme.colors.surface }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>{copy.loading}</Text>
        </View>
      ) : !category ? (
        <View className="mt-6 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-[12px] font-black" style={{ color: theme.colors.danger }}>{copy.notFound}</Text>
          <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
            {error ?? copy.notFoundDescription}
          </Text>
        </View>
      ) : (
        <>
          <View className="mt-7">
            <Text className="text-[9px] font-black tracking-[1.2px]" style={{ color: theme.colors.primary }}>{copy.eyebrow}</Text>
            <Text className="mt-2 text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>{copy.title}</Text>
            <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{copy.subtitle}</Text>
            <Text className="mt-2 text-[9px] font-extrabold" style={{ color: theme.colors.primary }}>
              {outletName || c.common.outletFallback}
            </Text>
          </View>

          <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
            <Field label={c.category.name}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={c.category.namePlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                maxLength={80}
                className="min-h-[48px] rounded-[16px] px-4 text-[11px]"
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              />
            </Field>

            <Field label={c.category.description}>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={c.category.optional}
                placeholderTextColor={theme.colors.textMuted}
                maxLength={300}
                multiline
                textAlignVertical="top"
                className="min-h-[84px] rounded-[16px] px-4 py-3 text-[11px]"
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              />
            </Field>

            <Field label={c.category.sort}>
              <TextInput
                value={sortOrder}
                onChangeText={setSortOrder}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.textMuted}
                className="min-h-[48px] rounded-[16px] px-4 text-[11px]"
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              />
            </Field>

            {error ? (
              <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}>
                <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              className="mt-5 min-h-[50px] items-center justify-center rounded-[16px]"
              disabled={saving}
              onPress={() => void save()}
              style={{ backgroundColor: theme.colors.primary, opacity: saving ? 0.5 : 1 }}
            >
              <Text className="text-[11px] font-black text-white">{saving ? c.common.saving : copy.save}</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );

  function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
      <View className="mt-3">
        <Text className="mb-2 text-[9px] font-extrabold" style={{ color: theme.colors.textMuted }}>{label}</Text>
        {children}
      </View>
    );
  }
}
