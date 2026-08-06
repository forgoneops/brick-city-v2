import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import en from './locales/en.json';
import pl from './locales/pl.json';
import de from './locales/de.json';
import { useCms } from '../lib/cms.js';

export const LOCALES = ['en', 'pl', 'de'] as const;
export type Locale = (typeof LOCALES)[number];

const LOCALE_KEY = 'bcm_locale';

const dictionaries: Record<Locale, Record<string, string>> = { en, pl, de };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored && (LOCALES as readonly string[]).includes(stored)) {
    return stored as Locale;
  }
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale());
  // CmsProvider wraps I18nProvider (see main.tsx) specifically so t() can
  // check admin-set overrides before falling back to the bundled JSON.
  const { config } = useCms();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem(LOCALE_KEY, next);
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string) => {
      const override = config?.localeOverrides.values[locale]?.[key];
      if (override) return override;
      const value = dictionaries[locale][key] ?? dictionaries.en[key];
      return value ?? key;
    },
    [locale, config]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useT must be used within <I18nProvider>');
  }
  return ctx;
}
