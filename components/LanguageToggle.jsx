'use client';

import { useLanguage } from '@/context/LanguageContext';
import { useRouter, usePathname } from 'next/navigation';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const handleToggle = () => {
    const newLang = language === 'en' ? 'es' : 'en';
    
    // Build new URL with correct locale
    let newPath;
    
    if (pathname === '/en' || pathname === '/es') {
      // Root with locale: /en → /es
      newPath = `/${newLang}`;
    } else if (pathname.startsWith('/en/') || pathname.startsWith('/es/')) {
      // Path with locale: /en/page → /es/page
      newPath = pathname.replace(/^\/(en|es)/, `/${newLang}`);
    } else if (pathname === '/') {
      // Root without locale (should redirect to /en via middleware)
      newPath = `/${newLang}`;
    } else {
      // Any other path without locale
      newPath = `/${newLang}${pathname}`;
    }
    
    // Update URL via Next.js router
    router.push(newPath);
    
    // Language state will update via LanguageContext's useEffect
    // which watches pathname changes
  };

  return (
    <button
      onClick={handleToggle}
      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
      aria-label={`Switch to ${language === 'en' ? 'Spanish' : 'English'}`}
      title={`Switch to ${language === 'en' ? 'Spanish' : 'English'}`}
    >
      <span className="mr-1.5">{language === 'en' ? '🇺🇸' : '🇪🇸'}</span>
      <span className="font-medium">{language === 'en' ? 'EN' : 'ES'}</span>
      <svg 
        className="ml-1.5 w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
    </button>
  );
}