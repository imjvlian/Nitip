import { formatRupiah } from "@nitip/domain";
import type { DriverDeliveryAction, NitipDriverOrder } from "@nitip/domain/driver";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { NitipIcon } from "../../components/NitipIcon";
import RouteMap from "../../components/RouteMap";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { actOnDriverOrder, getDriverOrder } from "../../lib/api";

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
  const [error, setError] = useState<string | null>(null);

  const c = language === "id"
    ? {
        title: "Detail perjalanan", loading: "Memuat assignment...", unavailable: "Order tidak tersedia", fare: "Pendapatan delivery", status: "STATUS PERJALANAN",
        assigned: "Ambil pesanan dari merchant sebelum menuju customer.", picked: "Pesanan sudah kamu pegang dan siap diantar.", delivery: "Pesanan sedang dalam perjalanan ke customer.", done: "Pengantaran selesai dan assignment aktif sudah dilepas.",
        map: "Peta perjalanan", pickup: "Pickup", destination: "Antar ke", items: "Isi pesanan", note: "CATATAN CUSTOMER", next: "Langkah berikutnya", complete: "Pengantaran selesai", completeBody: "Order sudah selesai. Kamu dapat kembali menerima order berikutnya jika tetap online.",
        cancel: "Batal", continue: "Lanjut", pickupAction: "Pesanan sudah diambil", pickupTitle: "Konfirmasi pickup?", pickupMessage: "Pastikan pesanan sudah kamu terima dari merchant sebelum melanjutkan.", pickupHelper: "Periksa item dari merchant, lalu konfirmasi pickup.",
        startAction: "Mulai pengantaran", startTitle: "Mulai pengantaran?", startMessage: "Status customer dan merchant akan berubah menjadi sedang diantar.", startHelper: "Mulai pengantaran saat kamu siap menuju customer.",
        doneAction: "Pesanan diterima customer", doneTitle: "Selesaikan pesanan?", doneMessage: "Gunakan tombol ini hanya setelah pesanan benar-benar diterima customer.", doneHelper: "Pastikan customer sudah menerima pesanan sebelum menyelesaikan perjalanan.",
      }
    : {
        title: "Trip details", loading: "Loading assignment...", unavailable: "Order unavailable", fare: "Delivery earning", status: "TRIP STATUS",
        assigned: "Pick up the order from the merchant before heading to the customer.", picked: "The order is secured and ready for delivery.", delivery: "The order is on its way to the customer.", done: "Delivery is complete and the active assignment has been released.",
        map: "Trip map", pickup: "Pickup", destination: "Deliver to", items: "Order items", note: "CUSTOMER NOTE", next: "Next step", complete: "Delivery completed", completeBody: "The order is completed. You can receive another order while remaining online.",
        cancel: "Cancel", continue: "Continue", pickupAction: "Order picked up", pickupTitle: "Confirm pickup?", pickupMessage: "Make sure you received the order from the merchant before continuing.", pickupHelper: "Check the merchant order, then confirm pickup.",
        startAction: "Start delivery", startTitle: "Start delivery?", startMessage: "Customer and merchant status will change to on delivery.", startHelper: "Start delivery when you are ready to head to the customer.",
        doneAction: "Customer received order", doneTitle: "Complete delivery?", doneMessage: "Use this only after the customer has received the order.", doneHelper: "Make sure the customer has received the order before completing the trip.",
      };

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    setLoading(true);
    setError(null);
    getDriverOrder(user, id)
      .then((next) => { if (active) setOrder(next); })
      .catch((nextError: unknown) => { if (active) setError(nextError instanceof Error ? nextError.message : c.unavailable); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [c.unavailable, id, user]);

  if (!user) return <Redirect href="/login" />;

  const nextAction = order?.status === "driver_assigned"
    ? { action: "confirm_pickup" as DriverDeliveryAction, label: c.pickupAction, title: c.pickupTitle, message: c.pickupMessage, helper: c.pickupHelper }
    : order?.status === "picked_up"
      ? { action: "start_delivery" as DriverDeliveryAction, label: c.startAction, title: c.startTitle, message: c.startMessage, helper: c.startHelper }
      : order?.status === "on_delivery"
        ? { action: "complete_delivery" as DriverDeliveryAction, label: c.doneAction, title: c.doneTitle, message: c.doneMessage, helper: c.doneHelper }
        : null;

  async function runAction(action: DriverDeliveryAction) {
    if (!order) return;
    setUpdating(true);
    setError(null);
    try {
      setOrder(await actOnDriverOrder(user, order.id, action));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.unavailable);
    } finally {
      setUpdating(false);
    }
  }

  function confirmAction() {
    if (!nextAction) return;
    Alert.alert(nextAction.title, nextAction.message, [
      { text: c.cancel, style: "cancel" },
      { text: c.continue, onPress: () => void runAction(nextAction.action) },
    ]);
  }

  const progressText = order?.status === "driver_assigned" ? c.assigned : order?.status === "picked_up" ? c.picked : order?.status === "on_delivery" ? c.delivery : c.done;
  const hasRoute = order ? (order.pickup.latitude != null && order.pickup.longitude != null) || (order.destination.latitude != null && order.destination.longitude != null) : false;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
        <AppHeader title={c.title} />

        {loading ? (
          <StateCard loading title={c.loading} />
        ) : error && !order ? (
          <StateCard title={c.unavailable} body={error} danger />
        ) : order ? (
          <>
            <View style={styles.hero}>
              <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>{statusLabel(order.status, language)}</Text>
              <Text style={[styles.orderCode, { color: theme.colors.text }]}>{order.orderCode}</Text>
              <Text style={[styles.fare, { color: theme.colors.primary }]}>{formatRupiah(order.deliveryFare)}</Text>
              <Text style={[styles.fareLabel, { color: theme.colors.textMuted }]}>{c.fare}</Text>
            </View>

            {error ? <View style={[styles.errorCard, { backgroundColor: theme.colors.dangerSurface }]}><Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text></View> : null}

            <View style={[styles.progress, { backgroundColor: order.status === "delivered" ? theme.colors.successSurface : theme.colors.surfaceAccent }]}> 
              <View style={[styles.progressBadge, { backgroundColor: order.status === "delivered" ? theme.colors.success : theme.colors.primary }]}> 
                <NitipIcon color="#FFFFFF" name={order.status === "delivered" ? "check" : "delivery"} size={18} />
              </View>
              <View style={styles.progressCopy}>
                <Text style={[styles.progressLabel, { color: order.status === "delivered" ? theme.colors.success : theme.colors.primary }]}>{c.status}</Text>
                <Text style={[styles.progressTitle, { color: theme.colors.text }]}>{statusLabel(order.status, language)}</Text>
                <Text style={[styles.progressBody, { color: theme.colors.textMuted }]}>{progressText}</Text>
              </View>
            </View>

            {hasRoute ? (
              <>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{c.map}</Text>
                <View style={[styles.mapCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
                  <RouteMap
                    pickup={{ latitude: order.pickup.latitude, longitude: order.pickup.longitude, label: `${order.pickup.businessName} · ${order.pickup.outletName}` }}
                    destination={{ latitude: order.destination.latitude, longitude: order.destination.longitude, label: order.destination.recipientName }}
                  />
                </View>
              </>
            ) : null}

            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{c.pickup}</Text>
            <InfoCard icon="store" title={order.pickup.businessName} strong={order.pickup.outletName} body={order.pickup.addressLine} />

            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{c.destination}</Text>
            <InfoCard icon="location" title={order.destination.recipientName} strong={order.destination.phoneNumber} body={order.destination.addressLine}>
              {order.destination.notes ? (
                <View style={[styles.note, { backgroundColor: theme.colors.surfaceAccent }]}> 
                  <Text style={[styles.noteLabel, { color: theme.colors.primary }]}>{c.note}</Text>
                  <Text style={[styles.noteText, { color: theme.colors.text }]}>{order.destination.notes}</Text>
                </View>
              ) : null}
            </InfoCard>

            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{c.items}</Text>
            <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
              {order.items.map((item, index) => (
                <View key={`${item.productId}-${index}`} style={[styles.itemRow, index > 0 && { borderTopColor: theme.colors.border, borderTopWidth: 1 }]}> 
                  <View style={[styles.quantityBadge, { backgroundColor: theme.colors.surfaceAccent }]}><Text style={[styles.quantity, { color: theme.colors.primary }]}>{item.quantity}×</Text></View>
                  <Text style={[styles.itemName, { color: theme.colors.text }]}>{item.name}</Text>
                </View>
              ))}
            </View>

            {nextAction ? (
              <View style={[styles.actionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}> 
                <Text style={[styles.actionTitle, { color: theme.colors.text }]}>{c.next}</Text>
                <Text style={[styles.actionBody, { color: theme.colors.textMuted }]}>{nextAction.helper}</Text>
                <Pressable disabled={updating} onPress={confirmAction} style={[styles.primaryButton, { backgroundColor: theme.colors.primary, opacity: updating ? 0.55 : 1 }]}> 
                  {updating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{nextAction.label}</Text>}
                </Pressable>
              </View>
            ) : (
              <View style={[styles.completed, { backgroundColor: theme.colors.successSurface }]}> 
                <NitipIcon color={theme.colors.success} name="check" size={21} />
                <Text style={[styles.completedTitle, { color: theme.colors.text }]}>{c.complete}</Text>
                <Text style={[styles.completedBody, { color: theme.colors.textMuted }]}>{c.completeBody}</Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );

  function InfoCard({ icon, title, strong, body, children }: { icon: "store" | "location"; title: string; strong: string; body: string; children?: React.ReactNode }) {
    return <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><View style={styles.infoTop}><View style={[styles.infoBadge, { backgroundColor: theme.colors.surfaceAccent }]}><NitipIcon color={theme.colors.primary} name={icon} size={17} /></View><View style={styles.infoCopy}><Text style={[styles.infoTitle, { color: theme.colors.text }]}>{title}</Text><Text style={[styles.infoStrong, { color: theme.colors.primary }]}>{strong}</Text><Text style={[styles.infoBody, { color: theme.colors.textMuted }]}>{body}</Text></View></View>{children}</View>;
  }

  function StateCard({ loading = false, title, body, danger = false }: { loading?: boolean; title: string; body?: string; danger?: boolean }) {
    return <View style={[styles.stateCard, { backgroundColor: danger ? theme.colors.dangerSurface : theme.colors.surface, borderColor: danger ? theme.colors.dangerSurface : theme.colors.border }]}>{loading ? <ActivityIndicator color={theme.colors.primary} /> : <NitipIcon color={danger ? theme.colors.danger : theme.colors.primary} name="orders" size={22} />}<Text style={[styles.stateTitle, { color: danger ? theme.colors.danger : theme.colors.text }]}>{title}</Text>{body ? <Text style={[styles.stateBody, { color: danger ? theme.colors.danger : theme.colors.textMuted }]}>{body}</Text> : null}</View>;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 38, paddingHorizontal: 20 }, hero: { marginTop: 25 }, eyebrow: { fontSize: 8, fontWeight: "900", letterSpacing: 0.9 }, orderCode: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8, marginTop: 5 }, fare: { fontSize: 20, fontWeight: "900", marginTop: 12 }, fareLabel: { fontSize: 8, marginTop: 2 },
  errorCard: { borderRadius: 15, marginTop: 12, padding: 12 }, errorText: { fontSize: 9, lineHeight: 14 }, progress: { alignItems: "center", borderRadius: 18, flexDirection: "row", marginTop: 18, padding: 14 }, progressBadge: { alignItems: "center", borderRadius: 21, height: 42, justifyContent: "center", width: 42 }, progressCopy: { flex: 1, paddingLeft: 11 }, progressLabel: { fontSize: 7, fontWeight: "900", letterSpacing: 0.7 }, progressTitle: { fontSize: 12, fontWeight: "900", marginTop: 2 }, progressBody: { fontSize: 8, lineHeight: 13, marginTop: 3 },
  sectionTitle: { fontSize: 12, fontWeight: "900", marginBottom: 9, marginTop: 23 }, mapCard: { borderRadius: 20, borderWidth: 1, height: 250, overflow: "hidden" }, infoCard: { borderRadius: 18, borderWidth: 1, padding: 13 }, infoTop: { alignItems: "flex-start", flexDirection: "row" }, infoBadge: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 }, infoCopy: { flex: 1, minWidth: 0, paddingLeft: 11 }, infoTitle: { fontSize: 11, fontWeight: "900" }, infoStrong: { fontSize: 9, fontWeight: "800", marginTop: 3 }, infoBody: { fontSize: 8, lineHeight: 13, marginTop: 3 }, note: { borderRadius: 14, marginTop: 12, padding: 11 }, noteLabel: { fontSize: 7, fontWeight: "900", letterSpacing: 0.7 }, noteText: { fontSize: 9, lineHeight: 14, marginTop: 4 },
  itemRow: { alignItems: "center", flexDirection: "row", minHeight: 48, paddingVertical: 7 }, quantityBadge: { alignItems: "center", borderRadius: 15, height: 30, justifyContent: "center", width: 38 }, quantity: { fontSize: 9, fontWeight: "900" }, itemName: { flex: 1, fontSize: 10, fontWeight: "800", paddingLeft: 10 }, actionCard: { borderRadius: 20, borderWidth: 1, elevation: 2, marginTop: 22, padding: 15, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 7 }, actionTitle: { fontSize: 13, fontWeight: "900" }, actionBody: { fontSize: 9, lineHeight: 15, marginTop: 5 }, primaryButton: { alignItems: "center", borderRadius: 14, justifyContent: "center", marginTop: 14, minHeight: 48 }, primaryText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" }, completed: { alignItems: "center", borderRadius: 20, marginTop: 22, padding: 22 }, completedTitle: { fontSize: 13, fontWeight: "900", marginTop: 8 }, completedBody: { fontSize: 9, lineHeight: 15, marginTop: 5, textAlign: "center" }, stateCard: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 20, padding: 27 }, stateTitle: { fontSize: 12, fontWeight: "900", marginTop: 10 }, stateBody: { fontSize: 9, lineHeight: 15, marginTop: 5, textAlign: "center" },
});
