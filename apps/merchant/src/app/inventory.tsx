import type { NitipOutlet } from "@nitip/domain";
import type { NitipProduct } from "@nitip/domain/catalog";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { listOutlets, listProducts, updateProduct } from "../lib/api";

export default function InventoryScreen() {
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [outlets, setOutlets] = useState<NitipOutlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [products, setProducts] = useState<NitipProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const c = language === "id" ? {
    title: "Inventori", subtitle: "Pantau stok, produk menipis, dan produk habis sebelum mengganggu order.",
    allGood: "Stok aman", low: "Stok menipis", soldOut: "Habis", unlimited: "Tanpa batas", units: "stok",
    available: "Tersedia", unavailable: "Tidak tersedia", empty: "Belum ada produk di outlet ini.",
    auto: "Otomatis nonaktif saat stok 0", loadError: "Inventori belum bisa dimuat.", choose: "Pilih outlet",
  } : {
    title: "Inventory", subtitle: "Monitor stock, low-stock items, and sold-out products before they affect orders.",
    allGood: "Healthy stock", low: "Low stock", soldOut: "Sold out", unlimited: "Unlimited", units: "stock",
    available: "Available", unavailable: "Unavailable", empty: "No products in this outlet yet.",
    auto: "Automatically unavailable at stock 0", loadError: "Unable to load inventory.", choose: "Choose outlet",
  };

  const loadOutlets = useCallback(async () => {
    if (!user) return;
    const next = await listOutlets(user);
    setOutlets(next);
    setOutletId((current) => current || next[0]?.id || "");
  }, [user]);

  const loadProducts = useCallback(async (targetId: string) => {
    if (!user || !targetId) { setProducts([]); return; }
    setProducts(await listProducts(user, targetId));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true); setError(null);
    loadOutlets().catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : c.loadError); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [c.loadError, loadOutlets, user]);

  useEffect(() => {
    if (!outletId) return;
    setLoading(true); setError(null);
    void loadProducts(outletId).catch((e: unknown) => setError(e instanceof Error ? e.message : c.loadError)).finally(() => setLoading(false));
  }, [c.loadError, loadProducts, outletId]);

  const activeProducts = useMemo(() => products.filter((p) => p.isActive), [products]);
  const soldOut = activeProducts.filter((p) => p.stockQuantity === 0);
  const lowStock = activeProducts.filter((p) => p.stockQuantity != null && p.stockQuantity > 0 && p.stockQuantity <= 5);
  const healthy = activeProducts.length - soldOut.length - lowStock.length;

  if (!user) return <Redirect href="/login" />;

  async function refresh() {
    setRefreshing(true); setError(null);
    try { await loadOutlets(); if (outletId) await loadProducts(outletId); }
    catch (e) { setError(e instanceof Error ? e.message : c.loadError); }
    finally { setRefreshing(false); }
  }

  async function toggle(product: NitipProduct) {
    if (!outletId) return;
    setUpdatingId(product.id); setError(null);
    try {
      const next = await updateProduct(user, outletId, product.id, { isAvailable: !product.isAvailable });
      setProducts((current) => current.map((item) => item.id === next.id ? next : item));
    } catch (e) { setError(e instanceof Error ? e.message : c.loadError); }
    finally { setUpdatingId(null); }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={c.title} onBack={() => router.back()} />
        <View style={styles.hero}><Text style={[styles.title, { color: theme.colors.text }]}>{c.title}</Text><Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>{c.subtitle}</Text></View>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{c.choose}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.outlets}>
          {outlets.map((outlet) => {
            const active = outlet.id === outletId;
            return <Pressable key={outlet.id} onPress={() => setOutletId(outlet.id)} style={[styles.outletPill, { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: active ? theme.colors.primary : theme.colors.border }]}><Text style={[styles.outletText, { color: active ? "#FFFFFF" : theme.colors.text }]}>{outlet.name}</Text></Pressable>;
          })}
        </ScrollView>

        <View style={styles.metrics}>
          <Metric value={healthy} label={c.allGood} tone="good" />
          <Metric value={lowStock.length} label={c.low} tone="warn" />
          <Metric value={soldOut.length} label={c.soldOut} tone="danger" />
        </View>

        <View style={[styles.notice, { backgroundColor: theme.colors.surfaceAccent }]}><NitipIcon color={theme.colors.primary} name="product" size={18} /><Text style={[styles.noticeText, { color: theme.colors.text }]}>{c.auto}</Text></View>
        {error ? <View style={[styles.error, { backgroundColor: theme.colors.dangerSurface }]}><Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text></View> : null}

        {loading ? <View style={styles.loading}><ActivityIndicator color={theme.colors.primary} /></View> : activeProducts.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><NitipIcon color={theme.colors.textMuted} name="product" size={24} /><Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>{c.empty}</Text></View>
        ) : (
          <View style={styles.list}>{activeProducts.sort((a, b) => (a.stockQuantity ?? 999999) - (b.stockQuantity ?? 999999)).map((product) => {
            const stock = product.stockQuantity;
            const isSoldOut = stock === 0;
            const isLow = stock != null && stock > 0 && stock <= 5;
            const stockColor = isSoldOut ? theme.colors.danger : isLow ? theme.colors.warning : theme.colors.success;
            return <View key={product.id} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.icon, { backgroundColor: isSoldOut ? theme.colors.dangerSurface : isLow ? theme.colors.warningSurface : theme.colors.surfaceAccent }]}><NitipIcon color={stockColor} name="product" size={18} /></View>
              <View style={styles.copy}><Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={1}>{product.name}</Text><Text style={[styles.stock, { color: stockColor }]}>{stock == null ? c.unlimited : `${stock} ${c.units}`}</Text></View>
              <Pressable disabled={updatingId === product.id || isSoldOut} onPress={() => void toggle(product)} style={[styles.toggle, { backgroundColor: product.isAvailable && !isSoldOut ? theme.colors.successSurface : theme.colors.surfaceRaised, opacity: updatingId === product.id ? 0.5 : 1 }]}>
                {updatingId === product.id ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={[styles.toggleText, { color: product.isAvailable && !isSoldOut ? theme.colors.success : theme.colors.textMuted }]}>{product.isAvailable && !isSoldOut ? c.available : c.unavailable}</Text>}
              </Pressable>
            </View>;
          })}</View>
        )}
      </ScrollView>
    </View>
  );

  function Metric({ value, label, tone }: { value: number; label: string; tone: "good" | "warn" | "danger" }) {
    const color = tone === "good" ? theme.colors.success : tone === "warn" ? theme.colors.warning : theme.colors.danger;
    const background = tone === "good" ? theme.colors.successSurface : tone === "warn" ? theme.colors.warningSurface : theme.colors.dangerSurface;
    return <View style={[styles.metric, { backgroundColor: background }]}><Text style={[styles.metricValue, { color }]}>{value}</Text><Text style={[styles.metricLabel, { color }]}>{label}</Text></View>;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 42, paddingHorizontal: 20 }, hero: { marginTop: 24 }, title: { fontSize: 27, fontWeight: "900", letterSpacing: -0.7 }, subtitle: { fontSize: 10, lineHeight: 17, marginTop: 6, maxWidth: 330 }, label: { fontSize: 9, fontWeight: "800", marginTop: 22 }, outlets: { gap: 8, paddingTop: 10, paddingRight: 20 }, outletPill: { borderRadius: 999, borderWidth: 1, minHeight: 38, justifyContent: "center", paddingHorizontal: 15 }, outletText: { fontSize: 9, fontWeight: "900" }, metrics: { flexDirection: "row", gap: 8, marginTop: 18 }, metric: { borderRadius: 18, flex: 1, minHeight: 86, padding: 13 }, metricValue: { fontSize: 24, fontWeight: "900" }, metricLabel: { fontSize: 8, fontWeight: "800", lineHeight: 12, marginTop: 5 }, notice: { alignItems: "center", borderRadius: 18, flexDirection: "row", marginTop: 14, padding: 14 }, noticeText: { flex: 1, fontSize: 9, fontWeight: "700", lineHeight: 14, marginLeft: 10 }, error: { borderRadius: 16, marginTop: 12, padding: 12 }, errorText: { fontSize: 9, lineHeight: 14 }, loading: { alignItems: "center", paddingVertical: 40 }, empty: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 18, padding: 28 }, emptyText: { fontSize: 10, marginTop: 10 }, list: { gap: 9, marginTop: 18 }, card: { alignItems: "center", borderRadius: 18, borderWidth: 1, flexDirection: "row", padding: 12 }, icon: { alignItems: "center", borderRadius: 18, height: 40, justifyContent: "center", width: 40 }, copy: { flex: 1, minWidth: 0, paddingHorizontal: 11 }, productName: { fontSize: 11, fontWeight: "900" }, stock: { fontSize: 8, fontWeight: "900", marginTop: 4 }, toggle: { alignItems: "center", borderRadius: 999, minHeight: 34, justifyContent: "center", minWidth: 80, paddingHorizontal: 10 }, toggleText: { fontSize: 8, fontWeight: "900" },
});
