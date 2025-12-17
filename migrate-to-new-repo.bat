@echo off
REM Script untuk memindahkan project ke repository GitHub baru
REM Repository: https://github.com/Kazuchan1889/fe-arab-new.git

echo ========================================
echo  Migrate to New GitHub Repository
echo ========================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git tidak terinstall. Silakan install Git terlebih dahulu.
    pause
    exit /b 1
)

echo [INFO] Git sudah terinstall
echo.

REM Check if already a git repository
if exist .git (
    echo [INFO] Repository git sudah ada
    echo [INFO] Menghapus remote lama (jika ada)...
    git remote remove origin 2>nul
    echo [INFO] Menambahkan remote baru...
    git remote add origin https://github.com/Kazuchan1889/fe-arab-new.git
) else (
    echo [INFO] Inisialisasi git repository baru...
    git init
    git remote add origin https://github.com/Kazuchan1889/fe-arab-new.git
)

echo.
echo [INFO] Menambahkan semua file ke staging...
git add .

echo.
echo [INFO] Membuat commit...
git commit -m "Initial commit: Hexa Suite Frontend - Migrated to new repository"

echo.
echo [INFO] Mengubah branch ke main...
git branch -M main

echo.
echo [INFO] Push ke repository baru...
echo [WARNING] Pastikan Anda sudah login ke GitHub dan memiliki akses ke repository!
echo.
git push -u origin main

if errorlevel 1 (
    echo.
    echo [ERROR] Push gagal!
    echo.
    echo Kemungkinan penyebab:
    echo 1. Belum login ke GitHub
    echo 2. Repository belum dibuat atau tidak ada akses
    echo 3. Perlu authentication (token atau SSH)
    echo.
    echo Solusi:
    echo - Login ke GitHub: git config --global user.name "Your Name"
    echo - Set email: git config --global user.email "your.email@example.com"
    echo - Atau gunakan GitHub CLI: gh auth login
    echo.
) else (
    echo.
    echo [SUCCESS] Project berhasil di-push ke repository baru!
    echo Repository: https://github.com/Kazuchan1889/fe-arab-new.git
    echo.
)

pause

