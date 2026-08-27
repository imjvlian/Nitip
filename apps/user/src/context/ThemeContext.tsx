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

export type UserThemePreference = "system" | "light" | "dark";
export type UserThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "@nitip/user-theme";

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
