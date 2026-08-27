import type { NitipMerchantProfile } from "@nitip/domain";
import type { NitipMerchantOrder } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getMerchantMe, listMerchantOrders } from "../lib/api";
import {
  buildMerchantNotifications,
  getMerchantNotificationReadIds,
  markMerchantNotificationRead,
  markMerchantNotificationsRead,
  type MerchantNotification,
} from "../lib/merchantNotifications";

type Filter = "all" | "unread";

function relativeTime(timestamp: string, language: "id" | "en") {
  const value = Date.parse(timestamp);
  if (!Number.isFinite(value)) return "";

  const diffMs = Math.max(0, Date.now() - value);
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return language === "id" ? "Baru saja" : "Just now";
  if (minutes < 60) return language === "id" ? `${minutes} mnt lalu` : `${minutes}m ago`;
  if (hours < 24) return language === "id" ? `${hours} jam lalu` : `${hours}h ago`;
  if (days < 7) return language === "id" ? `${days} hari lalu` : `${days}d ago`;

  return new Date(value).toLocaleDateString(language === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

export default function MerchantNotificationsScreen() {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [merchant, setMerchant] = useState<NitipMerchantProfile | null>(null);
  const [orders, setOrders] = useState<NitipMerchantOrder[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const [nextMerchant, nextReadIds] = await Promise.all([
        getMerchantMe(user),
        getMerchantNotificationReadIds(user.uid),
      ]);
      const nextOrders = nextMerchant?.status === "approved"
        ? await listMerchantOrders(user)
        : [];

      setMerchant(nextMerchant);
      setOrders(nextOrders);
      setReadIds(nextReadIds);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : language === "id"
            ? "Gagal memuat notifikasi"
            : "Failed to load notifications",
      );
    } finally {
      setLoading(false);
    }
  }, [language, user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const notifications = useMemo(
    () => buildMerchantNotifications(merchant, orders, language),
    [language, merchant, orders],
  );
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !readIds.has(notification.id)).length,
    [notifications, readIds],
  );
  const visibleNotifications = useMemo(
    () => filter === "unread"
      ? notifications.filter((notification) => !readIds.has(notification.id))
      : notifications,
    [filter, notifications, readIds],
  );

  if (!user) return <Redirect href="/login" />;
  const userId = user.uid;

  async function markAllRead() {
    const next = await markMerchantNotificationsRead(
      userId,
      notifications.map((notification) => notification.id),
    );
    setReadIds(new Set(next));
  }

  async function openNotification(notification: MerchantNotification) {
    try {
      const next = await markMerchantNotificationRead(userId, notification.id);
      setReadIds(new Set(next));
    } catch {
      // Navigation should still work even if local read-state persistence fails.
    }

    if (notification.target.type === "order") {
      router.push({ pathname: "/order/[id]", params: { id: notification.target.orderId } });
      return;
    }

    router.push("/settings/business");
  }

  function toneStyle(notification: MerchantNotification) {
    if (notification.tone === "action") {
      return { background: theme.colors.surfaceAccent, foreground: theme.colors.primary };
    }
    if (notification.tone === "success") {
      return { background: theme.colors.successSurface, foreground: theme.colors.success };
    }
    if (notification.tone === "danger") {
      return { background: theme.colors.dangerSurface, foreground: theme.colors.danger };
    }
    return { background: theme.colors.surface, foreground: theme.colors.textMuted };
  }

  const title = language === "id" ? "Notifikasi" : "Notifications";
  const subtitle = language === "id"
    ? "Update operasional merchant dan pesanan terbaru."
    : "Latest merchant operations and order updates.";
  const allLabel = language === "id" ? "Semua" : "All";
  const unreadLabel = language === "id" ? "Belum dibaca" : "Unread";
  const markAllLabel = language === "id" ? "Tandai semua dibaca" : "Mark all as read";
  const emptyTitle = filter === "unread"
    ? language === "id" ? "Semua sudah dibaca" : "You're all caught up"
    : language === "id" ? "Belum ada notifikasi" : "No notifications yet";
  const emptyDescription = filter === "unread"
    ? language === "id"
      ? "Notifikasi baru akan muncul ketika ada perubahan status merchant atau pesanan."
      : "New notifications will appear when merchant or order status changes."
    : language === "id"
      ? "Update merchant dan pesanan akan muncul di sini."
      : "Merchant and order updates will appear here.";

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: insets.top + 10,
        paddingBottom: Math.max(insets.bottom + 30, 42),
      }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      <AppHeader title={title} onBack={() => router.back()} />

      <View className="mt-7 flex-row items-end justify-between gap-4">
        <View className="flex-1">
          <Text className="text-[9px] font-black tracking-[1.2px]" style={{ color: theme.colors.primary }}>
            {language === "id" ? "NOTIFICATION CENTER" : "NOTIFICATION CENTER"}
          </Text>
          <Text className="mt-2 text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
            {title}
          </Text>
          <Text className="mt-1 max-w-[280px] text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
            {subtitle}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <Pressable
            className="min-h-[38px] justify-center rounded-full px-3"
            onPress={() => void markAllRead()}
            style={{ backgroundColor: theme.colors.surfaceAccent }}
          >
            <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>
              {markAllLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {!loading ? (
        <View className="mt-5 flex-row gap-2">
          {([
            { key: "all" as const, label: allLabel, count: notifications.length },
            { key: "unread" as const, label: unreadLabel, count: unreadCount },
          ]).map((item) => {
            const selected = filter === item.key;
            return (
              <Pressable
                className="min-h-[42px] flex-1 flex-row items-center justify-center rounded-[15px]"
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={{
                  backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                }}
              >
                <Text
                  className="text-[9px] font-black"
                  style={{ color: selected ? "#FFFFFF" : theme.colors.textMuted }}
                >
                  {item.label} · {item.count}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {loading ? (
        <View className="mt-6 items-center rounded-[22px] p-7" style={{ backgroundColor: theme.colors.surface }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>
            {language === "id" ? "Memuat notifikasi..." : "Loading notifications..."}
          </Text>
        </View>
      ) : error ? (
        <View className="mt-6 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
        </View>
      ) : visibleNotifications.length === 0 ? (
        <View className="mt-6 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.surface }}>
          <NitipIcon color={theme.colors.textMuted} name="notification" size={23} />
          <Text className="mt-4 text-[13px] font-black" style={{ color: theme.colors.text }}>{emptyTitle}</Text>
          <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
            {emptyDescription}
          </Text>
        </View>
      ) : (
        <View className="mt-5 gap-2">
          {visibleNotifications.map((notification) => {
            const unread = !readIds.has(notification.id);
            const tone = toneStyle(notification);
            return (
              <Pressable
                className="rounded-[22px] p-4"
                key={notification.id}
                onPress={() => void openNotification(notification)}
                style={{ backgroundColor: tone.background }}
              >
                <View className="flex-row items-start gap-3">
                  <View
                    className="h-9 w-9 items-center justify-center rounded-[13px]"
                    style={{ backgroundColor: theme.colors.surfaceRaised }}
                  >
                    <NitipIcon
                      color={tone.foreground}
                      name={notification.target.type === "order" ? "orders" : "profile"}
                      size={17}
                    />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-start gap-2">
                      <Text className="flex-1 text-[11px] font-black leading-4" style={{ color: theme.colors.text }}>
                        {notification.title}
                      </Text>
                      {unread ? (
                        <View className="mt-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
                      ) : null}
                    </View>
                    <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                      {notification.body}
                    </Text>
                    <View className="mt-3 flex-row items-center justify-between">
                      <Text className="text-[8px] font-extrabold" style={{ color: tone.foreground }}>
                        {relativeTime(notification.timestamp, language)}
                      </Text>
                      <View className="flex-row items-center">
                        <Text className="mr-1 text-[8px] font-black" style={{ color: tone.foreground }}>
                          {notification.target.type === "order"
                            ? language === "id" ? "Lihat pesanan" : "View order"
                            : language === "id" ? "Lihat profil" : "View profile"}
                        </Text>
                        <NitipIcon color={tone.foreground} name="next" size={12} />
                      </View>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
