@echo off
echo === FIXING TAILWIND CSS ===

echo 1. Installing @tailwindcss/postcss for v4...
npm install -D @tailwindcss/postcss

echo 2. Updating postcss.config.js...
echo module.exports = { > postcss.config.js
echo   plugins: { >> postcss.config.js
echo     '@tailwindcss/postcss': {}, >> postcss.config.js
echo   }, >> postcss.config.js
echo } >> postcss.config.js

echo 3. Verifying tailwind.config.js...
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

echo 4. Creating/updating globals.css...
if not exist styles mkdir styles
echo @import "tailwindcss"; > styles/globals.css

echo.
echo === SETUP COMPLETE ===
echo Run: npm run dev
pause