import type { NitipSupportTicket } from "@nitip/domain";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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

import { AnimatedPopup, type PopupNotice } from "../components/AnimatedPopup";
import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { createDriverSupportTicket, listDriverSupportTickets } from "../lib/api";

type DriverSupportCategory = "driver" | "account" | "other";

function statusMeta(status: NitipSupportTicket["status"], language: "id" | "en") {
  const id = {
    open: ["TERBUKA", "Menunggu penanganan"],
    in_review: ["DIPROSES", "Sedang ditinjau tim Nitip"],
    resolved: ["SELESAI", "Laporan telah diselesaikan"],
  } as const;
  const en = {
    open: ["OPEN", "Waiting for support"],
    in_review: ["IN REVIEW", "Nitip is reviewing this ticket"],
    resolved: ["RESOLVED", "This ticket has been resolved"],
  } as const;
  return (language === "id" ? id : en)[status];
}

function formatDate(value: string, language: "id" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(language === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DriverSupportScreen() {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState<NitipSupportTicket[]>([]);
  const [category, setCategory] = useState<DriverSupportCategory>("driver");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<PopupNotice | null>(null);

  const c = language === "id" ? {
    title: "Pusat bantuan",
    heading: "Butuh bantuan?",
    subtitle: "Kirim laporan langsung ke Nitip dan pantau status penanganannya dari halaman ini.",
    newTicket: "BUAT LAPORAN",
    category: "Kategori",
    driver: "Driver",
    account: "Akun",
    other: "Lainnya",
    subject: "Subjek",
    subjectPlaceholder: "Contoh: perubahan data kendaraan",
    message: "Jelaskan masalah",
    messagePlaceholder: "Tuliskan detail masalah, konteks, dan bantuan yang kamu perlukan.",
    send: "Kirim laporan",
    sending: "Mengirim...",
    history: "RIWAYAT BANTUAN",
    refresh: "Refresh",
    empty: "Belum ada laporan",
    emptyBody: "Tiket yang kamu buat akan muncul di sini bersama status penanganannya.",
    sent: "Laporan terkirim",
    sentBody: "Tiket bantuan berhasil dibuat dan masuk antrean Nitip.",
    validation: "Lengkapi laporan",
    validationBody: "Subjek dan deskripsi masalah wajib diisi.",
    failed: "Pusat bantuan tidak tersedia",
    order: "Order",
  } : {
    title: "Help Center",
    heading: "Need help?",
    subtitle: "Send a report directly to Nitip and track its handling status from this page.",
    newTicket: "CREATE REPORT",
    category: "Category",
    driver: "Driver",
    account: "Account",
    other: "Other",
    subject: "Subject",
    subjectPlaceholder: "Example: vehicle data change",
    message: "Describe the issue",
    messagePlaceholder: "Add the issue details, context, and the help you need.",
    send: "Send report",
    sending: "Sending...",
    history: "SUPPORT HISTORY",
    refresh: "Refresh",
    empty: "No reports yet",
    emptyBody: "Tickets you create will appear here together with their support status.",
    sent: "Report sent",
    sentBody: "Your support ticket was created and added to Nitip's queue.",
    validation: "Complete the report",
    validationBody: "Subject and issue description are required.",
    failed: "Help Center unavailable",
    order: "Order",
  };

  const popupColors = {
    surface: theme.colors.surfaceRaised,
    border: theme.colors.border,
    text: theme.colors.text,
    textMuted: theme.colors.textMuted,
    primary: theme.colors.primary,
    success: theme.colors.success,
    danger: theme.colors.danger,
    warning: theme.colors.warning,
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setTickets(await listDriverSupportTickets(user));
    } catch (error) {
      setNotice({ id: Date.now(), tone: "error", title: c.failed, message: error instanceof Error ? error.message : c.failed });
    } finally {
      setLoading(false);
    }
  }, [c.failed, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!user) return <Redirect href="/login" />;

  async function submit() {
    if (submitting) return;
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject || !trimmedMessage) {
      setNotice({ id: Date.now(), tone: "warning", title: c.validation, message: c.validationBody });
      return;
    }

    setSubmitting(true);
    try {
      const ticket = await createDriverSupportTicket(user, {
        category,
        subject: trimmedSubject,
        message: trimmedMessage,
      });
      setTickets((current) => [ticket, ...current.filter((item) => item.id !== ticket.id)]);
      setSubject("");
      setMessage("");
      setNotice({ id: Date.now(), tone: "success", title: c.sent, message: c.sentBody });
    } catch (error) {
      setNotice({ id: Date.now(), tone: "error", title: c.failed, message: error instanceof Error ? error.message : c.failed });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AnimatedPopup colors={popupColors} notice={notice} onNoticeDismiss={() => setNotice(null)} top={insets.top + 8} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={c.title} />
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{c.heading}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>{c.newTicket}</Text>
        <View style={[styles.formCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{c.category}</Text>
          <View style={styles.categoryRow}>
            {(["driver", "account", "other"] as DriverSupportCategory[]).map((item) => {
              const selected = item === category;
              const label = item === "driver" ? c.driver : item === "account" ? c.account : c.other;
              return (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.categoryChoice,
                    {
                      backgroundColor: selected ? theme.colors.surfaceAccent : theme.colors.background,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.categoryText, { color: selected ? theme.colors.primary : theme.colors.textMuted }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{c.subject}</Text>
            <TextInput
              onChangeText={setSubject}
              placeholder={c.subjectPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
              value={subject}
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{c.message}</Text>
            <TextInput
              multiline
              onChangeText={setMessage}
              placeholder={c.messagePlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, styles.messageInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
              textAlignVertical="top"
              value={message}
            />
          </View>
          <Pressable disabled={submitting} onPress={() => void submit()} style={[styles.primaryButton, { backgroundColor: theme.colors.primary, opacity: submitting ? 0.55 : 1 }]}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <NitipIcon color="#FFFFFF" name="help" size={16} />}
            <Text style={styles.primaryText}>{submitting ? c.sending : c.send}</Text>
          </Pressable>
        </View>

        <View style={styles.historyHeader}>
          <Text style={[styles.sectionLabel, styles.historyLabel, { color: theme.colors.textMuted }]}>{c.history}</Text>
          <Pressable disabled={loading} onPress={() => void load()} style={[styles.refreshButton, { backgroundColor: theme.colors.surfaceAccent }]}>
            {loading ? <ActivityIndicator color={theme.colors.primary} size="small" /> : <NitipIcon color={theme.colors.primary} name="refresh" size={14} />}
            <Text style={[styles.refreshText, { color: theme.colors.primary }]}>{c.refresh}</Text>
          </Pressable>
        </View>

        {loading && tickets.length === 0 ? (
          <View style={styles.loading}><ActivityIndicator color={theme.colors.primary} /></View>
        ) : tickets.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceAccent }]}><NitipIcon color={theme.colors.primary} name="help" size={22} /></View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{c.empty}</Text>
            <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{c.emptyBody}</Text>
          </View>
        ) : (
          <View style={styles.ticketList}>
            {tickets.map((ticket) => {
              const [statusTitle, statusBody] = statusMeta(ticket.status, language);
              const statusColor = ticket.status === "resolved" ? theme.colors.success : ticket.status === "in_review" ? theme.colors.primary : theme.colors.warning;
              return (
                <View key={ticket.id} style={[styles.ticketCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={styles.ticketTop}>
                    <View style={[styles.ticketStatus, { backgroundColor: theme.colors.surfaceAccent }]}><View style={[styles.statusDot, { backgroundColor: statusColor }]} /><Text style={[styles.statusText, { color: statusColor }]}>{statusTitle}</Text></View>
                    <Text style={[styles.ticketDate, { color: theme.colors.textMuted }]}>{formatDate(ticket.createdAt, language)}</Text>
                  </View>
                  <Text style={[styles.ticketSubject, { color: theme.colors.text }]}>{ticket.subject}</Text>
                  <Text numberOfLines={4} style={[styles.ticketMessage, { color: theme.colors.textMuted }]}>{ticket.message}</Text>
                  <View style={[styles.ticketMeta, { backgroundColor: theme.colors.secondary }]}>
                    <Text style={[styles.ticketMetaText, { color: theme.colors.textMuted }]}>{ticket.category.toUpperCase()}</Text>
                    {ticket.orderCode ? <Text style={[styles.ticketMetaText, { color: theme.colors.textMuted }]}>{c.order} {ticket.orderCode}</Text> : null}
                  </View>
                  <Text style={[styles.statusBody, { color: theme.colors.textMuted }]}>{statusBody}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 44, paddingHorizontal: 20 },
  hero: { marginTop: 24 },
  heroTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8 },
  heroSubtitle: { fontSize: 10, lineHeight: 17, marginTop: 6 },
  sectionLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 1.1, marginTop: 26 },
  formCard: { borderRadius: 22, borderWidth: 1, gap: 14, marginTop: 10, padding: 14 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 8, fontWeight: "800" },
  categoryRow: { flexDirection: "row", gap: 7 },
  categoryChoice: { alignItems: "center", borderRadius: 14, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 42, paddingHorizontal: 8 },
  categoryText: { fontSize: 8, fontWeight: "900" },
  input: { borderRadius: 15, borderWidth: 1, fontSize: 10, fontWeight: "700", minHeight: 48, paddingHorizontal: 13, paddingVertical: 11 },
  messageInput: { minHeight: 112 },
  primaryButton: { alignItems: "center", borderRadius: 17, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 52, paddingHorizontal: 16 },
  primaryText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  historyHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  historyLabel: { flex: 1 },
  refreshButton: { alignItems: "center", borderRadius: 13, flexDirection: "row", gap: 5, minHeight: 34, paddingHorizontal: 10 },
  refreshText: { fontSize: 8, fontWeight: "900" },
  loading: { alignItems: "center", justifyContent: "center", minHeight: 120 },
  emptyCard: { alignItems: "center", borderRadius: 22, borderWidth: 1, marginTop: 10, padding: 22 },
  emptyIcon: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  emptyTitle: { fontSize: 12, fontWeight: "900", marginTop: 12 },
  emptyBody: { fontSize: 9, lineHeight: 14, marginTop: 5, textAlign: "center" },
  ticketList: { gap: 9, marginTop: 10 },
  ticketCard: { borderRadius: 20, borderWidth: 1, padding: 13 },
  ticketTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  ticketStatus: { alignItems: "center", borderRadius: 999, flexDirection: "row", gap: 5, paddingHorizontal: 8, paddingVertical: 5 },
  statusDot: { borderRadius: 4, height: 7, width: 7 },
  statusText: { fontSize: 7, fontWeight: "900" },
  ticketDate: { fontSize: 7, fontWeight: "700" },
  ticketSubject: { fontSize: 11, fontWeight: "900", marginTop: 11 },
  ticketMessage: { fontSize: 9, lineHeight: 14, marginTop: 4 },
  ticketMeta: { alignItems: "center", borderRadius: 12, flexDirection: "row", justifyContent: "space-between", marginTop: 10, minHeight: 32, paddingHorizontal: 9 },
  ticketMetaText: { fontSize: 7, fontWeight: "800" },
  statusBody: { fontSize: 8, fontWeight: "700", marginTop: 8 },
});
