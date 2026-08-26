import type { AddressLabel } from "@nitip/domain";
import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { createAddress } from "../../lib/api";

const labels: { value: AddressLabel; text: string }[] = [
  { value: "home", text: "Rumah" },
  { value: "office", text: "Kantor" },
  { value: "other", text: "Lainnya" },
];

export default function NewAddressScreen() {
  const { user } = useAuth();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [label, setLabel] = useState<AddressLabel>("home");
  const [customLabel, setCustomLabel] = useState("");
  const [recipientName, setRecipientName] = useState(user?.displayName ?? "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [notes, setNotes] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return <Redirect href="/login" />;

  async function save() {
    setSaving(true);
    setError(null);

    try {
      await createAddress(user, {
        label,
        customLabel: label === "other" ? customLabel.trim() || null : null,
        recipientName: recipientName.trim(),
        phoneNumber: phoneNumber.trim(),
        addressLine: addressLine.trim(),
        notes: notes.trim() || null,
        latitude: null,
        longitude: null,
        isDefault,
      });
      router.replace("/profile");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal menyimpan alamat");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </Pressable>
        <Text style={styles.brand}>nitip.</Text>
      </View>

      <Text style={styles.eyebrow}>ALAMAT BARU</Text>
      <Text style={styles.title}>Mau dikirim ke mana?</Text>
      <Text style={styles.subtitle}>
        Isi alamat lengkap dulu. Pemilihan titik lokasi lewat peta kita tambahkan di tahap Maps.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Label alamat</Text>
        <View style={styles.labelRow}>
          {labels.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setLabel(item.value)}
              style={[styles.labelChip, label === item.value && styles.labelChipActive]}
            >
              <Text style={[styles.labelChipText, label === item.value && styles.labelChipTextActive]}>
                {item.text}
              </Text>
            </Pressable>
          ))}
        </View>

        {label === "other" && (
          <>
            <Text style={styles.label}>Nama label</Text>
            <TextInput
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder="Contoh: Rumah Orang Tua"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              maxLength={30}
            />
          </>
        )}

        <Text style={styles.label}>Nama penerima</Text>
        <TextInput
          value={recipientName}
          onChangeText={setRecipientName}
          placeholder="Nama penerima"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          maxLength={80}
        />

        <Text style={styles.label}>Nomor HP penerima</Text>
        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="08xxxxxxxxxx"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          keyboardType="phone-pad"
          maxLength={30}
        />

        <Text style={styles.label}>Alamat lengkap</Text>
        <TextInput
          value={addressLine}
          onChangeText={setAddressLine}
          placeholder="Jalan, nomor rumah, RT/RW, desa/kelurahan, kecamatan"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.multiline]}
          multiline
          textAlignVertical="top"
          maxLength={300}
        />

        <Text style={styles.label}>Catatan alamat</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Contoh: pagar hitam, sebelah minimarket"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.notesInput]}
          multiline
          textAlignVertical="top"
          maxLength={300}
        />

        <Pressable onPress={() => setIsDefault((value) => !value)} style={styles.defaultRow}>
          <View style={[styles.checkbox, isDefault && styles.checkboxActive]}>
            {isDefault && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.defaultCopy}>
            <Text style={styles.defaultTitle}>Jadikan alamat utama</Text>
            <Text style={styles.defaultMeta}>Alamat pertama tetap otomatis menjadi utama.</Text>
          </View>
        </Pressable>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          disabled={saving}
          onPress={() => void save()}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || saving) && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>{saving ? "Menyimpan..." : "Simpan alamat"}</Text>
        </Pressable>
      </View>
    </ScrollView>
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
    container: { flexGrow: 1, backgroundColor: colors.background, padding: 20, paddingTop: 54, paddingBottom: 40 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 30 },
    backButton: { paddingVertical: 8, paddingRight: 12 },
    backText: { color: colors.primary, fontWeight: "800" },
    brand: { color: colors.primaryStrong, fontSize: 25, fontWeight: "900", letterSpacing: -1 },
    eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
    title: { color: colors.text, fontSize: 30, fontWeight: "900", letterSpacing: -1, marginTop: 5 },
    subtitle: { color: colors.textMuted, lineHeight: 20, marginTop: 7, marginBottom: 22 },
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 17 },
    label: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 15, marginBottom: 7 },
    labelRow: { flexDirection: "row", gap: 8, marginTop: 3 },
    labelChip: { borderColor: colors.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
    labelChipActive: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
    labelChipText: { color: colors.text, fontWeight: "800", fontSize: 12 },
    labelChipTextActive: { color: "#FFFFFF" },
    input: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 14, color: colors.text, paddingHorizontal: 13, paddingVertical: 12 },
    multiline: { minHeight: 96 },
    notesInput: { minHeight: 72 },
    defaultRow: { flexDirection: "row", alignItems: "center", marginTop: 20 },
    checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    checkboxActive: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
    checkmark: { color: "#FFFFFF", fontWeight: "900" },
    defaultCopy: { flex: 1, paddingLeft: 10 },
    defaultTitle: { color: colors.text, fontWeight: "900", fontSize: 13 },
    defaultMeta: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
    errorCard: { backgroundColor: colors.surfaceAccent, borderRadius: 13, padding: 12, marginTop: 16 },
    errorText: { color: colors.text, fontSize: 12, lineHeight: 18 },
    primaryButton: { backgroundColor: colors.primaryStrong, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 20 },
    primaryButtonText: { color: "#FFFFFF", fontWeight: "900" },
    buttonPressed: { opacity: 0.7 },
  });
}
