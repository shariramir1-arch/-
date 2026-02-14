'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type Locale, type Dictionary, getDictionary } from '@/lib/i18n';

interface LocaleContextType {
  locale: Locale;
  t: Dictionary;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('he');

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === 'he' ? 'en' : 'he'));
  }, []);

  const t = getDictionary(locale);

  return (
    <LocaleContext.Provider value={{ locale, t, toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
