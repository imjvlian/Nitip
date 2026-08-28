import { formatRupiah, type NitipOutlet } from "@nitip/domain";
import type { NitipCategory, NitipProduct } from "@nitip/domain/catalog";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import {
  deleteCategory,
  deleteProduct,
  listCategories,
  listOutlets,
  listProducts,
  updateCategory,
  updateProduct,
} from "../lib/api";

export default function MenuScreen() {
  const params = useLocalSearchParams<{ outletId?: string; outletName?: string }>();
  const { language } = useNitipLanguage();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [outlets, setOutlets] = useState<NitipOutlet[]>([]);
  const [activeOutletId, setActiveOutletId] = useState<string | null>(params.outletId ?? null);
  const [categories, setCategories] = useState<NitipCategory[]>([]);
  const [products, setProducts] = useState<NitipProduct[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = language === "id"
    ? {
        title: "Menu",
        heading: "Kelola katalog.",
        subtitle: "Atur produk, kategori, stok, dan ketersediaan untuk setiap outlet.",
        outlet: "Outlet",
        noOutlet: "Belum ada outlet",
        noOutletBody: "Tambahkan outlet terlebih dahulu sebelum membuat menu.",
        addOutlet: "Tambah outlet",
        category: "Kategori",
        categories: "Kategori",
        product: "Produk",
        products: "Produk",
        visible: "Tampil",
        available: "Tersedia",
        hidden: "Disembunyikan",
        unavailable: "Habis / nonaktif",
        addCategory: "Kategori baru",
        addProduct: "Produk baru",
        search: "Cari produk atau kategori",
        all: "Semua",
        edit: "Ubah",
        hide: "Sembunyikan",
        show: "Tampilkan",
        disable: "Nonaktifkan",
        enable: "Aktifkan",
        delete: "Hapus",
        loading: "Memuat katalog...",
        empty: "Belum ada produk",
        emptyBody: "Tambahkan kategori dan produk untuk mulai menerima pesanan.",
        noResult: "Produk tidak ditemukan",
        noResultBody: "Coba kata kunci atau kategori lain.",
        deleteProductTitle: "Hapus produk?",
        deleteCategoryTitle: "Hapus kategori?",
        deleteProductBody: "Produk akan dihapus dari katalog outlet.",
        deleteCategoryBody: "Kategori hanya dapat dihapus jika tidak lagi digunakan produk.",
      }
    : {
        title: "Menu",
        heading: "Manage catalog.",
        subtitle: "Manage products, categories, stock, and availability for each outlet.",
        outlet: "Outlet",
        noOutlet: "No outlet yet",
        noOutletBody: "Create an outlet before adding a menu.",
        addOutlet: "Add outlet",
        category: "Category",
        categories: "Categories",
        product: "Product",
        products: "Products",
        visible: "Visible",
        available: "Available",
        hidden: "Hidden",
        unavailable: "Unavailable",
        addCategory: "New category",
        addProduct: "New product",
        search: "Search products or categories",
        all: "All",
        edit: "Edit",
        hide: "Hide",
        show: "Show",
        disable: "Disable",
        enable: "Enable",
        delete: "Delete",
        loading: "Loading catalog...",
        empty: "No products yet",
        emptyBody: "Add categories and products to start taking orders.",
        noResult: "No products found",
        noResultBody: "Try another keyword or category.",
        deleteProductTitle: "Delete product?",
        deleteCategoryTitle: "Delete category?",
        deleteProductBody: "The product will be removed from this outlet catalog.",
        deleteCategoryBody: "A category can only be deleted when no product uses it.",
      };

  const loadOutlets = useCallback(async () => {
    if (!user) return;
    setLoadingOutlets(true);
    setError(null);
    try {
      const next = await listOutlets(user);
      setOutlets(next);
      setActiveOutletId((current) => {
        if (current && next.some((outlet) => outlet.id === current)) return current;
        if (params.outletId && next.some((outlet) => outlet.id === params.outletId)) return params.outletId;
        return next[0]?.id ?? null;
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loading);
    } finally {
      setLoadingOutlets(false);
    }
  }, [copy.loading, params.outletId, user]);

  const loadCatalog = useCallback(async () => {
    if (!user || !activeOutletId) {
      setCategories([]);
      setProducts([]);
      return;
    }
    setLoadingCatalog(true);
    setError(null);
    try {
      const [nextCategories, nextProducts] = await Promise.all([
        listCategories(user, activeOutletId),
        listProducts(user, activeOutletId),
      ]);
      setCategories(nextCategories);
      setProducts(nextProducts);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loading);
    } finally {
      setLoadingCatalog(false);
    }
  }, [activeOutletId, copy.loading, user]);

  useFocusEffect(useCallback(() => {
    void loadOutlets();
  }, [loadOutlets]));

  useFocusEffect(useCallback(() => {
    void loadCatalog();
  }, [loadCatalog]));

  if (!user) return <Redirect href="/login" />;

  const activeOutlet = outlets.find((outlet) => outlet.id === activeOutletId) ?? null;
  const visibleProducts = products.filter((product) => product.isActive).length;
  const availableProducts = products.filter((product) => product.isActive && product.isAvailable).length;
  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      if (selectedCategoryId && product.categoryId !== selectedCategoryId) return false;
      if (!needle) return true;
      const category = categories.find((item) => item.id === product.categoryId)?.name ?? "";
      return `${product.name} ${product.description ?? ""} ${category}`.toLowerCase().includes(needle);
    });
  }, [categories, products, query, selectedCategoryId]);

  async function toggleProduct(product: NitipProduct, field: "isActive" | "isAvailable") {
    if (!activeOutletId) return;
    setError(null);
    try {
      const next = await updateProduct(user, activeOutletId, product.id, {
        [field]: !product[field],
      });
      setProducts((current) => current.map((item) => item.id === next.id ? next : item));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loading);
    }
  }

  async function toggleCategory(category: NitipCategory) {
    if (!activeOutletId) return;
    setError(null);
    try {
      const next = await updateCategory(user, activeOutletId, category.id, { isActive: !category.isActive });
      setCategories((current) => current.map((item) => item.id === next.id ? next : item));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.loading);
    }
  }

  function confirmDeleteProduct(product: NitipProduct) {
    if (!activeOutletId) return;
    Alert.alert(copy.deleteProductTitle, copy.deleteProductBody, [
      { text: language === "id" ? "Batal" : "Cancel", style: "cancel" },
      {
        text: copy.delete,
        style: "destructive",
        onPress: () => void deleteProduct(user, activeOutletId, product.id)
          .then(() => setProducts((current) => current.filter((item) => item.id !== product.id)))
          .catch((nextError: unknown) => setError(nextError instanceof Error ? nextError.message : copy.loading)),
      },
    ]);
  }

  function confirmDeleteCategory(category: NitipCategory) {
    if (!activeOutletId) return;
    Alert.alert(copy.deleteCategoryTitle, copy.deleteCategoryBody, [
      { text: language === "id" ? "Batal" : "Cancel", style: "cancel" },
      {
        text: copy.delete,
        style: "destructive",
        onPress: () => void deleteCategory(user, activeOutletId, category.id)
          .then(() => {
            setCategories((current) => current.filter((item) => item.id !== category.id));
            if (selectedCategoryId === category.id) setSelectedCategoryId(null);
          })
          .catch((nextError: unknown) => setError(nextError instanceof Error ? nextError.message : copy.loading)),
      },
    ]);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={copy.title} showBack={false} />

        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{copy.heading}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{copy.subtitle}</Text>
        </View>

        {loadingOutlets ? (
          <StateCard loading text={copy.loading} />
        ) : outlets.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
            <View style={[styles.emptyBadge, { backgroundColor: theme.colors.surfaceAccent }]}> 
              <NitipIcon color={theme.colors.primary} name="store" size={22} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{copy.noOutlet}</Text>
            <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{copy.noOutletBody}</Text>
            <Pressable onPress={() => router.push("/outlet/new")} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}> 
              <Text style={styles.primaryButtonText}>{copy.addOutlet}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>{copy.outlet}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.outletStrip}>
              {outlets.map((outlet) => {
                const selected = outlet.id === activeOutletId;
                return (
                  <Pressable
                    key={outlet.id}
                    onPress={() => {
                      setActiveOutletId(outlet.id);
                      setSelectedCategoryId(null);
                      setQuery("");
                    }}
                    style={[
                      styles.outletPill,
                      {
                        backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                        borderColor: selected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text numberOfLines={1} style={[styles.outletPillText, { color: selected ? "#FFFFFF" : theme.colors.text }]}> 
                      {outlet.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.metrics}>
              <Metric label={copy.categories} value={categories.length} icon="category" />
              <Metric label={copy.visible} value={visibleProducts} icon="visibility" />
              <Metric label={copy.available} value={availableProducts} icon="product" />
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() => activeOutletId && router.push({ pathname: "/category/new", params: { outletId: activeOutletId, outletName: activeOutlet?.name ?? "" } })}
                style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceAccent }]}
              >
                <NitipIcon color={theme.colors.primary} name="category" size={16} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>{copy.addCategory}</Text>
              </Pressable>
              <Pressable
                onPress={() => activeOutletId && router.push({ pathname: "/product/new", params: { outletId: activeOutletId, outletName: activeOutlet?.name ?? "" } })}
                style={[styles.secondaryButton, { backgroundColor: theme.colors.primary }]}
              >
                <NitipIcon color="#FFFFFF" name="plus" size={16} />
                <Text style={[styles.secondaryButtonText, { color: "#FFFFFF" }]}>{copy.addProduct}</Text>
              </Pressable>
            </View>

            <View style={[styles.search, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
              <NitipIcon color={theme.colors.textMuted} name="product" size={15} />
              <TextInput
                onChangeText={setQuery}
                placeholder={copy.search}
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.searchInput, { color: theme.colors.text }]}
                value={query}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryStrip}>
              <Pressable
                onPress={() => setSelectedCategoryId(null)}
                style={[styles.categoryPill, { backgroundColor: selectedCategoryId === null ? theme.colors.primary : theme.colors.surface }]}
              >
                <Text style={[styles.categoryText, { color: selectedCategoryId === null ? "#FFFFFF" : theme.colors.textMuted }]}>{copy.all}</Text>
              </Pressable>
              {categories.map((category) => {
                const selected = selectedCategoryId === category.id;
                return (
                  <Pressable
                    key={category.id}
                    onLongPress={() => confirmDeleteCategory(category)}
                    onPress={() => setSelectedCategoryId(category.id)}
                    style={[styles.categoryPill, { backgroundColor: selected ? theme.colors.primary : theme.colors.surface }]}
                  >
                    <Text style={[styles.categoryText, { color: selected ? "#FFFFFF" : theme.colors.textMuted }]}>{category.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {categories.length > 0 ? (
              <View style={styles.categoryManager}>
                {categories.map((category) => (
                  <View key={category.id} style={[styles.categoryRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
                    <View style={styles.categoryCopy}>
                      <Text style={[styles.categoryName, { color: theme.colors.text }]}>{category.name}</Text>
                      <Text style={[styles.categoryMeta, { color: theme.colors.textMuted }]}>
                        {products.filter((product) => product.categoryId === category.id).length} {copy.products.toLowerCase()}
                      </Text>
                    </View>
                    <Pressable onPress={() => void toggleCategory(category)} style={styles.textAction}>
                      <Text style={[styles.textActionLabel, { color: theme.colors.primary }]}>{category.isActive ? copy.hide : copy.show}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => activeOutletId && router.push({ pathname: "/category/[id]/edit", params: { id: category.id, outletId: activeOutletId, outletName: activeOutlet?.name ?? "" } })}
                      style={styles.textAction}
                    >
                      <Text style={[styles.textActionLabel, { color: theme.colors.primary }]}>{copy.edit}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            {loadingCatalog ? (
              <StateCard loading text={copy.loading} />
            ) : products.length === 0 ? (
              <StateCard text={copy.empty} body={copy.emptyBody} />
            ) : filteredProducts.length === 0 ? (
              <StateCard text={copy.noResult} body={copy.noResultBody} />
            ) : (
              <View style={styles.productList}>
                {filteredProducts.map((product) => (
                  <View key={product.id} style={[styles.productCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}> 
                    {product.imageUrl ? (
                      <Image source={{ uri: product.imageUrl }} style={[styles.productImage, { backgroundColor: theme.colors.surfaceAccent }]} />
                    ) : (
                      <View style={[styles.productImage, styles.productFallback, { backgroundColor: theme.colors.surfaceAccent }]}> 
                        <NitipIcon color={theme.colors.primary} name="product" size={24} />
                      </View>
                    )}
                    <View style={styles.productCopy}>
                      <Text numberOfLines={2} style={[styles.productName, { color: theme.colors.text }]}>{product.name}</Text>
                      <Text style={[styles.productPrice, { color: theme.colors.primary }]}>{formatRupiah(product.price)}</Text>
                      <Text numberOfLines={1} style={[styles.productMeta, { color: theme.colors.textMuted }]}> 
                        {categories.find((category) => category.id === product.categoryId)?.name ?? copy.category}
                        {product.stockQuantity != null ? ` · stok ${product.stockQuantity}` : ""}
                      </Text>
                      <View style={styles.badges}>
                        <View style={[styles.badge, { backgroundColor: product.isActive ? theme.colors.surfaceAccent : theme.colors.secondary }]}> 
                          <Text style={[styles.badgeText, { color: product.isActive ? theme.colors.primary : theme.colors.textMuted }]}>{product.isActive ? copy.visible : copy.hidden}</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: product.isAvailable ? theme.colors.successSurface : theme.colors.dangerSurface }]}> 
                          <Text style={[styles.badgeText, { color: product.isAvailable ? theme.colors.success : theme.colors.danger }]}>{product.isAvailable ? copy.available : copy.unavailable}</Text>
                        </View>
                      </View>
                      <View style={styles.productActions}>
                        <Pressable
                          onPress={() => activeOutletId && router.push({ pathname: "/product/[id]/edit", params: { id: product.id, outletId: activeOutletId, outletName: activeOutlet?.name ?? "" } })}
                          style={styles.textAction}
                        >
                          <Text style={[styles.textActionLabel, { color: theme.colors.primary }]}>{copy.edit}</Text>
                        </Pressable>
                        <Pressable onPress={() => void toggleProduct(product, "isAvailable")} style={styles.textAction}>
                          <Text style={[styles.textActionLabel, { color: theme.colors.primary }]}>{product.isAvailable ? copy.disable : copy.enable}</Text>
                        </Pressable>
                        <Pressable onPress={() => void toggleProduct(product, "isActive")} style={styles.textAction}>
                          <Text style={[styles.textActionLabel, { color: theme.colors.primary }]}>{product.isActive ? copy.hide : copy.show}</Text>
                        </Pressable>
                        <Pressable onPress={() => confirmDeleteProduct(product)} style={styles.textAction}>
                          <Text style={[styles.textActionLabel, { color: theme.colors.danger }]}>{copy.delete}</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
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

  function Metric({ label, value, icon }: { label: string; value: number; icon: "category" | "visibility" | "product" }) {
    return (
      <View style={[styles.metric, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
        <View style={[styles.metricBadge, { backgroundColor: theme.colors.surfaceAccent }]}> 
          <NitipIcon color={theme.colors.primary} name={icon} size={15} />
        </View>
        <Text style={[styles.metricValue, { color: theme.colors.text }]}>{value}</Text>
        <Text numberOfLines={1} style={[styles.metricLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      </View>
    );
  }

  function StateCard({ loading = false, text, body }: { loading?: boolean; text: string; body?: string }) {
    return (
      <View style={[styles.state, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
        {loading ? <ActivityIndicator color={theme.colors.primary} /> : <NitipIcon color={theme.colors.primary} name="menu" size={22} />}
        <Text style={[styles.stateTitle, { color: theme.colors.text }]}>{text}</Text>
        {body ? <Text style={[styles.stateBody, { color: theme.colors.textMuted }]}>{body}</Text> : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 36, paddingHorizontal: 20 },
  hero: { marginTop: 24 },
  heroTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.8 },
  heroSubtitle: { fontSize: 10, lineHeight: 17, marginTop: 6, maxWidth: 340 },
  sectionLabel: { fontSize: 11, fontWeight: "900", marginTop: 22 },
  outletStrip: { gap: 8, paddingRight: 20, paddingTop: 10 },
  outletPill: { borderRadius: 999, borderWidth: 1, maxWidth: 190, minHeight: 38, justifyContent: "center", paddingHorizontal: 15 },
  outletPillText: { fontSize: 10, fontWeight: "800" },
  metrics: { flexDirection: "row", gap: 8, marginTop: 16 },
  metric: { borderRadius: 18, borderWidth: 1, flex: 1, padding: 12 },
  metricBadge: { alignItems: "center", borderRadius: 16, height: 32, justifyContent: "center", width: 32 },
  metricValue: { fontSize: 18, fontWeight: "900", marginTop: 8 },
  metricLabel: { fontSize: 8, fontWeight: "700", marginTop: 2 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  secondaryButton: { alignItems: "center", borderRadius: 16, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 48, paddingHorizontal: 12 },
  secondaryButtonText: { fontSize: 10, fontWeight: "900" },
  search: { alignItems: "center", borderRadius: 18, borderWidth: 1, flexDirection: "row", marginTop: 16, minHeight: 48, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 10, marginLeft: 10, minHeight: 46 },
  categoryStrip: { gap: 8, paddingRight: 20, paddingTop: 12 },
  categoryPill: { borderRadius: 999, justifyContent: "center", minHeight: 36, paddingHorizontal: 14 },
  categoryText: { fontSize: 9, fontWeight: "800" },
  categoryManager: { gap: 8, marginTop: 14 },
  categoryRow: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", minHeight: 58, paddingHorizontal: 13 },
  categoryCopy: { flex: 1, minWidth: 0 },
  categoryName: { fontSize: 10, fontWeight: "900" },
  categoryMeta: { fontSize: 8, marginTop: 2 },
  textAction: { justifyContent: "center", minHeight: 36, paddingHorizontal: 7 },
  textActionLabel: { fontSize: 8, fontWeight: "900" },
  productList: { gap: 10, marginTop: 16 },
  productCard: { borderRadius: 20, borderWidth: 1, elevation: 2, flexDirection: "row", padding: 11, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 7 },
  productImage: { borderRadius: 16, height: 92, width: 92 },
  productFallback: { alignItems: "center", justifyContent: "center" },
  productCopy: { flex: 1, minWidth: 0, paddingLeft: 12 },
  productName: { fontSize: 12, fontWeight: "900", lineHeight: 16 },
  productPrice: { fontSize: 10, fontWeight: "900", marginTop: 4 },
  productMeta: { fontSize: 8, marginTop: 4 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  badgeText: { fontSize: 7, fontWeight: "900" },
  productActions: { flexDirection: "row", flexWrap: "wrap", marginTop: 5 },
  state: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 18, padding: 26 },
  stateTitle: { fontSize: 12, fontWeight: "900", marginTop: 10, textAlign: "center" },
  stateBody: { fontSize: 9, lineHeight: 15, marginTop: 5, textAlign: "center" },
  empty: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 20, padding: 28 },
  emptyBadge: { alignItems: "center", borderRadius: 25, height: 50, justifyContent: "center", width: 50 },
  emptyTitle: { fontSize: 13, fontWeight: "900", marginTop: 12 },
  emptyBody: { fontSize: 9, lineHeight: 16, marginTop: 6, textAlign: "center" },
  primaryButton: { borderRadius: 16, marginTop: 16, minHeight: 46, justifyContent: "center", paddingHorizontal: 18 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  error: { borderRadius: 16, marginTop: 14, padding: 13 },
  errorText: { fontSize: 9, lineHeight: 14 },
});
