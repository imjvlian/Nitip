import { SymbolView } from "expo-symbols";
import type { ColorValue } from "react-native";

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

export function NitipIcon({ color, name, size = 20 }: { color: ColorValue; name: NitipIconName; size?: number }) {
  return (
    <SymbolView
      name={symbols[name] as never}
      size={size}
      tintColor={color}
    />
  );
}
