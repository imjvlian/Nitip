import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import i18n from "i18next";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { initReactI18next, useTranslation } from "react-i18next";

export type NitipLanguage = "id" | "en";

const LANGUAGE_STORAGE_KEY = "@nitip/language";
export const DEFAULT_NITIP_LANGUAGE: NitipLanguage = "id";
export const NITIP_LANGUAGES: readonly NitipLanguage[] = ["id", "en"];

export const resources = {
  id: {
    translation: {
      common: {
        language: "Bahasa",
        indonesia: "Indonesia",
        english: "English",
        back: "Kembali",
        save: "Simpan",
        cancel: "Batal",
        continue: "Lanjut",
        loading: "Memuat...",
        retry: "Coba lagi",
      },
      navigation: {
        home: "Beranda",
        orders: "Pesanan",
        profile: "Profil",
      },
      user: {
        languageTitle: "Bahasa aplikasi",
        languageDescription: "Pilih bahasa yang digunakan di aplikasi Nitip.",
      },
      merchant: {
        languageTitle: "Bahasa Nitip Mitra",
        languageDescription: "Pilih bahasa untuk workspace merchant.",
      },
      driver: {
        languageTitle: "Bahasa Nitip Driver",
        languageDescription: "Pilih bahasa untuk aplikasi driver.",
      },
    },
  },
  en: {
    translation: {
      common: {
        language: "Language",
        indonesia: "Indonesian",
        english: "English",
        back: "Back",
        save: "Save",
        cancel: "Cancel",
        continue: "Continue",
        loading: "Loading...",
        retry: "Try again",
      },
      navigation: {
        home: "Home",
        orders: "Orders",
        profile: "Profile",
      },
      user: {
        languageTitle: "App language",
        languageDescription: "Choose the language used in the Nitip app.",
      },
      merchant: {
        languageTitle: "Nitip Merchant language",
        languageDescription: "Choose the language for your merchant workspace.",
      },
      driver: {
        languageTitle: "Nitip Driver language",
        languageDescription: "Choose the language for the driver app.",
      },
    },
  },
} as const;

export function normalizeNitipLanguage(value: string | null | undefined): NitipLanguage {
  const language = value?.toLowerCase().split(/[-_]/)[0];
  return language === "en" ? "en" : "id";
}

function deviceLanguage(): NitipLanguage {
  return normalizeNitipLanguage(getLocales()[0]?.languageCode);
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_NITIP_LANGUAGE,
    fallbackLng: DEFAULT_NITIP_LANGUAGE,
    supportedLngs: [...NITIP_LANGUAGES],
    interpolation: { escapeValue: false },
    initImmediate: false,
  });
}

interface NitipLanguageContextValue {
  language: NitipLanguage;
  setLanguage: (language: NitipLanguage) => Promise<void>;
}

const NitipLanguageContext = createContext<NitipLanguageContextValue | null>(null);

export function NitipI18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<NitipLanguage>(
    normalizeNitipLanguage(i18n.resolvedLanguage ?? i18n.language),
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      let nextLanguage = deviceLanguage();
      try {
        const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (storedLanguage) nextLanguage = normalizeNitipLanguage(storedLanguage);
      } catch {
        // Device locale remains the fallback if local storage is unavailable.
      }

      if (!active) return;
      await i18n.changeLanguage(nextLanguage);
      if (active) setLanguageState(nextLanguage);
    })();

    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: NitipLanguage) => {
    await i18n.changeLanguage(nextLanguage);
    setLanguageState(nextLanguage);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // Language still changes for the current session if persistence fails.
    }
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  );

  return (
    <NitipLanguageContext.Provider value={value}>
      {children}
    </NitipLanguageContext.Provider>
  );
}

export function useNitipLanguage() {
  const context = useContext(NitipLanguageContext);
  if (!context) {
    throw new Error("useNitipLanguage must be used inside NitipI18nProvider");
  }
  return context;
}

export function useNitipTranslation() {
  return useTranslation();
}

export { i18n };
