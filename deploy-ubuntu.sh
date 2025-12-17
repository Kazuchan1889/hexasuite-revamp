#!/bin/bash

# Script untuk Build dan Setup Nginx di Ubuntu Server
# IP Server: 192.168.1.44
# Author: Deployment Script
# Date: $(date +%Y-%m-%d)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="192.168.1.44"
PROJECT_DIR=$(pwd)
BUILD_DIR="$PROJECT_DIR/dist"
NGINX_DIR="/var/www/hexasuite"
NGINX_CONFIG="/etc/nginx/sites-available/hexasuite"
NGINX_ENABLED="/etc/nginx/sites-enabled/hexasuite"
DOMAIN_NAME="hexasuite.local"  # Ganti dengan domain Anda jika ada

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Hexa Suite - Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
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

# Check if running as root for nginx setup
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "Script ini perlu dijalankan sebagai root untuk setup nginx"
        print_warning "Gunakan: sudo ./deploy-ubuntu.sh"
        exit 1
    fi
}

# Check Node.js installation
check_nodejs() {
    print_status "Memeriksa instalasi Node.js..."
    
    if ! command -v node &> /dev/null; then
        print_warning "Node.js tidak ditemukan. Menginstall Node.js..."
        
        # Install Node.js 24.x using NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
        apt-get install -y nodejs
        
        print_status "Node.js berhasil diinstall"
    else
        NODE_VERSION=$(node -v)
        print_status "Node.js sudah terinstall: $NODE_VERSION"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm tidak ditemukan"
        exit 1
    fi
    
    NPM_VERSION=$(npm -v)
    print_status "npm version: $NPM_VERSION"
}

# Install project dependencies
install_dependencies() {
    print_status "Menginstall dependencies..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json tidak ditemukan. Pastikan Anda berada di direktori project yang benar."
        exit 1
    fi
    
    npm install
    print_status "Dependencies berhasil diinstall"
}

# Build project
build_project() {
    print_status "Membangun project..."
    
    # Clean previous build
    if [ -d "$BUILD_DIR" ]; then
        print_status "Menghapus build sebelumnya..."
        rm -rf "$BUILD_DIR"
    fi
    
    # Run build
    npm run build
    
    if [ ! -d "$BUILD_DIR" ]; then
        print_error "Build gagal! Direktori dist tidak ditemukan."
        exit 1
    fi
    
    print_status "Build berhasil! Output: $BUILD_DIR"
}

# Check and install nginx
check_nginx() {
    print_status "Memeriksa instalasi Nginx..."
    
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

# Create nginx directory
create_nginx_directory() {
    print_status "Membuat direktori nginx..."
    
    if [ ! -d "$NGINX_DIR" ]; then
        mkdir -p "$NGINX_DIR"
        print_status "Direktori $NGINX_DIR berhasil dibuat"
    else
        print_status "Direktori $NGINX_DIR sudah ada"
    fi
    
    # Set permissions
    chown -R www-data:www-data "$NGINX_DIR"
    chmod -R 755 "$NGINX_DIR"
}

# Copy build files to nginx directory
copy_build_files() {
    print_status "Menyalin file build ke direktori nginx..."
    
    # Copy all files from dist to nginx directory
    cp -r "$BUILD_DIR"/* "$NGINX_DIR/"
    
    # Set permissions
    chown -R www-data:www-data "$NGINX_DIR"
    chmod -R 755 "$NGINX_DIR"
    
    print_status "File build berhasil disalin ke $NGINX_DIR"
}

# Create nginx configuration
create_nginx_config() {
    print_status "Membuat konfigurasi Nginx..."
    
    cat > "$NGINX_CONFIG" << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_IP $DOMAIN_NAME;
    
    root $NGINX_DIR;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Main location
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API proxy (jika backend di server yang sama)
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
    }
    
    # Error pages
    error_page 404 /index.html;
}
EOF
    
    print_status "Konfigurasi Nginx berhasil dibuat: $NGINX_CONFIG"
}

# Enable nginx site
enable_nginx_site() {
    print_status "Mengaktifkan site Nginx..."
    
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
    print_status "Menguji konfigurasi Nginx..."
    
    if nginx -t; then
        print_status "Konfigurasi Nginx valid"
    else
        print_error "Konfigurasi Nginx tidak valid!"
        exit 1
    fi
}

# Restart nginx
restart_nginx() {
    print_status "Merestart Nginx..."
    
    systemctl restart nginx
    systemctl enable nginx
    
    if systemctl is-active --quiet nginx; then
        print_status "Nginx berhasil dijalankan"
    else
        print_error "Nginx gagal dijalankan!"
        exit 1
    fi
}

# Show deployment summary
show_summary() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Deployment Selesai!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${GREEN}Informasi Deployment:${NC}"
    echo "  - Server IP: $SERVER_IP"
    echo "  - Web Root: $NGINX_DIR"
    echo "  - Nginx Config: $NGINX_CONFIG"
    echo "  - Build Directory: $BUILD_DIR"
    echo ""
    echo -e "${GREEN}Akses Website:${NC}"
    echo "  - http://$SERVER_IP"
    if [ "$DOMAIN_NAME" != "hexasuite.local" ]; then
        echo "  - http://$DOMAIN_NAME"
    fi
    echo ""
    echo -e "${GREEN}Perintah Berguna:${NC}"
    echo "  - Cek status nginx: sudo systemctl status nginx"
    echo "  - Restart nginx: sudo systemctl restart nginx"
    echo "  - Cek error log: sudo tail -f /var/log/nginx/error.log"
    echo "  - Cek access log: sudo tail -f /var/log/nginx/access.log"
    echo ""
}

# Main execution
main() {
    print_status "Memulai deployment..."
    echo ""
    
    # Check root for nginx operations
    check_root
    
    # Step 1: Check and install Node.js
    check_nodejs
    echo ""
    
    # Step 2: Install dependencies
    install_dependencies
    echo ""
    
    # Step 3: Build project
    build_project
    echo ""
    
    # Step 4: Check and install nginx
    check_nginx
    echo ""
    
    # Step 5: Create nginx directory
    create_nginx_directory
    echo ""
    
    # Step 6: Copy build files
    copy_build_files
    echo ""
    
    # Step 7: Create nginx configuration
    create_nginx_config
    echo ""
    
    # Step 8: Enable nginx site
    enable_nginx_site
    echo ""
    
    # Step 9: Test nginx configuration
    test_nginx_config
    echo ""
    
    # Step 10: Restart nginx
    restart_nginx
    echo ""
    
    # Show summary
    show_summary
}

# Run main function
main

