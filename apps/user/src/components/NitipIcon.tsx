import { SymbolView } from "expo-symbols";
import type { ColorValue } from "react-native";

export type NitipIconName =
  | "home"
  | "office"
  | "orders"
  | "profile"
  | "cart"
  | "search"
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
  | "receipt";

const symbols: Record<
  NitipIconName,
  { ios: string; android: string; web: string }
> = {
  home: { ios: "house.fill", android: "home", web: "home" },
  office: { ios: "building.2.fill", android: "business", web: "business" },
  orders: { ios: "receipt.fill", android: "receipt_long", web: "receipt_long" },
  profile: { ios: "person.fill", android: "person", web: "person" },
  cart: { ios: "cart.fill", android: "shopping_cart", web: "shopping_cart" },
  search: { ios: "magnifyingglass", android: "search", web: "search" },
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
};

export function NitipIcon({
  color,
  name,
  size = 20,
}: {
  color: ColorValue;
  name: NitipIconName;
  size?: number;
}) {
  return (
    <SymbolView
      name={symbols[name] as never}
      size={size}
      style={{ height: size, width: size }}
      tintColor={color}
    />
  );
}
