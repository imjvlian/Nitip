import { SymbolView } from "expo-symbols";
import bold from "expo-symbols/androidWeights/bold";
import regular from "expo-symbols/androidWeights/regular";
import type { ColorValue } from "react-native";

export type NitipIconName =
  | "home"
  | "office"
  | "orders"
  | "profile"
  | "cart"
  | "promo"
  | "search"
  | "filter"
  | "food"
  | "drink"
  | "store"
  | "back"
  | "next"
  | "plus"
  | "minus"
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
  | "history"
  | "receipt"
  | "help"
  | "password"
  | "age"
  | "document"
  | "privacy"
  | "camera";

export type NitipIconVariant = "default" | "outline" | "filled";

type NitipSymbol = { ios: string; android: string; web: string };

const symbols: Record<NitipIconName, NitipSymbol> = {
  home: { ios: "house.fill", android: "home", web: "home" },
  office: { ios: "building.2.fill", android: "business", web: "business" },
  orders: { ios: "receipt.fill", android: "receipt_long", web: "receipt_long" },
  profile: { ios: "person.fill", android: "person", web: "person" },
  cart: { ios: "cart.fill", android: "shopping_cart", web: "shopping_cart" },
  promo: { ios: "tag.fill", android: "local_offer", web: "local_offer" },
  search: { ios: "magnifyingglass", android: "search", web: "search" },
  filter: { ios: "slider.horizontal.3", android: "tune", web: "tune" },
  food: { ios: "fork.knife", android: "restaurant", web: "restaurant" },
  drink: { ios: "cup.and.saucer.fill", android: "local_cafe", web: "local_cafe" },
  store: { ios: "storefront.fill", android: "storefront", web: "storefront" },
  back: { ios: "chevron.left", android: "chevron_left", web: "chevron_left" },
  next: { ios: "chevron.right", android: "chevron_right", web: "chevron_right" },
  plus: { ios: "plus", android: "add", web: "add" },
  minus: { ios: "minus", android: "remove", web: "remove" },
  trash: { ios: "trash.fill", android: "delete", web: "delete" },
  check: { ios: "checkmark", android: "check", web: "check" },
  location: { ios: "location.fill", android: "my_location", web: "my_location" },
  language: { ios: "globe", android: "language", web: "language" },
  theme: { ios: "circle.lefthalf.filled", android: "contrast", web: "contrast" },
  system: { ios: "desktopcomputer", android: "devices", web: "devices" },
  sun: { ios: "sun.max.fill", android: "light_mode", web: "light_mode" },
  moon: { ios: "moon.fill", android: "dark_mode", web: "dark_mode" },
  logout: {
    ios: "rectangle.portrait.and.arrow.right",
    android: "logout",
    web: "logout",
  },
  clock: { ios: "clock.fill", android: "schedule", web: "schedule" },
  history: { ios: "clock.arrow.circlepath", android: "history", web: "history" },
  receipt: { ios: "doc.text.fill", android: "receipt", web: "receipt" },
  help: { ios: "questionmark.circle.fill", android: "help", web: "help" },
  password: { ios: "key.fill", android: "key", web: "key" },
  age: { ios: "checkmark.seal.fill", android: "verified_user", web: "verified_user" },
  document: { ios: "doc.text.fill", android: "description", web: "description" },
  privacy: { ios: "lock.shield.fill", android: "privacy_tip", web: "privacy_tip" },
  camera: { ios: "camera.fill", android: "photo_camera", web: "photo_camera" },
};

const outlineSymbols: Partial<Record<NitipIconName, NitipSymbol>> = {
  home: { ios: "house", android: "home", web: "home" },
  orders: { ios: "receipt", android: "receipt_long", web: "receipt_long" },
  promo: { ios: "tag", android: "local_offer", web: "local_offer" },
  cart: { ios: "cart", android: "shopping_cart", web: "shopping_cart" },
  profile: { ios: "person", android: "person", web: "person" },
};

export function NitipIcon({
  color,
  name,
  size = 20,
  variant = "default",
}: {
  color: ColorValue;
  name: NitipIconName;
  size?: number;
  variant?: NitipIconVariant;
}) {
  const symbol = variant === "outline" ? outlineSymbols[name] ?? symbols[name] : symbols[name];
  const weight =
    variant === "filled"
      ? ({ ios: "semibold", android: bold } as never)
      : variant === "outline"
        ? ({ ios: "regular", android: regular } as never)
        : undefined;

  return (
    <SymbolView
      name={symbol as never}
      size={size}
      style={{ height: size, width: size }}
      tintColor={color}
      weight={weight}
    />
  );
}
