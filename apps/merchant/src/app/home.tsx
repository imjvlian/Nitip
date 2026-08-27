import type { NitipMerchantProfile, NitipOutlet } from "@nitip/domain";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { createMerchant, deleteOutlet, getMerchantMe, listOutlets, submitMerchant, updateMerchant, updateOutlet } from "../lib/api";

function statusCopy(status: NitipMerchantProfile["status"]) {
  if (status === "draft") return "DRAFT";
  if (status === "pending_review") return "MENUNGGU REVIEW";
  if (status === "approved") return "AKTIF";
  return "DITOLAK";
}

export default function MerchantHomeScreen() {
  const { signOut, user } = useAuth();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [merchant, setMerchant] = useState<NitipMerchantProfile | null>(null);
  const [outlets, setOutlets] = useState<NitipOutlet[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState(user?.displayName ?? "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const next = await getMerchantMe(user);
      setMerchant(next);
      if (next) {
        setBusinessName(next.businessName);
        setContactName(next.contactName);
        setPhoneNumber(next.phoneNumber);
        setDescription(next.description ?? "");
        setOutlets(await listOutlets(user));
      } else {
        setOutlets([]);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal memuat merchant");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [user]);

  if (!user) return <Redirect href="/login" />;

  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      const input = {
        businessName: businessName.trim(),
        contactName: contactName.trim(),
        phoneNumber: phoneNumber.trim(),
        description: description.trim() || null,
      };
      const next = merchant ? await updateMerchant(user, input) : await createMerchant(user, input);
      setMerchant(next);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal menyimpan profil merchant");
    } finally {
      setSaving(false);
    }
  }

  async function submitProfile() {
    setSaving(true);
    setError(null);
    try {
      setMerchant(await submitMerchant(user));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal mengirim onboarding");
    } finally {
      setSaving(false);
    }
  }

  async function toggleOrders(outlet: NitipOutlet) {
    try {
      const next = await updateOutlet(user, outlet.id, { acceptingOrders: !outlet.acceptingOrders });
      setOutlets((current) => current.map((item) => item.id === next.id ? next : item));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal mengubah status outlet");
    }
  }

  function confirmDelete(outlet: NitipOutlet) {
    Alert.alert("Hapus outlet?", `${outlet.name} dan seluruh katalog di dalamnya akan dihapus.`, [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => void (async () => {
        try {
          await deleteOutlet(user, outlet.id);
          setOutlets((current) => current.filter((item) => item.id !== outlet.id));
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "Gagal menghapus outlet");
        }
      })() },
    ]);
  }

  const editable = !merchant || merchant.status === "draft" || merchant.status === "rejected";

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View><Text style={styles.brand}>nitip mitra.</Text><Text style={styles.muted}>{user.email ?? "Merchant"}</Text></View>
        <Pressable onPress={() => void signOut()} style={styles.outlineButton}><Text style={styles.outlineText}>Keluar</Text></Pressable>
      </View>

      <Text style={styles.eyebrow}>MERCHANT CENTER</Text>
      <Text style={styles.title}>{merchant ? merchant.businessName : "Daftarkan usahamu."}</Text>
      <Text style={styles.subtitle}>Profil usaha, outlet, katalog, dan pesanan dikelola dari Nitip Mitra.</Text>

      {loading ? <View style={styles.loadingCard}><ActivityIndicator color={theme.colors.primary} /><Text style={styles.muted}>Memuat merchant...</Text></View> : <>
        {merchant && <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>STATUS ONBOARDING</Text>
          <Text style={styles.statusValue}>{statusCopy(merchant.status)}</Text>
          <Text style={styles.muted}>{merchant.status === "approved" ? "Merchant sudah siap menerima pesanan customer." : merchant.status === "pending_review" ? "Data menunggu review Ops. Menu tetap bisa disiapkan." : "Lengkapi data lalu kirim untuk review."}</Text>
        </View>}

        {merchant?.status === "approved" && (
          <Pressable onPress={() => router.push("/orders")} style={styles.orderCenterCard}>
            <View style={styles.orderCenterBody}>
              <Text style={styles.orderCenterLabel}>ORDER CENTER</Text>
              <Text style={styles.orderCenterTitle}>Pesanan masuk</Text>
              <Text style={styles.orderCenterMeta}>Konfirmasi, siapkan, dan tandai siap diambil driver.</Text>
            </View>
            <Text style={styles.orderCenterArrow}>›</Text>
          </Pressable>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profil usaha</Text>
          <Text style={styles.label}>Nama usaha</Text><TextInput editable={editable} value={businessName} onChangeText={setBusinessName} placeholder="Nasi Ayam Bu Rini" placeholderTextColor={theme.colors.textMuted} style={[styles.input, !editable && styles.readonly]} />
          <Text style={styles.label}>Penanggung jawab</Text><TextInput editable={editable} value={contactName} onChangeText={setContactName} placeholder="Nama lengkap" placeholderTextColor={theme.colors.textMuted} style={[styles.input, !editable && styles.readonly]} />
          <Text style={styles.label}>Nomor HP</Text><TextInput editable={editable} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholder="08xxxxxxxxxx" placeholderTextColor={theme.colors.textMuted} style={[styles.input, !editable && styles.readonly]} />
          <Text style={styles.label}>Deskripsi</Text><TextInput editable={editable} value={description} onChangeText={setDescription} multiline textAlignVertical="top" placeholder="Tentang usaha" placeholderTextColor={theme.colors.textMuted} style={[styles.input, styles.multiline, !editable && styles.readonly]} />
          {editable && <Pressable disabled={saving} onPress={() => void saveProfile()} style={styles.primaryButton}><Text style={styles.primaryText}>{saving ? "Menyimpan..." : merchant ? "Simpan perubahan" : "Buat profil merchant"}</Text></Pressable>}
          {merchant && (merchant.status === "draft" || merchant.status === "rejected") && <Pressable disabled={saving} onPress={() => void submitProfile()} style={styles.secondaryButton}><Text style={styles.secondaryText}>Kirim untuk review</Text></Pressable>}
        </View>

        {merchant && <>
          <View style={styles.sectionHeader}><View><Text style={styles.cardTitle}>Outlet</Text><Text style={styles.muted}>{outlets.length} outlet</Text></View><Pressable onPress={() => router.push("/outlet/new")} style={styles.smallButton}><Text style={styles.smallButtonText}>+ Tambah</Text></Pressable></View>
          {outlets.length === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>Belum ada outlet</Text><Text style={styles.muted}>Tambahkan lokasi jualan pertama.</Text></View> : outlets.map((outlet) => <View key={outlet.id} style={styles.outletCard}>
            <View style={styles.outletTop}><View style={styles.outletInfo}><Text style={styles.outletName}>{outlet.name}</Text><Text style={styles.muted}>{outlet.addressLine}</Text></View><View style={styles.badge}><Text style={styles.badgeText}>{outlet.acceptingOrders ? "BUKA" : "TUTUP"}</Text></View></View>
            <Text style={styles.meta}>{outlet.isActive ? "Outlet aktif" : "Outlet nonaktif"} · {outlet.latitude != null ? "Lokasi tersimpan" : "Lokasi belum dipilih"}</Text>
            <View style={styles.actions}>
              <Pressable onPress={() => router.push({ pathname: "/menu", params: { outletId: outlet.id, outletName: outlet.name } })}><Text style={styles.linkText}>Kelola menu</Text></Pressable>
              <Pressable onPress={() => void toggleOrders(outlet)}><Text style={styles.linkText}>{outlet.acceptingOrders ? "Tutup sementara" : "Buka pesanan"}</Text></Pressable>
              <Pressable onPress={() => confirmDelete(outlet)}><Text style={styles.dangerText}>Hapus</Text></Pressable>
            </View>
          </View>)}
        </>}
      </>}

      {error && <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View>}
    </ScrollView>
  );
}

function createStyles(colors: { background: string; surface: string; surfaceAccent: string; primary: string; primaryStrong: string; secondary: string; text: string; textMuted: string; border: string; onPrimary: string }) {
  return StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 32 },
    brand: { color: colors.primaryStrong, fontSize: 27, fontWeight: "900", letterSpacing: -1 },
    muted: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 3 },
    outlineButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
    outlineText: { color: colors.text, fontWeight: "800", fontSize: 11 },
    eyebrow: { color: colors.primary, fontWeight: "900", fontSize: 10, letterSpacing: 1.4 },
    title: { color: colors.text, fontWeight: "900", fontSize: 32, letterSpacing: -1.1, marginTop: 5 },
    subtitle: { color: colors.textMuted, lineHeight: 20, fontSize: 12, marginTop: 8, marginBottom: 20 },
    loadingCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 18, alignItems: "center", gap: 8 },
    statusCard: { backgroundColor: colors.surfaceAccent, borderRadius: 18, padding: 16, marginBottom: 12 },
    statusLabel: { color: colors.primary, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
    statusValue: { color: colors.text, fontSize: 17, fontWeight: "900", marginTop: 4 },
    orderCenterCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryStrong, borderRadius: 20, padding: 17, marginBottom: 12 },
    orderCenterBody: { flex: 1 },
    orderCenterLabel: { color: colors.secondary, fontWeight: "900", fontSize: 9, letterSpacing: 1.1 },
    orderCenterTitle: { color: colors.onPrimary, fontWeight: "900", fontSize: 18, marginTop: 4 },
    orderCenterMeta: { color: colors.secondary, fontSize: 10, lineHeight: 15, marginTop: 4 },
    orderCenterArrow: { color: colors.onPrimary, fontWeight: "900", fontSize: 30, marginLeft: 12 },
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 17 },
    cardTitle: { color: colors.text, fontWeight: "900", fontSize: 17 },
    label: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 15, marginBottom: 7 },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 14, color: colors.text, paddingHorizontal: 13, paddingVertical: 12 },
    readonly: { opacity: 0.7 },
    multiline: { minHeight: 90 },
    primaryButton: { backgroundColor: colors.primaryStrong, borderRadius: 14, alignItems: "center", paddingVertical: 14, marginTop: 18 },
    primaryText: { color: "#FFFFFF", fontWeight: "900" },
    secondaryButton: { borderWidth: 1, borderColor: colors.primary, borderRadius: 14, alignItems: "center", paddingVertical: 13, marginTop: 9 },
    secondaryText: { color: colors.primary, fontWeight: "900" },
    sectionHeader: { marginTop: 28, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    smallButton: { backgroundColor: colors.surfaceAccent, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
    smallButtonText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 11 },
    outletCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 10 },
    outletTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
    outletInfo: { flex: 1 },
    outletName: { color: colors.text, fontWeight: "900", fontSize: 15 },
    badge: { backgroundColor: colors.surfaceAccent, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
    badgeText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 9 },
    meta: { color: colors.primary, fontSize: 10, fontWeight: "700", marginTop: 11 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 12 },
    linkText: { color: colors.primary, fontWeight: "800", fontSize: 11 },
    dangerText: { color: "#B42318", fontWeight: "800", fontSize: 11 },
    errorCard: { marginTop: 14, padding: 13, borderRadius: 14, backgroundColor: colors.surfaceAccent },
    errorText: { color: colors.text, fontSize: 11, lineHeight: 17 },
  });
}
