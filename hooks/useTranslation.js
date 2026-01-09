// hooks/useTranslation.js
'use client';

import { useLanguage } from '@/context/LanguageContext';
import { t as translateText } from '@/utils/i18n';

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key) => {
    return translateText(key, language);
  };

  return {
    t,
    language
  };
}