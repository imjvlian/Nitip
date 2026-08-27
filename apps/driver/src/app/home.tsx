import type { DriverVehicleType, NitipDriverProfile } from "@nitip/domain/driver";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import {
  apiConfigured,
  createDriver,
  getDriverMe,
  setDriverOnline,
  submitDriver,
  updateDriver,
} from "../lib/api";

function statusLabel(status: NitipDriverProfile["status"]) {
  switch (status) {
    case "draft": return "DRAFT";
    case "pending_review": return "MENUNGGU REVIEW";
    case "approved": return "APPROVED";
    case "rejected": return "DITOLAK";
  }
}

export default function DriverHomeScreen() {
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<NitipDriverProfile | null>(null);
  const [fullName, setFullName] = useState(user?.displayName ?? "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<DriverVehicleType>("motorcycle");
  const [vehicleBrandModel, setVehicleBrandModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !apiConfigured) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    getDriverMe(user)
      .then((next) => {
        if (!active) return;
        setProfile(next);
        if (next) {
          setFullName(next.fullName);
          setPhoneNumber(next.phoneNumber);
          setVehicleType(next.vehicleType);
          setVehicleBrandModel(next.vehicleBrandModel);
          setVehiclePlate(next.vehiclePlate);
        }
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : "Gagal memuat profil driver");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [user]);

  if (!user) return <Redirect href="/login" />;

  const editable = !profile || profile.status === "draft" || profile.status === "rejected";

  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      const input = {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        vehicleType,
        vehicleBrandModel: vehicleBrandModel.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
      };
      const next = profile ? await updateDriver(user, input) : await createDriver(user, input);
      setProfile(next);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal menyimpan profil driver");
    } finally {
      setSaving(false);
    }
  }

  async function submitForReview() {
    setSaving(true);
    setError(null);
    try {
      setProfile(await submitDriver(user));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal mengirim data driver");
    } finally {
      setSaving(false);
    }
  }

  async function toggleOnline() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      setProfile(await setDriverOnline(user, !profile.isOnline));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal mengubah status driver");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>nitip driver.</Text>
          <Text style={styles.headerMeta}>{user.email ?? "Driver"}</Text>
        </View>
        <Pressable onPress={() => void signOut()} style={styles.outlineButton}>
          <Text style={styles.outlineText}>Keluar</Text>
        </Pressable>
      </View>

      <Text style={styles.eyebrow}>DRIVER CENTER</Text>
      <Text style={styles.title}>{profile ? `Halo, ${profile.fullName.split(" ")[0]}.` : "Lengkapi profilmu."}</Text>
      <Text style={styles.subtitle}>Data driver dan kendaraan akan direview Ops sebelum akun dapat online dan menerima order.</Text>

      {!apiConfigured ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>API belum dikonfigurasi</Text>
          <Text style={styles.muted}>Set EXPO_PUBLIC_API_URL di apps/driver/.env.</Text>
        </View>
      ) : loading ? (
        <View style={styles.centerCard}>
          <ActivityIndicator color="#08349C" />
          <Text style={styles.muted}>Memuat profil driver...</Text>
        </View>
      ) : (
        <>
          {profile ? (
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View>
                  <Text style={styles.statusLabel}>STATUS DRIVER</Text>
                  <Text style={styles.statusValue}>{statusLabel(profile.status)}</Text>
                </View>
                <View style={[styles.onlineBadge, profile.isOnline && styles.onlineBadgeActive]}>
                  <Text style={[styles.onlineBadgeText, profile.isOnline && styles.onlineBadgeTextActive]}>
                    {profile.isOnline ? "● ONLINE" : "○ OFFLINE"}
                  </Text>
                </View>
              </View>
              <Text style={styles.muted}>
                {profile.status === "approved"
                  ? "Akun sudah lolos review. Kamu dapat online untuk tahap dispatch berikutnya."
                  : profile.status === "pending_review"
                    ? "Data sedang menunggu review Nitip Ops."
                    : profile.status === "rejected"
                      ? "Perbaiki data sesuai alasan penolakan lalu kirim ulang."
                      : "Lengkapi data dan kirim untuk review."}
              </Text>
              {profile.rejectionReason ? (
                <View style={styles.rejectBox}>
                  <Text style={styles.rejectLabel}>ALASAN PENOLAKAN</Text>
                  <Text style={styles.rejectText}>{profile.rejectionReason}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {profile?.status === "approved" ? (
            <View style={styles.availabilityCard}>
              <Text style={styles.cardTitle}>Ketersediaan</Text>
              <Text style={styles.muted}>Online berarti siap menerima assignment order ketika Driver Dispatch diaktifkan.</Text>
              <Pressable
                disabled={saving}
                onPress={() => void toggleOnline()}
                style={[styles.availabilityButton, profile.isOnline && styles.availabilityButtonOffline]}
              >
                <Text style={styles.availabilityButtonText}>
                  {saving ? "Memproses..." : profile.isOnline ? "Jadikan offline" : "Mulai online"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Data driver</Text>
            <Text style={styles.label}>Nama lengkap</Text>
            <TextInput editable={editable} value={fullName} onChangeText={setFullName} placeholder="Nama lengkap" placeholderTextColor="#52607F" style={[styles.input, !editable && styles.readonly]} />

            <Text style={styles.label}>Nomor HP</Text>
            <TextInput editable={editable} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholder="08xxxxxxxxxx" placeholderTextColor="#52607F" style={[styles.input, !editable && styles.readonly]} />

            <Text style={styles.label}>Jenis kendaraan</Text>
            <View style={styles.vehicleRow}>
              <Pressable disabled={!editable} onPress={() => setVehicleType("motorcycle")} style={[styles.vehicleChoice, vehicleType === "motorcycle" && styles.vehicleChoiceActive, !editable && styles.readonly]}>
                <Text style={[styles.vehicleChoiceText, vehicleType === "motorcycle" && styles.vehicleChoiceTextActive]}>Motor</Text>
              </Pressable>
              <Pressable disabled={!editable} onPress={() => setVehicleType("car")} style={[styles.vehicleChoice, vehicleType === "car" && styles.vehicleChoiceActive, !editable && styles.readonly]}>
                <Text style={[styles.vehicleChoiceText, vehicleType === "car" && styles.vehicleChoiceTextActive]}>Mobil</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Merek & model</Text>
            <TextInput editable={editable} value={vehicleBrandModel} onChangeText={setVehicleBrandModel} placeholder="Honda Beat 2024" placeholderTextColor="#52607F" style={[styles.input, !editable && styles.readonly]} />

            <Text style={styles.label}>Nomor polisi</Text>
            <TextInput editable={editable} value={vehiclePlate} onChangeText={setVehiclePlate} autoCapitalize="characters" placeholder="N 1234 AB" placeholderTextColor="#52607F" style={[styles.input, !editable && styles.readonly]} />

            {editable ? (
              <Pressable disabled={saving} onPress={() => void saveProfile()} style={[styles.primaryButton, saving && styles.disabled]}>
                <Text style={styles.primaryText}>{saving ? "Menyimpan..." : profile ? "Simpan perubahan" : "Buat profil driver"}</Text>
              </Pressable>
            ) : null}

            {profile && (profile.status === "draft" || profile.status === "rejected") ? (
              <Pressable disabled={saving} onPress={() => void submitForReview()} style={[styles.secondaryButton, saving && styles.disabled]}>
                <Text style={styles.secondaryText}>Kirim untuk review</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}

      {error ? <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#F7FFF9", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 32 },
  brand: { color: "#14216D", fontSize: 27, fontWeight: "900", letterSpacing: -1 },
  headerMeta: { color: "#52607F", fontSize: 11, marginTop: 3 },
  outlineButton: { borderWidth: 1, borderColor: "#A1DCD9", borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  outlineText: { color: "#14216D", fontWeight: "800", fontSize: 11 },
  eyebrow: { color: "#08349C", fontWeight: "900", fontSize: 10, letterSpacing: 1.4 },
  title: { color: "#14216D", fontWeight: "900", fontSize: 32, letterSpacing: -1.1, marginTop: 5 },
  subtitle: { color: "#52607F", lineHeight: 20, fontSize: 12, marginTop: 8, marginBottom: 20 },
  notice: { backgroundColor: "#CEFCD9", borderRadius: 18, padding: 16, marginBottom: 12 },
  noticeTitle: { color: "#14216D", fontWeight: "900", fontSize: 13 },
  muted: { color: "#52607F", fontSize: 11, lineHeight: 17, marginTop: 4 },
  centerCard: { backgroundColor: "#FFFFFF", borderColor: "#A1DCD9", borderWidth: 1, borderRadius: 18, padding: 18, alignItems: "center", gap: 8 },
  statusCard: { backgroundColor: "#CEFCD9", borderRadius: 18, padding: 16, marginBottom: 12 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  statusLabel: { color: "#08349C", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  statusValue: { color: "#14216D", fontSize: 17, fontWeight: "900", marginTop: 4 },
  onlineBadge: { backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  onlineBadgeActive: { backgroundColor: "#08349C" },
  onlineBadgeText: { color: "#52607F", fontSize: 9, fontWeight: "900" },
  onlineBadgeTextActive: { color: "#FFFFFF" },
  rejectBox: { backgroundColor: "#FFF1F0", borderRadius: 12, padding: 12, marginTop: 12 },
  rejectLabel: { color: "#B42318", fontWeight: "900", fontSize: 9, letterSpacing: 0.8 },
  rejectText: { color: "#B42318", fontSize: 11, lineHeight: 17, marginTop: 4 },
  availabilityCard: { backgroundColor: "#14216D", borderRadius: 20, padding: 18, marginBottom: 12 },
  availabilityButton: { backgroundColor: "#08349C", borderRadius: 14, alignItems: "center", paddingVertical: 13, marginTop: 14 },
  availabilityButtonOffline: { backgroundColor: "#52607F" },
  availabilityButtonText: { color: "#FFFFFF", fontWeight: "900" },
  card: { backgroundColor: "#FFFFFF", borderColor: "#A1DCD9", borderWidth: 1, borderRadius: 20, padding: 17 },
  cardTitle: { color: "#14216D", fontWeight: "900", fontSize: 17 },
  label: { color: "#52607F", fontSize: 11, fontWeight: "800", marginTop: 15, marginBottom: 7 },
  input: { backgroundColor: "#F7FFF9", borderWidth: 1, borderColor: "#A1DCD9", borderRadius: 14, color: "#14216D", paddingHorizontal: 13, paddingVertical: 12 },
  readonly: { opacity: 0.65 },
  vehicleRow: { flexDirection: "row", gap: 10 },
  vehicleChoice: { flex: 1, borderWidth: 1, borderColor: "#A1DCD9", borderRadius: 14, alignItems: "center", paddingVertical: 12 },
  vehicleChoiceActive: { backgroundColor: "#CEFCD9", borderColor: "#08349C" },
  vehicleChoiceText: { color: "#52607F", fontWeight: "800" },
  vehicleChoiceTextActive: { color: "#14216D" },
  primaryButton: { backgroundColor: "#14216D", borderRadius: 14, alignItems: "center", paddingVertical: 14, marginTop: 18 },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  secondaryButton: { borderWidth: 1, borderColor: "#08349C", borderRadius: 14, alignItems: "center", paddingVertical: 13, marginTop: 9 },
  secondaryText: { color: "#08349C", fontWeight: "900" },
  disabled: { opacity: 0.5 },
  errorCard: { marginTop: 14, padding: 13, borderRadius: 14, backgroundColor: "#FFF1F0" },
  errorText: { color: "#B42318", fontSize: 11, lineHeight: 17 },
});
