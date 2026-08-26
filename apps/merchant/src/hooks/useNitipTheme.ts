import { getNitipTheme } from "@nitip/theme";
import { useColorScheme } from "react-native";

export function useNitipTheme() {
  const colorScheme = useColorScheme();
  return getNitipTheme(colorScheme === "dark" ? "dark" : "light");
}
