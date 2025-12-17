# Re-Deployment Script

Script `redeploy.sh` digunakan untuk melakukan re-deployment frontend setelah ada perubahan code.

## Fitur

- ✅ Build ulang project
- ✅ Backup deployment sebelumnya
- ✅ Deploy file baru ke nginx
- ✅ Reconfigure nginx jika perlu
- ✅ Graceful reload nginx (zero-downtime)
- ✅ Auto-check dependencies dan konfigurasi

## Cara Penggunaan

```bash
# 1. Masuk ke direktori project
cd /path/to/project

# 2. Fix line endings (PENTING jika file dibuat di Windows)
sed -i 's/\r$//' redeploy.sh

# 3. Berikan permission execute
chmod +x redeploy.sh

# 4. Jalankan sebagai root
sudo ./redeploy.sh
```

**Catatan**: Jika mendapat error "No such file or directory", fix line endings terlebih dahulu dengan perintah di step 2.

## Apa yang Dilakukan Script

1. **Check Node.js** - Memastikan Node.js terinstall
2. **Install Dependencies** - Update npm packages jika ada perubahan
3. **Build Project** - Build project dengan `npm run build`
4. **Check Nginx** - Memastikan nginx terinstall
5. **Backup Current** - Backup file lama ke `/tmp/hexasuite-backup-*`
6. **Copy Build Files** - Copy file build baru ke `/var/www/hexasuite`
7. **Check Config** - Memastikan konfigurasi nginx ada
8. **Test Config** - Validasi konfigurasi nginx
9. **Reload Nginx** - Graceful reload (zero-downtime)

## Perbedaan dengan deploy-ubuntu.sh

| Fitur | deploy-ubuntu.sh | redeploy.sh |
|-------|------------------|-------------|
| Install Node.js | ✅ | ❌ (harus sudah ada) |
| Install Nginx | ✅ | ✅ (jika belum ada) |
| Setup pertama kali | ✅ | ❌ |
| Re-deployment | ❌ | ✅ |
| Backup | ❌ | ✅ |
| Graceful reload | ❌ | ✅ (zero-downtime) |

## Kapan Menggunakan

**Gunakan `redeploy.sh` jika:**
- Sudah pernah deploy sebelumnya
- Ada perubahan code yang perlu di-deploy
- Ingin update frontend tanpa setup ulang
- Ingin zero-downtime deployment

**Gunakan `deploy-ubuntu.sh` jika:**
- Deployment pertama kali
- Perlu install Node.js/Nginx
- Perlu setup nginx dari awal

## Troubleshooting

### Build gagal

```bash
# Cek Node.js version
node -v

# Install dependencies manual
npm install

# Build manual
npm run build
```

### Nginx tidak reload

```bash
# Cek error log
sudo tail -f /var/log/nginx/error.log

# Test konfigurasi
sudo nginx -t

# Restart manual jika perlu
sudo systemctl restart nginx
```

### Perubahan tidak terlihat

1. **Hard refresh browser**: `Ctrl+Shift+R` (Linux/Windows) atau `Cmd+Shift+R` (Mac)
2. **Clear browser cache**
3. **Buka di incognito/private mode**
4. **Cek apakah file sudah ter-update**:
   ```bash
   ls -la /var/www/hexasuite/
   ```

### File tidak ter-update

```bash
# Cek apakah build berhasil
ls -la dist/

# Cek apakah file sudah ter-copy
ls -la /var/www/hexasuite/

# Cek permissions
ls -la /var/www/hexasuite/ | head -n 10
```

## Workflow Deployment

### Deployment Pertama Kali

```bash
sudo ./deploy-ubuntu.sh
```

### Update Code

```bash
# 1. Pull update dari git (jika menggunakan git)
git pull

# 2. Re-deploy
sudo ./redeploy.sh
```

### Update dengan Reset Nginx

```bash
# Jika ada masalah dengan nginx atau konflik
sudo ./reset-nginx.sh
```

## Tips

1. **Selalu backup sebelum deploy** - Script otomatis membuat backup
2. **Cek build size** - Pastikan build size masuk akal
3. **Monitor error log** - Setelah deploy, cek error log nginx
4. **Test di browser** - Hard refresh untuk melihat perubahan
5. **Keep dependencies updated** - Script akan update dependencies otomatis

## Environment Variables

Script menggunakan konfigurasi default. Untuk customisasi, edit variabel di script:

```bash
SERVER_IP="192.168.1.44"
NGINX_DIR="/var/www/hexasuite"
DOMAIN_NAME="hexasuite.local"
```

## Backup Location

Backup disimpan di:
```
/tmp/hexasuite-backup-YYYYMMDD-HHMMSS/
```

Backup akan otomatis terhapus saat server reboot atau bisa dihapus manual.

## Zero-Downtime Deployment

Script menggunakan `systemctl reload nginx` untuk graceful reload, sehingga:
- ✅ Tidak ada downtime
- ✅ Request yang sedang berjalan tetap berjalan
- ✅ File baru langsung aktif setelah reload

Jika reload gagal, script akan otomatis fallback ke restart.


