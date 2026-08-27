import { formatRupiah } from "@nitip/domain";
import type { NitipCategory, NitipProduct } from "@nitip/domain/catalog";
import { useNitipLanguage } from "@nitip/i18n";
import { Redirect, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NitipIcon } from "../components/NitipIcon";
import { getMerchantCopy } from "../constants/merchantCopy";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { deleteCategory, deleteProduct, listCategories, listProducts, updateCategory, updateProduct } from "../lib/api";

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

  if (!user) return <Redirect href="/login" />;

  async function toggleCategory(category: NitipCategory) {
    try {
      const next = await updateCategory(user, outletId, category.id, { isActive: !category.isActive });
      setCategories((current) => current.map((item) => item.id === next.id ? next : item));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.menu.toggleCategoryError);
    }
  }

  async function toggleAvailability(product: NitipProduct) {
    try {
      const next = await updateProduct(user, outletId, product.id, { isAvailable: !product.isAvailable });
      setProducts((current) => current.map((item) => item.id === next.id ? next : item));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.menu.toggleAvailabilityError);
    }
  }

  async function toggleProductVisibility(product: NitipProduct) {
    try {
      const next = await updateProduct(user, outletId, product.id, { isActive: !product.isActive });
      setProducts((current) => current.map((item) => item.id === next.id ? next : item));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.menu.toggleVisibilityError);
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
          onPress: () => void (async () => {
            try {
              await deleteProduct(user, outletId, product.id);
              setProducts((current) => current.filter((item) => item.id !== product.id));
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : c.menu.deleteProductError);
            }
          })(),
        },
      ],
    );
  }

  function confirmDeleteCategory(category: NitipCategory) {
    Alert.alert(c.menu.deleteCategoryTitle, c.menu.deleteCategoryDescription, [
      { text: c.common.cancel, style: "cancel" },
      {
        text: c.common.delete,
        style: "destructive",
        onPress: () => void (async () => {
          try {
            await deleteCategory(user, outletId, category.id);
            setCategories((current) => current.filter((item) => item.id !== category.id));
          } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : c.menu.deleteCategoryError);
          }
        })(),
      },
    ]);
  }

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
      <AppHeader title={outletName || c.menu.titleFallback} onBack={() => router.back()} />

      <View className="mt-7">
        <Text className="text-[9px] font-black tracking-[1.2px]" style={{ color: theme.colors.primary }}>{c.menu.eyebrow}</Text>
        <Text className="mt-2 text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>{outletName || c.menu.titleFallback}</Text>
        <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{c.menu.subtitle}</Text>
      </View>

      <View className="mt-5 flex-row gap-2">
        <Pressable
          className="min-h-[48px] flex-1 flex-row items-center justify-center rounded-[16px]"
          onPress={() => router.push({ pathname: "/category/new", params: { outletId, outletName: outletName ?? "" } })}
          style={{ backgroundColor: theme.colors.surfaceAccent }}
        >
          <NitipIcon color={theme.colors.primary} name="category" size={16} />
          <Text className="ml-2 text-[10px] font-black" style={{ color: theme.colors.primary }}>+ {c.menu.addCategory}</Text>
        </Pressable>
        <Pressable
          className="min-h-[48px] flex-1 flex-row items-center justify-center rounded-[16px]"
          onPress={() => router.push({ pathname: "/product/new", params: { outletId, outletName: outletName ?? "" } })}
          style={{ backgroundColor: theme.colors.primary }}
        >
          <NitipIcon color="#FFFFFF" name="product" size={16} />
          <Text className="ml-2 text-[10px] font-black text-white">+ {c.menu.addProduct}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="mt-6 items-center rounded-[22px] p-7" style={{ backgroundColor: theme.colors.surface }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>{c.menu.loading}</Text>
        </View>
      ) : (
        <>
          <SectionHeader icon="category" title={c.menu.categories} />
          {categories.length === 0 ? (
            <EmptyCard title={c.menu.noCategory} description={c.menu.noCategoryDescription} />
          ) : (
            <View className="gap-2">
              {categories.map((category) => (
                <View className="rounded-[20px] p-4" key={category.id} style={{ backgroundColor: theme.colors.surface }}>
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-[12px] font-black" style={{ color: theme.colors.text }}>{category.name}</Text>
                      <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                        {category.description || c.common.noDescription}
                      </Text>
                    </View>
                    <View
                      className="rounded-full px-2.5 py-1.5"
                      style={{ backgroundColor: category.isActive ? theme.colors.successSurface : theme.colors.surfaceRaised }}
                    >
                      <Text className="text-[7px] font-black" style={{ color: category.isActive ? theme.colors.success : theme.colors.textMuted }}>
                        {category.isActive ? c.menu.visible : c.menu.hidden}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-3 flex-row gap-4">
                    <Pressable
                      onPress={() => router.push({
                        pathname: "/category/[id]/edit",
                        params: {
                          id: category.id,
                          outletId,
                          outletName: outletName ?? "",
                        },
                      })}
                    >
                      <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>
                        {language === "id" ? "Ubah" : "Edit"}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => void toggleCategory(category)}>
                      <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>
                        {category.isActive ? c.common.hide : c.common.show}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => confirmDeleteCategory(category)}>
                      <Text className="text-[9px] font-black" style={{ color: theme.colors.danger }}>{c.common.delete}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          <SectionHeader icon="product" title={c.menu.products} />
          {products.length === 0 ? (
            <EmptyCard title={c.menu.noProduct} description={c.menu.noProductDescription} />
          ) : (
            <View className="gap-2">
              {products.map((product) => {
                const category = categories.find((item) => item.id === product.categoryId);
                return (
                  <View className="flex-row rounded-[22px] p-3" key={product.id} style={{ backgroundColor: theme.colors.surface }}>
                    {product.imageUrl ? (
                      <Image source={{ uri: product.imageUrl }} className="h-[74px] w-[74px] rounded-[17px]" />
                    ) : (
                      <View className="h-[74px] w-[74px] items-center justify-center rounded-[17px]" style={{ backgroundColor: theme.colors.surfaceRaised }}>
                        <NitipIcon color={theme.colors.textMuted} name="image" size={24} />
                      </View>
                    )}
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-start justify-between gap-2">
                        <Text className="flex-1 text-[12px] font-black" style={{ color: theme.colors.text }}>{product.name}</Text>
                        <Text className="text-[10px] font-black" style={{ color: theme.colors.primary }}>{formatRupiah(product.price)}</Text>
                      </View>
                      <Text className="mt-1 text-[8px] leading-4" style={{ color: theme.colors.textMuted }}>
                        {category?.name ?? c.menu.noCategoryLabel} · {product.stockQuantity == null ? c.menu.stockUntracked : c.menu.stock.replace("{{count}}", String(product.stockQuantity))}
                      </Text>
                      <Text
                        className="mt-1 text-[8px] font-extrabold"
                        style={{ color: product.isAvailable && product.isActive ? theme.colors.success : theme.colors.textMuted }}
                      >
                        {product.isActive ? c.menu.visible : c.menu.hidden} · {product.isAvailable ? c.common.available : c.common.unavailable}
                      </Text>
                      <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-2">
                        <Pressable
                          onPress={() => router.push({
                            pathname: "/product/[id]/edit",
                            params: {
                              id: product.id,
                              outletId,
                              outletName: outletName ?? "",
                            },
                          })}
                        >
                          <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>
                            {language === "id" ? "Ubah" : "Edit"}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => void toggleAvailability(product)}>
                          <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>
                            {product.isAvailable ? c.menu.markSoldOut : c.menu.markAvailable}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => void toggleProductVisibility(product)}>
                          <Text className="text-[9px] font-black" style={{ color: theme.colors.primary }}>
                            {product.isActive ? c.common.hide : c.common.show}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => confirmDeleteProduct(product)}>
                          <Text className="text-[9px] font-black" style={{ color: theme.colors.danger }}>{c.common.delete}</Text>
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
        <View className="mt-4 rounded-[18px] p-4" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );

  function SectionHeader({ icon, title }: { icon: "category" | "product"; title: string }) {
    return (
      <View className="mb-3 mt-8 flex-row items-center gap-2">
        <NitipIcon color={theme.colors.primary} name={icon} size={17} />
        <Text className="text-[15px] font-black" style={{ color: theme.colors.text }}>{title}</Text>
      </View>
    );
  }

  function EmptyCard({ title, description }: { title: string; description: string }) {
    return (
      <View className="rounded-[22px] p-5" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="text-[12px] font-black" style={{ color: theme.colors.text }}>{title}</Text>
        <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{description}</Text>
      </View>
    );
  }
}
