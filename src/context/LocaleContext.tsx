"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface LocaleContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ children }) => {
  const [locale, setLocale] = useState("en"); // Default language
  const [translations, setTranslations] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const response = await fetch(`/locales/${locale}.json`);
        if (!response.ok) {
          throw new Error(
            `Failed to load translations for locale: ${locale}`
          );
        }
        const data = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error("Error fetching translations:", error);
        // Fallback to English if translation fails
        const response = await fetch(`/locales/en.json`);
        const data = await response.json();
        setTranslations(data);
        setLocale("en");
      }
    };

    fetchTranslations();
  }, [locale]);

  const t = (key: string): string => {
    return translations[key] || key; // Return key if translation not found
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
};
