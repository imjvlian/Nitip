import { formatRupiah, type NitipMerchantProfile, type NitipOutlet } from "@nitip/domain";
import type { NitipMerchantOrder } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NitipIcon, type NitipIconName } from "../components/NitipIcon";
import { getMerchantCopy, merchantStatusLabel } from "../constants/merchantCopy";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getMerchantMe, listMerchantOrders, listOutlets } from "../lib/api";
import { buildMerchantNotifications, getMerchantNotificationReadIds } from "../lib/merchantNotifications";

export default function MerchantHomeScreen() {
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [merchant, setMerchant] = useState<NitipMerchantProfile | null>(null);
  const [outlets, setOutlets] = useState<NitipOutlet[]>([]);
  const [orders, setOrders] = useState<NitipMerchantOrder[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const labels = language === "id"
    ? {
        brand: "nitip mitra.",
        greeting: "Pusat operasionalmu.",
        subtitle: "Pantau pesanan, katalog, outlet, dan performa bisnis dari satu tempat.",
        revenue: "Pendapatan selesai",
        action: "Perlu tindakan",
        outlets: "Outlet",
        accepting: "Menerima order",
        operations: "Operasional",
        orders: "Kelola pesanan",
        ordersBody: "Proses order masuk sampai siap pickup.",
        menu: "Kelola menu",
        menuBody: "Produk, kategori, stok, dan ketersediaan.",
        earnings: "Pendapatan",
        earningsBody: "Lihat ringkasan penjualan dan order selesai.",
        analytics: "Analitik",
        analyticsBody: "Pantau tren order dan produk terlaris.",
        outletsTitle: "Outlet aktif",
        addOutlet: "Tambah outlet",
        noOutlet: "Belum ada outlet. Tambahkan outlet untuk mulai berjualan.",
        open: "BUKA",
        closed: "TUTUP",
        loading: "Memuat pusat merchant...",
        register: "Lengkapi profil bisnis",
        registerBody: "Profil bisnis diperlukan sebelum outlet dan order dapat dikelola.",
        review: "Status verifikasi",
      }
    : {
        brand: "nitip merchant.",
        greeting: "Your operations hub.",
        subtitle: "Track orders, catalog, outlets, and business performance in one place.",
        revenue: "Completed revenue",
        action: "Needs action",
        outlets: "Outlets",
        accepting: "Accepting orders",
        operations: "Operations",
        orders: "Manage orders",
        ordersBody: "Process incoming orders until pickup ready.",
        menu: "Manage menu",
        menuBody: "Products, categories, stock, and availability.",
        earnings: "Earnings",
        earningsBody: "Review sales summary and completed orders.",
        analytics: "Analytics",
        analyticsBody: "Track order trends and best-selling products.",
        outletsTitle: "Active outlets",
        addOutlet: "Add outlet",
        noOutlet: "No outlet yet. Add an outlet to start selling.",
        open: "OPEN",
        closed: "CLOSED",
        loading: "Loading merchant center...",
        register: "Complete business profile",
        registerBody: "A business profile is required before managing outlets and orders.",
        review: "Verification status",
      };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const nextMerchant = await getMerchantMe(user);
      setMerchant(nextMerchant);
      if (!nextMerchant) {
        setOutlets([]);
        setOrders([]);
        setNotificationCount(0);
        return;
      }

      const [nextOutlets, nextOrders, readIds] = await Promise.all([
        listOutlets(user),
        nextMerchant.status === "approved" ? listMerchantOrders(user) : Promise.resolve([]),
        getMerchantNotificationReadIds(user.uid),
      ]);
      setOutlets(nextOutlets);
      setOrders(nextOrders);
      const notifications = buildMerchantNotifications(nextMerchant, nextOrders, language);
      setNotificationCount(notifications.filter((item) => !readIds.has(item.id)).length);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.home.loadError);
    } finally {
      setLoading(false);
    }
  }, [c.home.loadError, language, user]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  if (!user) return <Redirect href="/login" />;

  const actionableOrders = orders.filter((order) => ["paid", "merchant_confirmed", "preparing"].includes(order.status)).length;
  const deliveredRevenue = orders
    .filter((order) => order.status === "delivered")
    .reduce((total, order) => total + order.merchantNet, 0);
  const acceptingCount = outlets.filter((outlet) => outlet.acceptingOrders).length;
  const firstOutlet = outlets[0] ?? null;
  const isDark = theme.mode === "dark";

  const shortcuts = useMemo(() => [
    {
      icon: "orders" as NitipIconName,
      title: labels.orders,
      body: labels.ordersBody,
      onPress: () => router.push("/orders"),
      emphasis: actionableOrders > 0,
    },
    {
      icon: "menu" as NitipIconName,
      title: labels.menu,
      body: labels.menuBody,
      onPress: () => router.push(firstOutlet ? { pathname: "/menu", params: { outletId: firstOutlet.id, outletName: firstOutlet.name } } : "/menu"),
    },
    {
      icon: "earnings" as NitipIconName,
      title: labels.earnings,
      body: labels.earningsBody,
      onPress: () => router.push("/earnings"),
    },
    {
      icon: "analytics" as NitipIconName,
      title: labels.analytics,
      body: labels.analyticsBody,
      onPress: () => router.push("/analytics"),
    },
  ], [actionableOrders, firstOutlet, labels]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <View style={styles.brandCopy}>
            <Text style={[styles.brand, { color: theme.colors.text }]}>{labels.brand}</Text>
            <Text numberOfLines={1} style={[styles.account, { color: theme.colors.textMuted }]}>{user.email ?? "Merchant"}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/notifications")}
            style={[
              styles.notification,
              {
                backgroundColor: isDark ? theme.colors.surfaceRaised : "#FFFFFF",
                borderColor: theme.colors.border,
              },
            ]}
          >
            <NitipIcon color={theme.colors.text} name="notification" size={18} />
            {notificationCount > 0 ? (
              <View style={[styles.notificationBadge, { backgroundColor: theme.colors.primary }]}> 
                <Text style={styles.notificationCount}>{notificationCount > 99 ? "99+" : notificationCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>MERCHANT CENTER</Text>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{merchant?.businessName ?? labels.greeting}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{labels.subtitle}</Text>
        </View>

        {loading ? (
          <View style={[styles.stateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>{labels.loading}</Text>
          </View>
        ) : !merchant ? (
          <Pressable
            onPress={() => router.push("/settings/business")}
            style={[styles.onboarding, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <View style={[styles.largeBadge, { backgroundColor: theme.colors.surfaceAccent }]}> 
              <NitipIcon color={theme.colors.primary} name="store" size={23} />
            </View>
            <View style={styles.onboardingCopy}>
              <Text style={[styles.onboardingTitle, { color: theme.colors.text }]}>{labels.register}</Text>
              <Text style={[styles.onboardingBody, { color: theme.colors.textMuted }]}>{labels.registerBody}</Text>
            </View>
            <NitipIcon color={theme.colors.textMuted} name="next" size={16} />
          </Pressable>
        ) : (
          <>
            <Pressable
              disabled={merchant.status === "approved"}
              onPress={() => router.push("/settings/business")}
              style={[
                styles.statusCard,
                {
                  backgroundColor: merchant.status === "approved"
                    ? theme.colors.successSurface
                    : merchant.status === "rejected"
                      ? theme.colors.dangerSurface
                      : theme.colors.surfaceAccent,
                },
              ]}
            >
              <View style={styles.statusCopy}>
                <Text style={[styles.statusEyebrow, { color: merchant.status === "rejected" ? theme.colors.danger : merchant.status === "approved" ? theme.colors.success : theme.colors.primary }]}>{labels.review.toUpperCase()}</Text>
                <Text style={[styles.statusTitle, { color: theme.colors.text }]}>{merchantStatusLabel(merchant.status, language)}</Text>
                {merchant.rejectionReason ? <Text style={[styles.statusBody, { color: theme.colors.danger }]}>{merchant.rejectionReason}</Text> : null}
              </View>
              {merchant.status !== "approved" ? <NitipIcon color={theme.colors.textMuted} name="next" size={16} /> : <NitipIcon color={theme.colors.success} name="check" size={16} />}
            </Pressable>

            {merchant.status === "approved" ? (
              <>
                <View style={styles.metrics}>
                  <Metric icon="earnings" label={labels.revenue} value={formatRupiah(deliveredRevenue)} />
                  <Metric icon="orders" label={labels.action} value={String(actionableOrders)} emphasized={actionableOrders > 0} />
                </View>
                <View style={styles.metrics}>
                  <Metric icon="store" label={labels.outlets} value={String(outlets.length)} />
                  <Metric icon="power" label={labels.accepting} value={String(acceptingCount)} />
                </View>

                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{labels.operations}</Text>
                <View style={styles.shortcuts}>
                  {shortcuts.map((item) => (
                    <Pressable
                      accessibilityRole="button"
                      key={item.title}
                      onPress={item.onPress}
                      style={[
                        styles.shortcut,
                        {
                          backgroundColor: item.emphasis ? theme.colors.primary : theme.colors.surface,
                          borderColor: item.emphasis ? theme.colors.primary : theme.colors.border,
                          shadowColor: theme.colors.shadow,
                        },
                      ]}
                    >
                      <View style={[styles.shortcutBadge, { backgroundColor: item.emphasis ? "rgba(255,255,255,0.16)" : theme.colors.surfaceAccent }]}> 
                        <NitipIcon color={item.emphasis ? "#FFFFFF" : theme.colors.primary} name={item.icon} size={19} />
                      </View>
                      <Text style={[styles.shortcutTitle, { color: item.emphasis ? "#FFFFFF" : theme.colors.text }]}>{item.title}</Text>
                      <Text style={[styles.shortcutBody, { color: item.emphasis ? "rgba(255,255,255,0.75)" : theme.colors.textMuted }]}>{item.body}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitleNoMargin, { color: theme.colors.text }]}>{labels.outletsTitle}</Text>
                  <Pressable onPress={() => router.push("/outlet/new")} style={[styles.addButton, { backgroundColor: theme.colors.surfaceAccent }]}> 
                    <NitipIcon color={theme.colors.primary} name="plus" size={14} />
                    <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>{labels.addOutlet}</Text>
                  </Pressable>
                </View>

                {outlets.length === 0 ? (
                  <View style={[styles.stateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
                    <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>{labels.noOutlet}</Text>
                  </View>
                ) : (
                  <View style={styles.outletList}>
                    {outlets.map((outlet) => (
                      <Pressable
                        key={outlet.id}
                        onPress={() => router.push({ pathname: "/outlet/[id]", params: { id: outlet.id } })}
                        style={[styles.outletCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}
                      >
                        <View style={[styles.outletBadge, { backgroundColor: theme.colors.surfaceAccent }]}> 
                          <NitipIcon color={theme.colors.primary} name="store" size={18} />
                        </View>
                        <View style={styles.outletCopy}>
                          <Text numberOfLines={1} style={[styles.outletName, { color: theme.colors.text }]}>{outlet.name}</Text>
                          <Text numberOfLines={2} style={[styles.outletAddress, { color: theme.colors.textMuted }]}>{outlet.addressLine}</Text>
                        </View>
                        <View style={[styles.outletStatus, { backgroundColor: outlet.acceptingOrders ? theme.colors.successSurface : theme.colors.secondary }]}> 
                          <Text style={[styles.outletStatusText, { color: outlet.acceptingOrders ? theme.colors.success : theme.colors.textMuted }]}>{outlet.acceptingOrders ? labels.open : labels.closed}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </>
        )}

        {error ? (
          <View style={[styles.error, { backgroundColor: theme.colors.dangerSurface }]}> 
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );

  function Metric({ icon, label, value, emphasized = false }: { icon: NitipIconName; label: string; value: string; emphasized?: boolean }) {
    return (
      <View style={[styles.metric, { backgroundColor: emphasized ? theme.colors.surfaceAccent : theme.colors.surface, borderColor: theme.colors.border }]}> 
        <View style={[styles.metricIcon, { backgroundColor: emphasized ? theme.colors.primary : theme.colors.surfaceAccent }]}> 
          <NitipIcon color={emphasized ? "#FFFFFF" : theme.colors.primary} name={icon} size={15} />
        </View>
        <Text numberOfLines={1} style={[styles.metricValue, { color: emphasized ? theme.colors.primary : theme.colors.text }]}>{value}</Text>
        <Text numberOfLines={2} style={[styles.metricLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 34, paddingHorizontal: 20 },
  topbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 44 },
  brandCopy: { flex: 1, minWidth: 0 },
  brand: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  account: { fontSize: 8, marginTop: 2 },
  notification: { alignItems: "center", borderRadius: 20, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  notificationBadge: { alignItems: "center", borderRadius: 9, justifyContent: "center", minHeight: 17, minWidth: 17, paddingHorizontal: 3, position: "absolute", right: -2, top: -2 },
  notificationCount: { color: "#FFFFFF", fontSize: 7, fontWeight: "900" },
  hero: { marginTop: 24 },
  eyebrow: { fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  heroTitle: { fontSize: 29, fontWeight: "900", letterSpacing: -0.9, lineHeight: 34, marginTop: 7 },
  heroSubtitle: { fontSize: 10, lineHeight: 17, marginTop: 6, maxWidth: 340 },
  stateCard: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 20, padding: 24 },
  stateText: { fontSize: 10, lineHeight: 16, marginTop: 8, textAlign: "center" },
  onboarding: { alignItems: "center", borderRadius: 20, borderWidth: 1, flexDirection: "row", marginTop: 20, padding: 14 },
  largeBadge: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  onboardingCopy: { flex: 1, paddingHorizontal: 12 },
  onboardingTitle: { fontSize: 12, fontWeight: "900" },
  onboardingBody: { fontSize: 9, lineHeight: 14, marginTop: 3 },
  statusCard: { alignItems: "center", borderRadius: 18, flexDirection: "row", marginTop: 20, padding: 14 },
  statusCopy: { flex: 1 },
  statusEyebrow: { fontSize: 7, fontWeight: "900", letterSpacing: 0.8 },
  statusTitle: { fontSize: 13, fontWeight: "900", marginTop: 3 },
  statusBody: { fontSize: 9, lineHeight: 14, marginTop: 4 },
  metrics: { flexDirection: "row", gap: 8, marginTop: 10 },
  metric: { borderRadius: 18, borderWidth: 1, flex: 1, minHeight: 112, padding: 12 },
  metricIcon: { alignItems: "center", borderRadius: 16, height: 32, justifyContent: "center", width: 32 },
  metricValue: { fontSize: 16, fontWeight: "900", marginTop: 10 },
  metricLabel: { fontSize: 8, fontWeight: "700", lineHeight: 11, marginTop: 3 },
  sectionTitle: { fontSize: 13, fontWeight: "900", marginTop: 26 },
  shortcuts: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  shortcut: { borderRadius: 20, borderWidth: 1, elevation: 2, minHeight: 142, padding: 14, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 7, width: "48.5%" },
  shortcutBadge: { alignItems: "center", borderRadius: 19, height: 38, justifyContent: "center", width: 38 },
  shortcutTitle: { fontSize: 11, fontWeight: "900", marginTop: 13 },
  shortcutBody: { fontSize: 8, lineHeight: 13, marginTop: 4 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 26 },
  sectionTitleNoMargin: { fontSize: 13, fontWeight: "900" },
  addButton: { alignItems: "center", borderRadius: 999, flexDirection: "row", gap: 5, minHeight: 36, paddingHorizontal: 12 },
  addButtonText: { fontSize: 8, fontWeight: "900" },
  outletList: { gap: 9, marginTop: 10 },
  outletCard: { alignItems: "center", borderRadius: 18, borderWidth: 1, elevation: 2, flexDirection: "row", minHeight: 72, padding: 11, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 7 },
  outletBadge: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  outletCopy: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  outletName: { fontSize: 11, fontWeight: "900" },
  outletAddress: { fontSize: 8, lineHeight: 12, marginTop: 3 },
  outletStatus: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  outletStatusText: { fontSize: 7, fontWeight: "900" },
  error: { borderRadius: 16, marginTop: 14, padding: 13 },
  errorText: { fontSize: 9, lineHeight: 14 },
});
