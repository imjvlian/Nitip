import { formatRupiah } from "@nitip/domain";
import type { MerchantOrderAction, NitipMerchantOrder } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { NitipIcon } from "../../components/NitipIcon";
import { getMerchantCopy, merchantOrderStatusLabel } from "../../constants/merchantCopy";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { actOnMerchantOrder, getMerchantOrder } from "../../lib/api";

export default function MerchantOrderDetailScreen() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<NitipMerchantOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    setLoading(true);
    setError(null);
    void getMerchantOrder(user, id)
      .then((next) => { if (active) setOrder(next); })
      .catch((nextError: unknown) => { if (active) setError(nextError instanceof Error ? nextError.message : c.orderDetail.loadError); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [c.orderDetail.loadError, id, user]);

  if (!user) return <Redirect href="/login" />;

  async function runAction(action: MerchantOrderAction) {
    if (!order) return;
    setUpdating(true);
    setError(null);
    try {
      const next = await actOnMerchantOrder(user, order.id, { action, ...(action === "reject" ? { reason: rejectionReason.trim() || null } : {}) });
      setOrder(next);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.orderDetail.updateError);
    } finally { setUpdating(false); }
  }

  function confirmAction(action: MerchantOrderAction, title: string, message: string) {
    Alert.alert(title, message, [
      { text: c.common.cancel, style: "cancel" },
      { text: c.common.continue, onPress: () => void runAction(action) },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 30, 42) }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ backgroundColor: theme.colors.background }}>
      <AppHeader title={c.orderDetail.title} onBack={() => router.back()} />

      {loading ? <View className="mt-6 items-center rounded-[22px] p-7" style={{ backgroundColor: theme.colors.surface }}><ActivityIndicator color={theme.colors.primary} /><Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>{c.orderDetail.loading}</Text></View> : error && !order ? <View className="mt-6 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}><Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text></View> : order ? <>
        <View className="mt-7">
          <View className="self-start rounded-full px-3 py-2" style={{ backgroundColor: theme.colors.surfaceAccent }}><Text className="text-[8px] font-black" style={{ color: theme.colors.primary }}>{merchantOrderStatusLabel(order.status, language)}</Text></View>
          <Text className="mt-4 text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>{order.orderCode}</Text>
          <Text className="mt-1 text-[10px]" style={{ color: theme.colors.textMuted }}>{order.businessName} · {order.outletName}</Text>
        </View>

        {order.status === "paid" ? <ActionCard title={c.orderDetail.paidTitle} description={c.orderDetail.paidDescription}>
          <Pressable className="mt-4 min-h-[48px] items-center justify-center rounded-[16px]" disabled={updating} onPress={() => confirmAction("confirm", c.orderDetail.acceptTitle, c.orderDetail.acceptMessage)} style={{ backgroundColor: theme.colors.primary, opacity: updating ? 0.5 : 1 }}><Text className="text-[11px] font-black text-white">{updating ? c.common.processing : c.orderDetail.accept}</Text></Pressable>
          <TextInput value={rejectionReason} onChangeText={setRejectionReason} placeholder={c.orderDetail.rejectionPlaceholder} placeholderTextColor={theme.colors.textMuted} maxLength={300} className="mt-3 min-h-[46px] rounded-[16px] px-4 text-[10px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} />
          <Pressable className="mt-2 min-h-[46px] items-center justify-center rounded-[16px]" disabled={updating} onPress={() => confirmAction("reject", c.orderDetail.rejectTitle, c.orderDetail.rejectMessage)} style={{ backgroundColor: theme.colors.dangerSurface, opacity: updating ? 0.5 : 1 }}><Text className="text-[10px] font-black" style={{ color: theme.colors.danger }}>{c.orderDetail.reject}</Text></Pressable>
        </ActionCard> : null}

        {order.status === "merchant_confirmed" ? <ActionCard title={c.orderDetail.confirmedTitle} description={c.orderDetail.confirmedDescription}><PrimaryAction label={c.orderDetail.startPreparing} onPress={() => void runAction("start_preparing")} /></ActionCard> : null}
        {order.status === "preparing" ? <ActionCard title={c.orderDetail.preparingTitle} description={c.orderDetail.preparingDescription}><PrimaryAction label={c.orderDetail.ready} onPress={() => void runAction("ready_for_pickup")} /></ActionCard> : null}
        {order.status === "ready_for_pickup" ? <ActionCard title={c.orderDetail.waitingDriver} description={c.orderDetail.waitingDriverDescription}><View className="mt-3 flex-row items-center gap-2"><NitipIcon color={theme.colors.primary} name="clock" size={15} /><Text className="text-[9px] font-extrabold" style={{ color: theme.colors.primary }}>{merchantOrderStatusLabel(order.status, language)}</Text></View></ActionCard> : null}
        {order.status === "cancelled" && order.cancellationReason ? <View className="mt-4 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}><Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{c.orderDetail.cancellationReason.replace("{{reason}}", order.cancellationReason)}</Text></View> : null}

        <Section title={c.orderDetail.items}><View className="rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>{order.items.map((item) => <View className="flex-row justify-between gap-4 py-2" key={item.productId}><Text className="flex-1 text-[10px]" style={{ color: theme.colors.textMuted }}>{item.quantity}× {item.name}</Text><Text className="text-[10px] font-black" style={{ color: theme.colors.text }}>{formatRupiah(item.lineTotal)}</Text></View>)}</View></Section>

        <Section title={c.orderDetail.customerDelivery}><View className="rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}><View className="flex-row items-start"><View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}><NitipIcon color={theme.colors.primary} name="profile" size={17} /></View><View className="ml-3 flex-1"><Text className="text-[12px] font-black" style={{ color: theme.colors.text }}>{order.address.recipientName}</Text><Text className="mt-1 text-[9px] font-extrabold" style={{ color: theme.colors.primary }}>{order.address.phoneNumber}</Text><Text className="mt-2 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{order.address.addressLine}</Text>{order.address.notes ? <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{c.orderDetail.notes.replace("{{notes}}", order.address.notes)}</Text> : null}</View></View></View></Section>

        <Section title={c.orderDetail.orderValue}><View className="rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}><AmountRow label={c.orderDetail.subtotal} value={order.subtotal} /><AmountRow label={c.orderDetail.commission} value={-order.merchantCommission} /><View className="mt-3 flex-row justify-between border-t pt-4" style={{ borderTopColor: theme.colors.border }}><Text className="text-[12px] font-black" style={{ color: theme.colors.text }}>{c.orderDetail.merchantIncome}</Text><Text className="text-[16px] font-black" style={{ color: theme.colors.primary }}>{formatRupiah(order.merchantNet)}</Text></View></View></Section>

        {error ? <View className="mt-4 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}><Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text></View> : null}
      </> : null}
    </ScrollView>
  );

  function ActionCard({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) { return <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surfaceAccent }}><Text className="text-[13px] font-black" style={{ color: theme.colors.text }}>{title}</Text><Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{description}</Text>{children}</View>; }
  function PrimaryAction({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable className="mt-4 min-h-[48px] items-center justify-center rounded-[16px]" disabled={updating} onPress={onPress} style={{ backgroundColor: theme.colors.primary, opacity: updating ? 0.5 : 1 }}><Text className="text-[11px] font-black text-white">{updating ? c.common.processing : label}</Text></Pressable>; }
  function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View className="mt-7"><Text className="mb-3 text-[14px] font-black" style={{ color: theme.colors.text }}>{title}</Text>{children}</View>; }
  function AmountRow({ label, value }: { label: string; value: number }) { return <View className="flex-row justify-between py-1.5"><Text className="text-[10px]" style={{ color: theme.colors.textMuted }}>{label}</Text><Text className="text-[10px] font-extrabold" style={{ color: theme.colors.text }}>{value < 0 ? `−${formatRupiah(Math.abs(value))}` : formatRupiah(value)}</Text></View>; }
}
