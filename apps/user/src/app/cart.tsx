import { formatRupiah } from "@nitip/domain";
import { useNitipTranslation } from "@nitip/i18n";
import { Redirect, router } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NitipIcon } from "../components/NitipIcon";
import { useAuth } from "../context/AuthContext";
import { cartLineUnitPrice, useCart } from "../context/CartContext";
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
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full"
            onPress={() => router.back()}
            style={{ backgroundColor: theme.colors.surface }}
          >
            <NitipIcon color={theme.colors.text} name="back" size={18} />
          </Pressable>
          <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
            {t("common.cart")}
          </Text>
          <View className="h-10 w-10" />
        </View>

        <View className="mt-7">
          <Text className="text-[26px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
            {cart.outlet?.businessName ?? t("cart.emptyTitle")}
          </Text>
          {cart.outlet ? (
            <Text className="mt-1 text-xs" style={{ color: theme.colors.textMuted }}>
              {cart.outlet.name}
            </Text>
          ) : null}
        </View>

        {cart.items.length === 0 ? (
          <View className="mt-5 rounded-[24px] p-6" style={{ backgroundColor: theme.colors.surface }}>
            <View className="mb-4 h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.surfaceRaised }}>
              <NitipIcon color={theme.colors.primary} name="cart" size={21} />
            </View>
            <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
              {t("cart.noProducts")}
            </Text>
            <Text className="mt-2 text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>
              {t("cart.noProductsDescription")}
            </Text>
            <Pressable
              className="mt-5 min-h-12 flex-row items-center justify-center gap-2 rounded-2xl"
              onPress={() => router.replace("/home")}
              style={{ backgroundColor: theme.colors.primary }}
            >
              <NitipIcon color="#FFFFFF" name="store" size={17} />
              <Text className="text-xs font-black text-white">{t("cart.browseMerchants")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="mt-5 gap-2.5">
              {cart.items.map((item) => {
                const maxQuantity = item.product.stockQuantity ?? 99;
                const unitPrice = cartLineUnitPrice(item);
                return (
                  <View className="flex-row rounded-[24px] p-3" key={item.product.id} style={{ backgroundColor: theme.colors.surface }}>
                    {item.product.imageUrl ? (
                      <Image
                        className="h-[82px] w-[82px] rounded-[18px]"
                        source={{ uri: item.product.imageUrl }}
                        style={{ backgroundColor: theme.colors.surfaceAccent }}
                      />
                    ) : (
                      <View className="h-[82px] w-[82px] items-center justify-center rounded-[18px]" style={{ backgroundColor: theme.colors.surfaceRaised }}>
                        <Text className="text-2xl font-black" style={{ color: theme.colors.primary }}>
                          N
                        </Text>
                      </View>
                    )}

                    <View className="flex-1 pl-3.5">
                      <Text className="text-xs font-black" numberOfLines={2} style={{ color: theme.colors.text }}>
                        {item.product.name}
                      </Text>
                      <Text className="mt-1 text-[11px] font-extrabold" style={{ color: theme.colors.primary }}>
                        {formatRupiah(unitPrice)}
                      </Text>

                      {item.selectedAddons.length > 0 ? (
                        <View className="mt-1.5">
                          {item.selectedAddons.map((addon) => (
                            <Text key={addon.id} className="text-[8px] leading-3.5" style={{ color: theme.colors.textMuted }}>
                              + {addon.name}{addon.price > 0 ? ` · ${formatRupiah(addon.price)}` : ""}
                            </Text>
                          ))}
                        </View>
                      ) : null}

                      <View className="mt-3 flex-row items-center gap-2">
                        <Pressable
                          className="h-8 w-8 items-center justify-center rounded-xl"
                          onPress={() => cart.setQuantity(item.product.id, item.quantity - 1)}
                          style={{ backgroundColor: theme.colors.surfaceRaised }}
                        >
                          <NitipIcon color={theme.colors.text} name="minus" size={16} />
                        </Pressable>
                        <Text className="min-w-6 text-center text-xs font-black" style={{ color: theme.colors.text }}>
                          {item.quantity}
                        </Text>
                        <Pressable
                          className="h-8 w-8 items-center justify-center rounded-xl"
                          disabled={item.quantity >= maxQuantity}
                          onPress={() => cart.setQuantity(item.product.id, item.quantity + 1)}
                          style={{ backgroundColor: theme.colors.surfaceRaised, opacity: item.quantity >= maxQuantity ? 0.35 : 1 }}
                        >
                          <NitipIcon color={theme.colors.text} name="plus" size={16} />
                        </Pressable>
                        <Pressable className="ml-1 h-8 w-8 items-center justify-center rounded-xl" onPress={() => cart.removeItem(item.product.id)} style={{ backgroundColor: theme.colors.dangerSurface }}>
                          <NitipIcon color={theme.colors.danger} name="trash" size={14} />
                        </Pressable>
                      </View>

                      <Text className="mt-2 text-[11px] font-black" style={{ color: theme.colors.text }}>
                        {formatRupiah(unitPrice * item.quantity)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View className="mt-4 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-[10px]" style={{ color: theme.colors.textMuted }}>
                  {t("cart.subtotal")}
                </Text>
                <Text className="text-sm font-black" style={{ color: theme.colors.text }}>
                  {formatRupiah(cart.subtotal)}
                </Text>
              </View>
              <Text className="mt-1.5 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>
                {t("cart.feeNote")}
              </Text>
            </View>

            <Pressable className="mt-3 flex-row items-center justify-center gap-2 py-3" onPress={cart.clearCart}>
              <NitipIcon color={theme.colors.danger} name="trash" size={14} />
              <Text className="text-[10px] font-black" style={{ color: theme.colors.danger }}>
                {t("cart.clear")}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {cart.items.length > 0 ? (
        <View
          className="absolute bottom-0 left-0 right-0 px-5 pt-3"
          style={{
            backgroundColor: theme.colors.surfaceRaised,
            paddingBottom: Math.max(insets.bottom, 12),
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: theme.mode === "dark" ? 0.22 : 0.06,
            shadowRadius: 14,
            elevation: 10,
          }}
        >
          <View className="flex-row items-center gap-4">
            <View className="flex-1">
              <Text className="text-[9px] font-bold" style={{ color: theme.colors.textMuted }}>
                {t("cart.subtotal")}
              </Text>
              <Text className="mt-0.5 text-sm font-black" style={{ color: theme.colors.text }}>
                {formatRupiah(cart.subtotal)}
              </Text>
            </View>
            <Pressable
              className="min-h-[52px] flex-[1.45] flex-row items-center justify-center gap-2 rounded-2xl px-4"
              onPress={() => router.push("/checkout")}
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Text className="text-center text-xs font-black text-white">
                {t("cart.checkoutCta", { count: cart.itemCount })}
              </Text>
              <NitipIcon color="#FFFFFF" name="next" size={16} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
