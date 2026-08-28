import { SymbolView } from "expo-symbols";
import type { ColorValue } from "react-native";

export type NitipIconName =
  | "home" | "orders" | "settings" | "back" | "next" | "profile" | "vehicle" | "location" | "power" | "refresh" | "clock" | "check" | "store" | "delivery" | "earnings" | "language" | "theme" | "system" | "sun" | "moon" | "logout" | "safety" | "camera" | "phone" | "share" | "help" | "notification";

const symbols: Record<NitipIconName, { ios: string; android: string; web: string }> = {
  home: { ios: "house.fill", android: "home", web: "home" }, orders: { ios: "receipt.fill", android: "receipt_long", web: "receipt_long" }, settings: { ios: "gearshape.fill", android: "settings", web: "settings" },
  back: { ios: "chevron.left", android: "chevron_left", web: "chevron_left" }, next: { ios: "chevron.right", android: "chevron_right", web: "chevron_right" }, profile: { ios: "person.fill", android: "person", web: "person" },
  vehicle: { ios: "motorcycle.fill", android: "two_wheeler", web: "two_wheeler" }, location: { ios: "location.fill", android: "my_location", web: "my_location" }, power: { ios: "power", android: "power_settings_new", web: "power_settings_new" },
  refresh: { ios: "arrow.clockwise", android: "refresh", web: "refresh" }, clock: { ios: "clock.fill", android: "schedule", web: "schedule" }, check: { ios: "checkmark", android: "check", web: "check" },
  store: { ios: "storefront.fill", android: "storefront", web: "storefront" }, delivery: { ios: "box.truck.fill", android: "local_shipping", web: "local_shipping" }, earnings: { ios: "banknote.fill", android: "account_balance_wallet", web: "account_balance_wallet" },
  language: { ios: "globe", android: "language", web: "language" }, theme: { ios: "circle.lefthalf.filled", android: "contrast", web: "contrast" }, system: { ios: "desktopcomputer", android: "devices", web: "devices" },
  sun: { ios: "sun.max.fill", android: "light_mode", web: "light_mode" }, moon: { ios: "moon.fill", android: "dark_mode", web: "dark_mode" }, logout: { ios: "rectangle.portrait.and.arrow.right", android: "logout", web: "logout" },
  safety: { ios: "shield.fill", android: "health_and_safety", web: "health_and_safety" }, camera: { ios: "camera.fill", android: "photo_camera", web: "photo_camera" }, phone: { ios: "phone.fill", android: "call", web: "call" }, share: { ios: "square.and.arrow.up", android: "share", web: "share" }, help: { ios: "exclamationmark.bubble.fill", android: "report_problem", web: "report_problem" },
  notification: { ios: "bell.fill", android: "notifications", web: "notifications" },
};

export function NitipIcon({ color, name, size = 20 }: { color: ColorValue; name: NitipIconName; size?: number }) {
  return <SymbolView name={symbols[name] as never} size={size} tintColor={color} />;
}
