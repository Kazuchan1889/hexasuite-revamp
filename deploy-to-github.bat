@echo off
echo.
echo ======================================
echo   Deploying to GitHub
echo ======================================
echo.

cd /d "%~dp0"

echo [1/4] Checking git status...
git status
echo.

echo [2/4] Adding all files...
git add .
echo.

echo [3/4] Committing changes...
git commit -m "Add Vercel deployment configuration - Add vite.config.js - Add vercel.json - Update package.json with React plugin - Add .gitignore"
echo.

echo [4/4] Pushing to GitHub...
echo NOTE: You may need to enter your GitHub credentials
echo Username: Kazuchan1889
echo Password: Your Personal Access Token
echo.
git push origin main
echo.

echo ======================================
echo   Done!
echo ======================================
echo.
echo Next: Go to Vercel and redeploy
echo https://vercel.com/dashboard
echo.

pause


