import { formatRupiah } from "@nitip/domain";
import type { NitipOrder, NitipOrderOperations, NitipOrderRating } from "@nitip/domain/commerce";
import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPopup, type PopupNotice } from "../../components/AnimatedPopup";
import { AppHeader } from "../../components/AppHeader";
import { LiveDriverTracking } from "../../components/LiveDriverTracking";
import { NitipIcon, type NitipIconName } from "../../components/NitipIcon";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { getOrder, getOrderOperations, getOrderRating, simulateOrderPayment, upsertOrderRating } from "../../lib/api";

function reservationDeadline(value: string | null, language: "id" | "en") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(language === "en" ? "en-US" : "id-ID", { hour: "2-digit", minute: "2-digit" });
}

function readyTime(value: string | null, language: "id" | "en") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(language === "en" ? "en-US" : "id-ID", { hour: "2-digit", minute: "2-digit" });
}

function orderProgress(status: NitipOrder["status"]) {
  if (status === "delivered") return 3;
  if (status === "driver_assigned" || status === "picked_up" || status === "on_delivery") return 2;
  if (status === "paid" || status === "merchant_confirmed" || status === "preparing" || status === "ready_for_pickup") return 1;
  return 0;
}

function receiptAvailable(status: NitipOrder["status"]) {
  return ["paid", "merchant_confirmed", "preparing", "ready_for_pickup", "driver_assigned", "picked_up", "on_delivery", "delivered", "refunded"].includes(status);
}

function shouldPoll(status: NitipOrder["status"] | undefined) {
  return Boolean(status && !["delivered", "cancelled", "refunded"].includes(status));
}

export default function OrderDetailScreen() {
  const { t } = useNitipTranslation();
  const { language } = useNitipLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<NitipOrder | null>(null);
  const [operations, setOperations] = useState<NitipOrderOperations | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<PopupNotice | null>(null);
  const [rating, setRating] = useState<NitipOrderRating | null>(null);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingSaved, setRatingSaved] = useState(false);

  const x = language === "en" ? {
    prepTitle: "Merchant preparation", prepBody: "The merchant estimated this order will take {{minutes}} minutes to prepare.", readyAt: "Estimated ready at",
    otpTitle: "Delivery verification code", otpBody: "Give this 4-digit code to the driver only after you have received your order.", otpWarning: "Do not share this code before the order reaches you.",
    report: "Report an order issue", reportBody: "Missing item, wrong order, delivery problem, or payment issue.",
    ratingTitle: "Rate this order", ratingDescription: "Only completed deliveries can be rated. Your score contributes to the outlet rating.", choose: "Choose 1–5 stars before submitting.", commentPlaceholder: "Optional: tell us about the food or merchant", submit: "Submit rating", update: "Update rating", saved: "Rating saved", savedBody: "Thank you for sharing your experience.", loadError: "Unable to load your rating.", saveError: "Unable to save your rating.",
    live: "LIVE STATUS", refreshing: "Status refreshes automatically while the order is active.", receipt: "View & save receipt", receiptBody: "Open the transaction receipt and save it as a PDF.",
    paymentSuccess: "Payment confirmed", paymentSuccessBody: "The order is now waiting for the merchant.", paymentFailed: "Payment update failed",
  } : {
    prepTitle: "Persiapan merchant", prepBody: "Merchant memperkirakan pesanan ini membutuhkan {{minutes}} menit untuk disiapkan.", readyAt: "Perkiraan siap pukul",
    otpTitle: "Kode verifikasi penerimaan", otpBody: "Berikan kode 4 digit ini ke driver hanya setelah pesanan benar-benar kamu terima.", otpWarning: "Jangan berikan kode sebelum pesanan sampai kepadamu.",
    report: "Laporkan masalah pesanan", reportBody: "Item kurang, pesanan salah, masalah driver, atau kendala pembayaran.",
    ratingTitle: "Nilai pesanan ini", ratingDescription: "Hanya pesanan yang selesai diantar yang bisa dinilai. Nilaimu masuk ke rating outlet.", choose: "Pilih 1–5 bintang sebelum mengirim.", commentPlaceholder: "Opsional: ceritakan pengalaman makanan atau merchant", submit: "Kirim rating", update: "Perbarui rating", saved: "Rating tersimpan", savedBody: "Terima kasih sudah membagikan pengalamanmu.", loadError: "Rating kamu belum bisa dimuat.", saveError: "Rating belum bisa disimpan.",
    live: "STATUS LIVE", refreshing: "Status diperbarui otomatis selama pesanan masih aktif.", receipt: "Lihat & simpan receipt", receiptBody: "Buka bukti transaksi dan simpan sebagai PDF.",
    paymentSuccess: "Pembayaran dikonfirmasi", paymentSuccessBody: "Pesanan sekarang menunggu merchant.", paymentFailed: "Pembaruan pembayaran gagal",
  };

  function showNotice(tone: PopupNotice["tone"], title: string, message?: string | null, durationMs?: number) {
    setNotice({ id: Date.now(), tone, title, message, durationMs });
  }

  const loadOrder = useCallback(async (showLoader = false) => {
    if (!user || !id) return;
    if (showLoader) setLoading(true);
    try {
      const [nextOrder, nextOperations] = await Promise.all([
        getOrder(user, id),
        getOrderOperations(user, id).catch(() => null),
      ]);
      setOrder(nextOrder);
      setOperations(nextOperations);
      setError(null);
    } catch (nextError) {
      if (showLoader || !order) setError(nextError instanceof Error ? nextError.message : t("orderDetail.loadError"));
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [id, order, t, user]);

  useEffect(() => { void loadOrder(true); }, [id, user]);

  useEffect(() => {
    if (!shouldPoll(order?.status)) return;
    const timer = setInterval(() => { void loadOrder(false); }, 8000);
    return () => clearInterval(timer);
  }, [loadOrder, order?.status]);

  useEffect(() => {
    if (!user || !order || order.status !== "delivered") {
      setRating(null);
      setRatingScore(0);
      setRatingComment("");
      setRatingLoading(false);
      setRatingError(null);
      setRatingSaved(false);
      return;
    }
    let active = true;
    setRatingLoading(true);
    setRatingError(null);
    getOrderRating(user, order.id)
      .then((nextRating) => {
        if (!active) return;
        setRating(nextRating);
        setRatingScore(nextRating?.score ?? 0);
        setRatingComment(nextRating?.comment ?? "");
      })
      .catch((e: unknown) => {
        if (active) setRatingError(e instanceof Error ? e.message : x.loadError);
      })
      .finally(() => {
        if (active) setRatingLoading(false);
      });
    return () => { active = false; };
  }, [order?.id, order?.status, user]);

  if (!user) return <Redirect href="/login" />;

  async function simulatePayment() {
    if (!order) return;
    setSimulating(true);
    setError(null);
    try {
      setOrder(await simulateOrderPayment(user, order.id));
      await loadOrder(false);
      showNotice("success", x.paymentSuccess, x.paymentSuccessBody);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("orderDetail.simulateError");
      setError(message);
      showNotice("error", x.paymentFailed, message, 3200);
    } finally {
      setSimulating(false);
    }
  }

  async function submitRating() {
    if (!order || order.status !== "delivered") return;
    if (ratingScore < 1 || ratingScore > 5) {
      setRatingError(x.choose);
      showNotice("warning", x.ratingTitle, x.choose);
      return;
    }
    setRatingSaving(true);
    setRatingError(null);
    setRatingSaved(false);
    try {
      const next = await upsertOrderRating(user, order.id, { score: ratingScore, comment: ratingComment.trim() || null });
      setRating(next);
      setRatingScore(next.score);
      setRatingComment(next.comment ?? "");
      setRatingSaved(true);
      showNotice("success", x.saved, x.savedBody);
    } catch (e) {
      const message = e instanceof Error ? e.message : x.saveError;
      setRatingError(message);
      showNotice("error", x.saveError, message, 3200);
    } finally {
      setRatingSaving(false);
    }
  }

  const deadline = reservationDeadline(order?.stockReservationExpiresAt ?? null, language);
  const progress = order ? orderProgress(order.status) : 0;
  const progressSteps: { label: string; icon: NitipIconName }[] = [
    { label: t("orderDetail.progressPayment"), icon: "receipt" },
    { label: t("orderDetail.progressPreparing"), icon: "clock" },
    { label: t("orderDetail.progressDelivery"), icon: "location" },
    { label: t("orderDetail.progressDone"), icon: "check" },
  ];
  const estimatedReady = readyTime(operations?.estimatedReadyAt ?? null, language);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AnimatedPopup
        colors={theme.colors}
        notice={notice}
        top={insets.top + 8}
        onNoticeDismiss={() => setNotice(null)}
      />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 18, paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 28, 40) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={t("orderDetail.title")} onBack={() => router.back()} />

        {loading ? <State loading text={t("orderDetail.loading")} /> : error && !order ? <State danger text={error} /> : order ? <>
          <View style={styles.hero}>
            <View style={[styles.statusPill, { backgroundColor: theme.colors.surfaceRaised }]}><Text style={[styles.statusText, { color: theme.colors.primary }]}>{t(`orders.status.${order.status}`)}</Text></View>
            <Text style={[styles.business, { color: theme.colors.text }]}>{order.businessName}</Text>
            <Text style={[styles.orderCode, { color: theme.colors.primary }]}>{order.orderCode}</Text>
            <Text style={[styles.outlet, { color: theme.colors.textMuted }]}>{order.outletName}</Text>
          </View>

          {shouldPoll(order.status) ? <View style={[styles.live, { backgroundColor: theme.colors.surfaceAccent }]}><View style={[styles.liveDot, { backgroundColor: theme.colors.primary }]} /><View style={styles.liveCopy}><Text style={[styles.liveTitle, { color: theme.colors.primary }]}>{x.live}</Text><Text style={[styles.liveBody, { color: theme.colors.textMuted }]}>{x.refreshing}</Text></View></View> : null}

          {order.status !== "cancelled" && order.status !== "refunded" ? (
            <View style={[styles.card, styles.progressCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.progressRow}>{progressSteps.map((step, index) => {
                const reached = index <= progress;
                const color = reached ? theme.colors.primary : theme.colors.textMuted;
                return <View style={styles.progressStep} key={step.label}><View style={styles.progressLineRow}>{index > 0 ? <View style={[styles.line, { backgroundColor: index <= progress ? theme.colors.primary : theme.colors.border }]} /> : <View style={styles.line} />}<View style={[styles.progressCircle, { backgroundColor: reached ? theme.colors.surfaceAccent : theme.colors.background }]}><NitipIcon color={color} name={step.icon} size={15} /></View>{index < progressSteps.length - 1 ? <View style={[styles.line, { backgroundColor: index < progress ? theme.colors.primary : theme.colors.border }]} /> : <View style={styles.line} />}</View><Text style={[styles.progressLabel, { color: reached ? theme.colors.text : theme.colors.textMuted }]}>{step.label}</Text></View>;
              })}</View>
            </View>
          ) : null}

          {order.status === "pending_payment" ? <View style={[styles.card, { backgroundColor: theme.colors.warningSurface, borderColor: theme.colors.warningSurface }]}><Text style={[styles.cardTitle, { color: theme.colors.warning }]}>{t("orderDetail.paymentGatewayDev")}</Text><Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>{t("orderDetail.paymentGatewayDevDescription")}</Text>{order.stockReservationStatus === "reserved" ? <Text style={[styles.helper, { color: theme.colors.textMuted }]}>{deadline ? t("orderDetail.stockReservedDeadline", { deadline }) : t("orderDetail.stockReservedGeneric")}</Text> : null}<Pressable disabled={simulating} onPress={() => void simulatePayment()} style={[styles.primary, { backgroundColor: theme.colors.primary, opacity: simulating ? 0.55 : 1 }]}>{simulating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{t("orderDetail.simulatePayment")}</Text>}</Pressable></View> : null}

          {operations?.preparationMinutes && ["merchant_confirmed", "preparing", "ready_for_pickup", "driver_assigned"].includes(order.status) ? <View style={[styles.card, { backgroundColor: theme.colors.surfaceAccent, borderColor: theme.colors.surfaceAccent }]}><View style={styles.rowTop}><View style={[styles.roundIcon, { backgroundColor: theme.colors.surface }]}><NitipIcon color={theme.colors.primary} name="clock" size={18} /></View><View style={styles.flex}><Text style={[styles.cardTitle, { color: theme.colors.text }]}>{x.prepTitle}</Text><Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>{x.prepBody.replace("{{minutes}}", String(operations.preparationMinutes))}</Text>{estimatedReady ? <Text style={[styles.highlight, { color: theme.colors.primary }]}>{x.readyAt} {estimatedReady}</Text> : null}</View></View></View> : null}

          {order.status === "on_delivery" ? <LiveDriverTracking orderId={order.id} active /> : null}

          {operations?.deliveryOtp ? <View style={[styles.otpCard, { backgroundColor: theme.colors.primary }]}><Text style={styles.otpTitle}>{x.otpTitle}</Text><Text style={styles.otpCode}>{operations.deliveryOtp}</Text><Text style={styles.otpBody}>{x.otpBody}</Text><View style={styles.otpWarning}><Text style={styles.otpWarningText}>{x.otpWarning}</Text></View></View> : null}

          {order.status === "cancelled" ? <View style={[styles.card, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerSurface }]}><Text style={[styles.cardTitle, { color: theme.colors.danger }]}>{t("orderDetail.cancelled")}</Text><Text style={[styles.cardBody, { color: theme.colors.danger }]}>{order.cancellationReason ?? t("orderDetail.cancelledFallback")}</Text></View> : null}

          <Section title={t("orderDetail.items")}><View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>{order.items.map((item, index) => <View key={`${item.productId}-${index}`} style={[styles.item, index > 0 && { borderTopColor: theme.colors.border, borderTopWidth: 1 }]}><View style={styles.flex}><Text style={[styles.itemName, { color: theme.colors.text }]}>{item.quantity}× {item.name}</Text>{(item.addons ?? []).map((addon) => <Text key={addon.id} style={[styles.addon, { color: theme.colors.primary }]}>+ {addon.name}</Text>)}</View><Text style={[styles.itemPrice, { color: theme.colors.text }]}>{formatRupiah(item.lineTotal)}</Text></View>)}</View></Section>

          <Section title={t("orderDetail.deliverTo")}><View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><View style={styles.rowTop}><View style={[styles.roundIcon, { backgroundColor: theme.colors.surfaceRaised }]}><NitipIcon color={theme.colors.primary} name="location" size={16} /></View><View style={styles.flex}><Text style={[styles.cardTitle, { color: theme.colors.text }]}>{order.address.recipientName}</Text><Text style={[styles.highlight, { color: theme.colors.primary }]}>{order.address.phoneNumber}</Text><Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>{order.address.addressLine}</Text>{order.address.notes ? <Text style={[styles.helper, { color: theme.colors.textMuted }]}>{t("orderDetail.notesPrefix", { notes: order.address.notes })}</Text> : null}</View></View></View></Section>

          <Section title={t("orderDetail.payment")}><View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Amount label={t("common.subtotal")} value={order.subtotal} /><Amount label={t("common.deliveryFee")} value={order.deliveryFare} /><Amount label={t("common.serviceFee")} value={order.serviceFee} /><View style={[styles.totalRow, { borderTopColor: theme.colors.border }]}><Text style={[styles.totalLabel, { color: theme.colors.text }]}>{t("common.total")}</Text><Text style={[styles.totalValue, { color: theme.colors.primary }]}>{formatRupiah(order.customerTotal)}</Text></View></View></Section>

          {receiptAvailable(order.status) ? <Pressable onPress={() => router.push({ pathname: "/order/[id]/receipt", params: { id: order.id } })} style={[styles.linkCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><View style={[styles.roundIcon, { backgroundColor: theme.colors.surfaceRaised }]}><NitipIcon color={theme.colors.primary} name="receipt" size={18} /></View><View style={styles.flex}><Text style={[styles.linkTitle, { color: theme.colors.text }]}>{x.receipt}</Text><Text style={[styles.linkBody, { color: theme.colors.textMuted }]}>{x.receiptBody}</Text></View><NitipIcon color={theme.colors.textMuted} name="next" size={16} /></Pressable> : null}

          <Pressable onPress={() => router.push({ pathname: "/support", params: { orderCode: order.orderCode } })} style={[styles.linkCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><View style={[styles.roundIcon, { backgroundColor: theme.colors.dangerSurface }]}><NitipIcon color={theme.colors.danger} name="help" size={18} /></View><View style={styles.flex}><Text style={[styles.linkTitle, { color: theme.colors.text }]}>{x.report}</Text><Text style={[styles.linkBody, { color: theme.colors.textMuted }]}>{x.reportBody}</Text></View><NitipIcon color={theme.colors.textMuted} name="next" size={16} /></Pressable>

          {order.status === "delivered" ? <View style={[styles.card, styles.ratingCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[styles.cardTitle, { color: theme.colors.text }]}>{x.ratingTitle}</Text><Text style={[styles.cardBody, { color: theme.colors.textMuted }]}>{x.ratingDescription}</Text>{ratingLoading ? <ActivityIndicator style={styles.ratingLoading} color={theme.colors.primary} /> : <><View style={styles.stars}>{[1, 2, 3, 4, 5].map((score) => { const selected = score <= ratingScore; return <Pressable key={score} onPress={() => { setRatingScore(score); setRatingSaved(false); setRatingError(null); }} style={[styles.star, { backgroundColor: selected ? "#FFF3C4" : theme.colors.surfaceRaised, borderColor: selected ? "#F4B400" : theme.colors.border }]}><Text style={[styles.starText, { color: selected ? "#F4B400" : theme.colors.textMuted }]}>★</Text></Pressable>; })}</View><TextInput multiline maxLength={500} onChangeText={(value) => { setRatingComment(value); setRatingSaved(false); }} placeholder={x.commentPlaceholder} placeholderTextColor={theme.colors.textMuted} style={[styles.ratingInput, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, color: theme.colors.text }]} textAlignVertical="top" value={ratingComment} /><Pressable disabled={ratingSaving} onPress={() => void submitRating()} style={[styles.primary, { backgroundColor: theme.colors.primary, opacity: ratingSaving ? 0.55 : 1 }]}>{ratingSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{rating ? x.update : x.submit}</Text>}</Pressable></>}{ratingSaved ? <Text style={[styles.message, { color: theme.colors.success }]}>{x.saved}</Text> : null}{ratingError ? <Text style={[styles.message, { color: theme.colors.danger }]}>{ratingError}</Text> : null}</View> : null}

          {error ? <View style={[styles.errorInline, { backgroundColor: theme.colors.dangerSurface }]}><Text style={[styles.message, { color: theme.colors.danger }]}>{error}</Text></View> : null}
          <Pressable onPress={() => router.replace("/orders")} style={[styles.primary, { backgroundColor: theme.colors.primary }]}><NitipIcon color="#FFFFFF" name="orders" size={16} /><Text style={[styles.primaryText, { marginLeft: 8 }]}>{t("orderDetail.backOrders")}</Text></Pressable>
        </> : null}
      </ScrollView>
    </View>
  );

  function State({ loading: busy = false, danger = false, text }: { loading?: boolean; danger?: boolean; text: string }) { return <View style={[styles.state, { backgroundColor: danger ? theme.colors.dangerSurface : theme.colors.surface, borderColor: danger ? theme.colors.dangerSurface : theme.colors.border }]}>{busy ? <ActivityIndicator color={theme.colors.primary} /> : <NitipIcon color={danger ? theme.colors.danger : theme.colors.primary} name="orders" size={22} />}<Text style={[styles.stateText, { color: danger ? theme.colors.danger : theme.colors.text }]}>{text}</Text></View>; }
  function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>{children}</View>; }
  function Amount({ label, value }: { label: string; value: number }) { return <View style={styles.amountRow}><Text style={[styles.amountLabel, { color: theme.colors.textMuted }]}>{label}</Text><Text style={[styles.amountValue, { color: theme.colors.text }]}>{formatRupiah(value)}</Text></View>; }
}

const styles = StyleSheet.create({
  hero: { marginTop: 26 },
  statusPill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  statusText: { fontSize: 8, fontWeight: "900" },
  business: { fontSize: 26, fontWeight: "900", letterSpacing: -0.7, marginTop: 13 },
  orderCode: { fontSize: 11, fontWeight: "900", marginTop: 5 },
  outlet: { fontSize: 9, marginTop: 3 },
  live: { alignItems: "center", borderRadius: 18, flexDirection: "row", marginTop: 16, padding: 13 },
  liveDot: { borderRadius: 5, height: 9, width: 9 },
  liveCopy: { flex: 1, paddingLeft: 10 },
  liveTitle: { fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  liveBody: { fontSize: 8, marginTop: 2 },
  card: { borderRadius: 22, borderWidth: 1, marginTop: 14, padding: 15 },
  progressCard: { paddingHorizontal: 8 },
  progressRow: { flexDirection: "row" },
  progressStep: { alignItems: "center", flex: 1 },
  progressLineRow: { alignItems: "center", flexDirection: "row", width: "100%" },
  line: { flex: 1, height: 2 },
  progressCircle: { alignItems: "center", borderRadius: 16, height: 32, justifyContent: "center", width: 32 },
  progressLabel: { fontSize: 7, fontWeight: "800", marginTop: 7, textAlign: "center" },
  cardTitle: { fontSize: 12, fontWeight: "900" },
  cardBody: { fontSize: 9, lineHeight: 15, marginTop: 5 },
  helper: { fontSize: 8, lineHeight: 13, marginTop: 10 },
  primary: { alignItems: "center", borderRadius: 16, flexDirection: "row", justifyContent: "center", marginTop: 14, minHeight: 50 },
  primaryText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  rowTop: { alignItems: "flex-start", flexDirection: "row" },
  roundIcon: { alignItems: "center", borderRadius: 21, height: 42, justifyContent: "center", marginRight: 11, width: 42 },
  flex: { flex: 1, minWidth: 0 },
  highlight: { fontSize: 9, fontWeight: "900", marginTop: 6 },
  otpCard: { borderRadius: 24, marginTop: 14, padding: 20 },
  otpTitle: { color: "rgba(255,255,255,.82)", fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  otpCode: { color: "#FFFFFF", fontSize: 40, fontWeight: "900", letterSpacing: 10, marginTop: 10 },
  otpBody: { color: "#FFFFFF", fontSize: 10, lineHeight: 16, marginTop: 9 },
  otpWarning: { backgroundColor: "rgba(0,0,0,.16)", borderRadius: 14, marginTop: 13, padding: 11 },
  otpWarningText: { color: "#FFFFFF", fontSize: 8, fontWeight: "800", lineHeight: 13 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: "900", marginBottom: -2 },
  item: { alignItems: "flex-start", flexDirection: "row", paddingVertical: 10 },
  itemName: { fontSize: 10, fontWeight: "900" },
  addon: { fontSize: 8, marginTop: 3 },
  itemPrice: { fontSize: 9, fontWeight: "900", marginLeft: 10 },
  amountRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  amountLabel: { fontSize: 9 },
  amountValue: { fontSize: 9, fontWeight: "800" },
  totalRow: { borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 13 },
  totalLabel: { fontSize: 12, fontWeight: "900" },
  totalValue: { fontSize: 15, fontWeight: "900" },
  linkCard: { alignItems: "center", borderRadius: 20, borderWidth: 1, flexDirection: "row", marginTop: 13, padding: 13 },
  linkTitle: { fontSize: 10, fontWeight: "900" },
  linkBody: { fontSize: 8, lineHeight: 13, marginTop: 3 },
  ratingCard: { marginTop: 20 },
  ratingLoading: { marginTop: 18 },
  stars: { flexDirection: "row", gap: 7, justifyContent: "space-between", marginTop: 16 },
  star: { alignItems: "center", borderRadius: 13, borderWidth: 1, flex: 1, height: 44, justifyContent: "center" },
  starText: { fontSize: 22 },
  ratingInput: { borderRadius: 16, borderWidth: 1, fontSize: 10, lineHeight: 16, marginTop: 13, minHeight: 86, padding: 12 },
  message: { fontSize: 8, fontWeight: "800", lineHeight: 13, marginTop: 9 },
  errorInline: { borderRadius: 16, marginTop: 13, padding: 12 },
  state: { alignItems: "center", borderRadius: 22, borderWidth: 1, marginTop: 22, padding: 28 },
  stateText: { fontSize: 10, fontWeight: "800", lineHeight: 15, marginTop: 9, textAlign: "center" },
});
