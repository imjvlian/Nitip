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
import { Appearance, useColorScheme } from "react-native";

export type UserThemePreference = "system" | "light" | "dark";
export type UserThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "@nitip/user-theme";

const lightTheme = {
  mode: "light",
  colors: {
    background: "#F7F8FA",
    surface: "#FFFFFF",
    surfaceAccent: "#EEF4FF",
    primary: "#1746C7",
    primaryStrong: "#14216D",
    secondary: "#D9F3F0",
    text: "#101828",
    textMuted: "#667085",
    border: "#EAECF0",
    onPrimary: "#FFFFFF",
    danger: "#B42318",
    dangerSurface: "#FEF3F2",
    success: "#067647",
    successSurface: "#ECFDF3",
    warning: "#B54708",
    warningSurface: "#FFFAEB",
  },
} as const;

const darkTheme = {
  mode: "dark",
  colors: {
    background: "#090D1B",
    surface: "#11172A",
    surfaceAccent: "#18223B",
    primary: "#4264D6",
    primaryStrong: "#B5C5FF",
    secondary: "#173A3A",
    text: "#F5F7FA",
    textMuted: "#98A2B3",
    border: "#28324A",
    onPrimary: "#FFFFFF",
    danger: "#FDA29B",
    dangerSurface: "#351B1D",
    success: "#75E0A7",
    successSurface: "#123326",
    warning: "#FEC84B",
    warningSurface: "#342B14",
  },
} as const;

export type UserNitipTheme = typeof lightTheme | typeof darkTheme;

interface UserThemeContextValue {
  preference: UserThemePreference;
  resolvedMode: UserThemeMode;
  theme: UserNitipTheme;
  setPreference: (preference: UserThemePreference) => Promise<void>;
}

const UserThemeContext = createContext<UserThemeContextValue | null>(null);

function normalizePreference(value: string | null): UserThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function UserThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<UserThemePreference>("system");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (active) setPreferenceState(normalizePreference(stored));
      } catch {
        // Keep the system preference when storage is unavailable.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    Appearance.setColorScheme(preference === "system" ? null : preference);
    return () => {
      Appearance.setColorScheme(null);
    };
  }, [preference]);

  const resolvedMode: UserThemeMode =
    preference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  const setPreference = useCallback(async (nextPreference: UserThemePreference) => {
    setPreferenceState(nextPreference);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    } catch {
      // The theme still changes for the current session when persistence fails.
    }
  }, []);

  const value = useMemo<UserThemeContextValue>(
    () => ({
      preference,
      resolvedMode,
      theme: resolvedMode === "dark" ? darkTheme : lightTheme,
      setPreference,
    }),
    [preference, resolvedMode, setPreference],
  );

  return <UserThemeContext.Provider value={value}>{children}</UserThemeContext.Provider>;
}

export function useUserTheme() {
  const context = useContext(UserThemeContext);
  if (!context) {
    throw new Error("useUserTheme must be used inside UserThemeProvider");
  }
  return context;
}
