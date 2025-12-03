@echo off
echo Fixing Tailwind CSS setup...

REM Option 1: Fix for Tailwind v4
echo Installing @tailwindcss/postcss...
npm install -D @tailwindcss/postcss

echo Updating postcss.config.js...
echo module.exports = { > postcss.config.js
echo   plugins: { >> postcss.config.js
echo     '@tailwindcss/postcss': {}, >> postcss.config.js
echo     'autoprefixer': {}, >> postcss.config.js
echo   }, >> postcss.config.js
echo } >> postcss.config.js

echo.
echo Fixed! Now restart the dev server:
echo npm run dev
pause