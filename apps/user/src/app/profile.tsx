import type { NitipAddress, NitipUserProfile } from "@nitip/domain";
import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import {
  deleteAddress,
  getMe,
  listAddresses,
  updateAddress,
  updateMe,
} from "../lib/api";

function addressLabel(address: NitipAddress) {
  if (address.label === "home") return "Rumah";
  if (address.label === "office") return "Kantor";
  return address.customLabel || "Lainnya";
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [profile, setProfile] = useState<NitipUserProfile | null>(null);
  const [addresses, setAddresses] = useState<NitipAddress[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const [nextProfile, nextAddresses] = await Promise.all([
        getMe(user),
        listAddresses(user),
      ]);
      setProfile(nextProfile);
      setDisplayName(nextProfile.displayName ?? "");
      setPhoneNumber(nextProfile.phoneNumber ?? "");
      setAddresses(nextAddresses);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal memuat profil");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user]);

  if (!user) return <Redirect href="/login" />;

  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      const nextProfile = await updateMe(user, {
        displayName: displayName.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
      });
      setProfile(nextProfile);
      setDisplayName(nextProfile.displayName ?? "");
      setPhoneNumber(nextProfile.phoneNumber ?? "");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(address: NitipAddress) {
    try {
      await updateAddress(user, address.id, { isDefault: true });
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal mengubah alamat utama");
    }
  }

  function confirmDelete(address: NitipAddress) {
    Alert.alert(
      "Hapus alamat?",
      `${addressLabel(address)} akan dihapus dari akun Nitip.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteAddress(user, address.id);
                await load();
              } catch (nextError) {
                setError(
                  nextError instanceof Error ? nextError.message : "Gagal menghapus alamat",
                );
              }
            })();
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </Pressable>
        <Text style={styles.brand}>nitip.</Text>
      </View>

      <Text style={styles.eyebrow}>AKUN</Text>
      <Text style={styles.title}>Profil & alamat</Text>
      <Text style={styles.subtitle}>Data ini akan dipakai saat checkout dan pengantaran.</Text>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>Memuat profil...</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Profil</Text>
            <Text style={styles.label}>Email</Text>
            <View style={styles.readonlyInput}>
              <Text style={styles.readonlyText}>{profile?.email ?? user.email ?? "-"}</Text>
            </View>

            <Text style={styles.label}>Nama</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Nama lengkap"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              maxLength={80}
            />

            <Text style={styles.label}>Nomor HP</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              keyboardType="phone-pad"
              maxLength={30}
            />

            <Pressable
              disabled={saving}
              onPress={() => void saveProfile()}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || saving) && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? "Menyimpan..." : "Simpan profil"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.cardTitle}>Alamat tersimpan</Text>
              <Text style={styles.muted}>{addresses.length} alamat</Text>
            </View>
            <Pressable onPress={() => router.push("/address/new")} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>+ Tambah</Text>
            </Pressable>
          </View>

          {addresses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Belum ada alamat</Text>
              <Text style={styles.muted}>
                Tambahkan alamat pertama. Alamat tersebut otomatis menjadi alamat utama.
              </Text>
            </View>
          ) : (
            addresses.map((address) => (
              <View key={address.id} style={styles.addressCard}>
                <View style={styles.addressTopRow}>
                  <Text style={styles.addressLabel}>{addressLabel(address)}</Text>
                  {address.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>UTAMA</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.recipient}>{address.recipientName}</Text>
                <Text style={styles.addressText}>{address.phoneNumber}</Text>
                <Text style={styles.addressText}>{address.addressLine}</Text>
                {address.notes ? <Text style={styles.notes}>Catatan: {address.notes}</Text> : null}
                <Text style={styles.coordinateText}>
                  {address.latitude != null && address.longitude != null
                    ? `${address.latitude.toFixed(6)}, ${address.longitude.toFixed(6)}`
                    : "Lokasi peta belum ditentukan"}
                </Text>

                <View style={styles.addressActions}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/address/[id]/location",
                        params: { id: address.id },
                      })
                    }
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkText}>
                      {address.latitude != null ? "Ubah titik peta" : "Atur titik peta"}
                    </Text>
                  </Pressable>
                  {!address.isDefault && (
                    <Pressable onPress={() => void makeDefault(address)} style={styles.linkButton}>
                      <Text style={styles.linkText}>Jadikan utama</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => confirmDelete(address)} style={styles.linkButton}>
                    <Text style={styles.dangerText}>Hapus</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
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
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
    backButton: { paddingVertical: 8, paddingRight: 12 },
    backText: { color: colors.primary, fontWeight: "800" },
    brand: { color: colors.primaryStrong, fontSize: 25, fontWeight: "900", letterSpacing: -1 },
    eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
    title: { color: colors.text, fontSize: 30, fontWeight: "900", letterSpacing: -1, marginTop: 5 },
    subtitle: { color: colors.textMuted, lineHeight: 20, marginTop: 7, marginBottom: 22 },
    loadingCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 18, alignItems: "center", gap: 10 },
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 17 },
    cardTitle: { color: colors.text, fontSize: 17, fontWeight: "900" },
    label: { color: colors.textMuted, fontSize: 11, fontWeight: "800", marginTop: 16, marginBottom: 7 },
    input: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 14, color: colors.text, paddingHorizontal: 13, paddingVertical: 12 },
    readonlyInput: { backgroundColor: colors.surfaceAccent, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 12 },
    readonlyText: { color: colors.textMuted },
    primaryButton: { backgroundColor: colors.primaryStrong, borderRadius: 14, alignItems: "center", paddingVertical: 14, marginTop: 18 },
    primaryButtonText: { color: "#FFFFFF", fontWeight: "900" },
    buttonPressed: { opacity: 0.7 },
    sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28, marginBottom: 12 },
    muted: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
    smallButton: { backgroundColor: colors.surfaceAccent, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
    smallButtonText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 12 },
    emptyCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 17 },
    emptyTitle: { color: colors.text, fontWeight: "900", marginBottom: 3 },
    addressCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 10 },
    addressTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    addressLabel: { color: colors.primary, fontWeight: "900", fontSize: 13 },
    defaultBadge: { backgroundColor: colors.surfaceAccent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    defaultText: { color: colors.primaryStrong, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
    recipient: { color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 10 },
    addressText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 2 },
    notes: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 7 },
    coordinateText: { color: colors.primary, fontSize: 10, fontWeight: "700", marginTop: 9 },
    addressActions: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 13 },
    linkButton: { paddingVertical: 4 },
    linkText: { color: colors.primary, fontWeight: "800", fontSize: 12 },
    dangerText: { color: "#B42318", fontWeight: "800", fontSize: 12 },
    errorCard: { backgroundColor: colors.surfaceAccent, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 14 },
    errorText: { color: colors.text, fontSize: 12, lineHeight: 18 },
  });
}
