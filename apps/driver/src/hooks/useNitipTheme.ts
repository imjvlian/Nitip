import { useDriverTheme } from "../context/ThemeContext";

export function useNitipTheme() {
  const { theme } = useDriverTheme();

  if (theme.mode === "dark") {
    return {
      ...theme,
      colors: {
        ...theme.colors,
        background: "#121318",
        surface: "#1B1D23",
        surfaceRaised: "#22242B",
        surfaceAccent: "#242A45",
        secondary: "#24272E",
        border: "#2D3037",
        shadow: "#111318",
      },
    };
  }

  return {
    ...theme,
    colors: {
      ...theme.colors,
      background: "#F2F3F5",
      surface: "#FFFFFF",
      surfaceRaised: "#FFFFFF",
      surfaceAccent: "#EEF1FF",
      secondary: "#F0F1F4",
      border: "#E8E9ED",
      shadow: "#111318",
    },
  };
}
