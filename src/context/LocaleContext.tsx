// src/context/LocaleContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';

export type Locale = 'en' | 'es';
type Dict = Record<string, string>;

type LocaleContextType = {
  locale: Locale;
  setLocale: Dispatch<SetStateAction<Locale>>;
  toggle: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  ready: boolean; // translations loaded for current locale
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

type Props = { children: ReactNode };

// simple in-memory cache to avoid re-fetching per locale
const dictCache: Partial<Record<Locale, Dict>> = {};

export const LocaleProvider: React.FC<Props> = ({ children }) => {
  // lazy init from localStorage if present
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('locale');
      if (saved === 'en' || saved === 'es') return saved;
    }
    return 'en';
  });

  const [dict, setDict] = useState<Dict>(() => dictCache[locale] ?? {});
  const [ready, setReady] = useState<boolean>(!!dictCache[locale]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // persist choice
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('locale', locale);
      // reflect in <html lang="..">
      try {
        document.documentElement.setAttribute('lang', locale);
      } catch {}
    }

    // use cache if available
    if (dictCache[locale]) {
      setDict(dictCache[locale]!);
      setReady(true);
      return;
    }

    // fetch translations from /public/locales/<locale>.json
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setReady(false);

    const load = async () => {
      try {
        const res = await fetch(`/locales/${locale}.json`, { signal: ac.signal });
        if (!res.ok) throw new Error(`Failed to load ${locale}.json`);
        const data = (await res.json()) as Dict;
        dictCache[locale] = data;
        if (!ac.signal.aborted) {
          setDict(data);
          setReady(true);
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        console.error('[i18n] load failed, falling back to en:', err);
        // fallback to English
        if (locale !== 'en') {
          setLocale('en'); // triggers effect again; cached if already loaded
        } else {
          // as a last resort, try to fetch en.json
          try {
            const res = await fetch(`/locales/en.json`, { signal: ac.signal });
            const data = (await res.json()) as Dict;
            dictCache.en = data;
            if (!ac.signal.aborted) {
              setDict(data);
              setReady(true);
            }
          } catch (e) {
            console.error('[i18n] failed to load en.json:', e);
            setDict({});
            setReady(true);
          }
        }
      }
    };

    void load();
    return () => ac.abort();
  }, [locale]);

  // very small formatter: replaces {var} with value
  const t = useMemo(() => {
    return (key: string, vars?: Record<string, string | number>): string => {
      const base = dict[key] ?? key;
      if (!vars) return base;
      return base.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
    };
  }, [dict]);

  const toggle = () => setLocale(prev => (prev === 'en' ? 'es' : 'en'));

  const value = useMemo<LocaleContextType>(
    () => ({ locale, setLocale, toggle, t, ready }),
    [locale, t, ready]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export function useLocale(): LocaleContextType {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a <LocaleProvider>');
  return ctx;
}
