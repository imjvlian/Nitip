import { formatRupiah } from "@nitip/domain";
import type { NitipOrder } from "@nitip/domain/commerce";
import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { getOrder, simulateOrderPayment } from "../../lib/api";

function reservationDeadline(value: string | null, language: "id" | "en") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(language === "en" ? "en-US" : "id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function orderProgress(status: NitipOrder["status"]) {
  if (status === "delivered") return 3;
  if (status === "driver_assigned" || status === "picked_up" || status === "on_delivery") return 2;
  if (
    status === "paid" ||
    status === "merchant_confirmed" ||
    status === "preparing" ||
    status === "ready_for_pickup"
  ) {
    return 1;
  }
  return 0;
}

export default function OrderDetailScreen() {
  const { t } = useNitipTranslation();
  const { language } = useNitipLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<NitipOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
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
        if (active) {
          setError(nextError instanceof Error ? nextError.message : t("orderDetail.loadError"));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, t, user]);

  if (!user) return <Redirect href="/login" />;

  async function simulatePayment() {
    if (!order) return;
    setSimulating(true);
    setError(null);
    try {
      setOrder(await simulateOrderPayment(user, order.id));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("orderDetail.simulateError"));
    } finally {
      setSimulating(false);
    }
  }

  const deadline = reservationDeadline(order?.stockReservationExpiresAt ?? null, language);
  const progress = order ? orderProgress(order.status) : 0;
  const progressSteps = [
    t("orderDetail.progressPayment"),
    t("orderDetail.progressPreparing"),
    t("orderDetail.progressDelivery"),
    t("orderDetail.progressDone"),
  ];

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: insets.top + 14,
        paddingBottom: Math.max(insets.bottom + 28, 44),
        backgroundColor: theme.colors.background,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center justify-between">
        <Pressable className="min-h-10 justify-center pr-4" onPress={() => router.replace("/orders")}>
          <Text className="text-xs font-black" style={{ color: theme.colors.primary }}>
            ‹ {t("navigation.orders")}
          </Text>
        </Pressable>
        <Text className="text-2xl font-black tracking-tighter" style={{ color: theme.colors.primaryStrong }}>
          nitip.
        </Text>
      </View>

      {loading ? (
        <View
          className="mt-8 items-center rounded-3xl border p-7"
          style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
        >
          <ActivityIndicator color={theme.colors.primary} />
          <Text className="mt-3 text-xs" style={{ color: theme.colors.textMuted }}>
            {t("orderDetail.loading")}
          </Text>
        </View>
      ) : error && !order ? (
        <View className="mt-8 rounded-3xl p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-base font-black" style={{ color: theme.colors.danger }}>
            {t("orderDetail.notFound")}
          </Text>
          <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>{error}</Text>
        </View>
      ) : order ? (
        <>
          <View className="mt-8">
            <View className="self-start rounded-full px-3 py-2" style={{ backgroundColor: theme.colors.surfaceAccent }}>
              <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>
                {t(`orders.status.${order.status}`)}
              </Text>
            </View>
            <Text className="mt-4 text-3xl font-black tracking-tighter" style={{ color: theme.colors.text }}>
              {t("orderDetail.title")}
            </Text>
            <Text className="mt-2 text-sm font-black" style={{ color: theme.colors.primary }}>
              {order.orderCode}
            </Text>
            <Text className="mt-1 text-xs" style={{ color: theme.colors.textMuted }}>
              {order.businessName} · {order.outletName}
            </Text>
          </View>

          {order.status !== "cancelled" && order.status !== "refunded" ? (
            <View
              className="mt-6 rounded-3xl border p-4"
              style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
            >
              <View className="flex-row items-start">
                {progressSteps.map((label, index) => {
                  const reached = index <= progress;
                  return (
                    <View className="flex-1 items-center" key={label}>
                      <View className="w-full flex-row items-center">
                        {index > 0 ? (
                          <View
                            className="h-0.5 flex-1"
                            style={{ backgroundColor: index <= progress ? theme.colors.primary : theme.colors.border }}
                          />
                        ) : (
                          <View className="flex-1" />
                        )}
                        <View
                          className="h-5 w-5 items-center justify-center rounded-full"
                          style={{ backgroundColor: reached ? theme.colors.primary : theme.colors.surfaceAccent }}
                        >
                          <View
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: reached ? "#FFFFFF" : theme.colors.textMuted }}
                          />
                        </View>
                        {index < progressSteps.length - 1 ? (
                          <View
                            className="h-0.5 flex-1"
                            style={{ backgroundColor: index < progress ? theme.colors.primary : theme.colors.border }}
                          />
                        ) : (
                          <View className="flex-1" />
                        )}
                      </View>
                      <Text
                        className="mt-2 text-center text-[9px] font-extrabold"
                        style={{ color: reached ? theme.colors.text : theme.colors.textMuted }}
                      >
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {order.status === "pending_payment" ? (
            <View className="mt-5 rounded-3xl p-5" style={{ backgroundColor: theme.colors.warningSurface }}>
              <Text className="text-sm font-black" style={{ color: theme.colors.warning }}>
                {t("orderDetail.paymentGatewayDev")}
              </Text>
              <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
                {t("orderDetail.paymentGatewayDevDescription")}
              </Text>

              {order.stockReservationStatus === "reserved" ? (
                <View
                  className="mt-4 rounded-2xl border p-3"
                  style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
                >
                  <Text className="text-[9px] font-black tracking-wide" style={{ color: theme.colors.primary }}>
                    {t("orderDetail.stockReserved")}
                  </Text>
                  <Text className="mt-1 text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>
                    {deadline
                      ? t("orderDetail.stockReservedDeadline", { deadline })
                      : t("orderDetail.stockReservedGeneric")}
                  </Text>
                </View>
              ) : null}

              <Pressable
                className="mt-4 min-h-12 items-center justify-center rounded-2xl"
                disabled={simulating}
                onPress={() => void simulatePayment()}
                style={{ backgroundColor: theme.colors.primary, opacity: simulating ? 0.55 : 1 }}
              >
                {simulating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-xs font-black text-white">{t("orderDetail.simulatePayment")}</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {order.status === "paid" ? (
            <View className="mt-5 rounded-3xl p-5" style={{ backgroundColor: theme.colors.successSurface }}>
              <Text className="text-sm font-black" style={{ color: theme.colors.success }}>
                {t("orderDetail.paymentReceived")}
              </Text>
              <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
                {t("orderDetail.paymentReceivedDescription")}
              </Text>
            </View>
          ) : null}

          {order.status === "cancelled" ? (
            <View className="mt-5 rounded-3xl p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
              <Text className="text-sm font-black" style={{ color: theme.colors.danger }}>
                {t("orderDetail.cancelled")}
              </Text>
              <Text className="mt-1 text-xs leading-5" style={{ color: theme.colors.danger }}>
                {order.cancellationReason ?? t("orderDetail.cancelledFallback")}
              </Text>
            </View>
          ) : null}

          <Text className="mt-8 text-lg font-black" style={{ color: theme.colors.text }}>
            {t("orderDetail.items")}
          </Text>
          <View
            className="mt-3 rounded-3xl border p-5"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
          >
            {order.items.map((item) => (
              <View className="flex-row justify-between gap-4 py-1.5" key={item.productId}>
                <Text className="flex-1 text-xs" style={{ color: theme.colors.textMuted }}>
                  {item.quantity}× {item.name}
                </Text>
                <Text className="text-xs font-extrabold" style={{ color: theme.colors.text }}>
                  {formatRupiah(item.lineTotal)}
                </Text>
              </View>
            ))}
          </View>

          <Text className="mt-8 text-lg font-black" style={{ color: theme.colors.text }}>
            {t("orderDetail.deliverTo")}
          </Text>
          <View
            className="mt-3 rounded-3xl border p-5"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
          >
            <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
              {order.address.recipientName}
            </Text>
            <Text className="mt-1 text-xs font-extrabold" style={{ color: theme.colors.primary }}>
              {order.address.phoneNumber}
            </Text>
            <Text className="mt-2 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {order.address.addressLine}
            </Text>
            {order.address.notes ? (
              <Text className="mt-2 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
                {t("orderDetail.notesPrefix", { notes: order.address.notes })}
              </Text>
            ) : null}
          </View>

          <Text className="mt-8 text-lg font-black" style={{ color: theme.colors.text }}>
            {t("orderDetail.payment")}
          </Text>
          <View
            className="mt-3 rounded-3xl border p-5"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
          >
            <View className="flex-row justify-between py-1.5">
              <Text className="text-xs" style={{ color: theme.colors.textMuted }}>{t("common.subtotal")}</Text>
              <Text className="text-xs font-extrabold" style={{ color: theme.colors.text }}>{formatRupiah(order.subtotal)}</Text>
            </View>
            <View className="flex-row justify-between py-1.5">
              <Text className="text-xs" style={{ color: theme.colors.textMuted }}>{t("common.deliveryFee")}</Text>
              <Text className="text-xs font-extrabold" style={{ color: theme.colors.text }}>{formatRupiah(order.deliveryFare)}</Text>
            </View>
            <View className="flex-row justify-between py-1.5">
              <Text className="text-xs" style={{ color: theme.colors.textMuted }}>{t("common.serviceFee")}</Text>
              <Text className="text-xs font-extrabold" style={{ color: theme.colors.text }}>{formatRupiah(order.serviceFee)}</Text>
            </View>
            <View className="mt-3 flex-row justify-between border-t pt-4" style={{ borderTopColor: theme.colors.border }}>
              <Text className="text-base font-black" style={{ color: theme.colors.text }}>{t("common.total")}</Text>
              <Text className="text-lg font-black" style={{ color: theme.colors.primary }}>{formatRupiah(order.customerTotal)}</Text>
            </View>
          </View>

          {error ? (
            <View className="mt-4 rounded-2xl p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
              <Text className="text-xs leading-5" style={{ color: theme.colors.danger }}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            className="mt-7 min-h-[52px] items-center justify-center rounded-2xl"
            onPress={() => router.replace("/orders")}
            style={{ backgroundColor: theme.colors.primary }}
          >
            <Text className="text-sm font-black text-white">{t("orderDetail.backOrders")}</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}
