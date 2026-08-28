import { usePathname } from "expo-router";

import { useUserTheme } from "../context/ThemeContext";

export function useNitipTheme() {
  const pathname = usePathname();
  const { theme } = useUserTheme();

  const preserveExistingPresentation = pathname.startsWith("/settings");

  if (preserveExistingPresentation) return theme;

  if (theme.mode === "dark") {
    return {
      ...theme,
      colors: {
        ...theme.colors,
        background: "#121318",
        surface: "#1B1D23",
        surfaceRaised: "#22242B",
        secondary: "#24272E",
        border: "#2D3037",
      },
    };
  }

  return {
    ...theme,
    colors: {
      ...theme.colors,
      background: "#F3F3F0",
      surface: "#FFFFFF",
      surfaceRaised: "#FFFFFF",
      surfaceAccent: "#EEF1FF",
      secondary: "#F0F1F4",
      border: "#E7E7E2",
      shadow: "#111318",
    },
  };
}
