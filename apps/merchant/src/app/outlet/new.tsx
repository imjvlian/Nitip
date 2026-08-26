import { WEEKDAYS, type OutletOpeningHour, type Weekday } from "@nitip/domain";
import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { createOutlet } from "../../lib/api";

const dayLabels: Record<Weekday, string> = { mon: "Sen", tue: "Sel", wed: "Rab", thu: "Kam", fri: "Jum", sat: "Sab", sun: "Min" };

export default function NewOutletScreen() {
  const { user } = useAuth();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [openDays, setOpenDays] = useState<Weekday[]>([...WEEKDAYS]);
  const [opensAt, setOpensAt] = useState("08:00");
  const [closesAt, setClosesAt] = useState("20:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return <Redirect href="/login" />;

  function toggleDay(day: Weekday) {
    setOpenDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const openingHours: OutletOpeningHour[] = WEEKDAYS.map((day) => {
      const isOpen = openDays.includes(day);
      return { day, isOpen, opensAt: isOpen ? opensAt : null, closesAt: isOpen ? closesAt : null };
    });

    try {
      await createOutlet(user, {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        addressLine: addressLine.trim(),
        latitude: null,
        longitude: null,
        isActive: true,
        acceptingOrders: false,
        openingHours,
      });
      router.replace("/home");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal membuat outlet");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.backText}>‹ Kembali</Text></Pressable><Text style={styles.brand}>nitip mitra.</Text></View>
      <Text style={styles.eyebrow}>OUTLET BARU</Text>
      <Text style={styles.title}>Tambahkan lokasi jualan.</Text>
      <Text style={styles.subtitle}>Alamat dan jam operasional disimpan sekarang. Titik peta ditambahkan pada fase Maps.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Nama outlet</Text><TextInput value={name} onChangeText={setName} placeholder="Cabang Lumajang Kota" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
        <Text style={styles.label}>Nomor kontak</Text><TextInput value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholder="08xxxxxxxxxx" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
        <Text style={styles.label}>Alamat lengkap</Text><TextInput value={addressLine} onChangeText={setAddressLine} multiline textAlignVertical="top" placeholder="Jalan, nomor, desa/kelurahan, kecamatan" placeholderTextColor={theme.colors.textMuted} style={[styles.input, styles.multiline]} />

        <Text style={styles.sectionLabel}>Hari buka</Text>
        <View style={styles.days}>{WEEKDAYS.map((day) => {
          const active = openDays.includes(day);
          return <Pressable key={day} onPress={() => toggleDay(day)} style={[styles.dayChip, active && styles.dayChipActive]}><Text style={[styles.dayText, active && styles.dayTextActive]}>{dayLabels[day]}</Text></Pressable>;
        })}</View>

        <View style={styles.timeRow}>
          <View style={styles.timeField}><Text style={styles.label}>Buka</Text><TextInput value={opensAt} onChangeText={setOpensAt} placeholder="08:00" placeholderTextColor={theme.colors.textMuted} style={styles.input} maxLength={5} /></View>
          <View style={styles.timeField}><Text style={styles.label}>Tutup</Text><TextInput value={closesAt} onChangeText={setClosesAt} placeholder="20:00" placeholderTextColor={theme.colors.textMuted} style={styles.input} maxLength={5} /></View>
        </View>
        <Text style={styles.hint}>Gunakan format 24 jam HH:MM. Backend sudah mendukung jadwal berbeda per hari.</Text>
        {error && <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View>}
        <Pressable disabled={saving} onPress={() => void save()} style={styles.primaryButton}><Text style={styles.primaryText}>{saving ? "Menyimpan..." : "Simpan outlet"}</Text></Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: { background: string; surface: string; surfaceAccent: string; primary: string; primaryStrong: string; secondary: string; text: string; textMuted: string; border: string; onPrimary: string }) {
  return StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: colors.background, padding: 20, paddingTop: 54, paddingBottom: 40 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
    backText: { color: colors.primary, fontWeight: "800" },
    brand: { color: colors.primaryStrong, fontSize: 24, fontWeight: "900", letterSpacing: -1 },
    eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
    title: { color: colors.text, fontSize: 30, fontWeight: "900", letterSpacing: -1, marginTop: 5 },
    subtitle: { color: colors.textMuted, lineHeight: 20, marginTop: 7, marginBottom: 22, fontSize: 12 },
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 17 },
    label: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 15, marginBottom: 7 },
    sectionLabel: { color: colors.text, fontSize: 13, fontWeight: "900", marginTop: 22, marginBottom: 10 },
    input: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 14, color: colors.text, paddingHorizontal: 13, paddingVertical: 12 },
    multiline: { minHeight: 92 },
    days: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    dayChip: { width: 44, alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 9 },
    dayChipActive: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
    dayText: { color: colors.text, fontSize: 11, fontWeight: "800" },
    dayTextActive: { color: "#FFFFFF" },
    timeRow: { flexDirection: "row", gap: 10 },
    timeField: { flex: 1 },
    hint: { color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 10 },
    errorCard: { backgroundColor: colors.surfaceAccent, borderRadius: 13, padding: 12, marginTop: 16 },
    errorText: { color: colors.text, fontSize: 11, lineHeight: 17 },
    primaryButton: { backgroundColor: colors.primaryStrong, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 20 },
    primaryText: { color: "#FFFFFF", fontWeight: "900" },
  });
}
