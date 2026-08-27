import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getNitipTheme,
  type NitipTheme,
  type NitipThemeMode,
} from "@nitip/theme";
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
export type MerchantThemeMode = NitipThemeMode;
export type MerchantNitipTheme = NitipTheme;

const THEME_STORAGE_KEY = "@nitip/merchant-theme";

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
      theme: getNitipTheme(resolvedMode),
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
