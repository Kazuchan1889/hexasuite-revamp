#!/bin/bash

# Script untuk Reset Nginx dan Setup Fresh untuk Hexa Suite
# Script ini akan menghapus semua konfigurasi site lain dan setup ulang untuk project ini saja

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
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
BACKUP_DIR="/tmp/nginx-backup-$(date +%Y%m%d-%H%M%S)"
DOMAIN_NAME="hexasuite.local"

echo -e "${RED}========================================${NC}"
echo -e "${RED}  Nginx Reset & Fresh Setup${NC}"
echo -e "${RED}========================================${NC}"
echo ""
echo -e "${YELLOW}PERINGATAN: Script ini akan:${NC}"
echo -e "${YELLOW}  1. Backup konfigurasi nginx yang ada${NC}"
echo -e "${YELLOW}  2. Menghapus SEMUA site yang di-enable${NC}"
echo -e "${YELLOW}  3. Setup fresh untuk Hexa Suite saja${NC}"
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

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "Script ini HARUS dijalankan sebagai root"
        print_warning "Gunakan: sudo ./reset-nginx.sh"
        exit 1
    fi
}

# Confirm action
confirm_reset() {
    echo -e "${YELLOW}Apakah Anda yakin ingin reset nginx? (yes/no):${NC} "
    read -r response
    if [ "$response" != "yes" ]; then
        print_status "Dibatalkan oleh user"
        exit 0
    fi
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

# Backup existing nginx configuration
backup_nginx_config() {
    print_step "Membuat backup konfigurasi nginx..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup sites-available
    if [ -d "$NGINX_SITES_AVAILABLE" ]; then
        cp -r "$NGINX_SITES_AVAILABLE"/* "$BACKUP_DIR/sites-available/" 2>/dev/null || true
        print_status "Backup sites-available: $BACKUP_DIR/sites-available/"
    fi
    
    # Backup sites-enabled
    if [ -d "$NGINX_SITES_ENABLED" ]; then
        cp -r "$NGINX_SITES_ENABLED"/* "$BACKUP_DIR/sites-enabled/" 2>/dev/null || true
        print_status "Backup sites-enabled: $BACKUP_DIR/sites-enabled/"
    fi
    
    # Backup main nginx config
    if [ -f "/etc/nginx/nginx.conf" ]; then
        cp /etc/nginx/nginx.conf "$BACKUP_DIR/nginx.conf"
        print_status "Backup nginx.conf: $BACKUP_DIR/nginx.conf"
    fi
    
    print_status "Backup disimpan di: $BACKUP_DIR"
}

# Remove all enabled sites
remove_all_enabled_sites() {
    print_step "Menghapus semua site yang di-enable..."
    
    if [ -d "$NGINX_SITES_ENABLED" ]; then
        # List all enabled sites
        ENABLED_SITES=$(ls -1 "$NGINX_SITES_ENABLED" 2>/dev/null || true)
        
        if [ -n "$ENABLED_SITES" ]; then
            print_warning "Site yang akan dihapus:"
            echo "$ENABLED_SITES" | while read -r site; do
                echo "  - $site"
            done
            
            # Remove all symlinks
            rm -f "$NGINX_SITES_ENABLED"/*
            print_status "Semua site yang di-enable telah dihapus"
        else
            print_status "Tidak ada site yang di-enable"
        fi
    fi
}

# Remove all sites-available (except hexasuite if exists)
cleanup_sites_available() {
    print_step "Membersihkan sites-available..."
    
    if [ -d "$NGINX_SITES_AVAILABLE" ]; then
        # Keep only hexasuite config if exists, remove others
        for config in "$NGINX_SITES_AVAILABLE"/*; do
            if [ -f "$config" ] && [ "$(basename "$config")" != "hexasuite" ]; then
                print_status "Menghapus: $(basename "$config")"
                rm -f "$config"
            fi
        done
        print_status "Sites-available telah dibersihkan"
    fi
}

# Create nginx directory
create_nginx_directory() {
    print_step "Membuat direktori nginx..."
    
    # Remove old directory if exists
    if [ -d "$NGINX_DIR" ]; then
        print_warning "Direktori $NGINX_DIR sudah ada. Menghapus..."
        rm -rf "$NGINX_DIR"
    fi
    
    mkdir -p "$NGINX_DIR"
    chown -R www-data:www-data "$NGINX_DIR"
    chmod -R 755 "$NGINX_DIR"
    print_status "Direktori $NGINX_DIR berhasil dibuat"
}

# Check if build exists
check_build() {
    print_step "Memeriksa build project..."
    
    if [ ! -d "$BUILD_DIR" ]; then
        print_warning "Build tidak ditemukan di $BUILD_DIR"
        print_warning "Apakah Anda ingin build project sekarang? (yes/no): "
        read -r response
        
        if [ "$response" = "yes" ]; then
            # Check Node.js
            if ! command -v node &> /dev/null; then
                print_error "Node.js tidak ditemukan. Install Node.js terlebih dahulu."
                exit 1
            fi
            
            # Install dependencies and build
            print_status "Menginstall dependencies..."
            npm install
            
            print_status "Membangun project..."
            npm run build
            
            if [ ! -d "$BUILD_DIR" ]; then
                print_error "Build gagal!"
                exit 1
            fi
        else
            print_error "Build diperlukan untuk deployment. Silakan build terlebih dahulu."
            exit 1
        fi
    else
        print_status "Build ditemukan di $BUILD_DIR"
    fi
}

# Copy build files to nginx directory
copy_build_files() {
    print_step "Menyalin file build ke direktori nginx..."
    
    cp -r "$BUILD_DIR"/* "$NGINX_DIR/"
    chown -R www-data:www-data "$NGINX_DIR"
    chmod -R 755 "$NGINX_DIR"
    
    print_status "File build berhasil disalin ke $NGINX_DIR"
}

# Create fresh nginx configuration
create_nginx_config() {
    print_step "Membuat konfigurasi Nginx fresh..."
    
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
    
    # Create symlink
    if [ -L "$NGINX_ENABLED" ]; then
        rm "$NGINX_ENABLED"
    fi
    
    ln -s "$NGINX_CONFIG" "$NGINX_ENABLED"
    print_status "Site berhasil diaktifkan"
}

# Test nginx configuration
test_nginx_config() {
    print_step "Menguji konfigurasi Nginx..."
    
    if nginx -t; then
        print_status "Konfigurasi Nginx valid ✓"
    else
        print_error "Konfigurasi Nginx tidak valid!"
        print_warning "Restore backup dari: $BACKUP_DIR"
        exit 1
    fi
}

# Restart nginx
restart_nginx() {
    print_step "Merestart Nginx..."
    
    # Stop nginx first
    systemctl stop nginx 2>/dev/null || true
    
    # Start nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Wait a moment
    sleep 2
    
    if systemctl is-active --quiet nginx; then
        print_status "Nginx berhasil dijalankan ✓"
    else
        print_error "Nginx gagal dijalankan!"
        print_warning "Cek error log: tail -f /var/log/nginx/error.log"
        exit 1
    fi
}

# Show summary
show_summary() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Nginx Reset & Setup Selesai!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${GREEN}Informasi Deployment:${NC}"
    echo "  - Server IP: $SERVER_IP"
    echo "  - Web Root: $NGINX_DIR"
    echo "  - Nginx Config: $NGINX_CONFIG"
    echo "  - Backup Location: $BACKUP_DIR"
    echo ""
    echo -e "${GREEN}Akses Website:${NC}"
    echo "  - http://$SERVER_IP"
    echo ""
    echo -e "${GREEN}Status Nginx:${NC}"
    systemctl status nginx --no-pager -l | head -n 5
    echo ""
    echo -e "${GREEN}Enabled Sites:${NC}"
    ls -la "$NGINX_SITES_ENABLED" 2>/dev/null || echo "  Tidak ada"
    echo ""
    echo -e "${YELLOW}Catatan:${NC}"
    echo "  - Backup konfigurasi lama ada di: $BACKUP_DIR"
    echo "  - Hanya Hexa Suite yang aktif di nginx"
    echo "  - Semua site lain telah dihapus"
    echo ""
    echo -e "${GREEN}Perintah Berguna:${NC}"
    echo "  - Cek status: sudo systemctl status nginx"
    echo "  - Restart: sudo systemctl restart nginx"
    echo "  - Error log: sudo tail -f /var/log/nginx/hexasuite-error.log"
    echo "  - Access log: sudo tail -f /var/log/nginx/hexasuite-access.log"
    echo ""
}

# Main execution
main() {
    print_status "Memulai reset dan setup nginx..."
    echo ""
    
    # Check root
    check_root
    
    # Confirm action
    confirm_reset
    echo ""
    
    # Step 1: Check nginx
    check_nginx
    echo ""
    
    # Step 2: Backup existing config
    backup_nginx_config
    echo ""
    
    # Step 3: Remove all enabled sites
    remove_all_enabled_sites
    echo ""
    
    # Step 4: Cleanup sites-available
    cleanup_sites_available
    echo ""
    
    # Step 5: Check build
    check_build
    echo ""
    
    # Step 6: Create nginx directory
    create_nginx_directory
    echo ""
    
    # Step 7: Copy build files
    copy_build_files
    echo ""
    
    # Step 8: Create nginx configuration
    create_nginx_config
    echo ""
    
    # Step 9: Enable nginx site
    enable_nginx_site
    echo ""
    
    # Step 10: Test nginx configuration
    test_nginx_config
    echo ""
    
    # Step 11: Restart nginx
    restart_nginx
    echo ""
    
    # Show summary
    show_summary
}

# Run main function
main

