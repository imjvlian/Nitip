import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

export type MerchantThemePreference = "system" | "light" | "dark";
export type MerchantThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "@nitip/merchant-theme";

const lightTheme = {
  mode: "light",
  colors: {
    background: "#FFFFFF",
    surface: "#F5F6F8",
    surfaceRaised: "#FFFFFF",
    surfaceAccent: "#EEF1FF",
    primary: "#2448F5",
    primaryStrong: "#1836C9",
    secondary: "#EFF1F5",
    text: "#111318",
    textMuted: "#7C8190",
    border: "#E7E9EE",
    shadow: "#111318",
    onPrimary: "#FFFFFF",
    danger: "#D92D20",
    dangerSurface: "#FFF1F0",
    success: "#159A66",
    successSurface: "#ECFDF3",
    warning: "#C96A09",
    warningSurface: "#FFF7E8",
  },
} as const;

const darkTheme = {
  mode: "dark",
  colors: {
    background: "#0F1014",
    surface: "#191B20",
    surfaceRaised: "#22242B",
    surfaceAccent: "#242943",
    primary: "#5A72FF",
    primaryStrong: "#AAB7FF",
    secondary: "#24272E",
    text: "#F7F7F8",
    textMuted: "#9A9FAA",
    border: "#2C3038",
    shadow: "#000000",
    onPrimary: "#FFFFFF",
    danger: "#FF8A80",
    dangerSurface: "#351E1E",
    success: "#72D6A4",
    successSurface: "#153226",
    warning: "#F8C36A",
    warningSurface: "#352A16",
  },
} as const;

export type MerchantNitipTheme = typeof lightTheme | typeof darkTheme;

interface MerchantThemeContextValue {
  preference: MerchantThemePreference;
  resolvedMode: MerchantThemeMode;
  theme: MerchantNitipTheme;
  setPreference: (preference: MerchantThemePreference) => Promise<void>;
}

const MerchantThemeContext = createContext<MerchantThemeContextValue | null>(null);

function normalizePreference(value: string | null): MerchantThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function MerchantThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<MerchantThemePreference>("system");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (active) setPreferenceState(normalizePreference(stored));
      } catch {
        // Keep system preference when storage is unavailable.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const resolvedMode: MerchantThemeMode =
    preference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  const setPreference = useCallback(async (nextPreference: MerchantThemePreference) => {
    setPreferenceState(nextPreference);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    } catch {
      // Keep the current-session preference when persistence fails.
    }
  }, []);

  const value = useMemo<MerchantThemeContextValue>(
    () => ({
      preference,
      resolvedMode,
      theme: resolvedMode === "dark" ? darkTheme : lightTheme,
      setPreference,
    }),
    [preference, resolvedMode, setPreference],
  );

  return <MerchantThemeContext.Provider value={value}>{children}</MerchantThemeContext.Provider>;
}

export function useMerchantTheme() {
  const context = useContext(MerchantThemeContext);
  if (!context) throw new Error("useMerchantTheme must be used inside MerchantThemeProvider");
  return context;
}
