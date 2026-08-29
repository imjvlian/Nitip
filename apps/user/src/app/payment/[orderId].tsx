import type { NitipOrder } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { AppHeader } from "../../components/AppHeader";
import { NitipIcon } from "../../components/NitipIcon";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { getOrder, reconcileDokuOrderPayment, startDokuOrderPayment } from "../../lib/api";

export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();
  const { language } = useNitipLanguage();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const reconcileLock = useRef(false);
  const [order, setOrder] = useState<NitipOrder | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const c = language === "id" ? {
    title: "Pembayaran",
    loading: "Menyiapkan halaman pembayaran...",
    unavailable: "Halaman pembayaran belum tersedia",
    retry: "Coba lagi",
    back: "Kembali ke pesanan",
    check: "Cek status",
    checking: "Mengecek...",
    pending: "Pembayaran masih menunggu konfirmasi DOKU.",
    paid: "Pembayaran berhasil dikonfirmasi.",
    expired: "Sesi pembayaran sudah berakhir.",
    externalFailed: "Aplikasi pembayaran tidak dapat dibuka dari perangkat ini.",
    webFailed: "Halaman DOKU tidak dapat dimuat. Periksa koneksi lalu coba lagi.",
  } : {
    title: "Payment",
    loading: "Preparing payment page...",
    unavailable: "Payment page is not available yet",
    retry: "Try again",
    back: "Back to order",
    check: "Check status",
    checking: "Checking...",
    pending: "Payment is still awaiting confirmation from DOKU.",
    paid: "Payment has been confirmed.",
    expired: "The payment session has expired.",
    externalFailed: "The payment app could not be opened on this device.",
    webFailed: "The DOKU page could not be loaded. Check your connection and try again.",
  };

  const backToOrder = useCallback(() => {
    if (!orderId) {
      router.replace("/orders");
      return;
    }
    router.replace({ pathname: "/order/[id]", params: { id: orderId } });
  }, [orderId]);

  const loadCheckout = useCallback(async () => {
    if (!user || !orderId) return;
    setLoading(true);
    setFatalError(null);
    setStatusMessage(null);
    try {
      let next = await getOrder(user, orderId);
      if (next.status !== "pending_payment") {
        setOrder(next);
        if (next.status === "paid") setStatusMessage(c.paid);
        else setStatusMessage(c.expired);
        setCheckoutUrl(null);
        return;
      }
      if (next.payment?.provider !== "doku" || !next.payment.checkoutUrl) {
        next = await startDokuOrderPayment(user, orderId);
      }
      const url = next.payment?.checkoutUrl;
      if (!url) throw new Error(c.unavailable);
      setOrder(next);
      setCheckoutUrl(url);
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : c.unavailable);
    } finally {
      setLoading(false);
    }
  }, [c.expired, c.paid, c.unavailable, orderId, user]);

  const reconcile = useCallback(async (silent = false) => {
    if (!user || !orderId || !checkoutUrl || reconcileLock.current) return;
    reconcileLock.current = true;
    if (!silent) {
      setReconciling(true);
      setStatusMessage(null);
    }
    try {
      const next = await reconcileDokuOrderPayment(user, orderId);
      setOrder(next);
      if (next.status === "paid") {
        setStatusMessage(c.paid);
        setCheckoutUrl(null);
        setTimeout(() => backToOrder(), 450);
      } else if (next.status === "cancelled" || next.payment?.status === "expired") {
        setStatusMessage(c.expired);
        setCheckoutUrl(null);
      } else if (!silent) {
        setStatusMessage(c.pending);
      }
    } catch (error) {
      if (!silent) setStatusMessage(error instanceof Error ? error.message : c.pending);
    } finally {
      reconcileLock.current = false;
      if (!silent) setReconciling(false);
    }
  }, [backToOrder, c.expired, c.paid, c.pending, checkoutUrl, orderId, user]);

  useEffect(() => { void loadCheckout(); }, [loadCheckout]);

  useEffect(() => {
    if (!checkoutUrl) return;
    const timer = setInterval(() => { void reconcile(true); }, 10_000);
    return () => clearInterval(timer);
  }, [checkoutUrl, reconcile]);

  useEffect(() => {
    if (!checkoutUrl) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void reconcile(true);
    });
    return () => subscription.remove();
  }, [checkoutUrl, reconcile]);

  if (!user) return <Redirect href="/login" />;

  function handleNavigation(url: string) {
    if (/^https?:\/\//i.test(url) || url === "about:blank") return true;
    void Linking.openURL(url).catch(() => setStatusMessage(c.externalFailed));
    return false;
  }

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
            <Pressable onPress={() => void loadCheckout()} style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.primaryText}>{c.retry}</Text>
            </Pressable>
          </View>
        ) : checkoutUrl ? (
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
        ) : (
          <View style={styles.center}>
            <NitipIcon color={theme.colors.primary} name="receipt" size={28} />
            <Text style={[styles.errorTitle, { color: theme.colors.text }]}>{statusMessage ?? c.unavailable}</Text>
          </View>
        )}
      </View>

      <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        {statusMessage ? <Text style={[styles.statusText, { color: theme.colors.textMuted }]}>{statusMessage}</Text> : null}
        <View style={styles.actions}>
          <Pressable onPress={backToOrder} style={[styles.action, styles.secondaryAction, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.secondaryText, { color: theme.colors.text }]}>{c.back}</Text>
          </Pressable>
          {checkoutUrl ? (
            <Pressable disabled={reconciling} onPress={() => void reconcile(false)} style={[styles.action, { backgroundColor: theme.colors.primary, opacity: reconciling ? 0.55 : 1 }]}>
              {reconciling ? <ActivityIndicator color="#FFFFFF" size="small" /> : <NitipIcon color="#FFFFFF" name="refresh" size={15} />}
              <Text style={styles.primaryText}>{reconciling ? c.checking : c.check}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
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
});
