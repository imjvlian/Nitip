import { Symbol as ExpoSymbol, SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  Image,
  Platform,
  View,
  type ColorValue,
  type ImageSourcePropType,
} from "react-native";

export type NitipIconName =
  | "home"
  | "orders"
  | "settings"
  | "store"
  | "menu"
  | "product"
  | "category"
  | "back"
  | "next"
  | "plus"
  | "trash"
  | "check"
  | "location"
  | "language"
  | "theme"
  | "system"
  | "sun"
  | "moon"
  | "logout"
  | "clock"
  | "image"
  | "visibility"
  | "power"
  | "profile";

const symbols: Record<NitipIconName, { ios: string; android: string; web: string }> = {
  home: { ios: "house.fill", android: "home", web: "home" },
  orders: { ios: "receipt.fill", android: "receipt_long", web: "receipt_long" },
  settings: { ios: "gearshape.fill", android: "settings", web: "settings" },
  store: { ios: "storefront.fill", android: "storefront", web: "storefront" },
  menu: { ios: "list.bullet.rectangle.fill", android: "restaurant_menu", web: "restaurant_menu" },
  product: { ios: "shippingbox.fill", android: "inventory_2", web: "inventory_2" },
  category: { ios: "square.grid.2x2.fill", android: "category", web: "category" },
  back: { ios: "chevron.left", android: "chevron_left", web: "chevron_left" },
  next: { ios: "chevron.right", android: "chevron_right", web: "chevron_right" },
  plus: { ios: "plus", android: "add", web: "add" },
  trash: { ios: "trash.fill", android: "delete", web: "delete" },
  check: { ios: "checkmark", android: "check", web: "check" },
  location: { ios: "location.fill", android: "my_location", web: "my_location" },
  language: { ios: "globe", android: "language", web: "language" },
  theme: { ios: "circle.lefthalf.filled", android: "contrast", web: "contrast" },
  system: { ios: "desktopcomputer", android: "devices", web: "devices" },
  sun: { ios: "sun.max.fill", android: "light_mode", web: "light_mode" },
  moon: { ios: "moon.fill", android: "dark_mode", web: "dark_mode" },
  logout: { ios: "rectangle.portrait.and.arrow.right", android: "logout", web: "logout" },
  clock: { ios: "clock.fill", android: "schedule", web: "schedule" },
  image: { ios: "photo.fill", android: "image", web: "image" },
  visibility: { ios: "eye.fill", android: "visibility", web: "visibility" },
  power: { ios: "power", android: "power_settings_new", web: "power_settings_new" },
  profile: { ios: "person.fill", android: "person", web: "person" },
};

const androidSourceCache = new Map<string, ImageSourcePropType>();

function AndroidNitipIcon({
  color,
  name,
  size,
}: {
  color: ColorValue;
  name: NitipIconName;
  size: number;
}) {
  const materialName = symbols[name].android;
  const resolvedColor = typeof color === "string" ? color : "#000000";
  const cacheKey = `${materialName}:${size}:${resolvedColor}`;
  const [source, setSource] = useState<ImageSourcePropType | null>(
    () => androidSourceCache.get(cacheKey) ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    const cached = androidSourceCache.get(cacheKey);

    if (cached) {
      setSource(cached);
      return () => {
        cancelled = true;
      };
    }

    setSource(null);

    void ExpoSymbol.unstable_getMaterialSymbolSourceAsync(
      materialName as never,
      size,
      resolvedColor,
    ).then((nextSource) => {
      if (!nextSource) return;
      androidSourceCache.set(cacheKey, nextSource);
      if (!cancelled) setSource(nextSource);
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, materialName, resolvedColor, size]);

  return (
    <View
      style={{
        alignItems: "center",
        height: size,
        justifyContent: "center",
        width: size,
      }}
    >
      {source ? (
        <Image
          resizeMode="contain"
          source={source}
          style={{ height: size, width: size }}
        />
      ) : null}
    </View>
  );
}

export function NitipIcon({
  color,
  name,
  size = 20,
}: {
  color: ColorValue;
  name: NitipIconName;
  size?: number;
}) {
  if (Platform.OS === "android") {
    return <AndroidNitipIcon color={color} name={name} size={size} />;
  }

  return (
    <SymbolView
      name={symbols[name] as never}
      size={size}
      tintColor={color}
    />
  );
}
