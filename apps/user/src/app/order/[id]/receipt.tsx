import { formatRupiah } from "@nitip/domain";
import type { NitipOrder } from "@nitip/domain/commerce";
import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../../components/AppHeader";
import { NitipIcon } from "../../../components/NitipIcon";
import { useAuth } from "../../../context/AuthContext";
import { useNitipTheme } from "../../../hooks/useNitipTheme";
import { getOrder } from "../../../lib/api";

const copy = {
  id: {
    title: "Receipt",
    eyebrow: "BUKTI TRANSAKSI",
    heading: "Receipt pesanan",
    description: "Ringkasan transaksi berdasarkan data pesanan Nitip.",
    loading: "Memuat receipt...",
    loadError: "Gagal memuat receipt",
    unavailable: "Receipt belum tersedia",
    unavailableDescription: "Receipt tersedia setelah pembayaran berhasil.",
    orderCode: "Kode pesanan",
    orderDate: "Tanggal pesanan",
    merchant: "Merchant",
    outlet: "Outlet",
    status: "Status",
    items: "Rincian pesanan",
    delivery: "Pengantaran",
    payment: "Ringkasan pembayaran",
    paymentConfirmed: "Pembayaran terkonfirmasi",
    refunded: "Pembayaran direfund",
    savePdf: "Simpan receipt PDF",
    savingPdf: "Membuat PDF...",
    saveError: "Gagal membuat atau menyimpan receipt PDF.",
    sharingUnavailable: "Fitur simpan/bagikan file tidak tersedia di perangkat ini.",
    footer: "Receipt ini bukan faktur pajak. Data pembayaran provider akan ditambahkan saat payment gateway production aktif.",
    notes: "Catatan",
  },
  en: {
    title: "Receipt",
    eyebrow: "TRANSACTION RECEIPT",
    heading: "Order receipt",
    description: "Transaction summary based on Nitip order data.",
    loading: "Loading receipt...",
    loadError: "Failed to load receipt",
    unavailable: "Receipt is not available yet",
    unavailableDescription: "A receipt becomes available after payment succeeds.",
    orderCode: "Order code",
    orderDate: "Order date",
    merchant: "Merchant",
    outlet: "Outlet",
    status: "Status",
    items: "Order details",
    delivery: "Delivery",
    payment: "Payment summary",
    paymentConfirmed: "Payment confirmed",
    refunded: "Payment refunded",
    savePdf: "Save receipt PDF",
    savingPdf: "Creating PDF...",
    saveError: "Failed to create or save the receipt PDF.",
    sharingUnavailable: "File saving/sharing is not available on this device.",
    footer: "This receipt is not a tax invoice. Payment-provider details will be added when the production payment gateway is enabled.",
    notes: "Notes",
  },
} as const;

const receiptStatuses: readonly NitipOrder["status"][] = [
  "paid",
  "merchant_confirmed",
  "preparing",
  "ready_for_pickup",
  "driver_assigned",
  "picked_up",
  "on_delivery",
  "delivered",
  "refunded",
];

function receiptAvailable(status: NitipOrder["status"]) {
  return receiptStatuses.includes(status);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string, language: "id" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(language === "en" ? "en-US" : "id-ID", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createReceiptHtml(
  order: NitipOrder,
  language: "id" | "en",
  statusLabel: string,
) {
  const c = copy[language];
  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escapeHtml(item.name)}</strong><br />
            <span>${item.quantity} × ${escapeHtml(formatRupiah(item.unitPrice))}</span>
          </td>
          <td class="amount">${escapeHtml(formatRupiah(item.lineTotal))}</td>
        </tr>`,
    )
    .join("");

  const note = order.address.notes
    ? `<div class="note"><strong>${escapeHtml(c.notes)}:</strong> ${escapeHtml(order.address.notes)}</div>`
    : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 36px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #151821; background: #ffffff; }
    .brand { color: #2448F5; font-size: 28px; font-weight: 900; letter-spacing: -1px; margin-bottom: 28px; }
    .eyebrow { color: #2448F5; font-size: 10px; font-weight: 800; letter-spacing: 1.2px; }
    h1 { font-size: 26px; margin: 6px 0 5px; letter-spacing: -0.6px; }
    .muted { color: #6E7482; font-size: 11px; line-height: 1.55; }
    .meta { margin-top: 24px; padding: 18px; background: #F5F6F8; border-radius: 16px; }
    .meta-row, .total-row { display: flex; justify-content: space-between; gap: 20px; margin: 8px 0; }
    .label { color: #777E8D; font-size: 11px; }
    .value { font-size: 11px; font-weight: 700; text-align: right; }
    h2 { font-size: 14px; margin: 26px 0 10px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 10px 0; border-bottom: 1px solid #ECEEF2; font-size: 11px; vertical-align: top; }
    td span { color: #777E8D; font-size: 10px; }
    .amount { text-align: right; font-weight: 700; white-space: nowrap; }
    .address { background: #F5F6F8; padding: 16px; border-radius: 16px; font-size: 11px; line-height: 1.55; }
    .address strong { font-size: 12px; }
    .note { margin-top: 8px; color: #777E8D; }
    .payment { background: #F5F6F8; padding: 16px; border-radius: 16px; }
    .divider { border-top: 1px solid #DDE1E8; margin: 12px 0; }
    .grand { font-size: 16px; font-weight: 900; color: #2448F5; }
    .confirmed { margin-top: 14px; display: inline-block; padding: 7px 10px; border-radius: 999px; background: #E9F8EF; color: #167543; font-size: 9px; font-weight: 800; }
    .footer { margin-top: 34px; padding-top: 16px; border-top: 1px solid #ECEEF2; color: #8B91A0; font-size: 9px; line-height: 1.55; }
  </style>
</head>
<body>
  <div class="brand">nitip.</div>
  <div class="eyebrow">${escapeHtml(c.eyebrow)}</div>
  <h1>${escapeHtml(c.heading)}</h1>
  <div class="muted">${escapeHtml(c.description)}</div>

  <div class="meta">
    <div class="meta-row"><span class="label">${escapeHtml(c.orderCode)}</span><span class="value">${escapeHtml(order.orderCode)}</span></div>
    <div class="meta-row"><span class="label">${escapeHtml(c.orderDate)}</span><span class="value">${escapeHtml(formatDate(order.createdAt, language))}</span></div>
    <div class="meta-row"><span class="label">${escapeHtml(c.merchant)}</span><span class="value">${escapeHtml(order.businessName)}</span></div>
    <div class="meta-row"><span class="label">${escapeHtml(c.outlet)}</span><span class="value">${escapeHtml(order.outletName)}</span></div>
    <div class="meta-row"><span class="label">${escapeHtml(c.status)}</span><span class="value">${escapeHtml(statusLabel)}</span></div>
  </div>

  <h2>${escapeHtml(c.items)}</h2>
  <table>${itemRows}</table>

  <h2>${escapeHtml(c.delivery)}</h2>
  <div class="address">
    <strong>${escapeHtml(order.address.recipientName)}</strong><br />
    ${escapeHtml(order.address.phoneNumber)}<br />
    ${escapeHtml(order.address.addressLine)}
    ${note}
  </div>

  <h2>${escapeHtml(c.payment)}</h2>
  <div class="payment">
    <div class="total-row"><span class="label">Subtotal</span><span class="value">${escapeHtml(formatRupiah(order.subtotal))}</span></div>
    <div class="total-row"><span class="label">${escapeHtml(language === "en" ? "Delivery fee" : "Ongkir")}</span><span class="value">${escapeHtml(formatRupiah(order.deliveryFare))}</span></div>
    <div class="total-row"><span class="label">${escapeHtml(language === "en" ? "Service fee" : "Biaya layanan")}</span><span class="value">${escapeHtml(formatRupiah(order.serviceFee))}</span></div>
    <div class="divider"></div>
    <div class="total-row"><strong>Total</strong><span class="grand">${escapeHtml(formatRupiah(order.customerTotal))}</span></div>
    <div class="confirmed">${escapeHtml(order.status === "refunded" ? c.refunded : c.paymentConfirmed)}</div>
  </div>

  <div class="footer">${escapeHtml(c.footer)}</div>
</body>
</html>`;
}

export default function OrderReceiptScreen() {
  const { t } = useNitipTranslation();
  const { language } = useNitipLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const c = copy[language];
  const [order, setOrder] = useState<NitipOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    setLoading(true);
    setError(null);
    getOrder(user, id)
      .then((next) => {
        if (active) setOrder(next);
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : c.loadError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [c.loadError, id, user]);

  const orderDate = useMemo(
    () => (order ? formatDate(order.createdAt, language) : ""),
    [language, order],
  );

  if (!user) return <Redirect href="/login" />;

  async function saveReceipt() {
    if (!order || !receiptAvailable(order.status) || saving) return;
    setSaving(true);
    setError(null);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error(c.sharingUnavailable);
      if (!FileSystem.documentDirectory) throw new Error(c.saveError);

      const statusLabel = t(`orders.status.${order.status}`);
      const { uri } = await Print.printToFileAsync({
        html: createReceiptHtml(order, language, statusLabel),
      });

      const safeOrderCode = order.orderCode.replace(/[^A-Za-z0-9._-]/g, "_");
      const receiptUri = `${FileSystem.documentDirectory}nitip-receipt-${safeOrderCode}.pdf`;
      await FileSystem.deleteAsync(receiptUri, { idempotent: true });
      await FileSystem.copyAsync({ from: uri, to: receiptUri });

      await Sharing.shareAsync(receiptUri, {
        dialogTitle: `${c.heading} · ${order.orderCode}`,
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 18,
        paddingTop: insets.top + 10,
        paddingBottom: Math.max(insets.bottom + 28, 40),
        backgroundColor: theme.colors.background,
      }}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader title={c.title} onBack={() => router.back()} />

      {loading ? (
        <View className="mt-6 items-center rounded-[22px] p-7" style={{ backgroundColor: theme.colors.surface }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>{c.loading}</Text>
        </View>
      ) : !order ? (
        <View className="mt-6 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>{c.loadError}</Text>
          {error ? <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{error}</Text> : null}
        </View>
      ) : !receiptAvailable(order.status) ? (
        <View className="mt-6 rounded-[22px] p-6" style={{ backgroundColor: theme.colors.surface }}>
          <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
            <NitipIcon color={theme.colors.textMuted} name="receipt" size={19} />
          </View>
          <Text className="mt-4 text-base font-black" style={{ color: theme.colors.text }}>{c.unavailable}</Text>
          <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{c.unavailableDescription}</Text>
        </View>
      ) : (
        <>
          <View className="mt-7">
            <Text className="text-[9px] font-black tracking-[1px]" style={{ color: theme.colors.primary }}>{c.eyebrow}</Text>
            <Text className="mt-2 text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>{c.heading}</Text>
            <Text className="mt-1 max-w-[320px] text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{c.description}</Text>
          </View>

          <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
            <ReceiptRow label={c.orderCode} value={order.orderCode} />
            <ReceiptRow label={c.orderDate} value={orderDate} />
            <ReceiptRow label={c.merchant} value={order.businessName} />
            <ReceiptRow label={c.outlet} value={order.outletName} />
            <ReceiptRow label={c.status} value={t(`orders.status.${order.status}`)} last />
          </View>

          <Text className="mt-7 text-sm font-black" style={{ color: theme.colors.text }}>{c.items}</Text>
          <View className="mt-3 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
            {order.items.map((item) => (
              <View className="flex-row justify-between gap-4 py-2" key={item.productId}>
                <View className="flex-1">
                  <Text className="text-[10px] font-extrabold" style={{ color: theme.colors.text }}>{item.name}</Text>
                  <Text className="mt-0.5 text-[9px]" style={{ color: theme.colors.textMuted }}>{item.quantity} × {formatRupiah(item.unitPrice)}</Text>
                </View>
                <Text className="text-[10px] font-black" style={{ color: theme.colors.text }}>{formatRupiah(item.lineTotal)}</Text>
              </View>
            ))}
          </View>

          <Text className="mt-7 text-sm font-black" style={{ color: theme.colors.text }}>{c.delivery}</Text>
          <View className="mt-3 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
            <Text className="text-xs font-black" style={{ color: theme.colors.text }}>{order.address.recipientName}</Text>
            <Text className="mt-1 text-[9px] font-extrabold" style={{ color: theme.colors.primary }}>{order.address.phoneNumber}</Text>
            <Text className="mt-2 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{order.address.addressLine}</Text>
            {order.address.notes ? <Text className="mt-2 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{c.notes}: {order.address.notes}</Text> : null}
          </View>

          <Text className="mt-7 text-sm font-black" style={{ color: theme.colors.text }}>{c.payment}</Text>
          <View className="mt-3 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
            <AmountRow label={t("common.subtotal")} value={order.subtotal} />
            <AmountRow label={t("common.deliveryFee")} value={order.deliveryFare} />
            <AmountRow label={t("common.serviceFee")} value={order.serviceFee} />
            <View className="mt-3 border-t pt-4" style={{ borderTopColor: theme.colors.border }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-black" style={{ color: theme.colors.text }}>{t("common.total")}</Text>
                <Text className="text-base font-black" style={{ color: theme.colors.primary }}>{formatRupiah(order.customerTotal)}</Text>
              </View>
              <View className="mt-3 self-start rounded-full px-3 py-2" style={{ backgroundColor: order.status === "refunded" ? theme.colors.warningSurface : theme.colors.successSurface }}>
                <Text className="text-[8px] font-black" style={{ color: order.status === "refunded" ? theme.colors.warning : theme.colors.success }}>
                  {order.status === "refunded" ? c.refunded : c.paymentConfirmed}
                </Text>
              </View>
            </View>
          </View>

          <Text className="mt-5 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{c.footer}</Text>

          {error ? (
            <View className="mt-4 rounded-[16px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
              <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            className="mt-6 min-h-[50px] flex-row items-center justify-center gap-2 rounded-[16px]"
            disabled={saving}
            onPress={() => void saveReceipt()}
            style={{ backgroundColor: theme.colors.primary, opacity: saving ? 0.55 : 1 }}
          >
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <NitipIcon color="#FFFFFF" name="document" size={16} />}
            <Text className="text-xs font-black text-white">{saving ? c.savingPdf : c.savePdf}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );

  function ReceiptRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
    return (
      <View className={`flex-row items-start justify-between gap-4 py-2.5 ${last ? "" : "border-b"}`} style={{ borderBottomColor: theme.colors.border }}>
        <Text className="text-[9px]" style={{ color: theme.colors.textMuted }}>{label}</Text>
        <Text className="max-w-[60%] text-right text-[10px] font-extrabold" style={{ color: theme.colors.text }}>{value}</Text>
      </View>
    );
  }

  function AmountRow({ label, value }: { label: string; value: number }) {
    return (
      <View className="flex-row justify-between py-1.5">
        <Text className="text-[10px]" style={{ color: theme.colors.textMuted }}>{label}</Text>
        <Text className="text-[10px] font-extrabold" style={{ color: theme.colors.text }}>{formatRupiah(value)}</Text>
      </View>
    );
  }
}
