import type { NitipAddress } from "@nitip/domain";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import LocationPicker from "../../../components/LocationPicker";
import { useAuth } from "../../../context/AuthContext";
import { useNitipTheme } from "../../../hooks/useNitipTheme";
import { listAddresses, updateAddress } from "../../../lib/api";

export default function AddressLocationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [address, setAddress] = useState<NitipAddress | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    setLoading(true);
    setError(null);

    listAddresses(user)
      .then((items) => {
        if (!active) return;
        const found = items.find((item) => item.id === id) ?? null;
        setAddress(found);
        setLatitude(found?.latitude ?? null);
        setLongitude(found?.longitude ?? null);
      })
      .catch((nextError: unknown) => {
        if (active) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Gagal memuat alamat",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, user]);

  if (!user) return <Redirect href="/login" />;

  async function save() {
    if (!address) return;
    setSaving(true);
    setError(null);
    try {
      await updateAddress(user, address.id, { latitude, longitude });
      router.replace("/profile");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Gagal menyimpan titik lokasi",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Kembali</Text>
        </Pressable>
        <Text style={styles.brand}>nitip.</Text>
      </View>

      <Text style={styles.eyebrow}>TITIK PENGANTARAN</Text>
      <Text style={styles.title}>Atur lokasi alamat.</Text>
      <Text style={styles.subtitle}>
        Alamat tertulis tetap digunakan sebagai petunjuk. Pin peta dipakai untuk perhitungan jarak dan routing.
      </Text>

      {loading ? (
        <View style={styles.centerCard}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>Memuat alamat...</Text>
        </View>
      ) : !address ? (
        <View style={styles.errorCard}>
          <Text style={styles.cardTitle}>Alamat tidak ditemukan</Text>
          <Text style={styles.muted}>{error ?? "Alamat ini sudah tidak tersedia."}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{address.addressLine}</Text>
          <Text style={styles.muted}>{address.recipientName} · {address.phoneNumber}</Text>

          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onChange={(nextLatitude, nextLongitude) => {
              setLatitude(nextLatitude);
              setLongitude(nextLongitude);
            }}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            disabled={saving}
            onPress={() => void save()}
            style={[styles.primaryButton, saving && styles.disabled]}
          >
            <Text style={styles.primaryText}>
              {saving ? "Menyimpan..." : "Simpan titik lokasi"}
            </Text>
          </Pressable>
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
    back: { color: colors.primary, fontWeight: "800" },
    brand: { color: colors.primaryStrong, fontSize: 25, fontWeight: "900", letterSpacing: -1 },
    eyebrow: { color: colors.primary, fontWeight: "900", fontSize: 10, letterSpacing: 1.4 },
    title: { color: colors.text, fontWeight: "900", fontSize: 30, letterSpacing: -1, marginTop: 5 },
    subtitle: { color: colors.textMuted, lineHeight: 20, fontSize: 12, marginTop: 7, marginBottom: 22 },
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 17 },
    centerCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 18, alignItems: "center", gap: 8 },
    errorCard: { backgroundColor: colors.surfaceAccent, borderRadius: 18, padding: 17 },
    cardTitle: { color: colors.text, fontWeight: "900", fontSize: 15 },
    muted: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 },
    errorText: { color: "#B42318", fontSize: 11, lineHeight: 17, marginTop: 12 },
    primaryButton: { backgroundColor: colors.primaryStrong, borderRadius: 14, alignItems: "center", paddingVertical: 14, marginTop: 18 },
    primaryText: { color: "#FFFFFF", fontWeight: "900" },
    disabled: { opacity: 0.55 },
  });
}
