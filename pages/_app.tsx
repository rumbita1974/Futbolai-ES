// File: pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { LanguageProvider } from '../context/LanguageContext'; // Adjust path if needed

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LanguageProvider>
      <Component {...pageProps} />
    </LanguageProvider>
  );
}