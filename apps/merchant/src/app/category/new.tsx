import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { createCategory } from "../../lib/api";

export default function NewCategoryScreen() {
  const { outletId, outletName } = useLocalSearchParams<{ outletId: string; outletName?: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return <Redirect href="/login" />;

  async function save() {
    if (!name.trim()) {
      setError("Nama kategori wajib diisi");
      return;
    }
    if (!Number.isInteger(Number(sortOrder || 0)) || Number(sortOrder || 0) < 0) {
      setError("Urutan tampil harus berupa angka bulat non-negatif");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createCategory(user, outletId, {
        name: name.trim(),
        description: description.trim() || null,
        sortOrder: Number(sortOrder || 0),
        isActive: true,
      });
      router.replace({ pathname: "/menu", params: { outletId, outletName: outletName ?? "" } });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal membuat kategori");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Kembali</Text></Pressable><Text style={styles.brand}>nitip mitra.</Text></View>
      <Text style={styles.eyebrow}>KATEGORI BARU</Text>
      <Text style={styles.title}>Kelompokkan menu.</Text>
      <Text style={styles.subtitle}>{outletName || "Outlet"}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Nama kategori</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Makanan" placeholderTextColor={theme.colors.textMuted} style={styles.input} maxLength={80} />
        <Text style={styles.label}>Deskripsi</Text>
        <TextInput value={description} onChangeText={setDescription} placeholder="Opsional" placeholderTextColor={theme.colors.textMuted} style={[styles.input, styles.multiline]} multiline textAlignVertical="top" maxLength={300} />
        <Text style={styles.label}>Urutan tampil</Text>
        <TextInput value={sortOrder} onChangeText={setSortOrder} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
        {error && <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View>}
        <Pressable disabled={saving} onPress={() => void save()} style={styles.button}><Text style={styles.buttonText}>{saving ? "Menyimpan..." : "Simpan kategori"}</Text></Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: { background: string; surface: string; surfaceAccent: string; primary: string; primaryStrong: string; secondary: string; text: string; textMuted: string; border: string; onPrimary: string }) {
  return StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: colors.background, padding: 20, paddingTop: 54, paddingBottom: 40 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
    back: { color: colors.primary, fontWeight: "900" },
    brand: { color: colors.primaryStrong, fontWeight: "900", fontSize: 23, letterSpacing: -1 },
    eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
    title: { color: colors.text, fontWeight: "900", fontSize: 30, letterSpacing: -1, marginTop: 5 },
    subtitle: { color: colors.textMuted, marginTop: 6, marginBottom: 20 },
    card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 17 },
    label: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 15, marginBottom: 7 },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 14, color: colors.text, paddingHorizontal: 13, paddingVertical: 12 },
    multiline: { minHeight: 82 },
    errorCard: { backgroundColor: colors.surfaceAccent, borderRadius: 13, padding: 12, marginTop: 16 },
    errorText: { color: colors.text, fontSize: 11, lineHeight: 17 },
    button: { backgroundColor: colors.primaryStrong, borderRadius: 14, alignItems: "center", paddingVertical: 14, marginTop: 20 },
    buttonText: { color: "#FFFFFF", fontWeight: "900" },
  });
}
