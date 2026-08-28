import type { NitipUserProfile } from "@nitip/domain";
import type { NitipDriverProfile } from "@nitip/domain/driver";
import { useNitipLanguage } from "@nitip/i18n";
import * as ImagePicker from "expo-image-picker";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPopup, type PopupNotice } from "../components/AnimatedPopup";
import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import {
  getDriverAccountProfile,
  getDriverMe,
  submitDriver,
  updateDriver,
  updateDriverProfilePhoto,
  uploadDriverProfilePhoto,
} from "../lib/api";

function statusLabel(status: NitipDriverProfile["status"], language: "id" | "en") {
  const id = { draft: "Draft", pending_review: "Dalam review", approved: "Terverifikasi", rejected: "Perlu diperbaiki" } as const;
  const en = { draft: "Draft", pending_review: "Under review", approved: "Verified", rejected: "Action required" } as const;
  return (language === "id" ? id : en)[status];
}

function formatDate(value: string | null, language: "id" | "en") {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(language === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DriverProfileScreen() {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<NitipDriverProfile | null>(null);
  const [account, setAccount] = useState<NitipUserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<PopupNotice | null>(null);

  const c = language === "id" ? {
    title: "Profil driver", heading: "Identitas kamu.", subtitle: "Data ini digunakan Nitip untuk verifikasi akun dan ditampilkan sebagai identitas driver saat pengantaran.",
    photo: "Foto profil", photoBody: "Ambil foto wajah terbaru. Foto dapat diperbarui tanpa mengubah status verifikasi driver.", takePhoto: "Ambil foto",
    identity: "INFORMASI PRIBADI", name: "Nama lengkap", phone: "Nomor HP", email: "Email akun", emailBody: "Email mengikuti akun Firebase yang digunakan untuk login.",
    verification: "STATUS VERIFIKASI", status: "Status", registered: "Terdaftar", submitted: "Dikirim untuk review", reviewed: "Terakhir direview", rejection: "CATATAN REVIEW",
    editable: "Data identitas dapat diedit selama profil masih draft atau ditolak.", locked: "Profil yang sedang direview atau sudah disetujui dikunci untuk menjaga konsistensi identitas. Gunakan Pusat Bantuan jika ada perubahan data.",
    save: "Simpan perubahan", submit: "Kirim untuk verifikasi", support: "Ajukan perubahan data", loading: "Memuat profil...", saveOk: "Profil diperbarui", saveOkBody: "Perubahan data driver berhasil disimpan.",
    submitOk: "Profil dikirim", submitOkBody: "Data kamu masuk antrean review Nitip.", photoOk: "Foto profil diperbarui", photoOkBody: "Foto baru sudah tersimpan.", failed: "Tidak dapat menyimpan",
    cameraDenied: "Izin kamera diperlukan", cameraDeniedBody: "Aktifkan izin kamera untuk mengambil foto profil.", missing: "Profil driver belum dibuat", missingBody: "Selesaikan onboarding driver dari halaman Home terlebih dahulu.", goHome: "Kembali ke Home",
  } : {
    title: "Driver profile", heading: "Your identity.", subtitle: "Nitip uses these details for account verification and as your driver identity during deliveries.",
    photo: "Profile photo", photoBody: "Take a recent face photo. You can update the photo without changing driver verification status.", takePhoto: "Take photo",
    identity: "PERSONAL INFORMATION", name: "Full name", phone: "Phone number", email: "Account email", emailBody: "Email follows the Firebase account used to sign in.",
    verification: "VERIFICATION STATUS", status: "Status", registered: "Registered", submitted: "Submitted for review", reviewed: "Last reviewed", rejection: "REVIEW NOTE",
    editable: "Identity details can be edited while the profile is draft or rejected.", locked: "Profiles under review or already approved are locked to preserve identity consistency. Use Help Center for changes.",
    save: "Save changes", submit: "Submit for verification", support: "Request a data change", loading: "Loading profile...", saveOk: "Profile updated", saveOkBody: "Driver details were saved successfully.",
    submitOk: "Profile submitted", submitOkBody: "Your details are now in Nitip's review queue.", photoOk: "Profile photo updated", photoOkBody: "Your new photo has been saved.", failed: "Unable to save",
    cameraDenied: "Camera permission required", cameraDeniedBody: "Enable camera access to capture your profile photo.", missing: "Driver profile not created", missingBody: "Complete driver onboarding from Home first.", goHome: "Back to Home",
  };

  const popupColors = { surface: theme.colors.surfaceRaised, border: theme.colors.border, text: theme.colors.text, textMuted: theme.colors.textMuted, primary: theme.colors.primary, success: theme.colors.success, danger: theme.colors.danger, warning: theme.colors.warning };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [driverProfile, accountProfile] = await Promise.all([getDriverMe(user), getDriverAccountProfile(user).catch(() => null)]);
      setProfile(driverProfile);
      setAccount(accountProfile);
      setFullName(driverProfile?.fullName ?? "");
      setPhoneNumber(driverProfile?.phoneNumber ?? "");
    } catch (error) {
      setNotice({ id: Date.now(), tone: "error", title: c.failed, message: error instanceof Error ? error.message : c.loading });
    } finally { setLoading(false); }
  }, [c.failed, c.loading, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!user) return <Redirect href="/login" />;

  const editable = profile?.status === "draft" || profile?.status === "rejected";
  const initials = useMemo(() => {
    const source = profile?.fullName || user.displayName || "D";
    return source.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "D";
  }, [profile?.fullName, user.displayName]);

  async function save() {
    if (!profile || !editable || saving) return;
    setSaving(true);
    try {
      const next = await updateDriver(user, { fullName: fullName.trim(), phoneNumber: phoneNumber.trim() });
      setProfile(next);
      setNotice({ id: Date.now(), tone: "success", title: c.saveOk, message: c.saveOkBody });
    } catch (error) {
      setNotice({ id: Date.now(), tone: "error", title: c.failed, message: error instanceof Error ? error.message : c.failed });
    } finally { setSaving(false); }
  }

  async function submit() {
    if (!profile || !editable || saving) return;
    setSaving(true);
    try {
      const next = await submitDriver(user);
      setProfile(next);
      setNotice({ id: Date.now(), tone: "success", title: c.submitOk, message: c.submitOkBody });
    } catch (error) {
      setNotice({ id: Date.now(), tone: "error", title: c.failed, message: error instanceof Error ? error.message : c.failed });
    } finally { setSaving(false); }
  }

  async function takeProfilePhoto() {
    if (uploading) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setNotice({ id: Date.now(), tone: "warning", title: c.cameraDenied, message: c.cameraDeniedBody });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.82 });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const url = await uploadDriverProfilePhoto(user, { uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
      const next = await updateDriverProfilePhoto(user, url);
      setAccount(next);
      setNotice({ id: Date.now(), tone: "success", title: c.photoOk, message: c.photoOkBody });
    } catch (error) {
      setNotice({ id: Date.now(), tone: "error", title: c.failed, message: error instanceof Error ? error.message : c.failed });
    } finally { setUploading(false); }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AnimatedPopup colors={popupColors} notice={notice} onNoticeDismiss={() => setNotice(null)} top={insets.top + 8} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AppHeader title={c.title} />
        {loading ? <View style={styles.loading}><ActivityIndicator color={theme.colors.primary} /></View> : !profile ? (
          <View style={[styles.empty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceAccent }]}><NitipIcon color={theme.colors.primary} name="profile" size={25} /></View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{c.missing}</Text>
            <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{c.missingBody}</Text>
            <Pressable onPress={() => router.replace("/home")} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}><Text style={styles.primaryText}>{c.goHome}</Text></Pressable>
          </View>
        ) : (
          <>
            <View style={styles.hero}><Text style={[styles.heroTitle, { color: theme.colors.text }]}>{c.heading}</Text><Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text></View>
            <View style={[styles.photoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.photoRow}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceAccent }]}>{account?.photoUrl ? <Image source={{ uri: account.photoUrl }} style={styles.avatarImage} /> : <Text style={[styles.initials, { color: theme.colors.primary }]}>{initials}</Text>}</View>
                <View style={styles.photoCopy}><Text style={[styles.cardTitle, { color: theme.colors.text }]}>{c.photo}</Text><Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>{c.photoBody}</Text></View>
              </View>
              <Pressable disabled={uploading} onPress={() => void takeProfilePhoto()} style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceAccent, borderColor: theme.colors.border, opacity: uploading ? 0.55 : 1 }]}>
                {uploading ? <ActivityIndicator color={theme.colors.primary} /> : <NitipIcon color={theme.colors.primary} name="camera" size={16} />}<Text style={[styles.secondaryText, { color: theme.colors.primary }]}>{c.takePhoto}</Text>
              </Pressable>
            </View>

            <SectionLabel text={c.identity} color={theme.colors.textMuted} />
            <View style={[styles.formCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Field label={c.name} value={fullName} onChangeText={setFullName} editable={editable} theme={theme} />
              <Field label={c.phone} value={phoneNumber} onChangeText={setPhoneNumber} editable={editable} keyboardType="phone-pad" theme={theme} />
              <View style={styles.field}><Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{c.email}</Text><View style={[styles.readonlyValue, { backgroundColor: theme.colors.secondary, borderColor: theme.colors.border }]}><Text numberOfLines={1} style={[styles.readonlyText, { color: theme.colors.text }]}>{user.email ?? "—"}</Text></View><Text style={[styles.fieldHint, { color: theme.colors.textMuted }]}>{c.emailBody}</Text></View>
              <Text style={[styles.lockHint, { color: editable ? theme.colors.primary : theme.colors.textMuted }]}>{editable ? c.editable : c.locked}</Text>
            </View>

            <SectionLabel text={c.verification} color={theme.colors.textMuted} />
            <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <InfoRow label={c.status} value={statusLabel(profile.status, language)} theme={theme} strong /><Divider color={theme.colors.border} />
              <InfoRow label={c.registered} value={formatDate(profile.createdAt, language)} theme={theme} /><Divider color={theme.colors.border} />
              <InfoRow label={c.submitted} value={formatDate(profile.submittedAt, language)} theme={theme} /><Divider color={theme.colors.border} />
              <InfoRow label={c.reviewed} value={formatDate(profile.reviewedAt, language)} theme={theme} />
              {profile.rejectionReason ? <><Divider color={theme.colors.border} /><View style={[styles.reviewNote, { backgroundColor: theme.colors.dangerSurface }]}><Text style={[styles.reviewLabel, { color: theme.colors.danger }]}>{c.rejection}</Text><Text style={[styles.reviewText, { color: theme.colors.danger }]}>{profile.rejectionReason}</Text></View></> : null}
            </View>

            {editable ? <View style={styles.actions}>
              <Pressable disabled={saving} onPress={() => void save()} style={[styles.primaryButton, { backgroundColor: theme.colors.primary, opacity: saving ? 0.55 : 1 }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{c.save}</Text>}</Pressable>
              <Pressable disabled={saving} onPress={() => void submit()} style={[styles.outlineButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}><Text style={[styles.outlineText, { color: theme.colors.primary }]}>{c.submit}</Text></Pressable>
            </View> : <Pressable onPress={() => router.push("/support")} style={[styles.outlineButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><NitipIcon color={theme.colors.primary} name="help" size={16} /><Text style={[styles.outlineText, { color: theme.colors.primary }]}>{c.support}</Text></Pressable>}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChangeText, editable, keyboardType, theme }: { label: string; value: string; onChangeText: (value: string) => void; editable: boolean; keyboardType?: "default" | "phone-pad"; theme: ReturnType<typeof useNitipTheme>; }) {
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{label}</Text><TextInput editable={editable} keyboardType={keyboardType} onChangeText={onChangeText} placeholder={label} placeholderTextColor={theme.colors.textMuted} style={[styles.input, { backgroundColor: editable ? theme.colors.background : theme.colors.secondary, borderColor: theme.colors.border, color: theme.colors.text, opacity: editable ? 1 : 0.78 }]} value={value} /></View>;
}
function InfoRow({ label, value, theme, strong = false }: { label: string; value: string; theme: ReturnType<typeof useNitipTheme>; strong?: boolean }) { return <View style={styles.infoRow}><Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>{label}</Text><Text style={[styles.infoValue, { color: strong ? theme.colors.primary : theme.colors.text }]}>{value}</Text></View>; }
function Divider({ color }: { color: string }) { return <View style={[styles.divider, { backgroundColor: color }]} />; }
function SectionLabel({ text, color }: { text: string; color: string }) { return <Text style={[styles.sectionLabel, { color }]}>{text}</Text>; }

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 42, paddingHorizontal: 20 }, loading: { alignItems: "center", justifyContent: "center", minHeight: 220 }, hero: { marginTop: 24 }, heroTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8 }, heroSubtitle: { fontSize: 10, lineHeight: 17, marginTop: 6 },
  photoCard: { borderRadius: 24, borderWidth: 1, marginTop: 20, padding: 14 }, photoRow: { alignItems: "center", flexDirection: "row" }, avatar: { alignItems: "center", borderRadius: 34, height: 68, justifyContent: "center", overflow: "hidden", width: 68 }, avatarImage: { height: "100%", width: "100%" }, initials: { fontSize: 19, fontWeight: "900" }, photoCopy: { flex: 1, paddingLeft: 13 }, cardTitle: { fontSize: 12, fontWeight: "900" }, cardBody: { fontSize: 9, lineHeight: 14, marginTop: 4 },
  secondaryButton: { alignItems: "center", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 13, minHeight: 44, paddingHorizontal: 13 }, secondaryText: { fontSize: 9, fontWeight: "900" }, sectionLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 1.1, marginTop: 26 },
  formCard: { borderRadius: 22, borderWidth: 1, gap: 14, marginTop: 10, padding: 14 }, field: { gap: 6 }, fieldLabel: { fontSize: 8, fontWeight: "800" }, input: { borderRadius: 15, borderWidth: 1, fontSize: 11, fontWeight: "700", minHeight: 48, paddingHorizontal: 13 }, readonlyValue: { borderRadius: 15, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 13 }, readonlyText: { fontSize: 11, fontWeight: "700" }, fieldHint: { fontSize: 8, lineHeight: 12 }, lockHint: { fontSize: 8, fontWeight: "700", lineHeight: 13, paddingTop: 2 },
  infoCard: { borderRadius: 22, borderWidth: 1, marginTop: 10, padding: 14 }, infoRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 39 }, infoLabel: { fontSize: 9, fontWeight: "700", paddingRight: 12 }, infoValue: { fontSize: 9, fontWeight: "900", maxWidth: "55%", textAlign: "right" }, divider: { height: StyleSheet.hairlineWidth }, reviewNote: { borderRadius: 15, marginTop: 10, padding: 12 }, reviewLabel: { fontSize: 7, fontWeight: "900", letterSpacing: 1 }, reviewText: { fontSize: 9, fontWeight: "700", lineHeight: 14, marginTop: 5 },
  actions: { gap: 9, marginTop: 18 }, primaryButton: { alignItems: "center", borderRadius: 17, justifyContent: "center", minHeight: 52, paddingHorizontal: 16 }, primaryText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" }, outlineButton: { alignItems: "center", borderRadius: 17, borderWidth: 1, flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 9, minHeight: 52, paddingHorizontal: 16 }, outlineText: { fontSize: 10, fontWeight: "900" },
  empty: { alignItems: "center", borderRadius: 24, borderWidth: 1, marginTop: 28, padding: 22 }, emptyIcon: { alignItems: "center", borderRadius: 28, height: 56, justifyContent: "center", width: 56 }, emptyTitle: { fontSize: 14, fontWeight: "900", marginTop: 14, textAlign: "center" }, emptyBody: { fontSize: 9, lineHeight: 15, marginBottom: 18, marginTop: 6, textAlign: "center" },
});
