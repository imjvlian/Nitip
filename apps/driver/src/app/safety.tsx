import type { NitipDriverOrder } from "@nitip/domain/driver";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPopup, type PopupNotice } from "../components/AnimatedPopup";
import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { createDriverSupportTicket, getCurrentDriverOrder } from "../lib/api";

export default function SafetyScreen() {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<NitipDriverOrder | null>(null);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<PopupNotice | null>(null);
  const [confirmEmergency, setConfirmEmergency] = useState(false);

  const c = language === "id" ? {
    title: "Safety Center", heading: "Bantuan saat perjalanan.", subtitle: "Gunakan SOS untuk keadaan darurat. Untuk masalah operasional, kirim laporan agar tercatat oleh tim Nitip.",
    sos: "Hubungi 112", sosBody: "Nomor darurat nasional Indonesia", customer: "Telepon customer", customerBody: "Hubungi penerima pada order aktif", share: "Bagikan perjalanan", shareBody: "Bagikan kode order dan tujuan ke kontak tepercaya", report: "Laporkan masalah", reportBody: "Jelaskan kendala, insiden, merchant, atau customer pada perjalanan ini.", placeholder: "Contoh: customer tidak dapat dihubungi / lokasi tidak aman...", send: "Kirim laporan", sent: "Laporan berhasil dikirim ke Support Nitip.", noOrder: "Tidak ada perjalanan aktif saat ini.", emergencyTitle: "Hubungi layanan darurat?", emergencyBody: "Gunakan 112 hanya untuk keadaan darurat yang membutuhkan bantuan segera.", cancel: "Batal", call: "Hubungi", reportFailed: "Laporan gagal dikirim", shareFailed: "Perjalanan gagal dibagikan",
  } : {
    title: "Safety Center", heading: "Help during a trip.", subtitle: "Use SOS for emergencies. For operational issues, send a report so Nitip Support has a record.",
    sos: "Call 112", sosBody: "Indonesia national emergency number", customer: "Call customer", customerBody: "Contact the recipient of your active order", share: "Share trip", shareBody: "Share order code and destination with a trusted contact", report: "Report an issue", reportBody: "Describe a safety, merchant, customer, or trip issue.", placeholder: "Example: customer unreachable / unsafe location...", send: "Send report", sent: "Report sent to Nitip Support.", noOrder: "There is no active trip right now.", emergencyTitle: "Call emergency services?", emergencyBody: "Use 112 only for emergencies requiring immediate help.", cancel: "Cancel", call: "Call", reportFailed: "Report could not be sent", shareFailed: "Trip could not be shared",
  };

  function showNotice(tone: PopupNotice["tone"], title: string, message?: string | null) {
    setNotice({ id: Date.now(), tone, title, message, durationMs: tone === "error" ? 3200 : 2400 });
  }

  useEffect(() => {
    if (!user) return;
    let active = true;
    getCurrentDriverOrder(user)
      .then((next) => { if (active) setOrder(next); })
      .catch(() => { if (active) setOrder(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  if (!user) return <Redirect href="/login" />;

  async function shareTrip() {
    if (!order) return;
    try {
      await Share.share({ message: `Nitip ${order.orderCode}\n${order.pickup.outletName} → ${order.destination.recipientName}\n${order.destination.addressLine}` });
    } catch (e) {
      showNotice("error", c.shareFailed, e instanceof Error ? e.message : null);
    }
  }

  async function sendReport() {
    const text = report.trim();
    if (!text) return;
    setSending(true);
    try {
      await createDriverSupportTicket(user, { category: "driver", subject: order ? `Driver incident ${order.orderCode}` : "Driver safety report", message: text, orderCode: order?.orderCode ?? null });
      setReport("");
      showNotice("success", c.sent);
    } catch (e) {
      showNotice("error", c.reportFailed, e instanceof Error ? e.message : null);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <AnimatedPopup
        colors={theme.colors}
        notice={notice}
        confirmation={confirmEmergency ? {
          visible: true,
          tone: "error",
          title: c.emergencyTitle,
          message: c.emergencyBody,
          confirmLabel: c.call,
          cancelLabel: c.cancel,
          destructive: true,
        } : null}
        top={insets.top + 8}
        onNoticeDismiss={() => setNotice(null)}
        onCancel={() => setConfirmEmergency(false)}
        onConfirm={() => {
          setConfirmEmergency(false);
          void Linking.openURL("tel:112").catch((e: unknown) => {
            showNotice("error", c.sos, e instanceof Error ? e.message : null);
          });
        }}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AppHeader title={c.title} onBack={() => router.back()} />
        <View style={styles.hero}><View style={[styles.heroIcon, { backgroundColor: theme.colors.dangerSurface }]}><NitipIcon color={theme.colors.danger} name="safety" size={25} /></View><Text style={[styles.heading, { color: theme.colors.text }]}>{c.heading}</Text><Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text></View>

        <Pressable onPress={() => setConfirmEmergency(true)} style={[styles.sos, { backgroundColor: theme.colors.danger }]}><NitipIcon color="#FFFFFF" name="phone" size={20} /><View style={styles.sosCopy}><Text style={styles.sosTitle}>{c.sos}</Text><Text style={styles.sosBody}>{c.sosBody}</Text></View></Pressable>

        {loading ? <View style={styles.loading}><ActivityIndicator color={theme.colors.primary} /></View> : order ? (
          <View style={[styles.tripCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[styles.tripLabel, { color: theme.colors.primary }]}>ACTIVE TRIP</Text><Text style={[styles.tripCode, { color: theme.colors.text }]}>{order.orderCode}</Text><Text style={[styles.tripAddress, { color: theme.colors.textMuted }]}>{order.destination.addressLine}</Text></View>
        ) : <Text style={[styles.noOrder, { color: theme.colors.textMuted }]}>{c.noOrder}</Text>}

        <View style={styles.actions}>
          <Action icon="phone" title={c.customer} body={c.customerBody} disabled={!order?.destination.phoneNumber} onPress={() => { if (order?.destination.phoneNumber) void Linking.openURL(`tel:${order.destination.phoneNumber}`); }} />
          <Action icon="share" title={c.share} body={c.shareBody} disabled={!order} onPress={() => void shareTrip()} />
        </View>

        <View style={[styles.reportCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><View style={styles.reportHead}><View style={[styles.reportIcon, { backgroundColor: theme.colors.surfaceAccent }]}><NitipIcon color={theme.colors.primary} name="help" size={18} /></View><View style={styles.reportCopy}><Text style={[styles.reportTitle, { color: theme.colors.text }]}>{c.report}</Text><Text style={[styles.reportBody, { color: theme.colors.textMuted }]}>{c.reportBody}</Text></View></View><TextInput multiline maxLength={2000} onChangeText={setReport} placeholder={c.placeholder} placeholderTextColor={theme.colors.textMuted} style={[styles.input, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, color: theme.colors.text }]} textAlignVertical="top" value={report} /><Pressable disabled={sending || !report.trim()} onPress={() => void sendReport()} style={[styles.send, { backgroundColor: theme.colors.primary, opacity: sending || !report.trim() ? 0.45 : 1 }]}>{sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sendText}>{c.send}</Text>}</Pressable></View>
      </ScrollView>
    </View>
  );

  function Action({ icon, title, body, onPress, disabled = false }: { icon: "phone" | "share"; title: string; body: string; onPress: () => void; disabled?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} style={[styles.action, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: disabled ? 0.45 : 1 }]}><View style={[styles.actionIcon, { backgroundColor: theme.colors.surfaceAccent }]}><NitipIcon color={theme.colors.primary} name={icon} size={18} /></View><Text style={[styles.actionTitle, { color: theme.colors.text }]}>{title}</Text><Text style={[styles.actionBody, { color: theme.colors.textMuted }]}>{body}</Text></Pressable>; }
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 40, paddingHorizontal: 20 }, hero: { alignItems: "flex-start", marginTop: 26 }, heroIcon: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 }, heading: { fontSize: 27, fontWeight: "900", letterSpacing: -0.8, marginTop: 15 }, subtitle: { fontSize: 10, lineHeight: 17, marginTop: 6, maxWidth: 340 },
  sos: { alignItems: "center", borderRadius: 20, flexDirection: "row", marginTop: 22, minHeight: 72, paddingHorizontal: 18 }, sosCopy: { flex: 1, paddingLeft: 12 }, sosTitle: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" }, sosBody: { color: "rgba(255,255,255,.82)", fontSize: 8, marginTop: 3 }, loading: { alignItems: "center", padding: 22 }, tripCard: { borderRadius: 18, borderWidth: 1, marginTop: 14, padding: 14 }, tripLabel: { fontSize: 7, fontWeight: "900", letterSpacing: 0.7 }, tripCode: { fontSize: 15, fontWeight: "900", marginTop: 4 }, tripAddress: { fontSize: 8, lineHeight: 13, marginTop: 4 }, noOrder: { fontSize: 9, marginTop: 15, textAlign: "center" },
  actions: { flexDirection: "row", gap: 9, marginTop: 18 }, action: { borderRadius: 18, borderWidth: 1, flex: 1, minHeight: 130, padding: 13 }, actionIcon: { alignItems: "center", borderRadius: 19, height: 38, justifyContent: "center", width: 38 }, actionTitle: { fontSize: 10, fontWeight: "900", marginTop: 11 }, actionBody: { fontSize: 8, lineHeight: 13, marginTop: 5 },
  reportCard: { borderRadius: 20, borderWidth: 1, marginTop: 18, padding: 15 }, reportHead: { alignItems: "flex-start", flexDirection: "row" }, reportIcon: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 }, reportCopy: { flex: 1, paddingLeft: 11 }, reportTitle: { fontSize: 11, fontWeight: "900" }, reportBody: { fontSize: 8, lineHeight: 13, marginTop: 4 }, input: { borderRadius: 16, borderWidth: 1, fontSize: 10, lineHeight: 16, marginTop: 14, minHeight: 110, padding: 13 }, send: { alignItems: "center", borderRadius: 16, justifyContent: "center", marginTop: 11, minHeight: 48 }, sendText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
});
