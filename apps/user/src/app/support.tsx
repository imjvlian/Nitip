import type { NitipSupportTicket, SupportTicketCategory } from "@nitip/domain";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { createSupportTicket, listSupportTickets } from "../lib/api";

const CATEGORIES: SupportTicketCategory[] = ["order", "payment", "driver", "merchant", "account", "other"];

const COPY = {
  id: {
    title: "Bantuan & laporan", heading: "Ada yang bisa kami bantu?", description: "Kirim laporan ke tim Nitip. Tiket tersimpan di akunmu dan terhubung ke kode pesanan bila tersedia.", category: "Kategori",
    categoryLabels: { order: "Pesanan", payment: "Pembayaran", driver: "Driver", merchant: "Merchant", account: "Akun", other: "Lainnya" },
    subject: "Judul laporan", subjectPlaceholder: "Ringkas masalahmu", orderCode: "Kode pesanan (opsional)", orderCodePlaceholder: "Contoh NTP-12345678", message: "Ceritakan masalahnya", messagePlaceholder: "Jelaskan apa yang terjadi dan bantuan yang kamu butuhkan.", send: "Kirim laporan", sending: "Mengirim...", sent: "Laporan berhasil dikirim.", history: "Riwayat laporan", noHistory: "Belum ada laporan.", loading: "Memuat laporan...", loadError: "Gagal memuat laporan", sendError: "Gagal mengirim laporan", required: "Pilih kategori, isi judul, dan jelaskan masalah terlebih dahulu.", status: { open: "Terbuka", in_review: "Ditinjau", resolved: "Selesai" }, orderSubject: "Masalah pesanan",
  },
  en: {
    title: "Help & reports", heading: "How can we help?", description: "Send a report to Nitip. Tickets stay in your account and link to an order code when available.", category: "Category",
    categoryLabels: { order: "Order", payment: "Payment", driver: "Driver", merchant: "Merchant", account: "Account", other: "Other" },
    subject: "Report subject", subjectPlaceholder: "Summarize the issue", orderCode: "Order code (optional)", orderCodePlaceholder: "Example NTP-12345678", message: "Describe the issue", messagePlaceholder: "Explain what happened and what help you need.", send: "Send report", sending: "Sending...", sent: "Report sent successfully.", history: "Report history", noHistory: "No reports yet.", loading: "Loading reports...", loadError: "Failed to load reports", sendError: "Failed to send report", required: "Choose a category, add a subject, and describe the issue first.", status: { open: "Open", in_review: "In review", resolved: "Resolved" }, orderSubject: "Order issue",
  },
} as const;

function formatTime(value: string, language: "id" | "en") {
  return new Date(value).toLocaleString(language === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SupportScreen() {
  const { orderCode: routeOrderCode } = useLocalSearchParams<{ orderCode?: string }>();
  const { language } = useNitipLanguage();
  const copy = COPY[language];
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState<NitipSupportTicket[]>([]);
  const [category, setCategory] = useState<SupportTicketCategory>("order");
  const [subject, setSubject] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = typeof routeOrderCode === "string" ? routeOrderCode.trim() : "";
    if (!code) return;
    setCategory("order"); setOrderCode(code); setSubject((current) => current || `${copy.orderSubject} ${code}`);
  }, [copy.orderSubject, routeOrderCode]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    listSupportTickets(user).then((items) => { if (active) setTickets(items); }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : copy.loadError); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [copy.loadError, user]);

  if (!user) return <Redirect href="/login" />;

  async function submit() {
    if (!subject.trim() || !message.trim()) { setError(copy.required); return; }
    if (sending) return;
    setSending(true); setSent(false); setError(null);
    try {
      const ticket = await createSupportTicket(user, { category, subject: subject.trim(), message: message.trim(), orderCode: orderCode.trim() || null });
      setTickets((current) => [ticket, ...current]); setSubject(""); setMessage(""); setSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : copy.sendError); }
    finally { setSending(false); }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 28, 40), backgroundColor: theme.colors.background }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <AppHeader title={copy.title} />
      <View className="mt-7"><Text className="text-[26px] font-black tracking-tighter" style={{ color: theme.colors.text }}>{copy.heading}</Text><Text className="mt-1.5 text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>{copy.description}</Text></View>
      <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>{copy.category}</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">{CATEGORIES.map((item) => { const selected = item === category; return <Pressable className="rounded-full px-3 py-2.5" key={item} onPress={() => setCategory(item)} style={{ backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceRaised }}><Text className="text-[10px] font-black" style={{ color: selected ? "#FFFFFF" : theme.colors.text }}>{copy.categoryLabels[item]}</Text></Pressable>; })}</View>
        <Field label={copy.subject}><TextInput className="rounded-[16px] px-4 py-4 text-sm" maxLength={120} onChangeText={setSubject} placeholder={copy.subjectPlaceholder} placeholderTextColor={theme.colors.textMuted} style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} value={subject} /></Field>
        <Field label={copy.orderCode}><TextInput autoCapitalize="characters" className="rounded-[16px] px-4 py-4 text-sm" maxLength={50} onChangeText={setOrderCode} placeholder={copy.orderCodePlaceholder} placeholderTextColor={theme.colors.textMuted} style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} value={orderCode} /></Field>
        <Field label={copy.message}><TextInput className="min-h-[120px] rounded-[16px] px-4 py-4 text-sm" maxLength={2000} multiline onChangeText={setMessage} placeholder={copy.messagePlaceholder} placeholderTextColor={theme.colors.textMuted} style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} textAlignVertical="top" value={message} /></Field>
        {sent ? <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.successSurface }}><Text className="text-[10px] leading-4" style={{ color: theme.colors.success }}>{copy.sent}</Text></View> : null}
        {error ? <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}><Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text></View> : null}
        <Pressable className="mt-5 min-h-[50px] flex-row items-center justify-center gap-2 rounded-[16px]" disabled={sending} onPress={() => void submit()} style={{ backgroundColor: theme.colors.primary, opacity: sending ? 0.55 : 1 }}>{sending ? <ActivityIndicator color="#FFFFFF" /> : <NitipIcon color="#FFFFFF" name="help" size={17} />}<Text className="text-xs font-black text-white">{sending ? copy.sending : copy.send}</Text></Pressable>
      </View>

      <Text className="mt-8 text-base font-black" style={{ color: theme.colors.text }}>{copy.history}</Text>
      {loading ? <View className="mt-3 items-center rounded-[20px] p-5" style={{ backgroundColor: theme.colors.surface }}><ActivityIndicator color={theme.colors.primary} /><Text className="mt-2 text-[9px]" style={{ color: theme.colors.textMuted }}>{copy.loading}</Text></View> : tickets.length === 0 ? <View className="mt-3 items-center rounded-[20px] p-6" style={{ backgroundColor: theme.colors.surface }}><NitipIcon color={theme.colors.textMuted} name="help" size={20} /><Text className="mt-2 text-[10px]" style={{ color: theme.colors.textMuted }}>{copy.noHistory}</Text></View> : <View className="mt-3 gap-2.5">{tickets.map((ticket) => <View className="rounded-[20px] p-4" key={ticket.id} style={{ backgroundColor: theme.colors.surface }}><View className="flex-row items-start justify-between gap-3"><View className="flex-1"><Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>{copy.categoryLabels[ticket.category]}</Text><Text className="mt-1 text-[11px] font-black" style={{ color: theme.colors.text }}>{ticket.subject}</Text></View><View className="rounded-full px-2.5 py-1.5" style={{ backgroundColor: theme.colors.surfaceRaised }}><Text className="text-[8px] font-black" style={{ color: theme.colors.textMuted }}>{copy.status[ticket.status]}</Text></View></View><Text className="mt-2 text-[9px] leading-4" numberOfLines={3} style={{ color: theme.colors.textMuted }}>{ticket.message}</Text><Text className="mt-2 text-[8px]" style={{ color: theme.colors.textMuted }}>{ticket.orderCode ? `${ticket.orderCode} · ` : ""}{formatTime(ticket.createdAt, language)}</Text></View>)}</View>}
    </ScrollView>
  );

  function Field({ label, children }: { label: string; children: React.ReactNode }) { return <View className="mt-4"><Text className="mb-2 text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>{label}</Text>{children}</View>; }
}
