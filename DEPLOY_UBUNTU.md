# Panduan Deployment ke Ubuntu Server

Script ini digunakan untuk build project dan setup Nginx di server Ubuntu Linux dengan IP `192.168.1.44`.

## Persyaratan

- Server Ubuntu Linux (18.04 atau lebih baru)
- Akses root/sudo
- Koneksi internet untuk download dependencies

## File Script

1. **deploy-ubuntu.sh** - Script lengkap untuk build dan setup nginx (deployment pertama kali)
2. **redeploy.sh** - Script untuk re-deployment setelah ada perubahan code (zero-downtime)
3. **build-only.sh** - Script untuk build project saja (tanpa setup nginx)
4. **reset-nginx.sh** - Script untuk reset nginx (hapus semua site lain) dan setup fresh untuk project ini

## Cara Penggunaan

### Opsi 1: Full Deployment (Build + Setup Nginx)

Script ini akan:
- Install Node.js (jika belum ada)
- Install dependencies project
- Build project
- Install Nginx (jika belum ada)
- Setup konfigurasi Nginx
- Deploy build files ke `/var/www/hexasuite`
- Restart Nginx

```bash
# 1. Upload project ke server (atau clone dari git)
cd /path/to/project

# 2. Berikan permission execute pada script
chmod +x deploy-ubuntu.sh

# 3. Jalankan script sebagai root
sudo ./deploy-ubuntu.sh
```

### Opsi 2: Build Saja

Jika Anda hanya ingin build project tanpa setup nginx:

```bash
# 1. Berikan permission execute
chmod +x build-only.sh

# 2. Jalankan script
./build-only.sh
```

Output build akan berada di folder `dist/`.

### Opsi 3: Re-Deployment (Update Code)

**PENTING**: Script ini untuk update code setelah deployment pertama. Gunakan jika:
- Sudah pernah deploy sebelumnya
- Ada perubahan code yang perlu di-deploy
- Ingin zero-downtime deployment

```bash
# 1. Berikan permission execute
chmod +x redeploy.sh

# 2. Jalankan sebagai root
sudo ./redeploy.sh
```

Script ini akan:
- Build ulang project
- Backup file lama
- Deploy file baru ke nginx
- Reload nginx (graceful reload, zero-downtime)
- Auto-check dan update konfigurasi jika perlu

**Keuntungan:**
- Zero-downtime (tidak ada gangguan saat deploy)
- Auto-backup file lama
- Auto-update dependencies
- Graceful nginx reload

### Opsi 4: Reset Nginx & Setup Fresh

**PENTING**: Script ini akan menghapus SEMUA konfigurasi site lain di nginx dan setup fresh untuk project ini saja. Gunakan jika:
- Ada konflik dengan project lain
- Ingin clean install
- Nginx sudah penuh dengan konfigurasi project lain

```bash
# 1. Berikan permission execute
chmod +x reset-nginx.sh

# 2. Jalankan sebagai root (akan ada konfirmasi)
sudo ./reset-nginx.sh
```

Script ini akan:
- Backup semua konfigurasi nginx yang ada
- Hapus semua site yang di-enable
- Setup fresh untuk Hexa Suite saja
- Build project jika belum ada
- Deploy dan restart nginx

## Konfigurasi

### Server IP
Script menggunakan IP `192.168.1.44` sebagai default. Jika IP berbeda, edit file `deploy-ubuntu.sh`:

```bash
SERVER_IP="192.168.1.44"  # Ganti dengan IP server Anda
```

### Domain Name
Jika Anda memiliki domain, edit bagian berikut di script:

```bash
DOMAIN_NAME="hexasuite.local"  # Ganti dengan domain Anda
```

### Nginx Configuration
Konfigurasi Nginx akan dibuat di:
- Config file: `/etc/nginx/sites-available/hexasuite`
- Enabled link: `/etc/nginx/sites-enabled/hexasuite`
- Web root: `/var/www/hexasuite`

## Struktur Direktori Setelah Deployment

```
/var/www/hexasuite/          # Web root directory
├── index.html
├── assets/
│   ├── index-*.js
│   ├── index-*.css
│   └── ...
└── ...
```

## API Proxy

Script sudah mengkonfigurasi proxy untuk API di `/api` yang akan di-forward ke backend di `http://192.168.1.44:4000`.

Jika backend berada di server/lokasi berbeda, edit bagian berikut di script:

```nginx
location /api {
    proxy_pass http://192.168.1.44:4000;  # Ganti dengan URL backend Anda
    ...
}
```

## Troubleshooting

### 1. Nginx tidak bisa start

```bash
# Cek status nginx
sudo systemctl status nginx

# Cek error log
sudo tail -f /var/log/nginx/error.log

# Test konfigurasi
sudo nginx -t
```

### 2. Permission denied

```bash
# Pastikan file script memiliki permission execute
chmod +x deploy-ubuntu.sh

# Pastikan menjalankan dengan sudo
sudo ./deploy-ubuntu.sh
```

### 3. Build gagal

```bash
# Pastikan Node.js terinstall
node -v
npm -v

# Install dependencies manual
npm install

# Build manual
npm run build
```

### 4. Website tidak bisa diakses

```bash
# Cek firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Cek nginx status
sudo systemctl status nginx

# Cek konfigurasi nginx
sudo nginx -t
```

### 5. File tidak ter-update setelah rebuild

```bash
# Hapus cache browser
# Atau restart nginx
sudo systemctl restart nginx

# Pastikan file sudah ter-copy
ls -la /var/www/hexasuite/
```

## Perintah Berguna

```bash
# Restart nginx
sudo systemctl restart nginx

# Reload nginx (tanpa restart)
sudo systemctl reload nginx

# Cek status nginx
sudo systemctl status nginx

# Cek error log
sudo tail -f /var/log/nginx/error.log

# Cek access log
sudo tail -f /var/log/nginx/access.log

# Test konfigurasi nginx
sudo nginx -t

# Lihat konfigurasi nginx
sudo cat /etc/nginx/sites-available/hexasuite
```

## Update Deployment

### Re-Deployment (Recommended)

Untuk update setelah perubahan code, gunakan `redeploy.sh`:

```bash
# 1. Pull update dari git (jika menggunakan git)
git pull

# 2. Jalankan re-deployment script
sudo ./redeploy.sh
```

**Keuntungan:**
- Zero-downtime deployment
- Auto-backup
- Graceful nginx reload

### Full Re-Deployment

Jika ingin full deployment ulang:

```bash
# 1. Pull update dari git (jika menggunakan git)
git pull

# 2. Jalankan script deployment lengkap
sudo ./deploy-ubuntu.sh
```

### Manual Rebuild

Jika hanya ingin rebuild manual:

```bash
# 1. Build saja
./build-only.sh

# 2. Copy manual ke nginx directory
sudo cp -r dist/* /var/www/hexasuite/

# 3. Reload nginx (graceful)
sudo systemctl reload nginx
```

## SSL/HTTPS Setup (Opsional)

Untuk setup SSL dengan Let's Encrypt:

```bash
# Install certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Setup SSL
sudo certbot --nginx -d your-domain.com
```

## Backup

Sebelum deployment, disarankan untuk backup konfigurasi nginx:

```bash
# Backup nginx config
sudo cp /etc/nginx/sites-available/hexasuite /etc/nginx/sites-available/hexasuite.backup

# Backup web files
sudo tar -czf /tmp/hexasuite-backup-$(date +%Y%m%d).tar.gz /var/www/hexasuite
```

## Catatan Penting

1. **Backend API**: Pastikan backend sudah berjalan di `http://192.168.1.44:4000`
2. **Firewall**: Pastikan port 80 (dan 443 jika menggunakan HTTPS) sudah dibuka
3. **Permissions**: Script akan set permission yang tepat untuk www-data user
4. **Node.js Version**: Script menggunakan Node.js 24.x sesuai dengan requirement di package.json

## Support

Jika ada masalah, cek:
- Error log nginx: `/var/log/nginx/error.log`
- System log: `journalctl -u nginx`
- Build output: Cek console saat menjalankan script

