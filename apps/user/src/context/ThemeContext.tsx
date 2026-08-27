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

export type UserThemePreference = "system" | "light" | "dark";
export type UserThemeMode = NitipThemeMode;
export type UserNitipTheme = NitipTheme;

const THEME_STORAGE_KEY = "@nitip/user-theme";

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
      theme: getNitipTheme(resolvedMode),
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
