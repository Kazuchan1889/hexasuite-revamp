#!/bin/bash

# Script untuk Re-Deployment Frontend di Ubuntu Server
# Script ini akan build ulang project dan deploy ke nginx
# Gunakan script ini setelah ada perubahan code

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="192.168.1.44"
PROJECT_DIR=$(pwd)
BUILD_DIR="$PROJECT_DIR/dist"
NGINX_DIR="/var/www/hexasuite"
NGINX_CONFIG="/etc/nginx/sites-available/hexasuite"
NGINX_ENABLED="/etc/nginx/sites-enabled/hexasuite"
DOMAIN_NAME="hexasuite.local"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Frontend Re-Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root for nginx operations
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "Script ini perlu dijalankan sebagai root untuk update nginx"
        print_warning "Gunakan: sudo ./redeploy.sh"
        exit 1
    fi
}

# Check Node.js installation
check_nodejs() {
    print_step "Memeriksa instalasi Node.js..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js tidak ditemukan. Silakan install Node.js terlebih dahulu."
        print_warning "Install Node.js: curl -fsSL https://deb.nodesource.com/setup_24.x | sudo bash - && sudo apt-get install -y nodejs"
        exit 1
    fi
    
    NODE_VERSION=$(node -v)
    print_status "Node.js version: $NODE_VERSION"
    
    if ! command -v npm &> /dev/null; then
        print_error "npm tidak ditemukan"
        exit 1
    fi
    
    NPM_VERSION=$(npm -v)
    print_status "npm version: $NPM_VERSION"
}

# Install/Update dependencies
install_dependencies() {
    print_step "Menginstall/update dependencies..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json tidak ditemukan. Pastikan Anda berada di direktori project yang benar."
        exit 1
    fi
    
    npm install
    print_status "Dependencies berhasil diinstall/update"
}

# Build project
build_project() {
    print_step "Membangun project..."
    
    # Clean previous build
    if [ -d "$BUILD_DIR" ]; then
        print_status "Menghapus build sebelumnya..."
        rm -rf "$BUILD_DIR"
    fi
    
    # Run build
    print_status "Menjalankan npm run build..."
    npm run build
    
    if [ ! -d "$BUILD_DIR" ]; then
        print_error "Build gagal! Direktori dist tidak ditemukan."
        exit 1
    fi
    
    # Show build size
    BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
    print_status "Build berhasil! Output: $BUILD_DIR (Ukuran: $BUILD_SIZE)"
}

# Check nginx installation
check_nginx() {
    print_step "Memeriksa instalasi Nginx..."
    
    if ! command -v nginx &> /dev/null; then
        print_warning "Nginx tidak ditemukan. Menginstall Nginx..."
        apt-get update
        apt-get install -y nginx
        print_status "Nginx berhasil diinstall"
    else
        NGINX_VERSION=$(nginx -v 2>&1)
        print_status "Nginx sudah terinstall: $NGINX_VERSION"
    fi
}

# Check if nginx directory exists
check_nginx_directory() {
    print_step "Memeriksa direktori nginx..."
    
    if [ ! -d "$NGINX_DIR" ]; then
        print_warning "Direktori $NGINX_DIR tidak ditemukan. Membuat direktori..."
        mkdir -p "$NGINX_DIR"
        chown -R www-data:www-data "$NGINX_DIR"
        chmod -R 755 "$NGINX_DIR"
        print_status "Direktori $NGINX_DIR berhasil dibuat"
    else
        print_status "Direktori $NGINX_DIR sudah ada"
    fi
}

# Backup current deployment
backup_current_deployment() {
    print_step "Membuat backup deployment saat ini..."
    
    BACKUP_DIR="/tmp/hexasuite-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$NGINX_DIR" ] && [ "$(ls -A $NGINX_DIR 2>/dev/null)" ]; then
        cp -r "$NGINX_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
        print_status "Backup disimpan di: $BACKUP_DIR"
    else
        print_status "Tidak ada file untuk di-backup (deployment pertama kali)"
    fi
}

# Copy build files to nginx directory
copy_build_files() {
    print_step "Menyalin file build ke direktori nginx..."
    
    # Remove old files (keep directory structure)
    if [ -d "$NGINX_DIR" ]; then
        print_status "Menghapus file lama..."
        rm -rf "$NGINX_DIR"/*
    fi
    
    # Copy new build files
    print_status "Menyalin file build baru..."
    cp -r "$BUILD_DIR"/* "$NGINX_DIR/"
    
    # Set permissions
    chown -R www-data:www-data "$NGINX_DIR"
    chmod -R 755 "$NGINX_DIR"
    
    print_status "File build berhasil disalin ke $NGINX_DIR"
}

# Check nginx configuration
check_nginx_config() {
    print_step "Memeriksa konfigurasi Nginx..."
    
    if [ ! -f "$NGINX_CONFIG" ]; then
        print_warning "Konfigurasi Nginx tidak ditemukan. Membuat konfigurasi baru..."
        create_nginx_config
    else
        print_status "Konfigurasi Nginx sudah ada: $NGINX_CONFIG"
    fi
    
    # Check if site is enabled
    if [ ! -L "$NGINX_ENABLED" ]; then
        print_warning "Site belum di-enable. Mengaktifkan site..."
        enable_nginx_site
    else
        print_status "Site sudah aktif"
    fi
}

# Create nginx configuration (if not exists)
create_nginx_config() {
    print_step "Membuat konfigurasi Nginx..."
    
    cat > "$NGINX_CONFIG" << EOF
# Hexa Suite - Nginx Configuration
# Generated: $(date)

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $SERVER_IP $DOMAIN_NAME _;
    
    root $NGINX_DIR;
    index index.html;
    
    # Logging
    access_log /var/log/nginx/hexasuite-access.log;
    error_log /var/log/nginx/hexasuite-error.log;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript 
               application/xml application/rss+xml 
               font/truetype font/opentype application/vnd.ms-fontobject 
               image/svg+xml;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Main location - SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache control for index.html
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # API proxy to backend
    location /api {
        proxy_pass http://$SERVER_IP:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF
    
    print_status "Konfigurasi Nginx berhasil dibuat: $NGINX_CONFIG"
}

# Enable nginx site
enable_nginx_site() {
    print_step "Mengaktifkan site Nginx..."
    
    # Remove default nginx site if exists
    if [ -L "/etc/nginx/sites-enabled/default" ]; then
        rm /etc/nginx/sites-enabled/default
        print_status "Default site dihapus"
    fi
    
    # Create symlink if not exists
    if [ ! -L "$NGINX_ENABLED" ]; then
        ln -s "$NGINX_CONFIG" "$NGINX_ENABLED"
        print_status "Site berhasil diaktifkan"
    else
        print_status "Site sudah aktif"
    fi
}

# Test nginx configuration
test_nginx_config() {
    print_step "Menguji konfigurasi Nginx..."
    
    if nginx -t; then
        print_status "Konfigurasi Nginx valid ✓"
    else
        print_error "Konfigurasi Nginx tidak valid!"
        exit 1
    fi
}

# Reload nginx (graceful reload)
reload_nginx() {
    print_step "Mereload Nginx (graceful reload)..."
    
    # Use reload instead of restart for zero-downtime
    systemctl reload nginx
    
    if systemctl is-active --quiet nginx; then
        print_status "Nginx berhasil di-reload ✓"
    else
        print_warning "Nginx reload gagal, mencoba restart..."
        systemctl restart nginx
        if systemctl is-active --quiet nginx; then
            print_status "Nginx berhasil di-restart ✓"
        else
            print_error "Nginx gagal dijalankan!"
            exit 1
        fi
    fi
}

# Clear browser cache hint
clear_cache_hint() {
    print_step "Tips untuk clear cache browser..."
    print_status "Jika perubahan tidak terlihat, coba:"
    echo "  1. Hard refresh browser: Ctrl+Shift+R (Linux/Windows) atau Cmd+Shift+R (Mac)"
    echo "  2. Clear browser cache"
    echo "  3. Atau buka di incognito/private mode"
}

# Show deployment summary
show_summary() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Re-Deployment Selesai!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${GREEN}Informasi Deployment:${NC}"
    echo "  - Server IP: $SERVER_IP"
    echo "  - Web Root: $NGINX_DIR"
    echo "  - Build Directory: $BUILD_DIR"
    echo "  - Build Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo -e "${GREEN}Akses Website:${NC}"
    echo "  - http://$SERVER_IP"
    if [ "$DOMAIN_NAME" != "hexasuite.local" ]; then
        echo "  - http://$DOMAIN_NAME"
    fi
    echo ""
    echo -e "${GREEN}Status Nginx:${NC}"
    systemctl status nginx --no-pager -l | head -n 5
    echo ""
    echo -e "${YELLOW}Catatan:${NC}"
    echo "  - File lama sudah di-backup"
    echo "  - Nginx sudah di-reload (zero-downtime)"
    echo "  - Jika perubahan tidak terlihat, coba hard refresh browser"
    echo ""
    echo -e "${GREEN}Perintah Berguna:${NC}"
    echo "  - Cek status: sudo systemctl status nginx"
    echo "  - Restart nginx: sudo systemctl restart nginx"
    echo "  - Error log: sudo tail -f /var/log/nginx/hexasuite-error.log"
    echo "  - Access log: sudo tail -f /var/log/nginx/hexasuite-access.log"
    echo ""
}

# Main execution
main() {
    print_status "Memulai re-deployment..."
    echo ""
    
    # Check root
    check_root
    
    # Step 1: Check Node.js
    check_nodejs
    echo ""
    
    # Step 2: Install/Update dependencies
    install_dependencies
    echo ""
    
    # Step 3: Build project
    build_project
    echo ""
    
    # Step 4: Check nginx
    check_nginx
    echo ""
    
    # Step 5: Check nginx directory
    check_nginx_directory
    echo ""
    
    # Step 6: Backup current deployment
    backup_current_deployment
    echo ""
    
    # Step 7: Copy build files
    copy_build_files
    echo ""
    
    # Step 8: Check nginx configuration
    check_nginx_config
    echo ""
    
    # Step 9: Test nginx configuration
    test_nginx_config
    echo ""
    
    # Step 10: Reload nginx
    reload_nginx
    echo ""
    
    # Show summary
    show_summary
    
    # Clear cache hint
    clear_cache_hint
}

# Run main function
main


