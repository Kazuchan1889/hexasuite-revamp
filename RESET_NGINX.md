# Reset Nginx - Clean Setup

Script `reset-nginx.sh` digunakan untuk **reset total nginx** dan setup fresh untuk Hexa Suite saja.

## ⚠️ PERINGATAN

Script ini akan:
- ✅ Backup semua konfigurasi nginx yang ada
- ❌ **Menghapus SEMUA site yang di-enable**
- ❌ **Menghapus semua konfigurasi site lain**
- ✅ Setup fresh untuk Hexa Suite saja

**Gunakan script ini jika:**
- Ada konflik dengan project lain di nginx
- Ingin clean install tanpa gangguan project lain
- Nginx sudah penuh dengan konfigurasi project lain
- Ingin memastikan hanya Hexa Suite yang berjalan

## Cara Penggunaan

```bash
# 1. Masuk ke direktori project
cd /path/to/project

# 2. Berikan permission execute
chmod +x reset-nginx.sh

# 3. Jalankan sebagai root (akan ada konfirmasi)
sudo ./reset-nginx.sh
```

Script akan meminta konfirmasi sebelum melakukan reset.

## Apa yang Dilakukan Script

1. **Backup Konfigurasi**
   - Backup semua file di `/etc/nginx/sites-available/`
   - Backup semua symlink di `/etc/nginx/sites-enabled/`
   - Backup `nginx.conf`
   - Backup disimpan di `/tmp/nginx-backup-YYYYMMDD-HHMMSS/`

2. **Hapus Semua Site**
   - Hapus semua symlink di `sites-enabled/`
   - Hapus semua config di `sites-available/` (kecuali hexasuite)

3. **Setup Fresh**
   - Buat direktori `/var/www/hexasuite`
   - Build project (jika belum ada)
   - Copy build files ke nginx directory
   - Buat konfigurasi nginx fresh
   - Enable site
   - Restart nginx

## Konfigurasi yang Dibuat

Script akan membuat konfigurasi nginx dengan:
- Listen di port 80 (default_server)
- Web root: `/var/www/hexasuite`
- API proxy ke: `http://192.168.1.44:4000`
- Gzip compression
- Security headers
- Static file caching
- SPA routing support

## Backup

Backup otomatis dibuat di:
```
/tmp/nginx-backup-YYYYMMDD-HHMMSS/
├── sites-available/
├── sites-enabled/
└── nginx.conf
```

Jika ada masalah, Anda bisa restore dari backup:
```bash
# Lihat backup yang ada
ls -la /tmp/nginx-backup-*

# Restore manual (contoh)
sudo cp /tmp/nginx-backup-*/sites-available/* /etc/nginx/sites-available/
sudo cp /tmp/nginx-backup-*/nginx.conf /etc/nginx/nginx.conf
```

## Troubleshooting

### Script meminta build tapi build gagal

```bash
# Build manual terlebih dahulu
npm install
npm run build

# Lalu jalankan script lagi
sudo ./reset-nginx.sh
```

### Nginx tidak bisa start setelah reset

```bash
# Cek error log
sudo tail -f /var/log/nginx/error.log

# Test konfigurasi
sudo nginx -t

# Restore dari backup jika perlu
```

### Website tidak bisa diakses

```bash
# Cek status nginx
sudo systemctl status nginx

# Cek apakah site sudah di-enable
ls -la /etc/nginx/sites-enabled/

# Cek konfigurasi
sudo cat /etc/nginx/sites-available/hexasuite

# Restart nginx
sudo systemctl restart nginx
```

## Perbedaan dengan deploy-ubuntu.sh

| Fitur | deploy-ubuntu.sh | reset-nginx.sh |
|-------|------------------|----------------|
| Install Node.js | ✅ | ❌ (harus sudah ada) |
| Install Nginx | ✅ | ✅ |
| Backup config | ❌ | ✅ |
| Hapus site lain | ❌ | ✅ |
| Build project | ✅ | ✅ (jika belum ada) |
| Setup nginx | ✅ | ✅ (fresh) |

## Contoh Output

```
========================================
  Nginx Reset & Fresh Setup
========================================

PERINGATAN: Script ini akan:
  1. Backup konfigurasi nginx yang ada
  2. Menghapus SEMUA site yang di-enable
  3. Setup fresh untuk Hexa Suite saja

Apakah Anda yakin ingin reset nginx? (yes/no): yes

[STEP] Memeriksa instalasi Nginx...
[INFO] Nginx sudah terinstall: nginx version: nginx/1.18.0

[STEP] Membuat backup konfigurasi nginx...
[INFO] Backup disimpan di: /tmp/nginx-backup-20241201-143022

[STEP] Menghapus semua site yang di-enable...
[WARNING] Site yang akan dihapus:
  - default
  - project-lain
[INFO] Semua site yang di-enable telah dihapus

[STEP] Membangun project...
[INFO] Build berhasil! Output: /path/to/project/dist

[STEP] Merestart Nginx...
[INFO] Nginx berhasil dijalankan ✓

========================================
  Nginx Reset & Setup Selesai!
========================================
```

## Catatan

- Script ini **tidak akan** menghapus backup otomatis
- Backup akan tetap ada di `/tmp/` sampai dihapus manual atau server di-reboot
- Setelah reset, hanya Hexa Suite yang aktif di nginx
- Semua project lain harus di-setup ulang jika diperlukan


