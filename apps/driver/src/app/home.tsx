import { formatRupiah } from "@nitip/domain";
import type {
  DriverVehicleType,
  NitipDriverOffer,
  NitipDriverOrder,
  NitipDriverProfile,
} from "@nitip/domain/driver";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvailabilitySwipe } from "../components/AvailabilitySwipe";
import { NitipIcon, type NitipIconName } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import {
  acceptDriverOffer,
  apiConfigured,
  createDriver,
  getCurrentDriverOrder,
  getDriverMe,
  listDriverOffers,
  listDriverOrderHistory,
  setDriverOnline,
  submitDriver,
  updateDriver,
} from "../lib/api";

function statusLabel(status: NitipDriverProfile["status"], language: "id" | "en") {
  const id = {
    draft: "DRAFT",
    pending_review: "MENUNGGU REVIEW",
    approved: "DISETUJUI",
    rejected: "DITOLAK",
  } as const;
  const en = {
    draft: "DRAFT",
    pending_review: "UNDER REVIEW",
    approved: "APPROVED",
    rejected: "REJECTED",
  } as const;
  return (language === "id" ? id : en)[status];
}

function deliveryStatusLabel(status: NitipDriverOrder["status"], language: "id" | "en") {
  const id = {
    driver_assigned: "ORDER DITUGASKAN",
    picked_up: "SUDAH DIAMBIL",
    on_delivery: "SEDANG DIANTAR",
    delivered: "SELESAI",
  } as const;
  const en = {
    driver_assigned: "ASSIGNED",
    picked_up: "PICKED UP",
    on_delivery: "ON DELIVERY",
    delivered: "COMPLETED",
  } as const;
  return (language === "id" ? id : en)[status];
}

export default function DriverHomeScreen() {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<NitipDriverProfile | null>(null);
  const [fullName, setFullName] = useState(user?.displayName ?? "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<DriverVehicleType>("motorcycle");
  const [vehicleBrandModel, setVehicleBrandModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [offers, setOffers] = useState<NitipDriverOffer[]>([]);
  const [currentOrder, setCurrentOrder] = useState<NitipDriverOrder | null>(null);
  const [history, setHistory] = useState<NitipDriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [takingId, setTakingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState(false);

  const c = language === "id"
    ? {
        brand: "nitip driver.",
        center: "DRIVER CENTER",
        hello: "Halo",
        complete: "Lengkapi profilmu.",
        subtitle: "Kelola status kerja, lihat ringkasan harian, dan ambil order pickup dari satu halaman.",
        loading: "Memuat profil driver...",
        api: "API belum dikonfigurasi",
        apiBody: "Set EXPO_PUBLIC_API_URL di apps/driver/.env.",
        status: "STATUS DRIVER",
        approved: "Akun siap menerima assignment.",
        pending: "Data sedang direview Nitip Ops.",
        rejected: "Perbaiki data sesuai alasan penolakan lalu kirim ulang.",
        draft: "Lengkapi data dan kirim untuk review.",
        availability: "Mode kerja",
        online: "ONLINE",
        offline: "OFFLINE",
        swipeOnline: "Geser untuk online →",
        swipeOffline: "← Geser untuk offline",
        processing: "Memproses...",
        onlineBody: "Kamu sedang menerima penawaran order. Lokasi diperbarui saat dispatch dimuat.",
        offlineBody: "Geser kontrol di bawah untuk mulai menerima penawaran order.",
        activeBody: "Perjalanan aktif tetap tersimpan. Offline hanya menghentikan penawaran baru.",
        swipeHint: "Perubahan status hanya diproses setelah swipe melewati batas konfirmasi.",
        summary: "Ringkasan hari ini",
        availableNow: "Order tersedia",
        tripsToday: "Perjalanan",
        earningsToday: "Pendapatan",
        summaryUnavailable: "Riwayat belum dapat dimuat. Ringkasan akan diperbarui saat koneksi pulih.",
        dispatch: "Dispatch",
        available: "order tersedia",
        active: "1 perjalanan aktif",
        refresh: "Refresh",
        finding: "Mencari order siap pickup terdekat...",
        noOffer: "Belum ada order tersedia",
        noOfferBody: "Order muncul setelah merchant menandainya siap diambil.",
        offlineTitle: "Kamu sedang offline",
        offlineOfferBody: "Order tersedia hanya ditampilkan saat driver approved sedang online.",
        pickup: "PICKUP",
        destination: "ANTAR",
        open: "Buka detail perjalanan",
        ready: "SIAP DIAMBIL",
        items: "item",
        distanceMissing: "Jarak belum tersedia",
        take: "Ambil order",
        privacy: "Alamat dan kontak customer lengkap dibuka setelah assignment berhasil.",
        quickActions: "Akses cepat",
        earnings: "Pendapatan",
        earningsDescription: "Lihat fee dan riwayat penghasilan",
        history: "Riwayat",
        historyDescription: "Lihat perjalanan yang sudah selesai",
        settings: "Pengaturan",
        settingsDescription: "Bahasa, tampilan, dan akun",
        driverInfo: "Kesiapan driver",
        vehicle: "Kendaraan",
        location: "Lokasi terakhir",
        locationNever: "Belum pernah diperbarui",
        accuracy: "Akurasi",
        profile: "Data driver",
        fullName: "Nama lengkap",
        phone: "Nomor HP",
        vehicleType: "Jenis kendaraan",
        motor: "Motor",
        car: "Mobil",
        model: "Merek & model",
        plate: "Nomor polisi",
        save: "Simpan perubahan",
        create: "Buat profil driver",
        review: "Kirim untuk review",
        rejection: "ALASAN PENOLAKAN",
      }
    : {
        brand: "nitip driver.",
        center: "DRIVER CENTER",
        hello: "Hi",
        complete: "Complete your profile.",
        subtitle: "Manage work status, check your daily summary, and take pickup orders from one screen.",
        loading: "Loading driver profile...",
        api: "API is not configured",
        apiBody: "Set EXPO_PUBLIC_API_URL in apps/driver/.env.",
        status: "DRIVER STATUS",
        approved: "Your account is ready for assignments.",
        pending: "Your details are under Nitip Ops review.",
        rejected: "Update the rejected details and submit again.",
        draft: "Complete your details and submit for review.",
        availability: "Work mode",
        online: "ONLINE",
        offline: "OFFLINE",
        swipeOnline: "Swipe to go online →",
        swipeOffline: "← Swipe to go offline",
        processing: "Processing...",
        onlineBody: "You are receiving order offers. Location refreshes when dispatch loads.",
        offlineBody: "Swipe the control below to start receiving order offers.",
        activeBody: "Your active trip stays assigned. Going offline only stops new offers.",
        swipeHint: "Status changes only after the swipe crosses the confirmation threshold.",
        summary: "Today's summary",
        availableNow: "Available orders",
        tripsToday: "Trips",
        earningsToday: "Earnings",
        summaryUnavailable: "History is unavailable. The summary will refresh when the connection recovers.",
        dispatch: "Dispatch",
        available: "orders available",
        active: "1 active trip",
        refresh: "Refresh",
        finding: "Finding nearby pickup-ready orders...",
        noOffer: "No orders available yet",
        noOfferBody: "Orders appear after a merchant marks them ready for pickup.",
        offlineTitle: "You are offline",
        offlineOfferBody: "Available orders are shown only while an approved driver is online.",
        pickup: "PICKUP",
        destination: "DROP-OFF",
        open: "Open trip details",
        ready: "READY FOR PICKUP",
        items: "items",
        distanceMissing: "Distance unavailable",
        take: "Accept order",
        privacy: "Full customer address and contact are revealed after assignment.",
        quickActions: "Quick access",
        earnings: "Earnings",
        earningsDescription: "View fees and earning history",
        history: "History",
        historyDescription: "Review completed trips",
        settings: "Settings",
        settingsDescription: "Language, appearance, and account",
        driverInfo: "Driver readiness",
        vehicle: "Vehicle",
        location: "Last location",
        locationNever: "Never updated",
        accuracy: "Accuracy",
        profile: "Driver details",
        fullName: "Full name",
        phone: "Phone number",
        vehicleType: "Vehicle type",
        motor: "Motorcycle",
        car: "Car",
        model: "Brand & model",
        plate: "Plate number",
        save: "Save changes",
        create: "Create driver profile",
        review: "Submit for review",
        rejection: "REJECTION REASON",
      };

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
      setError(nextError instanceof Error ? nextError.message : c.loading);
    } finally {
      setLoading(false);
    }
  }, [c.loading, user]);

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
      setOffers(current || !profile.isOnline ? [] : await listDriverOffers(user));
    } catch (nextError) {
      setDispatchError(nextError instanceof Error ? nextError.message : c.finding);
    } finally {
      setDispatchLoading(false);
    }
  }, [c.finding, profile?.isOnline, profile?.status, user]);

  const loadHistory = useCallback(async () => {
    if (!user || profile?.status !== "approved") {
      setHistory([]);
      setHistoryError(false);
      return;
    }

    setHistoryLoading(true);
    setHistoryError(false);
    try {
      setHistory(await listDriverOrderHistory(user));
    } catch {
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  }, [profile?.status, user]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  useFocusEffect(
    useCallback(() => {
      void loadDispatch();
    }, [loadDispatch]),
  );

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  if (!user) return <Redirect href="/login" />;

  const editable = !profile || profile.status === "draft" || profile.status === "rejected";
  const profileStatusBody = profile?.status === "approved"
    ? c.approved
    : profile?.status === "pending_review"
      ? c.pending
      : profile?.status === "rejected"
        ? c.rejected
        : c.draft;
  const availabilityBody = currentOrder
    ? c.activeBody
    : profile?.isOnline
      ? c.onlineBody
      : c.offlineBody;

  const todaySummary = useMemo(() => {
    const today = new Date().toDateString();
    const todaysOrders = history.filter(
      (order) => new Date(order.createdAt).toDateString() === today,
    );
    return {
      trips: todaysOrders.length,
      earnings: todaysOrders.reduce((total, order) => total + order.deliveryFare, 0),
    };
  }, [history]);

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
      setProfile(profile ? await updateDriver(user, input) : await createDriver(user, input));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.save);
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
      setError(nextError instanceof Error ? nextError.message : c.review);
    } finally {
      setSaving(false);
    }
  }

  async function changeOnlineStatus(nextOnline: boolean) {
    if (!profile || saving || profile.isOnline === nextOnline) return true;

    setSaving(true);
    setError(null);
    try {
      setProfile(await setDriverOnline(user, nextOnline));
      if (!nextOnline) setOffers([]);
      return true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.processing);
      return false;
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
      setDispatchError(nextError instanceof Error ? nextError.message : c.take);
      await loadDispatch();
    } finally {
      setTakingId(null);
    }
  }

  const locationLabel = profile?.locationUpdatedAt
    ? new Date(profile.locationUpdatedAt).toLocaleString(language === "id" ? "id-ID" : "en-US", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : c.locationNever;
  const accuracyLabel = profile?.locationAccuracyMeters == null
    ? null
    : `±${Math.round(profile.locationAccuracyMeters)} m`;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <View style={styles.brandCopy}>
            <Text style={[styles.brand, { color: theme.colors.text }]}>{c.brand}</Text>
            <Text numberOfLines={1} style={[styles.account, { color: theme.colors.textMuted }]}>
              {user.email ?? "Driver"}
            </Text>
          </View>
          {profile?.status === "approved" ? (
            <View
              style={[
                styles.onlinePill,
                {
                  backgroundColor: profile.isOnline ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: profile.isOnline ? "#FFFFFF" : theme.colors.textMuted },
                ]}
              />
              <Text
                style={[
                  styles.onlinePillText,
                  { color: profile.isOnline ? "#FFFFFF" : theme.colors.textMuted },
                ]}
              >
                {profile.isOnline ? c.online : c.offline}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>{c.center}</Text>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
            {profile ? `${c.hello}, ${profile.fullName.split(" ")[0]}.` : c.complete}
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text>
        </View>

        {!apiConfigured ? (
          <StateCard title={c.api} body={c.apiBody} />
        ) : loading ? (
          <StateCard loading title={c.loading} />
        ) : (
          <>
            {profile && profile.status !== "approved" ? (
              <View
                style={[
                  styles.statusCard,
                  {
                    backgroundColor: profile.status === "rejected"
                      ? theme.colors.dangerSurface
                      : theme.colors.surfaceAccent,
                  },
                ]}
              >
                <View style={styles.statusCopy}>
                  <Text
                    style={[
                      styles.statusLabel,
                      { color: profile.status === "rejected" ? theme.colors.danger : theme.colors.primary },
                    ]}
                  >
                    {c.status}
                  </Text>
                  <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                    {statusLabel(profile.status, language)}
                  </Text>
                  <Text style={[styles.statusBody, { color: theme.colors.textMuted }]}>
                    {profileStatusBody}
                  </Text>
                </View>
                {profile.status === "pending_review" ? (
                  <Pressable onPress={() => void loadProfile()} style={styles.iconAction}>
                    <NitipIcon color={theme.colors.primary} name="refresh" size={17} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {profile?.rejectionReason ? (
              <View style={[styles.errorCard, { backgroundColor: theme.colors.dangerSurface }]}> 
                <Text style={[styles.errorLabel, { color: theme.colors.danger }]}>{c.rejection}</Text>
                <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                  {profile.rejectionReason}
                </Text>
              </View>
            ) : null}

            {profile?.status === "approved" ? (
              <>
                <View
                  style={[
                    styles.availabilityCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      shadowColor: theme.colors.shadow,
                    },
                  ]}
                >
                  <View style={styles.availabilityHeader}>
                    <View style={[styles.largeBadge, { backgroundColor: theme.colors.surfaceAccent }]}> 
                      <NitipIcon color={theme.colors.primary} name="power" size={21} />
                    </View>
                    <View style={styles.availabilityCopy}>
                      <Text style={[styles.availabilityTitle, { color: theme.colors.text }]}>
                        {c.availability}
                      </Text>
                      <Text style={[styles.availabilityBody, { color: theme.colors.textMuted }]}>
                        {availabilityBody}
                      </Text>
                    </View>
                  </View>
                  <AvailabilitySwipe
                    disabled={saving}
                    isOnline={profile.isOnline}
                    labels={{
                      online: c.online,
                      offline: c.offline,
                      swipeOnline: c.swipeOnline,
                      swipeOffline: c.swipeOffline,
                      processing: c.processing,
                    }}
                    onChange={changeOnlineStatus}
                  />
                  <Text style={[styles.swipeHint, { color: theme.colors.textMuted }]}>{c.swipeHint}</Text>
                </View>

                <View style={styles.sectionHeaderPlain}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{c.summary}</Text>
                </View>
                <View style={styles.summaryGrid}>
                  <MetricCard
                    icon="delivery"
                    label={c.availableNow}
                    value={profile.isOnline ? String(offers.length) : "—"}
                  />
                  <MetricCard
                    icon="check"
                    label={c.tripsToday}
                    value={historyLoading || historyError ? "—" : String(todaySummary.trips)}
                  />
                  <MetricCard
                    compact
                    icon="earnings"
                    label={c.earningsToday}
                    value={historyLoading || historyError ? "—" : formatRupiah(todaySummary.earnings)}
                  />
                </View>
                {historyError ? (
                  <Text style={[styles.summaryError, { color: theme.colors.textMuted }]}>
                    {c.summaryUnavailable}
                  </Text>
                ) : null}

                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{c.dispatch}</Text>
                    <Text style={[styles.sectionMeta, { color: theme.colors.textMuted }]}>
                      {currentOrder ? c.active : `${offers.length} ${c.available}`}
                    </Text>
                  </View>
                  <Pressable
                    disabled={dispatchLoading}
                    onPress={() => void loadDispatch()}
                    style={[styles.refreshButton, { backgroundColor: theme.colors.surfaceAccent }]}
                  >
                    <NitipIcon color={theme.colors.primary} name="refresh" size={14} />
                    <Text style={[styles.refreshText, { color: theme.colors.primary }]}>{c.refresh}</Text>
                  </Pressable>
                </View>

                {dispatchError ? (
                  <View style={[styles.errorCard, { backgroundColor: theme.colors.dangerSurface }]}> 
                    <Text style={[styles.errorText, { color: theme.colors.danger }]}>{dispatchError}</Text>
                  </View>
                ) : null}

                {dispatchLoading && !currentOrder ? (
                  <StateCard loading title={c.finding} />
                ) : currentOrder ? (
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: "/order/[id]", params: { id: currentOrder.id } })
                    }
                    style={[
                      styles.currentOrder,
                      { backgroundColor: theme.colors.primary, shadowColor: theme.colors.shadow },
                    ]}
                  >
                    <View style={styles.orderTop}>
                      <View style={styles.orderIdentity}>
                        <Text style={styles.currentEyebrow}>
                          {deliveryStatusLabel(currentOrder.status, language)}
                        </Text>
                        <Text style={styles.currentCode}>{currentOrder.orderCode}</Text>
                      </View>
                      <Text style={styles.currentFare}>{formatRupiah(currentOrder.deliveryFare)}</Text>
                    </View>
                    <RouteRow
                      inverse
                      icon="store"
                      label={c.pickup}
                      title={`${currentOrder.pickup.businessName} · ${currentOrder.pickup.outletName}`}
                      body={currentOrder.pickup.addressLine}
                    />
                    <RouteRow
                      inverse
                      icon="location"
                      label={c.destination}
                      title={currentOrder.destination.recipientName}
                      body={currentOrder.destination.addressLine}
                    />
                    <View style={styles.openRow}>
                      <Text style={styles.openText}>{c.open}</Text>
                      <NitipIcon color="#FFFFFF" name="next" size={15} />
                    </View>
                  </Pressable>
                ) : !profile.isOnline ? (
                  <StateCard title={c.offlineTitle} body={c.offlineOfferBody} />
                ) : offers.length === 0 ? (
                  <StateCard title={c.noOffer} body={c.noOfferBody} />
                ) : (
                  <View style={styles.offerList}>
                    {offers.map((offer) => {
                      const deliveryDistanceKm = offer.deliveryDistanceKm ?? offer.distanceKm;
                      return (
                        <View
                          key={offer.id}
                          style={[
                            styles.offerCard,
                            {
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.border,
                              shadowColor: theme.colors.shadow,
                            },
                          ]}
                        >
                          <View style={styles.orderTop}>
                            <View style={styles.orderIdentity}>
                              <Text style={[styles.offerEyebrow, { color: theme.colors.primary }]}>
                                {c.ready}
                              </Text>
                              <Text style={[styles.offerCode, { color: theme.colors.text }]}>
                                {offer.orderCode}
                              </Text>
                            </View>
                            <Text style={[styles.offerFare, { color: theme.colors.primary }]}>
                              {formatRupiah(offer.deliveryFare)}
                            </Text>
                          </View>
                          <RouteRow
                            icon="store"
                            label={c.pickup}
                            title={`${offer.pickup.businessName} · ${offer.pickup.outletName}`}
                            body={offer.pickup.addressLine}
                          />
                          <View style={styles.offerMetaRow}>
                            <InfoPill text={`${offer.itemCount} ${c.items}`} />
                            <InfoPill
                              text={offer.pickupDistanceKm == null
                                ? c.distanceMissing
                                : `${offer.pickupDistanceKm.toFixed(2)} km pickup`}
                            />
                            <InfoPill
                              text={deliveryDistanceKm == null
                                ? c.distanceMissing
                                : `${deliveryDistanceKm.toFixed(2)} km delivery`}
                            />
                          </View>
                          <Text style={[styles.privacy, { color: theme.colors.textMuted }]}>
                            {c.privacy}
                          </Text>
                          <Pressable
                            disabled={takingId !== null}
                            onPress={() => void takeOffer(offer)}
                            style={[
                              styles.takeButton,
                              {
                                backgroundColor: theme.colors.primary,
                                opacity: takingId !== null && takingId !== offer.id ? 0.5 : 1,
                              },
                            ]}
                          >
                            {takingId === offer.id ? (
                              <ActivityIndicator color="#FFFFFF" />
                            ) : (
                              <Text style={styles.takeText}>{c.take}</Text>
                            )}
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}

                <Text style={[styles.sectionTitleStandalone, { color: theme.colors.text }]}>
                  {c.quickActions}
                </Text>
                <View style={styles.quickGrid}>
                  <QuickAction
                    description={c.earningsDescription}
                    icon="earnings"
                    onPress={() => router.push("/earnings")}
                    title={c.earnings}
                  />
                  <QuickAction
                    description={c.historyDescription}
                    icon="orders"
                    onPress={() => router.replace("/orders")}
                    title={c.history}
                  />
                  <QuickAction
                    description={c.settingsDescription}
                    icon="settings"
                    onPress={() => router.replace("/settings")}
                    title={c.settings}
                  />
                </View>

                <Text style={[styles.sectionTitleStandalone, { color: theme.colors.text }]}>
                  {c.driverInfo}
                </Text>
                <View
                  style={[
                    styles.readinessCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      shadowColor: theme.colors.shadow,
                    },
                  ]}
                >
                  <InfoRow
                    icon="vehicle"
                    label={c.vehicle}
                    value={`${profile.vehicleBrandModel} · ${profile.vehiclePlate}`}
                  />
                  <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
                  <InfoRow
                    icon="location"
                    label={c.location}
                    value={locationLabel}
                    detail={accuracyLabel ? `${c.accuracy} ${accuracyLabel}` : undefined}
                  />
                </View>
              </>
            ) : null}

            {profile?.status !== "approved" ? (
              <View
                style={[
                  styles.profileCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    shadowColor: theme.colors.shadow,
                  },
                ]}
              >
                <Text style={[styles.profileTitle, { color: theme.colors.text }]}>{c.profile}</Text>
                <Field label={c.fullName}>
                  <TextInput
                    editable={editable}
                    onChangeText={setFullName}
                    placeholder={c.fullName}
                    placeholderTextColor={theme.colors.textMuted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                      !editable && styles.readonly,
                    ]}
                    value={fullName}
                  />
                </Field>
                <Field label={c.phone}>
                  <TextInput
                    editable={editable}
                    keyboardType="phone-pad"
                    onChangeText={setPhoneNumber}
                    placeholder="08xxxxxxxxxx"
                    placeholderTextColor={theme.colors.textMuted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                      !editable && styles.readonly,
                    ]}
                    value={phoneNumber}
                  />
                </Field>
                <Field label={c.vehicleType}>
                  <View style={styles.vehicleRow}>
                    {(["motorcycle", "car"] as DriverVehicleType[]).map((type) => {
                      const selected = vehicleType === type;
                      return (
                        <Pressable
                          disabled={!editable}
                          key={type}
                          onPress={() => setVehicleType(type)}
                          style={[
                            styles.vehicleChoice,
                            {
                              backgroundColor: selected
                                ? theme.colors.surfaceAccent
                                : theme.colors.background,
                              borderColor: selected ? theme.colors.primary : theme.colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.vehicleText,
                              { color: selected ? theme.colors.primary : theme.colors.textMuted },
                            ]}
                          >
                            {type === "motorcycle" ? c.motor : c.car}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Field>
                <Field label={c.model}>
                  <TextInput
                    editable={editable}
                    onChangeText={setVehicleBrandModel}
                    placeholder="Honda Beat 2024"
                    placeholderTextColor={theme.colors.textMuted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                      !editable && styles.readonly,
                    ]}
                    value={vehicleBrandModel}
                  />
                </Field>
                <Field label={c.plate}>
                  <TextInput
                    autoCapitalize="characters"
                    editable={editable}
                    onChangeText={setVehiclePlate}
                    placeholder="N 1234 AB"
                    placeholderTextColor={theme.colors.textMuted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                      !editable && styles.readonly,
                    ]}
                    value={vehiclePlate}
                  />
                </Field>
                {editable ? (
                  <Pressable
                    disabled={saving}
                    onPress={() => void saveProfile()}
                    style={[
                      styles.primaryButton,
                      { backgroundColor: theme.colors.primary, opacity: saving ? 0.55 : 1 },
                    ]}
                  >
                    <Text style={styles.primaryText}>
                      {saving ? c.processing : profile ? c.save : c.create}
                    </Text>
                  </Pressable>
                ) : null}
                {profile && (profile.status === "draft" || profile.status === "rejected") ? (
                  <Pressable
                    disabled={saving}
                    onPress={() => void submitForReview()}
                    style={[styles.reviewButton, { backgroundColor: theme.colors.surfaceAccent }]}
                  >
                    <Text style={[styles.reviewText, { color: theme.colors.primary }]}>{c.review}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </>
        )}

        {error ? (
          <View style={[styles.errorCard, { backgroundColor: theme.colors.dangerSurface }]}> 
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );

  function MetricCard({
    icon,
    label,
    value,
    compact = false,
  }: {
    icon: NitipIconName;
    label: string;
    value: string;
    compact?: boolean;
  }) {
    return (
      <View
        style={[
          styles.metricCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <View style={[styles.metricIcon, { backgroundColor: theme.colors.surfaceAccent }]}> 
          <NitipIcon color={theme.colors.primary} name={icon} size={15} />
        </View>
        <Text
          numberOfLines={1}
          style={[
            compact ? styles.metricValueCompact : styles.metricValue,
            { color: theme.colors.text },
          ]}
        >
          {value}
        </Text>
        <Text numberOfLines={2} style={[styles.metricLabel, { color: theme.colors.textMuted }]}>
          {label}
        </Text>
      </View>
    );
  }

  function QuickAction({
    icon,
    title,
    description,
    onPress,
  }: {
    icon: NitipIconName;
    title: string;
    description: string;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.quickCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <View style={[styles.quickIcon, { backgroundColor: theme.colors.surfaceAccent }]}> 
          <NitipIcon color={theme.colors.primary} name={icon} size={17} />
        </View>
        <Text style={[styles.quickTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text numberOfLines={2} style={[styles.quickDescription, { color: theme.colors.textMuted }]}>
          {description}
        </Text>
      </Pressable>
    );
  }

  function InfoRow({
    icon,
    label,
    value,
    detail,
  }: {
    icon: NitipIconName;
    label: string;
    value: string;
    detail?: string;
  }) {
    return (
      <View style={styles.infoRow}>
        <View style={[styles.infoIcon, { backgroundColor: theme.colors.surfaceAccent }]}> 
          <NitipIcon color={theme.colors.primary} name={icon} size={16} />
        </View>
        <View style={styles.infoCopy}>
          <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>{label}</Text>
          <Text numberOfLines={1} style={[styles.infoValue, { color: theme.colors.text }]}>{value}</Text>
          {detail ? <Text style={[styles.infoDetail, { color: theme.colors.textMuted }]}>{detail}</Text> : null}
        </View>
      </View>
    );
  }

  function RouteRow({
    icon,
    label,
    title,
    body,
    inverse = false,
  }: {
    icon: "store" | "location";
    label: string;
    title: string;
    body: string;
    inverse?: boolean;
  }) {
    return (
      <View style={styles.routeRow}>
        <View
          style={[
            styles.routeBadge,
            { backgroundColor: inverse ? "rgba(255,255,255,0.14)" : theme.colors.surfaceAccent },
          ]}
        >
          <NitipIcon color={inverse ? "#FFFFFF" : theme.colors.primary} name={icon} size={14} />
        </View>
        <View style={styles.routeCopy}>
          <Text
            style={[
              styles.routeLabel,
              { color: inverse ? "rgba(255,255,255,0.65)" : theme.colors.textMuted },
            ]}
          >
            {label}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.routeTitle, { color: inverse ? "#FFFFFF" : theme.colors.text }]}
          >
            {title}
          </Text>
          <Text
            numberOfLines={2}
            style={[
              styles.routeBody,
              { color: inverse ? "rgba(255,255,255,0.72)" : theme.colors.textMuted },
            ]}
          >
            {body}
          </Text>
        </View>
      </View>
    );
  }

  function InfoPill({ text }: { text: string }) {
    return (
      <View style={[styles.infoPill, { backgroundColor: theme.colors.background }]}> 
        <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>{text}</Text>
      </View>
    );
  }

  function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{label}</Text>
        {children}
      </View>
    );
  }

  function StateCard({
    loading: cardLoading = false,
    title,
    body,
  }: {
    loading?: boolean;
    title: string;
    body?: string;
  }) {
    return (
      <View
        style={[
          styles.stateCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        {cardLoading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <View style={[styles.largeBadge, { backgroundColor: theme.colors.surfaceAccent }]}> 
            <NitipIcon color={theme.colors.primary} name="delivery" size={21} />
          </View>
        )}
        <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{title}</Text>
        {body ? <Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>{body}</Text> : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 40, paddingHorizontal: 20 },
  topbar: { alignItems: "center", flexDirection: "row", minHeight: 44 },
  brandCopy: { flex: 1, minWidth: 0 },
  brand: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  account: { fontSize: 8, marginTop: 2 },
  onlinePill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 11,
  },
  onlineDot: { borderRadius: 4, height: 7, width: 7 },
  onlinePillText: { fontSize: 8, fontWeight: "900" },
  hero: { marginTop: 24 },
  eyebrow: { fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  heroTitle: { fontSize: 29, fontWeight: "900", letterSpacing: -0.9, marginTop: 7 },
  heroSubtitle: { fontSize: 10, lineHeight: 17, marginTop: 6, maxWidth: 345 },
  statusCard: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    marginTop: 20,
    padding: 14,
  },
  statusCopy: { flex: 1 },
  statusLabel: { fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  statusValue: { fontSize: 13, fontWeight: "900", marginTop: 3 },
  statusBody: { fontSize: 9, lineHeight: 14, marginTop: 3 },
  iconAction: { alignItems: "center", height: 38, justifyContent: "center", width: 38 },
  errorCard: { borderRadius: 15, marginTop: 10, padding: 12 },
  errorLabel: { fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  errorText: { fontSize: 9, lineHeight: 14, marginTop: 3 },
  availabilityCard: {
    borderRadius: 22,
    borderWidth: 1,
    elevation: 2,
    marginTop: 20,
    padding: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  availabilityHeader: { alignItems: "center", flexDirection: "row", marginBottom: 14 },
  largeBadge: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  availabilityCopy: { flex: 1, minWidth: 0, paddingLeft: 11 },
  availabilityTitle: { fontSize: 12, fontWeight: "900" },
  availabilityBody: { fontSize: 8, lineHeight: 13, marginTop: 3 },
  swipeHint: { fontSize: 7, lineHeight: 11, marginTop: 8, textAlign: "center" },
  sectionHeaderPlain: { marginTop: 24 },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 26,
  },
  sectionTitle: { fontSize: 13, fontWeight: "900" },
  sectionTitleStandalone: { fontSize: 13, fontWeight: "900", marginTop: 26, marginBottom: 10 },
  sectionMeta: { fontSize: 8, marginTop: 2 },
  summaryGrid: { flexDirection: "row", gap: 8, marginTop: 10 },
  metricCard: {
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 112,
    padding: 11,
  },
  metricIcon: { alignItems: "center", borderRadius: 15, height: 30, justifyContent: "center", width: 30 },
  metricValue: { fontSize: 18, fontWeight: "900", marginTop: 12 },
  metricValueCompact: { fontSize: 12, fontWeight: "900", marginTop: 13 },
  metricLabel: { fontSize: 7, fontWeight: "700", lineHeight: 10, marginTop: 3 },
  summaryError: { fontSize: 8, lineHeight: 12, marginTop: 7 },
  refreshButton: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 11,
  },
  refreshText: { fontSize: 8, fontWeight: "900" },
  currentOrder: {
    borderRadius: 20,
    elevation: 3,
    marginTop: 10,
    padding: 15,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 9,
  },
  orderTop: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  orderIdentity: { flex: 1, minWidth: 0 },
  currentEyebrow: { color: "rgba(255,255,255,0.65)", fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  currentCode: { color: "#FFFFFF", fontSize: 15, fontWeight: "900", marginTop: 3 },
  currentFare: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  openRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  openText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  routeRow: { alignItems: "flex-start", flexDirection: "row", marginTop: 13 },
  routeBadge: { alignItems: "center", borderRadius: 17, height: 34, justifyContent: "center", width: 34 },
  routeCopy: { flex: 1, minWidth: 0, paddingLeft: 9 },
  routeLabel: { fontSize: 7, fontWeight: "800" },
  routeTitle: { fontSize: 10, fontWeight: "900", marginTop: 2 },
  routeBody: { fontSize: 8, lineHeight: 12, marginTop: 2 },
  offerList: { gap: 10, marginTop: 10 },
  offerCard: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    padding: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
  },
  offerEyebrow: { fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  offerCode: { fontSize: 14, fontWeight: "900", marginTop: 3 },
  offerFare: { fontSize: 13, fontWeight: "900" },
  offerMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  infoPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  infoText: { fontSize: 7, fontWeight: "700" },
  privacy: { fontSize: 8, lineHeight: 12, marginTop: 9 },
  takeButton: { alignItems: "center", borderRadius: 14, justifyContent: "center", marginTop: 12, minHeight: 44 },
  takeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  quickGrid: { flexDirection: "row", gap: 8 },
  quickCard: { borderRadius: 18, borderWidth: 1, flex: 1, minHeight: 126, padding: 11 },
  quickIcon: { alignItems: "center", borderRadius: 16, height: 34, justifyContent: "center", width: 34 },
  quickTitle: { fontSize: 10, fontWeight: "900", marginTop: 11 },
  quickDescription: { fontSize: 7, lineHeight: 11, marginTop: 4 },
  readinessCard: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    paddingHorizontal: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
  },
  infoRow: { alignItems: "center", flexDirection: "row", minHeight: 72, paddingVertical: 11 },
  infoIcon: { alignItems: "center", borderRadius: 17, height: 36, justifyContent: "center", width: 36 },
  infoCopy: { flex: 1, minWidth: 0, paddingLeft: 11 },
  infoLabel: { fontSize: 7, fontWeight: "800" },
  infoValue: { fontSize: 10, fontWeight: "900", marginTop: 3 },
  infoDetail: { fontSize: 7, marginTop: 2 },
  infoDivider: { height: StyleSheet.hairlineWidth, marginLeft: 47 },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    marginTop: 20,
    padding: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
  },
  profileTitle: { fontSize: 13, fontWeight: "900" },
  field: { marginTop: 13 },
  fieldLabel: { fontSize: 8, fontWeight: "800", marginBottom: 6 },
  input: { borderRadius: 14, borderWidth: 1, fontSize: 11, minHeight: 46, paddingHorizontal: 12 },
  readonly: { opacity: 0.55 },
  vehicleRow: { flexDirection: "row", gap: 8 },
  vehicleChoice: { alignItems: "center", borderRadius: 14, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 44 },
  vehicleText: { fontSize: 9, fontWeight: "900" },
  primaryButton: { alignItems: "center", borderRadius: 14, justifyContent: "center", marginTop: 16, minHeight: 48 },
  primaryText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  reviewButton: { alignItems: "center", borderRadius: 14, justifyContent: "center", marginTop: 8, minHeight: 46 },
  reviewText: { fontSize: 9, fontWeight: "900" },
  stateCard: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 18, padding: 25 },
  stateTitle: { fontSize: 12, fontWeight: "900", marginTop: 10, textAlign: "center" },
  stateBody: { fontSize: 9, lineHeight: 15, marginTop: 5, textAlign: "center" },
});
