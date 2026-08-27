import { useMerchantTheme } from "../context/ThemeContext";

export function useNitipTheme() {
  return useMerchantTheme().theme;
}
