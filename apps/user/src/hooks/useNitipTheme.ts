import { useUserTheme } from "../context/ThemeContext";

export function useNitipTheme() {
  return useUserTheme().theme;
}
