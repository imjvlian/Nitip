import { formatRupiah } from "@nitip/domain";
import type {
  DriverVehicleType,
  NitipDriverOffer,
  NitipDriverOrder,
  NitipDriverProfile,
} from "@nitip/domain/driver";
import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
  acceptDriverOffer,
  apiConfigured,
  createDriver,
  getCurrentDriverOrder,
  getDriverMe,
  listDriverOffers,
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

function deliveryStatusLabel(status: NitipDriverOrder["status"]) {
  switch (status) {
    case "driver_assigned": return "ORDER DITUGASKAN";
    case "picked_up": return "SUDAH DIAMBIL";
    case "on_delivery": return "SEDANG DIANTAR";
    case "delivered": return "SELESAI";
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
  const [offers, setOffers] = useState<NitipDriverOffer[]>([]);
  const [currentOrder, setCurrentOrder] = useState<NitipDriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [takingId, setTakingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user || !apiConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await getDriverMe(user);
      setProfile(next);
      if (next) {
        setFullName(next.fullName);
        setPhoneNumber(next.phoneNumber);
        setVehicleType(next.vehicleType);
        setVehicleBrandModel(next.vehicleBrandModel);
        setVehiclePlate(next.vehiclePlate);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Gagal memuat profil driver");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const loadDispatch = useCallback(async () => {
    if (!user || profile?.status !== "approved") {
      setCurrentOrder(null);
      setOffers([]);
      return;
    }

    setDispatchLoading(true);
    setDispatchError(null);
    try {
      const current = await getCurrentDriverOrder(user);
      setCurrentOrder(current);
      if (current || !profile.isOnline) {
        setOffers([]);
      } else {
        setOffers(await listDriverOffers(user));
      }
    } catch (nextError) {
      setDispatchError(nextError instanceof Error ? nextError.message : "Gagal memuat dispatch");
    } finally {
      setDispatchLoading(false);
    }
  }, [profile?.isOnline, profile?.status, user]);

  useEffect(() => {
    void loadDispatch();
  }, [loadDispatch]);

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

  async function takeOffer(offer: NitipDriverOffer) {
    setTakingId(offer.id);
    setDispatchError(null);
    try {
      const order = await acceptDriverOffer(user, offer.id);
      setCurrentOrder(order);
      setOffers([]);
      router.push({ pathname: "/order/[id]", params: { id: order.id } });
    } catch (nextError) {
      setDispatchError(nextError instanceof Error ? nextError.message : "Order gagal diambil");
      await loadDispatch();
    } finally {
      setTakingId(null);
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
      <Text style={styles.subtitle}>Online untuk melihat order siap pickup yang diurutkan dari lokasi terdekat.</Text>

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
                  ? "Akun sudah lolos review dan dapat menggunakan Driver Dispatch."
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
              {profile.status === "pending_review" ? (
                <Pressable onPress={() => void loadProfile()} style={styles.refreshStatusButton}>
                  <Text style={styles.refreshStatusText}>Muat ulang status review</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {profile?.status === "approved" ? (
            <>
              <View style={styles.availabilityCard}>
                <Text style={styles.availabilityTitle}>Ketersediaan</Text>
                <Text style={styles.availabilityText}>
                  {currentOrder
                    ? "Kamu punya order aktif. Offline hanya menghentikan penawaran baru; assignment tetap tersimpan."
                    : profile.isOnline
                      ? "Kamu sedang menerima penawaran order. Lokasi diperbarui saat daftar dispatch dimuat."
                      : "Aktifkan online untuk melihat order tersedia."}
                </Text>
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

              <View style={styles.dispatchHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Driver Dispatch</Text>
                  <Text style={styles.muted}>{currentOrder ? "1 order aktif" : `${offers.length} order tersedia`}</Text>
                </View>
                <Pressable disabled={dispatchLoading} onPress={() => void loadDispatch()} style={styles.refreshButton}>
                  <Text style={styles.refreshText}>{dispatchLoading ? "..." : "Refresh"}</Text>
                </Pressable>
              </View>

              {dispatchError ? (
                <View style={styles.errorCard}><Text style={styles.errorText}>{dispatchError}</Text></View>
              ) : null}

              {dispatchLoading && !currentOrder ? (
                <View style={styles.centerCard}>
                  <ActivityIndicator color="#08349C" />
                  <Text style={styles.muted}>Mencari order siap pickup terdekat...</Text>
                </View>
              ) : currentOrder ? (
                <Pressable
                  onPress={() => router.push({ pathname: "/order/[id]", params: { id: currentOrder.id } })}
                  style={styles.currentOrderCard}
                >
                  <View style={styles.orderTop}>
                    <View>
                      <Text style={styles.orderEyebrow}>{deliveryStatusLabel(currentOrder.status)}</Text>
                      <Text style={styles.orderCode}>{currentOrder.orderCode}</Text>
                    </View>
                    <Text style={styles.orderFare}>{formatRupiah(currentOrder.deliveryFare)}</Text>
                  </View>
                  <Text style={styles.routeLabel}>AMBIL</Text>
                  <Text style={styles.routeTitle}>{currentOrder.pickup.businessName} · {currentOrder.pickup.outletName}</Text>
                  <Text style={styles.routeMeta}>{currentOrder.pickup.addressLine}</Text>
                  <View style={styles.routeDivider} />
                  <Text style={styles.routeLabel}>ANTAR</Text>
                  <Text style={styles.routeTitle}>{currentOrder.destination.recipientName}</Text>
                  <Text style={styles.routeMeta}>{currentOrder.destination.addressLine}</Text>
                  <Text style={styles.openOrder}>Buka detail order →</Text>
                </Pressable>
              ) : !profile.isOnline ? (
                <View style={styles.emptyDispatch}>
                  <Text style={styles.cardTitle}>Kamu sedang offline</Text>
                  <Text style={styles.muted}>Order siap pickup hanya ditampilkan kepada driver approved yang sedang online.</Text>
                </View>
              ) : offers.length === 0 ? (
                <View style={styles.emptyDispatch}>
                  <Text style={styles.cardTitle}>Belum ada order tersedia</Text>
                  <Text style={styles.muted}>Order akan muncul setelah merchant menandainya siap diambil driver.</Text>
                </View>
              ) : (
                offers.map((offer) => {
                  const deliveryDistanceKm = offer.deliveryDistanceKm ?? offer.distanceKm;
                  return (
                    <View key={offer.id} style={styles.offerCard}>
                      <View style={styles.orderTop}>
                        <View>
                          <Text style={styles.offerLabel}>SIAP DIAMBIL</Text>
                          <Text style={styles.orderCode}>{offer.orderCode}</Text>
                        </View>
                        <Text style={styles.orderFare}>{formatRupiah(offer.deliveryFare)}</Text>
                      </View>
                      <Text style={styles.routeLabel}>PICKUP</Text>
                      <Text style={styles.routeTitle}>{offer.pickup.businessName} · {offer.pickup.outletName}</Text>
                      <Text style={styles.routeMeta}>{offer.pickup.addressLine}</Text>
                      <View style={styles.offerMetaRow}>
                        <Text style={styles.offerMeta}>{offer.itemCount} item</Text>
                        <Text style={styles.offerMeta}>
                          {offer.pickupDistanceKm == null
                            ? "Jarak ke pickup belum tersedia"
                            : `${offer.pickupDistanceKm.toFixed(2)} km ke pickup`}
                        </Text>
                        <Text style={styles.offerMeta}>
                          {deliveryDistanceKm == null
                            ? "Jarak antar belum tersedia"
                            : `${deliveryDistanceKm.toFixed(2)} km merchant → customer`}
                        </Text>
                      </View>
                      <Text style={styles.privacyNote}>Alamat lengkap dan kontak customer dibuka setelah assignment berhasil.</Text>
                      <Pressable
                        disabled={takingId !== null}
                        onPress={() => void takeOffer(offer)}
                        style={[styles.takeButton, takingId !== null && styles.disabled]}
                      >
                        {takingId === offer.id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.takeButtonText}>Ambil order</Text>}
                      </Pressable>
                    </View>
                  );
                })
              )}
            </>
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
  refreshStatusButton: { marginTop: 12, alignSelf: "flex-start", borderWidth: 1, borderColor: "#08349C", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  refreshStatusText: { color: "#08349C", fontWeight: "900", fontSize: 10 },
  availabilityCard: { backgroundColor: "#14216D", borderRadius: 20, padding: 18, marginBottom: 16 },
  availabilityTitle: { color: "#FFFFFF", fontWeight: "900", fontSize: 17 },
  availabilityText: { color: "#A1DCD9", fontSize: 11, lineHeight: 17, marginTop: 5 },
  availabilityButton: { backgroundColor: "#08349C", borderRadius: 14, alignItems: "center", paddingVertical: 13, marginTop: 14 },
  availabilityButtonOffline: { backgroundColor: "#52607F" },
  availabilityButtonText: { color: "#FFFFFF", fontWeight: "900" },
  dispatchHeader: { marginTop: 8, marginBottom: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: "#14216D", fontWeight: "900", fontSize: 18 },
  refreshButton: { backgroundColor: "#CEFCD9", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  refreshText: { color: "#08349C", fontWeight: "900", fontSize: 10 },
  currentOrderCard: { backgroundColor: "#CEFCD9", borderRadius: 20, padding: 17, marginBottom: 18, borderWidth: 1, borderColor: "#A1DCD9" },
  offerCard: { backgroundColor: "#FFFFFF", borderColor: "#A1DCD9", borderWidth: 1, borderRadius: 20, padding: 17, marginBottom: 10 },
  orderTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  orderEyebrow: { color: "#08349C", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  offerLabel: { color: "#08349C", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  orderCode: { color: "#14216D", fontSize: 15, fontWeight: "900", marginTop: 3 },
  orderFare: { color: "#08349C", fontSize: 16, fontWeight: "900" },
  routeLabel: { color: "#08349C", fontSize: 9, fontWeight: "900", letterSpacing: 0.8, marginTop: 16 },
  routeTitle: { color: "#14216D", fontWeight: "900", fontSize: 13, marginTop: 3 },
  routeMeta: { color: "#52607F", fontSize: 11, lineHeight: 17, marginTop: 3 },
  routeDivider: { height: 1, backgroundColor: "#A1DCD9", marginTop: 14 },
  offerMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  offerMeta: { backgroundColor: "#F7FFF9", color: "#52607F", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, fontSize: 9, fontWeight: "800" },
  privacyNote: { color: "#52607F", fontSize: 9, lineHeight: 14, marginTop: 11 },
  takeButton: { backgroundColor: "#08349C", borderRadius: 14, minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 13 },
  takeButtonText: { color: "#FFFFFF", fontWeight: "900" },
  openOrder: { color: "#08349C", fontWeight: "900", fontSize: 11, marginTop: 16 },
  emptyDispatch: { backgroundColor: "#FFFFFF", borderColor: "#A1DCD9", borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 18 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#A1DCD9", borderWidth: 1, borderRadius: 20, padding: 17, marginTop: 8 },
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
  errorCard: { marginBottom: 12, padding: 13, borderRadius: 14, backgroundColor: "#FFF1F0" },
  errorText: { color: "#B42318", fontSize: 11, lineHeight: 17 },
});
