import AsyncStorage from "@react-native-async-storage/async-storage";
import { getNitipTheme, type NitipTheme, type NitipThemeMode } from "@nitip/theme";
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

export type DriverThemePreference = "system" | "light" | "dark";

interface DriverThemeContextValue {
  preference: DriverThemePreference;
  resolvedMode: NitipThemeMode;
  theme: NitipTheme;
  setPreference: (preference: DriverThemePreference) => Promise<void>;
}

const STORAGE_KEY = "@nitip/driver-theme";
const DriverThemeContext = createContext<DriverThemeContextValue | null>(null);

function normalize(value: string | null): DriverThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function DriverThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<DriverThemePreference>("system");

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active) setPreferenceState(normalize(stored));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const resolvedMode: NitipThemeMode = preference === "system"
    ? systemScheme === "dark" ? "dark" : "light"
    : preference;

  const setPreference = useCallback(async (next: DriverThemePreference) => {
    setPreferenceState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Keep the current session preference when persistence is unavailable.
    }
  }, []);

  const value = useMemo<DriverThemeContextValue>(() => ({
    preference,
    resolvedMode,
    theme: getNitipTheme(resolvedMode),
    setPreference,
  }), [preference, resolvedMode, setPreference]);

  return <DriverThemeContext.Provider value={value}>{children}</DriverThemeContext.Provider>;
}

export function useDriverTheme() {
  const context = useContext(DriverThemeContext);
  if (!context) throw new Error("useDriverTheme must be used inside DriverThemeProvider");
  return context;
}
