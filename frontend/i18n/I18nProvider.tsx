import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { AppLocale, translations } from "./translations";

const LANGUAGE_STORAGE_KEY = "appLocale";

type I18nContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => Promise<void>;
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function formatMessage(
  locale: AppLocale,
  key: string,
  params?: Record<string, string | number | null | undefined>
) {
  const table = translations[locale];
  const fallbackTable = translations.en;
  let message = table[key] ?? fallbackTable[key] ?? key;

  if (!params) {
    return message;
  }

  Object.entries(params).forEach(([paramKey, value]) => {
    message = message.replaceAll(`{${paramKey}}`, value == null ? "" : String(value));
  });

  return message;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("sq");

  useEffect(() => {
    let mounted = true;

    (async () => {
      const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (!mounted || (saved !== "sq" && saved !== "en")) {
        return;
      }

      setLocaleState(saved);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: async (nextLocale) => {
        setLocaleState(nextLocale);
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale);
      },
      t: (key, params) => formatMessage(locale, key, params),
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return context;
}
