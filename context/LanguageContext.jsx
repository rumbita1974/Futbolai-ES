'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  // Sync language with URL on page load and navigation
  useEffect(() => {
    if (!pathname) return;
    
    // Extract locale from URL pathname
    const locale = pathname.split('/')[1];
    
    if (locale === 'en' || locale === 'es') {
      // URL has locale, sync with it
      setLanguage(locale);
      localStorage.setItem('futbolai-language', locale);
      document.documentElement.lang = locale;
    } else {
      // No locale in URL (shouldn't happen with middleware)
      // Use saved preference or default
      const savedLang = localStorage.getItem('futbolai-language');
      if (savedLang && (savedLang === 'en' || savedLang === 'es')) {
        setLanguage(savedLang);
        document.documentElement.lang = savedLang;
      }
    }
  }, [pathname]);

  const changeLanguage = (lang) => {
    if (lang !== 'en' && lang !== 'es') return;
    
    setLanguage(lang);
    localStorage.setItem('futbolai-language', lang);
    document.documentElement.lang = lang;
    
    // Update URL via Next.js router (handled by LanguageToggle)
    // Don't use window.history directly - let Next.js handle it
  };

  const toggleLanguage = () => {
    changeLanguage(language === 'en' ? 'es' : 'en');
  };

  return (
    <LanguageContext.Provider value={{
      language,
      changeLanguage,
      toggleLanguage,
      isLoading
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}