import { formatRupiah } from "@nitip/domain";
import type {
  MidtransNativeMethod,
  NitipMidtransChargeResult,
  NitipMidtransInstruction,
  NitipOrder,
  NitipPaymentConfig,
} from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { AppHeader } from "../../components/AppHeader";
import { NitipIcon } from "../../components/NitipIcon";
import {
  CopyPaymentValueButton,
  SaveQrImageButton,
} from "../../components/PaymentUtilityButton";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import {
  getOrder,
  getPaymentConfig,
  reconcileDokuOrderPayment,
  reconcileMidtransOrderPayment,
  startDokuOrderPayment,
  startMidtransOrderPayment,
} from "../../lib/api";

type PaymentProvider = "doku" | "midtrans";

type MethodCopy = {
  method: MidtransNativeMethod;
  title: string;
  description: string;
  badge?: string;
};

function isMidtransAttemptFailed(status: string) {
  const value = status.trim().toLowerCase();
  return value === "deny" || value === "cancel";
}

export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();
  const { language } = useNitipLanguage();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const reconcileLock = useRef(false);
  const [order, setOrder] = useState<NitipOrder | null>(null);
  const [config, setConfig] = useState<NitipPaymentConfig | null>(null);
  const [provider, setProvider] = useState<PaymentProvider | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [instruction, setInstruction] = useState<NitipMidtransInstruction | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingMethod, setStartingMethod] = useState<MidtransNativeMethod | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const c = language === "id" ? {
    title: "Pembayaran",
    loading: "Menyiapkan pembayaran...",
    unavailable: "Pembayaran belum tersedia",
    unavailableBody: "Metode pembayaran belum dapat digunakan. Coba lagi beberapa saat.",
    retry: "Coba lagi",
    back: "Kembali ke pesanan",
    check: "Cek status",
    checking: "Mengecek...",
    pending: "Pembayaran masih menunggu konfirmasi.",
    paid: "Pembayaran berhasil dikonfirmasi.",
    expired: "Waktu pembayaran sudah berakhir.",
    failed: "Pembayaran belum berhasil. Pilih metode lain untuk mencoba lagi.",
    externalFailed: "Aplikasi pembayaran tidak dapat dibuka dari perangkat ini.",
    webFailed: "Halaman pembayaran tidak dapat dimuat. Periksa koneksi lalu coba lagi.",
    total: "Total pembayaran",
    choose: "Pilih metode pembayaran",
    chooseBody: "Pilih metode yang ingin digunakan untuk menyelesaikan pesanan.",
    waiting: "Menunggu pembayaran",
    expires: "Berlaku sampai",
    openApp: "Buka aplikasi pembayaran",
    qrTitle: "Scan QRIS",
    qrBody: "Scan kode ini dari aplikasi bank atau e-wallet yang mendukung QRIS.",
    saveQr: "Simpan QR",
    savingQr: "Menyiapkan QR...",
    qrReady: "QRIS siap disimpan atau dibagikan.",
    qrSaveFailed: "Gambar QRIS belum dapat disimpan. Coba lagi.",
    vaTitle: "Nomor Virtual Account",
    vaBody: "Transfer sesuai total pembayaran ke nomor Virtual Account berikut.",
    copyVa: "Salin nomor VA",
    vaCopied: "Nomor Virtual Account berhasil disalin.",
    copyFailed: "Nomor belum dapat disalin. Coba lagi.",
    mandiriTitle: "Mandiri Bill Payment",
    biller: "Biller Code",
    billKey: "Bill Key",
    selectable: "Tekan lama nomor untuk menyalin.",
    qris: "QRIS",
    qrisBody: "Bayar dengan aplikasi bank atau e-wallet",
    bca: "BCA Virtual Account",
    bcaBody: "Transfer melalui BCA Virtual Account",
    bni: "BNI Virtual Account",
    bniBody: "Transfer melalui BNI Virtual Account",
    bri: "BRI Virtual Account",
    briBody: "Transfer melalui BRI Virtual Account",
    mandiri: "Mandiri Bill Payment",
    mandiriBody: "Bayar melalui Livin’, ATM, atau kanal Mandiri",
    gopay: "GoPay",
    gopayBody: "Lanjutkan pembayaran di aplikasi GoPay",
    shopeepay: "ShopeePay",
    shopeepayBody: "Lanjutkan pembayaran di aplikasi Shopee",
    recommended: "UMUM",
  } : {
    title: "Payment",
    loading: "Preparing payment...",
    unavailable: "Payment is not available",
    unavailableBody: "Payment methods are temporarily unavailable. Try again shortly.",
    retry: "Try again",
    back: "Back to order",
    check: "Check status",
    checking: "Checking...",
    pending: "Payment is still awaiting confirmation.",
    paid: "Payment has been confirmed.",
    expired: "The payment window has expired.",
    failed: "Payment was not completed. Choose another method to try again.",
    externalFailed: "The payment app could not be opened on this device.",
    webFailed: "The payment page could not be loaded. Check your connection and try again.",
    total: "Payment total",
    choose: "Choose payment method",
    chooseBody: "Choose how you want to complete this order.",
    waiting: "Awaiting payment",
    expires: "Valid until",
    openApp: "Open payment app",
    qrTitle: "Scan QRIS",
    qrBody: "Scan this code with a bank or e-wallet app that supports QRIS.",
    saveQr: "Save QR",
    savingQr: "Preparing QR...",
    qrReady: "QRIS is ready to save or share.",
    qrSaveFailed: "The QRIS image could not be saved. Try again.",
    vaTitle: "Virtual Account number",
    vaBody: "Transfer the exact payment total to this Virtual Account number.",
    copyVa: "Copy VA number",
    vaCopied: "Virtual Account number copied.",
    copyFailed: "The number could not be copied. Try again.",
    mandiriTitle: "Mandiri Bill Payment",
    biller: "Biller Code",
    billKey: "Bill Key",
    selectable: "Press and hold the number to copy it.",
    qris: "QRIS",
    qrisBody: "Pay with a bank or e-wallet app",
    bca: "BCA Virtual Account",
    bcaBody: "Transfer using BCA Virtual Account",
    bni: "BNI Virtual Account",
    bniBody: "Transfer using BNI Virtual Account",
    bri: "BRI Virtual Account",
    briBody: "Transfer using BRI Virtual Account",
    mandiri: "Mandiri Bill Payment",
    mandiriBody: "Pay through Livin’, ATM, or another Mandiri channel",
    gopay: "GoPay",
    gopayBody: "Continue in the GoPay app",
    shopeepay: "ShopeePay",
    shopeepayBody: "Continue in the Shopee app",
    recommended: "POPULAR",
  };

  const methods: MethodCopy[] = [
    { method: "qris", title: c.qris, description: c.qrisBody, badge: c.recommended },
    { method: "bca_va", title: c.bca, description: c.bcaBody },
    { method: "bni_va", title: c.bni, description: c.bniBody },
    { method: "bri_va", title: c.bri, description: c.briBody },
    { method: "mandiri_bill", title: c.mandiri, description: c.mandiriBody },
    { method: "gopay", title: c.gopay, description: c.gopayBody },
    { method: "shopeepay", title: c.shopeepay, description: c.shopeepayBody },
  ];

  const backToOrder = useCallback(() => {
    if (!orderId) {
      router.replace("/orders");
      return;
    }
    router.replace({ pathname: "/order/[id]", params: { id: orderId } });
  }, [orderId]);

  const handleOrderStatus = useCallback((next: NitipOrder) => {
    setOrder(next);
    if (next.status === "paid") {
      setStatusMessage(c.paid);
      setCheckoutUrl(null);
      setInstruction(null);
      setTimeout(() => backToOrder(), 450);
      return true;
    }
    if (next.status === "cancelled" || next.payment?.status === "expired") {
      setStatusMessage(c.expired);
      setCheckoutUrl(null);
      setInstruction(null);
      return true;
    }
    return false;
  }, [backToOrder, c.expired, c.paid]);

  const applyMidtransResult = useCallback((result: NitipMidtransChargeResult, silent = false) => {
    if (handleOrderStatus(result.order)) return;
    setProvider("midtrans");
    if (isMidtransAttemptFailed(result.instruction.transactionStatus)) {
      setInstruction(null);
      if (!silent) setStatusMessage(c.failed);
      return;
    }
    setInstruction(result.instruction);
    if (!silent) setStatusMessage(c.pending);
  }, [c.failed, c.pending, handleOrderStatus]);

  const loadPayment = useCallback(async () => {
    if (!user || !orderId) return;
    setLoading(true);
    setFatalError(null);
    setStatusMessage(null);
    try {
      let next = await getOrder(user, orderId);
      if (handleOrderStatus(next)) return;
      if (next.status !== "pending_payment") {
        setOrder(next);
        setStatusMessage(c.expired);
        return;
      }

      const existingProvider =
        next.payment?.provider === "doku" || next.payment?.provider === "midtrans"
          ? next.payment.provider
          : null;
      let selectedProvider = existingProvider;
      if (!selectedProvider) {
        const nextConfig = await getPaymentConfig(user);
        setConfig(nextConfig);
        if (!nextConfig.available) throw new Error(c.unavailableBody);
        selectedProvider = nextConfig.provider;
      }
      setProvider(selectedProvider);
      setOrder(next);

      if (selectedProvider === "doku") {
        if (next.payment?.provider !== "doku" || !next.payment.checkoutUrl) {
          next = await startDokuOrderPayment(user, orderId);
          setOrder(next);
        }
        const url = next.payment?.checkoutUrl;
        if (!url) throw new Error(c.unavailableBody);
        setCheckoutUrl(url);
        setInstruction(null);
        return;
      }

      setCheckoutUrl(null);
      if (next.payment?.provider === "midtrans" && next.payment.reference) {
        const result = await reconcileMidtransOrderPayment(user, orderId);
        applyMidtransResult(result, true);
      } else {
        setInstruction(null);
      }
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : c.unavailableBody);
    } finally {
      setLoading(false);
    }
  }, [applyMidtransResult, c.expired, c.unavailableBody, handleOrderStatus, orderId, user]);

  const reconcile = useCallback(async (silent = false) => {
    if (!user || !orderId || !provider || reconcileLock.current) return;
    reconcileLock.current = true;
    if (!silent) {
      setReconciling(true);
      setStatusMessage(null);
    }
    try {
      if (provider === "doku") {
        const next = await reconcileDokuOrderPayment(user, orderId);
        if (!handleOrderStatus(next) && !silent) setStatusMessage(c.pending);
      } else {
        const result = await reconcileMidtransOrderPayment(user, orderId);
        applyMidtransResult(result, silent);
      }
    } catch (error) {
      if (!silent) setStatusMessage(error instanceof Error ? error.message : c.pending);
    } finally {
      reconcileLock.current = false;
      if (!silent) setReconciling(false);
    }
  }, [applyMidtransResult, c.pending, handleOrderStatus, orderId, provider, user]);

  useEffect(() => { void loadPayment(); }, [loadPayment]);

  useEffect(() => {
    const active = provider === "doku" ? Boolean(checkoutUrl) : Boolean(instruction);
    if (!active) return;
    const timer = setInterval(() => { void reconcile(true); }, 10_000);
    return () => clearInterval(timer);
  }, [checkoutUrl, instruction, provider, reconcile]);

  useEffect(() => {
    const active = provider === "doku" ? Boolean(checkoutUrl) : Boolean(instruction);
    if (!active) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void reconcile(true);
    });
    return () => subscription.remove();
  }, [checkoutUrl, instruction, provider, reconcile]);

  if (!user) return <Redirect href="/login" />;

  async function startMethod(method: MidtransNativeMethod) {
    if (!user || !orderId || startingMethod) return;
    setStartingMethod(method);
    setFatalError(null);
    setStatusMessage(null);
    try {
      const result = await startMidtransOrderPayment(user, orderId, method);
      applyMidtransResult(result);
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : c.unavailableBody);
    } finally {
      setStartingMethod(null);
    }
  }

  function handleNavigation(url: string) {
    if (/^https?:\/\//i.test(url) || url === "about:blank") return true;
    void Linking.openURL(url).catch(() => setStatusMessage(c.externalFailed));
    return false;
  }

  async function openExternal(url: string | null) {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      setStatusMessage(c.externalFailed);
    }
  }

  function expiryText(value: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString(language === "id" ? "id-ID" : "en-US", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderMidtransContent() {
    if (!order) return null;
    if (!instruction) {
      return (
        <ScrollView contentContainerStyle={styles.nativeContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.totalCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.totalLabel, { color: theme.colors.textMuted }]}>{c.total}</Text>
            <Text style={[styles.totalValue, { color: theme.colors.text }]}>{formatRupiah(order.customerTotal)}</Text>
            <Text style={[styles.orderCode, { color: theme.colors.textMuted }]}>{order.orderCode}</Text>
          </View>

          {statusMessage ? (
            <View style={[styles.notice, { backgroundColor: theme.colors.warningSurface }]}>
              <Text style={[styles.noticeText, { color: theme.colors.warning }]}>{statusMessage}</Text>
            </View>
          ) : null}

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{c.choose}</Text>
          <Text style={[styles.sectionBody, { color: theme.colors.textMuted }]}>{c.chooseBody}</Text>
          <View style={styles.methodList}>
            {methods.map((item) => {
              const starting = startingMethod === item.method;
              return (
                <Pressable
                  key={item.method}
                  disabled={startingMethod !== null}
                  onPress={() => void startMethod(item.method)}
                  style={({ pressed }) => [
                    styles.methodCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      opacity: pressed || (startingMethod !== null && !starting) ? 0.58 : 1,
                    },
                  ]}
                >
                  <View style={[styles.methodIcon, { backgroundColor: theme.colors.surfaceAccent }]}>
                    {starting ? (
                      <ActivityIndicator color={theme.colors.primary} size="small" />
                    ) : (
                      <NitipIcon color={theme.colors.primary} name={item.method === "qris" ? "receipt" : item.method.includes("va") || item.method === "mandiri_bill" ? "office" : "cart"} size={18} />
                    )}
                  </View>
                  <View style={styles.methodCopy}>
                    <View style={styles.methodTitleRow}>
                      <Text style={[styles.methodTitle, { color: theme.colors.text }]}>{item.title}</Text>
                      {item.badge ? (
                        <View style={[styles.badge, { backgroundColor: theme.colors.surfaceAccent }]}>
                          <Text style={[styles.badgeText, { color: theme.colors.primary }]}>{item.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.methodDescription, { color: theme.colors.textMuted }]}>{item.description}</Text>
                  </View>
                  <NitipIcon color={theme.colors.textMuted} name="next" size={13} />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      );
    }

    const expiry = expiryText(instruction.expiresAt);
    const isQr = instruction.method === "qris";
    const isVa = ["bca_va", "bni_va", "bri_va"].includes(instruction.method);
    const isMandiri = instruction.method === "mandiri_bill";
    const isWallet = instruction.method === "gopay" || instruction.method === "shopeepay";

    return (
      <ScrollView contentContainerStyle={styles.nativeContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.totalCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.totalLabel, { color: theme.colors.textMuted }]}>{c.total}</Text>
          <Text style={[styles.totalValue, { color: theme.colors.text }]}>{formatRupiah(order.customerTotal)}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.warning }]} />
            <Text style={[styles.statusLabel, { color: theme.colors.textMuted }]}>{c.waiting}</Text>
          </View>
        </View>

        <View style={[styles.instructionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {isQr ? (
            <>
              <Text style={[styles.instructionTitle, { color: theme.colors.text }]}>{c.qrTitle}</Text>
              <Text style={[styles.instructionBody, { color: theme.colors.textMuted }]}>{c.qrBody}</Text>
              {instruction.qrCodeUrl ? (
                <>
                  <View style={styles.qrWrap}>
                    <Image source={{ uri: instruction.qrCodeUrl }} style={styles.qrImage} resizeMode="contain" />
                  </View>
                  <SaveQrImageButton
                    url={instruction.qrCodeUrl}
                    fileStem={order.orderCode}
                    label={c.saveQr}
                    savingLabel={c.savingQr}
                    readyMessage={c.qrReady}
                    failedMessage={c.qrSaveFailed}
                    onStatus={setStatusMessage}
                  />
                </>
              ) : null}
            </>
          ) : null}

          {isVa ? (
            <>
              <Text style={[styles.instructionTitle, { color: theme.colors.text }]}>{c.vaTitle}</Text>
              <Text style={[styles.instructionBody, { color: theme.colors.textMuted }]}>{c.vaBody}</Text>
              <Text style={[styles.bankName, { color: theme.colors.primary }]}>{instruction.bank?.toUpperCase()}</Text>
              <Text selectable style={[styles.paymentNumber, { color: theme.colors.text }]}>{instruction.vaNumber ?? "—"}</Text>
              <CopyPaymentValueButton
                value={instruction.vaNumber}
                label={c.copyVa}
                copiedMessage={c.vaCopied}
                failedMessage={c.copyFailed}
                onStatus={setStatusMessage}
              />
            </>
          ) : null}

          {isMandiri ? (
            <>
              <Text style={[styles.instructionTitle, { color: theme.colors.text }]}>{c.mandiriTitle}</Text>
              <InfoNumber label={c.biller} value={instruction.billerCode ?? "—"} />
              <InfoNumber label={c.billKey} value={instruction.billKey ?? "—"} />
              <Text style={[styles.selectableHint, { color: theme.colors.textMuted }]}>{c.selectable}</Text>
            </>
          ) : null}

          {isWallet ? (
            <>
              <Text style={[styles.instructionTitle, { color: theme.colors.text }]}>
                {instruction.method === "gopay" ? c.gopay : c.shopeepay}
              </Text>
              <Text style={[styles.instructionBody, { color: theme.colors.textMuted }]}>
                {instruction.method === "gopay" ? c.gopayBody : c.shopeepayBody}
              </Text>
              {instruction.qrCodeUrl ? (
                <View style={styles.qrWrap}>
                  <Image source={{ uri: instruction.qrCodeUrl }} style={styles.qrImage} resizeMode="contain" />
                </View>
              ) : null}
              {instruction.deeplinkUrl ? (
                <Pressable onPress={() => void openExternal(instruction.deeplinkUrl)} style={[styles.openAppButton, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.primaryText}>{c.openApp}</Text>
                  <NitipIcon color="#FFFFFF" name="next" size={14} />
                </Pressable>
              ) : null}
            </>
          ) : null}

          {expiry ? (
            <View style={[styles.expiryRow, { borderTopColor: theme.colors.border }]}>
              <NitipIcon color={theme.colors.textMuted} name="clock" size={14} />
              <Text style={[styles.expiryText, { color: theme.colors.textMuted }]}>{c.expires} {expiry}</Text>
            </View>
          ) : null}
        </View>

        {statusMessage ? <Text style={[styles.nativeStatus, { color: theme.colors.textMuted }]}>{statusMessage}</Text> : null}
        <Pressable
          disabled={reconciling}
          onPress={() => void reconcile(false)}
          style={[styles.checkButton, { backgroundColor: theme.colors.primary, opacity: reconciling ? 0.55 : 1 }]}
        >
          {reconciling ? <ActivityIndicator color="#FFFFFF" size="small" /> : <NitipIcon color="#FFFFFF" name="refresh" size={15} />}
          <Text style={styles.primaryText}>{reconciling ? c.checking : c.check}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  function InfoNumber({ label, value }: { label: string; value: string }) {
    return (
      <View style={[styles.infoNumber, { backgroundColor: theme.colors.surfaceRaised }]}>
        <Text style={[styles.infoLabel, { color: theme.colors.textMuted }]}>{label}</Text>
        <Text selectable style={[styles.infoValue, { color: theme.colors.text }]}>{value}</Text>
      </View>
    );
  }

  void config;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={{ paddingHorizontal: 18, paddingTop: insets.top + 10 }}>
        <AppHeader title={c.title} onBack={backToOrder} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={[styles.centerText, { color: theme.colors.textMuted }]}>{c.loading}</Text>
          </View>
        ) : fatalError ? (
          <View style={styles.center}>
            <View style={[styles.errorIcon, { backgroundColor: theme.colors.dangerSurface }]}>
              <NitipIcon color={theme.colors.danger} name="help" size={24} />
            </View>
            <Text style={[styles.errorTitle, { color: theme.colors.text }]}>{c.unavailable}</Text>
            <Text style={[styles.centerText, { color: theme.colors.textMuted }]}>{fatalError}</Text>
            <Pressable onPress={() => void loadPayment()} style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.primaryText}>{c.retry}</Text>
            </Pressable>
          </View>
        ) : provider === "doku" && checkoutUrl ? (
          <WebView
            source={{ uri: checkoutUrl }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={false}
            originWhitelist={["*"]}
            mixedContentMode="never"
            startInLoadingState
            renderLoading={() => (
              <View style={[styles.webLoading, { backgroundColor: theme.colors.background }]}> 
                <ActivityIndicator color={theme.colors.primary} size="large" />
                <Text style={[styles.centerText, { color: theme.colors.textMuted }]}>{c.loading}</Text>
              </View>
            )}
            onShouldStartLoadWithRequest={(request) => handleNavigation(request.url)}
            onError={() => setFatalError(c.webFailed)}
          />
        ) : provider === "midtrans" ? (
          renderMidtransContent()
        ) : (
          <View style={styles.center}>
            <NitipIcon color={theme.colors.primary} name="receipt" size={28} />
            <Text style={[styles.errorTitle, { color: theme.colors.text }]}>{statusMessage ?? c.unavailable}</Text>
          </View>
        )}
      </View>

      {provider === "doku" && checkoutUrl ? (
        <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
          {statusMessage ? <Text style={[styles.statusText, { color: theme.colors.textMuted }]}>{statusMessage}</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={backToOrder} style={[styles.action, styles.secondaryAction, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.secondaryText, { color: theme.colors.text }]}>{c.back}</Text>
            </Pressable>
            <Pressable disabled={reconciling} onPress={() => void reconcile(false)} style={[styles.action, { backgroundColor: theme.colors.primary, opacity: reconciling ? 0.55 : 1 }]}>
              {reconciling ? <ActivityIndicator color="#FFFFFF" size="small" /> : <NitipIcon color="#FFFFFF" name="refresh" size={15} />}
              <Text style={styles.primaryText}>{reconciling ? c.checking : c.check}</Text>
            </Pressable>
          </View>
        </View>
      ) : provider === "midtrans" ? (
        <View style={{ height: Math.max(insets.bottom, 8) }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1 },
  webview: { flex: 1 },
  webLoading: { alignItems: "center", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 },
  center: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 30 },
  centerText: { fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: "center" },
  errorIcon: { alignItems: "center", borderRadius: 999, height: 54, justifyContent: "center", width: 54 },
  errorTitle: { fontSize: 16, fontWeight: "900", marginTop: 14, textAlign: "center" },
  retryButton: { alignItems: "center", borderRadius: 14, justifyContent: "center", marginTop: 18, minHeight: 46, minWidth: 150, paddingHorizontal: 18 },
  footer: { borderTopWidth: 1, paddingHorizontal: 18, paddingTop: 10 },
  statusText: { fontSize: 10, lineHeight: 15, marginBottom: 8, textAlign: "center" },
  actions: { flexDirection: "row", gap: 8 },
  action: { alignItems: "center", borderRadius: 14, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 48, paddingHorizontal: 10 },
  secondaryAction: { borderWidth: 1 },
  primaryText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  secondaryText: { fontSize: 10, fontWeight: "900" },
  nativeContent: { paddingBottom: 22, paddingHorizontal: 18, paddingTop: 14 },
  totalCard: { borderRadius: 22, padding: 18 },
  totalLabel: { fontSize: 9, fontWeight: "800" },
  totalValue: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8, marginTop: 5 },
  orderCode: { fontSize: 9, fontWeight: "700", marginTop: 5 },
  statusRow: { alignItems: "center", flexDirection: "row", gap: 7, marginTop: 8 },
  statusDot: { borderRadius: 4, height: 7, width: 7 },
  statusLabel: { fontSize: 9, fontWeight: "800" },
  notice: { borderRadius: 16, marginTop: 12, padding: 12 },
  noticeText: { fontSize: 10, lineHeight: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "900", marginTop: 24 },
  sectionBody: { fontSize: 10, lineHeight: 15, marginTop: 4 },
  methodList: { gap: 9, marginTop: 14 },
  methodCard: { alignItems: "center", borderRadius: 18, borderWidth: 1, flexDirection: "row", minHeight: 72, padding: 12 },
  methodIcon: { alignItems: "center", borderRadius: 16, height: 40, justifyContent: "center", width: 40 },
  methodCopy: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  methodTitleRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  methodTitle: { fontSize: 11, fontWeight: "900" },
  methodDescription: { fontSize: 9, lineHeight: 13, marginTop: 3 },
  badge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 6, fontWeight: "900", letterSpacing: 0.4 },
  instructionCard: { borderRadius: 22, borderWidth: 1, marginTop: 14, padding: 18 },
  instructionTitle: { fontSize: 16, fontWeight: "900" },
  instructionBody: { fontSize: 10, lineHeight: 16, marginTop: 5 },
  qrWrap: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 20, marginTop: 18, padding: 14 },
  qrImage: { height: 220, width: 220 },
  bankName: { fontSize: 10, fontWeight: "900", marginTop: 20 },
  paymentNumber: { fontSize: 25, fontWeight: "900", letterSpacing: 0.6, marginTop: 5 },
  selectableHint: { fontSize: 8, lineHeight: 12, marginTop: 7 },
  infoNumber: { borderRadius: 16, marginTop: 12, padding: 14 },
  infoLabel: { fontSize: 8, fontWeight: "800" },
  infoValue: { fontSize: 20, fontWeight: "900", marginTop: 4 },
  openAppButton: { alignItems: "center", borderRadius: 15, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 18, minHeight: 50 },
  expiryRow: { alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 7, marginTop: 18, paddingTop: 13 },
  expiryText: { fontSize: 8, fontWeight: "700" },
  nativeStatus: { fontSize: 9, lineHeight: 14, marginTop: 12, textAlign: "center" },
  checkButton: { alignItems: "center", borderRadius: 15, flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 12, minHeight: 50 },
});
