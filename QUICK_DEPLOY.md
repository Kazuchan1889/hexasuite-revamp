# Quick Deploy Guide - Ubuntu Server

## Langkah Cepat Deployment

### 1. Upload Project ke Server

```bash
# Via SCP (dari komputer lokal)
scp -r "FE - Copy" user@192.168.1.44:/home/user/hexasuite

# Atau clone dari git (jika sudah di git)
ssh user@192.168.1.44
cd /home/user
git clone <your-repo-url> hexasuite
cd hexasuite
```

### 2. Jalankan Deployment Script

```bash
# Masuk ke direktori project
cd /home/user/hexasuite

# Berikan permission execute
chmod +x deploy-ubuntu.sh

# Jalankan sebagai root
sudo ./deploy-ubuntu.sh
```

### 3. Akses Website

Buka browser dan akses:
- http://192.168.1.44

## Jika Ada Masalah

### Permission Error
```bash
chmod +x deploy-ubuntu.sh
sudo ./deploy-ubuntu.sh
```

### Nginx Error
```bash
sudo nginx -t
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/error.log
```

### Build Error
```bash
node -v  # Harus 24.x
npm install
npm run build
```

## Reset Nginx (Hapus Project Lain)

Jika ada konflik dengan project lain di nginx:

```bash
cd /home/user/hexasuite
chmod +x reset-nginx.sh
sudo ./reset-nginx.sh
```

**PERINGATAN**: Script ini akan menghapus semua site lain di nginx!

## Re-Deployment (Update Code)

Setelah ada perubahan code, gunakan script `redeploy.sh` untuk update tanpa setup ulang:

```bash
cd /home/user/hexasuite
git pull  # atau upload file baru

# Fix line endings jika file dibuat di Windows
sed -i 's/\r$//' redeploy.sh

# Set permission dan jalankan
chmod +x redeploy.sh
sudo ./redeploy.sh
```

**Jika error "No such file or directory"**, jalankan dulu:
```bash
sed -i 's/\r$//' redeploy.sh
chmod +x redeploy.sh
```

Script ini akan:
- Build ulang project
- Backup file lama
- Deploy file baru
- Reload nginx (zero-downtime)

## Update Setelah Perubahan Code (Full Deploy)

Jika ingin full deployment ulang:

```bash
cd /home/user/hexasuite
git pull  # atau upload file baru
sudo ./deploy-ubuntu.sh
```

## Cek Status

```bash
# Status nginx
sudo systemctl status nginx

# Cek website
curl http://192.168.1.44

# Cek log
sudo tail -f /var/log/nginx/access.log
```

