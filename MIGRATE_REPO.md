# Migrasi ke Repository GitHub Baru

Panduan untuk memindahkan project ini ke repository GitHub baru: https://github.com/Kazuchan1889/fe-arab-new.git

## Cara Menggunakan

### Opsi 1: Menggunakan Script (Windows)

```bash
# Jalankan script batch
migrate-to-new-repo.bat
```

### Opsi 2: Manual (Windows/Linux)

```bash
# 1. Inisialisasi git (jika belum ada)
git init

# 2. Tambahkan remote baru
git remote add origin https://github.com/Kazuchan1889/fe-arab-new.git

# Jika sudah ada remote, hapus dulu:
git remote remove origin
git remote add origin https://github.com/Kazuchan1889/fe-arab-new.git

# 3. Tambahkan semua file
git add .

# 4. Commit
git commit -m "Initial commit: Hexa Suite Frontend - Migrated to new repository"

# 5. Set branch ke main
git branch -M main

# 6. Push ke repository baru
git push -u origin main
```

## Jika Repository Sudah Ada Remote Lama

```bash
# 1. Cek remote saat ini
git remote -v

# 2. Hapus remote lama
git remote remove origin

# 3. Tambahkan remote baru
git remote add origin https://github.com/Kazuchan1889/fe-arab-new.git

# 4. Push ke repository baru
git push -u origin main
```

## Authentication

Jika push gagal karena authentication:

### Menggunakan Personal Access Token

1. Buat token di GitHub: Settings > Developer settings > Personal access tokens
2. Gunakan token sebagai password saat push

### Menggunakan GitHub CLI

```bash
# Install GitHub CLI (jika belum ada)
# Windows: winget install GitHub.cli
# Linux: sudo apt install gh

# Login
gh auth login

# Push
git push -u origin main
```

### Menggunakan SSH

```bash
# 1. Generate SSH key (jika belum ada)
ssh-keygen -t ed25519 -C "your_email@example.com"

# 2. Add SSH key ke GitHub
# Copy isi ~/.ssh/id_ed25519.pub ke GitHub Settings > SSH keys

# 3. Ubah remote ke SSH
git remote set-url origin git@github.com:Kazuchan1889/fe-arab-new.git

# 4. Push
git push -u origin main
```

## Verifikasi

Setelah push berhasil:

1. Cek di browser: https://github.com/Kazuchan1889/fe-arab-new
2. Pastikan semua file sudah ter-upload
3. Cek remote:
   ```bash
   git remote -v
   ```

## Troubleshooting

### Error: "repository not found"

- Pastikan repository sudah dibuat di GitHub
- Pastikan Anda memiliki akses ke repository
- Cek URL repository apakah benar

### Error: "authentication failed"

- Gunakan Personal Access Token
- Atau setup SSH key
- Atau login dengan GitHub CLI

### Error: "remote origin already exists"

```bash
# Hapus remote lama
git remote remove origin

# Tambahkan remote baru
git remote add origin https://github.com/Kazuchan1889/fe-arab-new.git
```

### Error: "failed to push some refs"

```bash
# Jika repository baru sudah ada isinya, force push (HATI-HATI!)
git push -u origin main --force

# Atau pull dulu
git pull origin main --allow-unrelated-histories
git push -u origin main
```

## File yang Akan Di-Push

Semua file kecuali yang ada di `.gitignore`:
- ✅ Source code (`src/`)
- ✅ Configuration files
- ✅ Scripts deployment
- ✅ Documentation
- ❌ `node_modules/` (di-ignore)
- ❌ `dist/` (di-ignore)
- ❌ File temporary

## Setelah Push Berhasil

1. Update remote di server Ubuntu (jika sudah deploy):
   ```bash
   cd /path/to/project
   git remote set-url origin https://github.com/Kazuchan1889/fe-arab-new.git
   git fetch
   ```

2. Clone di tempat lain:
   ```bash
   git clone https://github.com/Kazuchan1889/fe-arab-new.git
   ```

