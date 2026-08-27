import { formatRupiah } from "@nitip/domain";
import { useNitipTranslation } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

export default function CartScreen() {
  const { t } = useNitipTranslation();
  const { user } = useAuth();
  const cart = useCart();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();

  if (!user) return <Redirect href="/login" />;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 14,
          paddingBottom: cart.items.length > 0 ? 145 : 30,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <Pressable className="min-h-10 justify-center pr-4" onPress={() => router.back()}>
            <Text className="text-xs font-black" style={{ color: theme.colors.primary }}>
              ‹ {t("common.back")}
            </Text>
          </Pressable>
          <Text className="text-2xl font-black tracking-tighter" style={{ color: theme.colors.primaryStrong }}>
            nitip.
          </Text>
        </View>

        <View className="mt-8">
          <Text className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: theme.colors.primary }}>
            {t("cart.eyebrow")}
          </Text>
          <Text className="mt-2 text-3xl font-black tracking-tighter" style={{ color: theme.colors.text }}>
            {cart.outlet?.businessName ?? t("cart.emptyTitle")}
          </Text>
          {cart.outlet ? (
            <Text className="mt-1 text-sm" style={{ color: theme.colors.textMuted }}>
              {cart.outlet.name}
            </Text>
          ) : null}
        </View>

        {cart.items.length === 0 ? (
          <View
            className="mt-6 rounded-3xl border p-6"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
          >
            <Text className="text-base font-black" style={{ color: theme.colors.text }}>
              {t("cart.noProducts")}
            </Text>
            <Text className="mt-2 text-xs leading-5" style={{ color: theme.colors.textMuted }}>
              {t("cart.noProductsDescription")}
            </Text>
            <Pressable
              className="mt-5 min-h-12 items-center justify-center rounded-2xl"
              onPress={() => router.replace("/home")}
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Text className="text-xs font-black text-white">{t("cart.browseMerchants")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="mt-5 gap-3">
              {cart.items.map((item) => {
                const maxQuantity = item.product.stockQuantity ?? 99;
                return (
                  <View
                    className="flex-row rounded-3xl border p-3"
                    key={item.product.id}
                    style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
                  >
                    {item.product.imageUrl ? (
                      <Image
                        className="h-24 w-24 rounded-2xl"
                        source={{ uri: item.product.imageUrl }}
                        style={{ backgroundColor: theme.colors.surfaceAccent }}
                      />
                    ) : (
                      <View
                        className="h-24 w-24 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: theme.colors.surfaceAccent }}
                      >
                        <Text className="text-3xl font-black" style={{ color: theme.colors.primary }}>
                          N
                        </Text>
                      </View>
                    )}

                    <View className="flex-1 pl-4">
                      <Text className="text-sm font-black" numberOfLines={2} style={{ color: theme.colors.text }}>
                        {item.product.name}
                      </Text>
                      <Text className="mt-1 text-xs font-extrabold" style={{ color: theme.colors.primary }}>
                        {formatRupiah(item.product.price)}
                      </Text>

                      <View className="mt-3 flex-row items-center gap-2">
                        <Pressable
                          className="h-9 w-9 items-center justify-center rounded-xl border"
                          onPress={() => cart.setQuantity(item.product.id, item.quantity - 1)}
                          style={{ borderColor: theme.colors.border }}
                        >
                          <Text className="text-lg font-black" style={{ color: theme.colors.text }}>−</Text>
                        </Pressable>
                        <Text className="min-w-7 text-center text-sm font-black" style={{ color: theme.colors.text }}>
                          {item.quantity}
                        </Text>
                        <Pressable
                          className="h-9 w-9 items-center justify-center rounded-xl border"
                          disabled={item.quantity >= maxQuantity}
                          onPress={() => cart.setQuantity(item.product.id, item.quantity + 1)}
                          style={{
                            borderColor: theme.colors.border,
                            opacity: item.quantity >= maxQuantity ? 0.35 : 1,
                          }}
                        >
                          <Text className="text-lg font-black" style={{ color: theme.colors.text }}>+</Text>
                        </Pressable>
                        <Pressable className="ml-2 py-2" onPress={() => cart.removeItem(item.product.id)}>
                          <Text className="text-[11px] font-black" style={{ color: theme.colors.danger }}>
                            {t("cart.remove")}
                          </Text>
                        </Pressable>
                      </View>

                      <Text className="mt-3 text-xs font-black" style={{ color: theme.colors.text }}>
                        {formatRupiah(item.product.price * item.quantity)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View
              className="mt-5 rounded-3xl p-5"
              style={{ backgroundColor: theme.colors.surfaceAccent }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-xs" style={{ color: theme.colors.textMuted }}>
                  {t("cart.subtotal")}
                </Text>
                <Text className="text-base font-black" style={{ color: theme.colors.text }}>
                  {formatRupiah(cart.subtotal)}
                </Text>
              </View>
              <Text className="mt-2 text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>
                {t("cart.feeNote")}
              </Text>
            </View>

            <Pressable className="mt-4 items-center py-3" onPress={cart.clearCart}>
              <Text className="text-xs font-black" style={{ color: theme.colors.danger }}>
                {t("cart.clear")}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {cart.items.length > 0 ? (
        <View
          className="absolute bottom-0 left-0 right-0 border-t px-5 pt-3"
          style={{
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          <View className="flex-row items-center gap-4">
            <View className="flex-1">
              <Text className="text-[10px] font-bold" style={{ color: theme.colors.textMuted }}>
                {t("cart.subtotal")}
              </Text>
              <Text className="mt-0.5 text-base font-black" style={{ color: theme.colors.text }}>
                {formatRupiah(cart.subtotal)}
              </Text>
            </View>
            <Pressable
              className="min-h-[52px] flex-[1.45] items-center justify-center rounded-2xl px-4 py-4"
              onPress={() => router.push("/checkout")}
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Text className="text-center text-xs font-black text-white">
                {t("cart.checkoutCta", { count: cart.itemCount })}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
