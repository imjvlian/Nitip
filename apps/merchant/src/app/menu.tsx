import { formatRupiah } from "@nitip/domain";
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
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { getMerchantCopy } from "../constants/merchantCopy";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import {
  deleteCategory,
  deleteProduct,
  listCategories,
  listProducts,
  updateCategory,
  updateProduct,
} from "../lib/api";

export default function MenuScreen() {
  const { outletId, outletName } = useLocalSearchParams<{ outletId: string; outletName?: string }>();
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<NitipCategory[]>([]);
  const [products, setProducts] = useState<NitipProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !outletId) return;
    setLoading(true);
    setError(null);
    try {
      const [nextCategories, nextProducts] = await Promise.all([
        listCategories(user, outletId),
        listProducts(user, outletId),
      ]);
      setCategories(nextCategories);
      setProducts(nextProducts);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.menu.loadError);
    } finally {
      setLoading(false);
    }
  }, [c.menu.loadError, outletId, user]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load]),
  );

  const visibleProducts = useMemo(
    () => products.filter((product) => product.isActive).length,
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      if (selectedCategoryId && product.categoryId !== selectedCategoryId) return false;
      if (!normalizedQuery) return true;

      const categoryName =
        categories.find((category) => category.id === product.categoryId)?.name ?? "";

      return [product.name, product.description ?? "", categoryName]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [categories, products, query, selectedCategoryId]);

  if (!user) return <Redirect href="/login" />;

  async function toggleCategory(category: NitipCategory) {
    try {
      const next = await updateCategory(user, outletId, category.id, {
        isActive: !category.isActive,
      });
      setCategories((current) =>
        current.map((item) => (item.id === next.id ? next : item)),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : c.menu.toggleCategoryError,
      );
    }
  }

  async function toggleAvailability(product: NitipProduct) {
    try {
      const next = await updateProduct(user, outletId, product.id, {
        isAvailable: !product.isAvailable,
      });
      setProducts((current) =>
        current.map((item) => (item.id === next.id ? next : item)),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : c.menu.toggleAvailabilityError,
      );
    }
  }

  async function toggleProductVisibility(product: NitipProduct) {
    try {
      const next = await updateProduct(user, outletId, product.id, {
        isActive: !product.isActive,
      });
      setProducts((current) =>
        current.map((item) => (item.id === next.id ? next : item)),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : c.menu.toggleVisibilityError,
      );
    }
  }

  function confirmDeleteProduct(product: NitipProduct) {
    Alert.alert(
      c.menu.deleteProductTitle,
      c.menu.deleteProductDescription.replace("{{name}}", product.name),
      [
        { text: c.common.cancel, style: "cancel" },
        {
          text: c.common.delete,
          style: "destructive",
          onPress: () =>
            void (async () => {
              try {
                await deleteProduct(user, outletId, product.id);
                setProducts((current) =>
                  current.filter((item) => item.id !== product.id),
                );
              } catch (nextError) {
                setError(
                  nextError instanceof Error
                    ? nextError.message
                    : c.menu.deleteProductError,
                );
              }
            })(),
        },
      ],
    );
  }

  function confirmDeleteCategory(category: NitipCategory) {
    Alert.alert(
      c.menu.deleteCategoryTitle,
      c.menu.deleteCategoryDescription,
      [
        { text: c.common.cancel, style: "cancel" },
        {
          text: c.common.delete,
          style: "destructive",
          onPress: () =>
            void (async () => {
              try {
                await deleteCategory(user, outletId, category.id);
                setCategories((current) =>
                  current.filter((item) => item.id !== category.id),
                );
                if (selectedCategoryId === category.id) {
                  setSelectedCategoryId(null);
                }
              } catch (nextError) {
                setError(
                  nextError instanceof Error
                    ? nextError.message
                    : c.menu.deleteCategoryError,
                );
              }
            })(),
        },
      ],
    );
  }

  const searchPlaceholder =
    language === "id" ? "Cari produk atau kategori" : "Search products or categories";
  const allLabel = language === "id" ? "Semua" : "All";
  const visibleLabel = language === "id" ? "Tampil" : "Visible";
  const filteredEmptyTitle =
    language === "id" ? "Produk tidak ditemukan" : "No products found";
  const filteredEmptyDescription =
    language === "id"
      ? "Coba kata kunci lain atau pilih kategori yang berbeda."
      : "Try another keyword or choose a different category.";

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
      <AppHeader
        title={outletName || c.menu.titleFallback}
        onBack={() => router.back()}
      />

      <View className="mt-7">
        <Text
          className="text-[9px] font-black tracking-[1.2px]"
          style={{ color: theme.colors.primary }}
        >
          {c.menu.eyebrow}
        </Text>
        <Text
          className="mt-2 text-[28px] font-black tracking-tighter"
          style={{ color: theme.colors.text }}
        >
          {outletName || c.menu.titleFallback}
        </Text>
        <Text
          className="mt-1 text-[10px] leading-4"
          style={{ color: theme.colors.textMuted }}
        >
          {c.menu.subtitle}
        </Text>
      </View>

      <View className="mt-5 flex-row gap-2">
        <Pressable
          className="min-h-[48px] flex-1 flex-row items-center justify-center rounded-[16px]"
          onPress={() =>
            router.push({
              pathname: "/category/new",
              params: { outletId, outletName: outletName ?? "" },
            })
          }
          style={{ backgroundColor: theme.colors.surfaceAccent }}
        >
          <NitipIcon color={theme.colors.primary} name="category" size={16} />
          <Text
            className="ml-2 text-[10px] font-black"
            style={{ color: theme.colors.primary }}
          >
            + {c.menu.addCategory}
          </Text>
        </Pressable>
        <Pressable
          className="min-h-[48px] flex-1 flex-row items-center justify-center rounded-[16px]"
          onPress={() =>
            router.push({
              pathname: "/product/new",
              params: { outletId, outletName: outletName ?? "" },
            })
          }
          style={{ backgroundColor: theme.colors.primary }}
        >
          <NitipIcon color="#FFFFFF" name="product" size={16} />
          <Text className="ml-2 text-[10px] font-black text-white">
            + {c.menu.addProduct}
          </Text>
        </Pressable>
      </View>

      {!loading ? (
        <View className="mt-3 flex-row gap-2">
          <MetricCard
            label={c.menu.categories}
            value={categories.length}
            icon="category"
          />
          <MetricCard
            label={c.menu.products}
            value={products.length}
            icon="product"
          />
          <MetricCard
            label={visibleLabel}
            value={visibleProducts}
            icon="visibility"
          />
        </View>
      ) : null}

      {loading ? (
        <View
          className="mt-6 items-center rounded-[22px] p-7"
          style={{ backgroundColor: theme.colors.surface }}
        >
          <ActivityIndicator color={theme.colors.primary} />
          <Text
            className="mt-3 text-[10px]"
            style={{ color: theme.colors.textMuted }}
          >
            {c.menu.loading}
          </Text>
        </View>
      ) : (
        <>
          <SectionHeader
            icon="category"
            title={`${c.menu.categories} · ${categories.length}`}
          />
          {categories.length === 0 ? (
            <EmptyCard
              title={c.menu.noCategory}
              description={c.menu.noCategoryDescription}
            />
          ) : (
            <View className="gap-2">
              {categories.map((category) => {
                const productCount = products.filter(
                  (product) => product.categoryId === category.id,
                ).length;

                return (
                  <View
                    className="rounded-[20px] p-4"
                    key={category.id}
                    style={{ backgroundColor: theme.colors.surface }}
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Text
                          className="text-[12px] font-black"
                          style={{ color: theme.colors.text }}
                        >
                          {category.name}
                        </Text>
                        <Text
                          className="mt-1 text-[9px] leading-4"
                          style={{ color: theme.colors.textMuted }}
                        >
                          {category.description || c.common.noDescription}
                        </Text>
                        <Text
                          className="mt-1.5 text-[8px] font-extrabold"
                          style={{ color: theme.colors.textMuted }}
                        >
                          {productCount} {c.menu.products.toLowerCase()}
                        </Text>
                      </View>
                      <View
                        className="rounded-full px-2.5 py-1.5"
                        style={{
                          backgroundColor: category.isActive
                            ? theme.colors.successSurface
                            : theme.colors.surfaceRaised,
                        }}
                      >
                        <Text
                          className="text-[7px] font-black"
                          style={{
                            color: category.isActive
                              ? theme.colors.success
                              : theme.colors.textMuted,
                          }}
                        >
                          {category.isActive ? c.menu.visible : c.menu.hidden}
                        </Text>
                      </View>
                    </View>
                    <View className="mt-3 flex-row gap-4">
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/category/[id]/edit",
                            params: {
                              id: category.id,
                              outletId,
                              outletName: outletName ?? "",
                            },
                          })
                        }
                      >
                        <Text
                          className="text-[9px] font-black"
                          style={{ color: theme.colors.primary }}
                        >
                          {language === "id" ? "Ubah" : "Edit"}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => void toggleCategory(category)}>
                        <Text
                          className="text-[9px] font-black"
                          style={{ color: theme.colors.primary }}
                        >
                          {category.isActive ? c.common.hide : c.common.show}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => confirmDeleteCategory(category)}>
                        <Text
                          className="text-[9px] font-black"
                          style={{ color: theme.colors.danger }}
                        >
                          {c.common.delete}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <SectionHeader
            icon="product"
            title={`${c.menu.products} · ${products.length}`}
          />

          <View
            className="mb-3 min-h-[46px] flex-row items-center rounded-[16px] px-4"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <TextInput
              className="flex-1 text-[11px] font-semibold"
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              style={{ color: theme.colors.text, paddingVertical: 0 }}
              value={query}
            />
            {query ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setQuery("")}
                className="ml-2 px-2 py-2"
              >
                <Text
                  className="text-[10px] font-black"
                  style={{ color: theme.colors.primary }}
                >
                  ×
                </Text>
              </Pressable>
            ) : null}
          </View>

          {categories.length > 0 ? (
            <ScrollView
              className="-mx-[18px] mb-3"
              contentContainerStyle={{
                gap: 8,
                paddingHorizontal: 18,
              }}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <FilterChip
                label={allLabel}
                selected={selectedCategoryId === null}
                onPress={() => setSelectedCategoryId(null)}
              />
              {categories.map((category) => (
                <FilterChip
                  key={category.id}
                  label={category.name}
                  selected={selectedCategoryId === category.id}
                  onPress={() => setSelectedCategoryId(category.id)}
                />
              ))}
            </ScrollView>
          ) : null}

          {products.length === 0 ? (
            <EmptyCard
              title={c.menu.noProduct}
              description={c.menu.noProductDescription}
            />
          ) : filteredProducts.length === 0 ? (
            <EmptyCard
              title={filteredEmptyTitle}
              description={filteredEmptyDescription}
            />
          ) : (
            <View className="gap-2">
              {filteredProducts.map((product) => {
                const category = categories.find(
                  (item) => item.id === product.categoryId,
                );

                return (
                  <View
                    className="flex-row rounded-[22px] p-3"
                    key={product.id}
                    style={{ backgroundColor: theme.colors.surface }}
                  >
                    {product.imageUrl ? (
                      <Image
                        source={{ uri: product.imageUrl }}
                        className="h-[74px] w-[74px] rounded-[17px]"
                      />
                    ) : (
                      <View
                        className="h-[74px] w-[74px] items-center justify-center rounded-[17px]"
                        style={{ backgroundColor: theme.colors.surfaceRaised }}
                      >
                        <NitipIcon
                          color={theme.colors.textMuted}
                          name="image"
                          size={24}
                        />
                      </View>
                    )}
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-start justify-between gap-2">
                        <Text
                          className="flex-1 text-[12px] font-black"
                          style={{ color: theme.colors.text }}
                        >
                          {product.name}
                        </Text>
                        <Text
                          className="text-[10px] font-black"
                          style={{ color: theme.colors.primary }}
                        >
                          {formatRupiah(product.price)}
                        </Text>
                      </View>
                      <Text
                        className="mt-1 text-[8px] leading-4"
                        style={{ color: theme.colors.textMuted }}
                      >
                        {category?.name ?? c.menu.noCategoryLabel} ·{" "}
                        {product.stockQuantity == null
                          ? c.menu.stockUntracked
                          : c.menu.stock.replace(
                              "{{count}}",
                              String(product.stockQuantity),
                            )}
                      </Text>
                      <Text
                        className="mt-1 text-[8px] font-extrabold"
                        style={{
                          color:
                            product.isAvailable && product.isActive
                              ? theme.colors.success
                              : theme.colors.textMuted,
                        }}
                      >
                        {product.isActive ? c.menu.visible : c.menu.hidden} ·{" "}
                        {product.isAvailable
                          ? c.common.available
                          : c.common.unavailable}
                      </Text>
                      <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-2">
                        <Pressable
                          onPress={() =>
                            router.push({
                              pathname: "/product/[id]/edit",
                              params: {
                                id: product.id,
                                outletId,
                                outletName: outletName ?? "",
                              },
                            })
                          }
                        >
                          <Text
                            className="text-[9px] font-black"
                            style={{ color: theme.colors.primary }}
                          >
                            {language === "id" ? "Ubah" : "Edit"}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void toggleAvailability(product)}
                        >
                          <Text
                            className="text-[9px] font-black"
                            style={{ color: theme.colors.primary }}
                          >
                            {product.isAvailable
                              ? c.menu.markSoldOut
                              : c.menu.markAvailable}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void toggleProductVisibility(product)}
                        >
                          <Text
                            className="text-[9px] font-black"
                            style={{ color: theme.colors.primary }}
                          >
                            {product.isActive
                              ? c.common.hide
                              : c.common.show}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => confirmDeleteProduct(product)}
                        >
                          <Text
                            className="text-[9px] font-black"
                            style={{ color: theme.colors.danger }}
                          >
                            {c.common.delete}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {error ? (
        <View
          className="mt-4 rounded-[18px] p-4"
          style={{ backgroundColor: theme.colors.dangerSurface }}
        >
          <Text
            className="text-[10px] leading-4"
            style={{ color: theme.colors.danger }}
          >
            {error}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );

  function MetricCard({
    icon,
    label,
    value,
  }: {
    icon: "category" | "product" | "visibility";
    label: string;
    value: number;
  }) {
    return (
      <View
        className="min-h-[74px] flex-1 rounded-[18px] p-3"
        style={{ backgroundColor: theme.colors.surface }}
      >
        <NitipIcon color={theme.colors.primary} name={icon} size={15} />
        <Text
          className="mt-2 text-[16px] font-black"
          style={{ color: theme.colors.text }}
        >
          {value}
        </Text>
        <Text
          className="mt-0.5 text-[7px] font-extrabold"
          numberOfLines={1}
          style={{ color: theme.colors.textMuted }}
        >
          {label}
        </Text>
      </View>
    );
  }

  function SectionHeader({
    icon,
    title,
  }: {
    icon: "category" | "product";
    title: string;
  }) {
    return (
      <View className="mb-3 mt-8 flex-row items-center gap-2">
        <NitipIcon color={theme.colors.primary} name={icon} size={17} />
        <Text
          className="text-[15px] font-black"
          style={{ color: theme.colors.text }}
        >
          {title}
        </Text>
      </View>
    );
  }

  function FilterChip({
    label,
    onPress,
    selected,
  }: {
    label: string;
    onPress: () => void;
    selected: boolean;
  }) {
    return (
      <Pressable
        className="min-h-[36px] items-center justify-center rounded-full px-4"
        onPress={onPress}
        style={{
          backgroundColor: selected
            ? theme.colors.primary
            : theme.colors.surface,
        }}
      >
        <Text
          className="text-[9px] font-black"
          style={{
            color: selected ? "#FFFFFF" : theme.colors.textMuted,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function EmptyCard({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) {
    return (
      <View
        className="rounded-[22px] p-5"
        style={{ backgroundColor: theme.colors.surface }}
      >
        <Text
          className="text-[12px] font-black"
          style={{ color: theme.colors.text }}
        >
          {title}
        </Text>
        <Text
          className="mt-1 text-[9px] leading-4"
          style={{ color: theme.colors.textMuted }}
        >
          {description}
        </Text>
      </View>
    );
  }
}
