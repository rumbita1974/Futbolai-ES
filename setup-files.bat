@echo off
echo Creating Tailwind CSS configuration files manually...

REM Create tailwind.config.js
echo /** @type {import('tailwindcss').Config} */ > tailwind.config.js
echo module.exports = { >> tailwind.config.js
echo   content: [ >> tailwind.config.js
echo     './pages/**/*.{js,ts,jsx,tsx,mdx}', >> tailwind.config.js
echo     './components/**/*.{js,ts,jsx,tsx,mdx}', >> tailwind.config.js
echo   ], >> tailwind.config.js
echo   theme: { >> tailwind.config.js
echo     extend: {}, >> tailwind.config.js
echo   }, >> tailwind.config.js
echo   plugins: [], >> tailwind.config.js
echo } >> tailwind.config.js
echo Created tailwind.config.js

REM Create postcss.config.js
echo module.exports = { > postcss.config.js
echo   plugins: { >> postcss.config.js
echo     tailwindcss: {}, >> postcss.config.js
echo     autoprefixer: {}, >> postcss.config.js
echo   }, >> postcss.config.js
echo } >> postcss.config.js
echo Created postcss.config.js

REM Create styles directory and globals.css
if not exist styles mkdir styles
echo @tailwind base; > styles/globals.css
echo @tailwind components; >> styles/globals.css
echo @tailwind utilities; >> styles/globals.css
echo Created styles/globals.css

REM Create _app.tsx
echo import '../styles/globals.css'; > pages/_app.tsx
echo import type { AppProps } from 'next/app'; >> pages/_app.tsx
echo. >> pages/_app.tsx
echo export default function App({ Component, pageProps }: AppProps) { >> pages/_app.tsx
echo   return ^<Component {...pageProps} /^>; >> pages/_app.tsx
echo } >> pages/_app.tsx
echo Created pages/_app.tsx

echo.
echo All configuration files created successfully!
echo Now you can run: npm run dev
pause