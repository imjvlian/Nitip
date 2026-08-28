import type { DriverVehicleType, NitipDriverProfile } from "@nitip/domain/driver";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPopup, type PopupNotice } from "../components/AnimatedPopup";
import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getDriverMe, updateDriver } from "../lib/api";

function statusLabel(status: NitipDriverProfile["status"], language: "id" | "en") {
  const id = { draft: "Draft", pending_review: "Dalam review", approved: "Terverifikasi", rejected: "Perlu diperbaiki" } as const;
  const en = { draft: "Draft", pending_review: "Under review", approved: "Verified", rejected: "Action required" } as const;
  return (language === "id" ? id : en)[status];
}

export default function DriverVehicleScreen() {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<NitipDriverProfile | null>(null);
  const [vehicleType, setVehicleType] = useState<DriverVehicleType>("motorcycle");
  const [vehicleBrandModel, setVehicleBrandModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<PopupNotice | null>(null);

  const c = language === "id" ? {
    title: "Kendaraan", heading: "Kendaraan terdaftar.", subtitle: "Pastikan data kendaraan yang digunakan mengantar sesuai dengan profil driver yang terverifikasi.", registered: "KENDARAAN AKTIF",
    type: "Jenis kendaraan", motorcycle: "Motor", car: "Mobil", model: "Merek & model", plate: "Nomor polisi", status: "Status verifikasi",
    editNote: "Data kendaraan masih dapat diedit selama profil draft atau ditolak.", lockedNote: "Data kendaraan dikunci setelah dikirim untuk review. Perubahan kendaraan pada akun aktif harus melalui verifikasi ulang agar data yang dilihat customer tetap konsisten.",
    save: "Simpan kendaraan", support: "Ajukan perubahan kendaraan", saveOk: "Kendaraan diperbarui", saveOkBody: "Data kendaraan berhasil disimpan.", failed: "Tidak dapat menyimpan", loading: "Memuat kendaraan...", missing: "Profil driver belum tersedia.",
  } : {
    title: "Vehicle", heading: "Registered vehicle.", subtitle: "Make sure the vehicle used for deliveries matches your verified driver profile.", registered: "ACTIVE VEHICLE",
    type: "Vehicle type", motorcycle: "Motorcycle", car: "Car", model: "Brand & model", plate: "License plate", status: "Verification status",
    editNote: "Vehicle details remain editable while the profile is draft or rejected.", lockedNote: "Vehicle details are locked after review submission. Changes on an active account must be verified again so customer-facing information stays consistent.",
    save: "Save vehicle", support: "Request vehicle change", saveOk: "Vehicle updated", saveOkBody: "Vehicle details were saved successfully.", failed: "Unable to save", loading: "Loading vehicle...", missing: "Driver profile is unavailable.",
  };

  const popupColors = { surface: theme.colors.surfaceRaised, border: theme.colors.border, text: theme.colors.text, textMuted: theme.colors.textMuted, primary: theme.colors.primary, success: theme.colors.success, danger: theme.colors.danger, warning: theme.colors.warning };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const next = await getDriverMe(user);
      setProfile(next);
      if (next) { setVehicleType(next.vehicleType); setVehicleBrandModel(next.vehicleBrandModel); setVehiclePlate(next.vehiclePlate); }
    } catch (error) {
      setNotice({ id: Date.now(), tone: "error", title: c.failed, message: error instanceof Error ? error.message : c.loading });
    } finally { setLoading(false); }
  }, [c.failed, c.loading, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!user) return <Redirect href="/login" />;
  const editable = profile?.status === "draft" || profile?.status === "rejected";

  async function save() {
    if (!profile || !editable || saving) return;
    setSaving(true);
    try {
      const next = await updateDriver(user, { vehicleType, vehicleBrandModel: vehicleBrandModel.trim(), vehiclePlate: vehiclePlate.trim().toUpperCase() });
      setProfile(next); setVehiclePlate(next.vehiclePlate);
      setNotice({ id: Date.now(), tone: "success", title: c.saveOk, message: c.saveOkBody });
    } catch (error) {
      setNotice({ id: Date.now(), tone: "error", title: c.failed, message: error instanceof Error ? error.message : c.failed });
    } finally { setSaving(false); }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AnimatedPopup colors={popupColors} notice={notice} onNoticeDismiss={() => setNotice(null)} top={insets.top + 8} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AppHeader title={c.title} />
        {loading ? <View style={styles.loading}><ActivityIndicator color={theme.colors.primary} /></View> : !profile ? (
          <View style={[styles.empty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>{c.missing}</Text></View>
        ) : <>
          <View style={styles.hero}><Text style={[styles.heroTitle, { color: theme.colors.text }]}>{c.heading}</Text><Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text></View>
          <View style={[styles.vehicleHero, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.shadow }]}>
            <View style={styles.vehicleIcon}><NitipIcon color="#FFFFFF" name="vehicle" size={27} /></View>
            <View style={styles.vehicleCopy}><Text style={styles.vehicleEyebrow}>{c.registered}</Text><Text numberOfLines={1} style={styles.vehicleName}>{profile.vehicleBrandModel || "—"}</Text><Text style={styles.vehiclePlate}>{profile.vehiclePlate || "—"}</Text></View>
            <View style={styles.statusPill}><Text style={styles.statusPillText}>{statusLabel(profile.status, language)}</Text></View>
          </View>

          <View style={[styles.formCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{c.type}</Text>
            <View style={styles.typeRow}>{(["motorcycle", "car"] as DriverVehicleType[]).map((type) => {
              const selected = vehicleType === type;
              return <Pressable disabled={!editable} key={type} onPress={() => setVehicleType(type)} style={[styles.typeChoice, { backgroundColor: selected ? theme.colors.surfaceAccent : theme.colors.background, borderColor: selected ? theme.colors.primary : theme.colors.border, opacity: editable ? 1 : 0.72 }]}><NitipIcon color={selected ? theme.colors.primary : theme.colors.textMuted} name="vehicle" size={17} /><Text style={[styles.typeText, { color: selected ? theme.colors.primary : theme.colors.text }]}>{type === "motorcycle" ? c.motorcycle : c.car}</Text></Pressable>;
            })}</View>
            <Field label={c.model} value={vehicleBrandModel} onChangeText={setVehicleBrandModel} editable={editable} theme={theme} />
            <Field label={c.plate} value={vehiclePlate} onChangeText={(value) => setVehiclePlate(value.toUpperCase())} editable={editable} autoCapitalize="characters" theme={theme} />
            <View style={[styles.statusRow, { backgroundColor: theme.colors.secondary }]}><Text style={[styles.statusLabel, { color: theme.colors.textMuted }]}>{c.status}</Text><Text style={[styles.statusValue, { color: profile.status === "approved" ? theme.colors.success : theme.colors.primary }]}>{statusLabel(profile.status, language)}</Text></View>
            <Text style={[styles.note, { color: editable ? theme.colors.primary : theme.colors.textMuted }]}>{editable ? c.editNote : c.lockedNote}</Text>
          </View>

          {editable ? <Pressable disabled={saving} onPress={() => void save()} style={[styles.primaryButton, { backgroundColor: theme.colors.primary, opacity: saving ? 0.55 : 1 }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{c.save}</Text>}</Pressable> : <Pressable onPress={() => router.push("/support")} style={[styles.outlineButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><NitipIcon color={theme.colors.primary} name="help" size={16} /><Text style={[styles.outlineText, { color: theme.colors.primary }]}>{c.support}</Text></Pressable>}
        </>}
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChangeText, editable, autoCapitalize, theme }: { label: string; value: string; onChangeText: (value: string) => void; editable: boolean; autoCapitalize?: "none" | "sentences" | "words" | "characters"; theme: ReturnType<typeof useNitipTheme>; }) {
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{label}</Text><TextInput autoCapitalize={autoCapitalize} editable={editable} onChangeText={onChangeText} placeholder={label} placeholderTextColor={theme.colors.textMuted} style={[styles.input, { backgroundColor: editable ? theme.colors.background : theme.colors.secondary, borderColor: theme.colors.border, color: theme.colors.text, opacity: editable ? 1 : 0.78 }]} value={value} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 42, paddingHorizontal: 20 }, loading: { alignItems: "center", justifyContent: "center", minHeight: 220 }, hero: { marginTop: 24 }, heroTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8 }, heroSubtitle: { fontSize: 10, lineHeight: 17, marginTop: 6 },
  vehicleHero: { alignItems: "center", borderRadius: 24, elevation: 4, flexDirection: "row", marginTop: 20, padding: 16, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.12, shadowRadius: 12 }, vehicleIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,.14)", borderRadius: 24, height: 48, justifyContent: "center", width: 48 }, vehicleCopy: { flex: 1, minWidth: 0, paddingHorizontal: 12 }, vehicleEyebrow: { color: "rgba(255,255,255,.72)", fontSize: 7, fontWeight: "900", letterSpacing: 1 }, vehicleName: { color: "#FFFFFF", fontSize: 14, fontWeight: "900", marginTop: 4 }, vehiclePlate: { color: "rgba(255,255,255,.84)", fontSize: 9, fontWeight: "800", marginTop: 3 }, statusPill: { backgroundColor: "rgba(255,255,255,.14)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 }, statusPillText: { color: "#FFFFFF", fontSize: 7, fontWeight: "900" },
  formCard: { borderRadius: 22, borderWidth: 1, gap: 14, marginTop: 14, padding: 14 }, field: { gap: 6 }, fieldLabel: { fontSize: 8, fontWeight: "800" }, typeRow: { flexDirection: "row", gap: 9 }, typeChoice: { alignItems: "center", borderRadius: 15, borderWidth: 1, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 46, paddingHorizontal: 10 }, typeText: { fontSize: 9, fontWeight: "900" }, input: { borderRadius: 15, borderWidth: 1, fontSize: 11, fontWeight: "700", minHeight: 48, paddingHorizontal: 13 }, statusRow: { alignItems: "center", borderRadius: 14, flexDirection: "row", justifyContent: "space-between", minHeight: 44, paddingHorizontal: 12 }, statusLabel: { fontSize: 8, fontWeight: "800" }, statusValue: { fontSize: 9, fontWeight: "900" }, note: { fontSize: 8, fontWeight: "700", lineHeight: 13 },
  primaryButton: { alignItems: "center", borderRadius: 17, justifyContent: "center", marginTop: 16, minHeight: 52, paddingHorizontal: 16 }, primaryText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" }, outlineButton: { alignItems: "center", borderRadius: 17, borderWidth: 1, flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 16, minHeight: 52, paddingHorizontal: 16 }, outlineText: { fontSize: 10, fontWeight: "900" }, empty: { borderRadius: 22, borderWidth: 1, marginTop: 24, padding: 24 }, emptyText: { fontSize: 10, lineHeight: 16, textAlign: "center" },
});
