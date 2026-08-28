import { formatRupiah } from "@nitip/domain";
import type { DriverDeliveryActionInput, NitipDriverOrder } from "@nitip/domain/driver";
import { useNitipLanguage } from "@nitip/i18n";
import * as ImagePicker from "expo-image-picker";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPopup, type PopupNotice } from "../../components/AnimatedPopup";
import { AppHeader } from "../../components/AppHeader";
import { NitipIcon } from "../../components/NitipIcon";
import RouteMap from "../../components/RouteMap";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { actOnDriverOrder, getDriverOrder, uploadDeliveryProof } from "../../lib/api";

function statusLabel(status: NitipDriverOrder["status"], language: "id" | "en") {
  const id = { driver_assigned: "ORDER DITUGASKAN", picked_up: "SUDAH DIAMBIL", on_delivery: "SEDANG DIANTAR", delivered: "SELESAI" } as const;
  const en = { driver_assigned: "ASSIGNED", picked_up: "PICKED UP", on_delivery: "ON DELIVERY", delivered: "COMPLETED" } as const;
  return (language === "id" ? id : en)[status];
}

export default function DriverOrderDetailScreen() {
  const { language } = useNitipLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<NitipDriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofAsset, setProofAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<PopupNotice | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    input: DriverDeliveryActionInput;
    title: string;
    message: string;
  } | null>(null);

  const c = language === "id" ? {
    title: "Detail perjalanan", loading: "Memuat assignment...", unavailable: "Order tidak tersedia", fare: "Pendapatan delivery", status: "STATUS PERJALANAN",
    assigned: "Ambil pesanan dari merchant sebelum menuju customer.", picked: "Pesanan sudah kamu pegang dan siap diantar.", delivery: "Pesanan sedang dalam perjalanan ke customer.", done: "Pengantaran selesai dan assignment aktif sudah dilepas.",
    map: "Peta perjalanan", pickup: "Pickup", destination: "Antar ke", items: "Isi pesanan", note: "CATATAN CUSTOMER", next: "Langkah berikutnya", complete: "Pengantaran selesai", completeBody: "Order selesai. Kamu dapat kembali menerima order berikutnya.",
    cancel: "Batal", continue: "Lanjut", pickupAction: "Pesanan sudah diambil", pickupTitle: "Konfirmasi pickup?", pickupMessage: "Pastikan pesanan sudah kamu terima dari merchant.", pickupHelper: "Periksa item dari merchant, lalu konfirmasi pickup.",
    startAction: "Mulai pengantaran", startTitle: "Mulai pengantaran?", startMessage: "Customer dan merchant akan melihat status sedang diantar.", startHelper: "Mulai saat kamu siap menuju customer.",
    doneAction: "Selesaikan pengantaran", doneTitle: "Konfirmasi penerimaan?", doneMessage: "Pastikan OTP customer benar dan pesanan benar-benar sudah diterima.", doneHelper: "Minta kode 4 digit dari customer. Tambahkan foto bukti bila tersedia.",
    otp: "OTP PENERIMAAN", otpHint: "Masukkan kode 4 digit yang tampil di aplikasi customer.", proof: "Bukti pengantaran", proofHint: "Foto paket di tangan customer atau lokasi penyerahan. Sangat disarankan untuk mengurangi sengketa.", takePhoto: "Ambil foto bukti", uploaded: "Foto bukti tersimpan", navigation: "Navigasi", call: "Telepon customer", safety: "Safety Center", noProof: "Foto belum terunggah. OTP tetap menjadi bukti utama.",
    pickupOk: "Pickup dikonfirmasi", pickupOkBody: "Status perjalanan diperbarui.", deliveryStarted: "Pengantaran dimulai", deliveryStartedBody: "Customer sekarang melihat pesanan sedang diantar.", otpCorrect: "OTP benar", otpCorrectBody: "Pengantaran berhasil diselesaikan.", otpWrong: "OTP salah", otpWrongBody: "Kode tidak cocok. Minta customer mengecek kembali 4 digit OTP.", actionFailed: "Aksi gagal", proofSaved: "Bukti tersimpan", proofSavedBody: "Foto bukti pengantaran berhasil diunggah.", cameraDenied: "Izin kamera diperlukan", cameraDeniedBody: "Aktifkan izin kamera untuk mengambil bukti pengantaran.", proofFailed: "Upload bukti gagal", navigationFailed: "Navigasi tidak dapat dibuka",
  } : {
    title: "Trip details", loading: "Loading assignment...", unavailable: "Order unavailable", fare: "Delivery earning", status: "TRIP STATUS",
    assigned: "Pick up the order from the merchant before heading to the customer.", picked: "The order is secured and ready for delivery.", delivery: "The order is on its way to the customer.", done: "Delivery is complete and the active assignment has been released.",
    map: "Trip map", pickup: "Pickup", destination: "Deliver to", items: "Order items", note: "CUSTOMER NOTE", next: "Next step", complete: "Delivery completed", completeBody: "The order is complete. You can receive another order.",
    cancel: "Cancel", continue: "Continue", pickupAction: "Order picked up", pickupTitle: "Confirm pickup?", pickupMessage: "Make sure you received the order from the merchant.", pickupHelper: "Check the merchant order, then confirm pickup.",
    startAction: "Start delivery", startTitle: "Start delivery?", startMessage: "Customer and merchant will see the on-delivery status.", startHelper: "Start when you are ready to head to the customer.",
    doneAction: "Complete delivery", doneTitle: "Confirm receipt?", doneMessage: "Make sure the customer OTP is correct and the order has been received.", doneHelper: "Ask the customer for the 4-digit code. Add proof photo when available.",
    otp: "DELIVERY OTP", otpHint: "Enter the 4-digit code shown in the customer app.", proof: "Delivery proof", proofHint: "Photograph the package at handoff or drop-off location. Recommended for dispute protection.", takePhoto: "Take proof photo", uploaded: "Proof photo saved", navigation: "Navigate", call: "Call customer", safety: "Safety Center", noProof: "Photo was not uploaded. OTP remains the primary proof.",
    pickupOk: "Pickup confirmed", pickupOkBody: "Trip status has been updated.", deliveryStarted: "Delivery started", deliveryStartedBody: "The customer can now see the order is on the way.", otpCorrect: "OTP verified", otpCorrectBody: "Delivery completed successfully.", otpWrong: "Wrong OTP", otpWrongBody: "The code does not match. Ask the customer to check the 4-digit OTP again.", actionFailed: "Action failed", proofSaved: "Proof saved", proofSavedBody: "Delivery proof photo was uploaded successfully.", cameraDenied: "Camera permission required", cameraDeniedBody: "Enable camera access to capture delivery proof.", proofFailed: "Proof upload failed", navigationFailed: "Navigation could not be opened",
  };

  function showNotice(tone: PopupNotice["tone"], title: string, message?: string | null, durationMs?: number) {
    setNotice({ id: Date.now(), tone, title, message, durationMs });
  }

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    getDriverOrder(user, id)
      .then((next) => { if (active) setOrder(next); })
      .catch((e: unknown) => { if (active) setLoadError(e instanceof Error ? e.message : c.unavailable); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [c.unavailable, id, user]);

  if (!user) return <Redirect href="/login" />;

  async function runAction(input: DriverDeliveryActionInput) {
    if (!order) return;
    setUpdating(true);
    try {
      const next = await actOnDriverOrder(user, order.id, input);
      setOrder(next);
      if (input.action === "complete_delivery") {
        setOtp("");
        showNotice("success", c.otpCorrect, c.otpCorrectBody, 2800);
      } else if (input.action === "start_delivery") {
        showNotice("success", c.deliveryStarted, c.deliveryStartedBody);
      } else {
        showNotice("success", c.pickupOk, c.pickupOkBody);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : c.unavailable;
      if (input.action === "complete_delivery" && /otp/i.test(message)) {
        showNotice("error", c.otpWrong, message || c.otpWrongBody, 3200);
      } else {
        showNotice("error", c.actionFailed, message, 3200);
      }
    } finally {
      setUpdating(false);
    }
  }

  function confirmBasic(input: DriverDeliveryActionInput, title: string, message: string) {
    setPendingAction({ input, title, message });
  }

  async function takeProof() {
    if (!order || order.status !== "on_delivery") return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showNotice("warning", c.cameraDenied, c.cameraDeniedBody, 3200);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.72, allowsEditing: false });
    const asset = result.canceled ? null : result.assets[0] ?? null;
    if (!asset) return;
    setProofAsset(asset);
    setUploadingProof(true);
    try {
      const uploadedUrl = await uploadDeliveryProof(user, order.id, asset);
      setProofUrl(uploadedUrl);
      showNotice("success", c.proofSaved, c.proofSavedBody);
    } catch (e) {
      setProofUrl(null);
      showNotice("error", c.proofFailed, e instanceof Error ? e.message : c.noProof, 3200);
    } finally {
      setUploadingProof(false);
    }
  }

  async function openNavigation(latitude: number | null, longitude: number | null, label: string) {
    if (latitude == null || longitude == null) return;
    const url = Platform.OS === "ios"
      ? `maps://?daddr=${latitude},${longitude}&q=${encodeURIComponent(label)}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label)})`;
    try {
      await Linking.openURL(url);
    } catch {
      try {
        await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`);
      } catch (e) {
        showNotice("error", c.navigationFailed, e instanceof Error ? e.message : null);
      }
    }
  }

  const progressText = order?.status === "driver_assigned" ? c.assigned : order?.status === "picked_up" ? c.picked : order?.status === "on_delivery" ? c.delivery : c.done;
  const hasRoute = order ? (order.pickup.latitude != null && order.pickup.longitude != null) || (order.destination.latitude != null && order.destination.longitude != null) : false;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AnimatedPopup
        colors={theme.colors}
        notice={notice}
        confirmation={pendingAction ? {
          visible: true,
          tone: pendingAction.input.action === "complete_delivery" ? "success" : "info",
          title: pendingAction.title,
          message: pendingAction.message,
          confirmLabel: c.continue,
          cancelLabel: c.cancel,
          busy: updating,
        } : null}
        top={insets.top + 8}
        onNoticeDismiss={() => setNotice(null)}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction;
          if (!action) return;
          setPendingAction(null);
          void runAction(action.input);
        }}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AppHeader title={c.title} />
        {loading ? <StateCard loading title={c.loading} /> : loadError && !order ? <StateCard title={c.unavailable} body={loadError} danger /> : order ? <>
          <View style={styles.hero}><Text style={[styles.eyebrow, { color: theme.colors.primary }]}>{statusLabel(order.status, language)}</Text><Text style={[styles.orderCode, { color: theme.colors.text }]}>{order.orderCode}</Text><Text style={[styles.fare, { color: theme.colors.primary }]}>{formatRupiah(order.deliveryFare)}</Text><Text style={[styles.fareLabel, { color: theme.colors.textMuted }]}>{c.fare}</Text></View>
          <View style={[styles.progress, { backgroundColor: order.status === "delivered" ? theme.colors.successSurface : theme.colors.surfaceAccent }]}><View style={[styles.progressBadge, { backgroundColor: order.status === "delivered" ? theme.colors.success : theme.colors.primary }]}><NitipIcon color="#FFFFFF" name={order.status === "delivered" ? "check" : "delivery"} size={18} /></View><View style={styles.progressCopy}><Text style={[styles.progressLabel, { color: order.status === "delivered" ? theme.colors.success : theme.colors.primary }]}>{c.status}</Text><Text style={[styles.progressTitle, { color: theme.colors.text }]}>{statusLabel(order.status, language)}</Text><Text style={[styles.progressBody, { color: theme.colors.textMuted }]}>{progressText}</Text></View></View>

          <View style={styles.quickActions}>
            <Quick icon="safety" label={c.safety} danger onPress={() => router.push("/safety")} />
            {order.destination.phoneNumber ? <Quick icon="phone" label={c.call} onPress={() => void Linking.openURL(`tel:${order.destination.phoneNumber}`)} /> : null}
          </View>

          {hasRoute ? <><Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{c.map}</Text><View style={[styles.mapCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><RouteMap pickup={{ latitude: order.pickup.latitude, longitude: order.pickup.longitude, label: `${order.pickup.businessName} · ${order.pickup.outletName}` }} destination={{ latitude: order.destination.latitude, longitude: order.destination.longitude, label: order.destination.recipientName }} /></View></> : null}

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{c.pickup}</Text>
          <InfoCard icon="store" title={order.pickup.businessName} strong={order.pickup.outletName} body={order.pickup.addressLine}><ActionLink icon="location" label={c.navigation} disabled={order.pickup.latitude == null} onPress={() => void openNavigation(order.pickup.latitude, order.pickup.longitude, order.pickup.outletName)} /></InfoCard>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{c.destination}</Text>
          <InfoCard icon="location" title={order.destination.recipientName} strong={order.destination.phoneNumber} body={order.destination.addressLine}>
            {order.destination.notes ? <View style={[styles.note, { backgroundColor: theme.colors.surfaceAccent }]}><Text style={[styles.noteLabel, { color: theme.colors.primary }]}>{c.note}</Text><Text style={[styles.noteText, { color: theme.colors.text }]}>{order.destination.notes}</Text></View> : null}
            <ActionLink icon="location" label={c.navigation} disabled={order.destination.latitude == null} onPress={() => void openNavigation(order.destination.latitude, order.destination.longitude, order.destination.recipientName)} />
          </InfoCard>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{c.items}</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>{order.items.map((item, index) => <View key={`${item.productId}-${index}`} style={[styles.itemRow, index > 0 && { borderTopColor: theme.colors.border, borderTopWidth: 1 }]}><View style={[styles.quantityBadge, { backgroundColor: theme.colors.surfaceAccent }]}><Text style={[styles.quantity, { color: theme.colors.primary }]}>{item.quantity}×</Text></View><Text style={[styles.itemName, { color: theme.colors.text }]}>{item.name}</Text></View>)}</View>

          {order.status === "driver_assigned" ? <ActionCard title={c.next} body={c.pickupHelper}><Primary label={c.pickupAction} onPress={() => confirmBasic({ action: "confirm_pickup" }, c.pickupTitle, c.pickupMessage)} /></ActionCard> : null}
          {order.status === "picked_up" ? <ActionCard title={c.next} body={c.startHelper}><Primary label={c.startAction} onPress={() => confirmBasic({ action: "start_delivery" }, c.startTitle, c.startMessage)} /></ActionCard> : null}
          {order.status === "on_delivery" ? (
            <View style={[styles.actionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.actionTitle, { color: theme.colors.text }]}>{c.next}</Text><Text style={[styles.actionBody, { color: theme.colors.textMuted }]}>{c.doneHelper}</Text>
              <Text style={[styles.fieldLabel, { color: theme.colors.primary }]}>{c.otp}</Text><Text style={[styles.fieldHelp, { color: theme.colors.textMuted }]}>{c.otpHint}</Text>
              <TextInput keyboardType="number-pad" maxLength={4} onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" placeholderTextColor={theme.colors.textMuted} style={[styles.otpInput, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, color: theme.colors.text }]} value={otp} />
              <Text style={[styles.fieldLabel, { color: theme.colors.primary }]}>{c.proof}</Text><Text style={[styles.fieldHelp, { color: theme.colors.textMuted }]}>{c.proofHint}</Text>
              {proofAsset ? <Image source={{ uri: proofAsset.uri }} style={styles.proofImage} /> : null}
              <Pressable disabled={uploadingProof} onPress={() => void takeProof()} style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceAccent }]}>{uploadingProof ? <ActivityIndicator color={theme.colors.primary} /> : <><NitipIcon color={theme.colors.primary} name="camera" size={17} /><Text style={[styles.secondaryText, { color: theme.colors.primary }]}>{proofUrl ? c.uploaded : c.takePhoto}</Text></>}</Pressable>
              <Primary disabled={otp.length !== 4} label={c.doneAction} onPress={() => confirmBasic({ action: "complete_delivery", otp, proofUrl }, c.doneTitle, c.doneMessage)} />
            </View>
          ) : null}
          {order.status === "delivered" ? <View style={[styles.completed, { backgroundColor: theme.colors.successSurface }]}><NitipIcon color={theme.colors.success} name="check" size={21} /><Text style={[styles.completedTitle, { color: theme.colors.text }]}>{c.complete}</Text><Text style={[styles.completedBody, { color: theme.colors.textMuted }]}>{c.completeBody}</Text></View> : null}
        </> : null}
      </ScrollView>
    </View>
  );

  function Quick({ icon, label, onPress, danger = false }: { icon: "safety" | "phone"; label: string; onPress: () => void; danger?: boolean }) { return <Pressable onPress={onPress} style={[styles.quick, { backgroundColor: danger ? theme.colors.dangerSurface : theme.colors.surface, borderColor: danger ? theme.colors.dangerSurface : theme.colors.border }]}><NitipIcon color={danger ? theme.colors.danger : theme.colors.primary} name={icon} size={16} /><Text numberOfLines={1} style={[styles.quickText, { color: danger ? theme.colors.danger : theme.colors.text }]}>{label}</Text></Pressable>; }
  function ActionLink({ icon, label, onPress, disabled = false }: { icon: "location"; label: string; onPress: () => void; disabled?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} style={[styles.actionLink, { backgroundColor: theme.colors.surfaceAccent, opacity: disabled ? 0.4 : 1 }]}><NitipIcon color={theme.colors.primary} name={icon} size={14} /><Text style={[styles.actionLinkText, { color: theme.colors.primary }]}>{label}</Text></Pressable>; }
  function InfoCard({ icon, title, strong, body, children }: { icon: "store" | "location"; title: string; strong: string; body: string; children?: React.ReactNode }) { return <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><View style={styles.infoTop}><View style={[styles.infoBadge, { backgroundColor: theme.colors.surfaceAccent }]}><NitipIcon color={theme.colors.primary} name={icon} size={17} /></View><View style={styles.infoCopy}><Text style={[styles.infoTitle, { color: theme.colors.text }]}>{title}</Text><Text style={[styles.infoStrong, { color: theme.colors.primary }]}>{strong}</Text><Text style={[styles.infoBody, { color: theme.colors.textMuted }]}>{body}</Text></View></View>{children}</View>; }
  function ActionCard({ title, body, children }: { title: string; body: string; children: React.ReactNode }) { return <View style={[styles.actionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[styles.actionTitle, { color: theme.colors.text }]}>{title}</Text><Text style={[styles.actionBody, { color: theme.colors.textMuted }]}>{body}</Text>{children}</View>; }
  function Primary({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable disabled={updating || disabled} onPress={onPress} style={[styles.primaryButton, { backgroundColor: theme.colors.primary, opacity: updating || disabled ? 0.45 : 1 }]}>{updating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{label}</Text>}</Pressable>; }
  function StateCard({ loading = false, title, body, danger = false }: { loading?: boolean; title: string; body?: string; danger?: boolean }) { return <View style={[styles.stateCard, { backgroundColor: danger ? theme.colors.dangerSurface : theme.colors.surface, borderColor: danger ? theme.colors.dangerSurface : theme.colors.border }]}>{loading ? <ActivityIndicator color={theme.colors.primary} /> : <NitipIcon color={danger ? theme.colors.danger : theme.colors.primary} name="orders" size={22} />}<Text style={[styles.stateTitle, { color: danger ? theme.colors.danger : theme.colors.text }]}>{title}</Text>{body ? <Text style={[styles.stateBody, { color: danger ? theme.colors.danger : theme.colors.textMuted }]}>{body}</Text> : null}</View>; }
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 38, paddingHorizontal: 20 }, hero: { marginTop: 25 }, eyebrow: { fontSize: 8, fontWeight: "900", letterSpacing: 0.9 }, orderCode: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8, marginTop: 5 }, fare: { fontSize: 20, fontWeight: "900", marginTop: 12 }, fareLabel: { fontSize: 8, marginTop: 2 },
  progress: { alignItems: "center", borderRadius: 18, flexDirection: "row", marginTop: 18, padding: 14 }, progressBadge: { alignItems: "center", borderRadius: 21, height: 42, justifyContent: "center", width: 42 }, progressCopy: { flex: 1, paddingLeft: 11 }, progressLabel: { fontSize: 7, fontWeight: "900", letterSpacing: 0.7 }, progressTitle: { fontSize: 12, fontWeight: "900", marginTop: 2 }, progressBody: { fontSize: 8, lineHeight: 13, marginTop: 3 },
  quickActions: { flexDirection: "row", gap: 8, marginTop: 12 }, quick: { alignItems: "center", borderRadius: 16, borderWidth: 1, flex: 1, flexDirection: "row", gap: 7, minHeight: 44, paddingHorizontal: 11 }, quickText: { flex: 1, fontSize: 8, fontWeight: "900" }, sectionTitle: { fontSize: 12, fontWeight: "900", marginBottom: 9, marginTop: 23 }, mapCard: { borderRadius: 20, borderWidth: 1, height: 250, overflow: "hidden" },
  infoCard: { borderRadius: 18, borderWidth: 1, padding: 13 }, infoTop: { alignItems: "flex-start", flexDirection: "row" }, infoBadge: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 }, infoCopy: { flex: 1, minWidth: 0, paddingLeft: 11 }, infoTitle: { fontSize: 11, fontWeight: "900" }, infoStrong: { fontSize: 8, fontWeight: "900", marginTop: 3 }, infoBody: { fontSize: 8, lineHeight: 13, marginTop: 5 }, actionLink: { alignItems: "center", alignSelf: "flex-start", borderRadius: 999, flexDirection: "row", gap: 6, marginTop: 12, paddingHorizontal: 11, paddingVertical: 9 }, actionLinkText: { fontSize: 8, fontWeight: "900" },
  note: { borderRadius: 14, marginTop: 12, padding: 11 }, noteLabel: { fontSize: 7, fontWeight: "900" }, noteText: { fontSize: 8, lineHeight: 13, marginTop: 3 }, itemRow: { alignItems: "center", flexDirection: "row", paddingVertical: 10 }, quantityBadge: { alignItems: "center", borderRadius: 10, justifyContent: "center", minHeight: 30, minWidth: 36 }, quantity: { fontSize: 9, fontWeight: "900" }, itemName: { flex: 1, fontSize: 9, fontWeight: "800", paddingLeft: 10 },
  actionCard: { borderRadius: 20, borderWidth: 1, marginTop: 22, padding: 15 }, actionTitle: { fontSize: 12, fontWeight: "900" }, actionBody: { fontSize: 9, lineHeight: 14, marginTop: 4 }, primaryButton: { alignItems: "center", borderRadius: 16, justifyContent: "center", marginTop: 14, minHeight: 50 }, primaryText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" }, fieldLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 0.5, marginTop: 17 }, fieldHelp: { fontSize: 8, lineHeight: 13, marginTop: 4 }, otpInput: { borderRadius: 16, borderWidth: 1, fontSize: 24, fontWeight: "900", letterSpacing: 12, marginTop: 9, minHeight: 58, paddingHorizontal: 18, textAlign: "center" }, proofImage: { borderRadius: 16, height: 170, marginTop: 10, width: "100%" }, secondaryButton: { alignItems: "center", borderRadius: 16, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 10, minHeight: 48 }, secondaryText: { fontSize: 9, fontWeight: "900" },
  completed: { alignItems: "center", borderRadius: 20, marginTop: 22, padding: 22 }, completedTitle: { fontSize: 12, fontWeight: "900", marginTop: 8 }, completedBody: { fontSize: 8, lineHeight: 13, marginTop: 4, textAlign: "center" }, stateCard: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 22, padding: 28 }, stateTitle: { fontSize: 11, fontWeight: "900", marginTop: 10 }, stateBody: { fontSize: 8, lineHeight: 13, marginTop: 4, textAlign: "center" },
});
