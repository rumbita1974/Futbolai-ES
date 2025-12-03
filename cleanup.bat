@echo off
echo Cleaning up repository...

:: Check current status
echo.
echo Current files:
dir *.js
dir *.js.js 2>nul

:: Add renamed files to Git
git add next.config.js 2>nul
git add postcss.config.js 2>nul
git add tailwind.config.js 2>nul

:: Remove empty npm file
if exist npm (
    echo Removing npm file...
    del npm
    git rm --cached npm 2>nul
)

:: Update .gitignore
echo Adding to .gitignore...
echo *.msi >> .gitignore
echo *.exe >> .gitignore
echo downloads/ >> .gitignore

:: Show status
echo.
echo Git status:
git status

echo.
echo Ready to commit and push!
echo Run: git commit -m "Clean up files" && git push
pause