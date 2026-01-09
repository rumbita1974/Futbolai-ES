// hooks/useTranslation.js
'use client';

import { useLanguage } from '@/context/LanguageContext';
import { t as translateText } from '@/utils/i18n';

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key, params = {}) => {
    return translateText(key, language, params);
  };

  return {
    t,
    language
  };
}