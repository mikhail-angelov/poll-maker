import { createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';
import { en } from './en';
import { ru } from './ru';

export type Language = 'en' | 'ru';
export type Dictionary = typeof en;

const dictionaries: Record<Language, Dictionary> = { en, ru };

export function detectLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language.toLowerCase();
  return lang.startsWith('ru') ? 'ru' : 'en';
}

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Dictionary) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key
});

export function useI18n() {
  return useContext(I18nContext);
}

export function translateErrorCode(errorCode: string): string {
  const i18n = useContext(I18nContext);
  const errorKey = `error.${errorCode}` as keyof Dictionary;
  if (errorKey in dictionaries[i18n.language]) {
    return i18n.t(errorKey);
  }
  return errorCode;
}

interface I18nProviderProps {
  children: preact.ComponentChildren;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('poll-maker-language') as Language | null;
      if (saved && (saved === 'en' || saved === 'ru')) {
        return saved;
      }
    }
    return detectLanguage();
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('poll-maker-language', lang);
    }
  };

  const t = (key: keyof Dictionary) => {
    return dictionaries[language][key] || key;
  };

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'poll-maker-language' && e.newValue && (e.newValue === 'en' || e.newValue === 'ru')) {
        setLanguageState(e.newValue as Language);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}