#!/bin/bash

# Script untuk Build Project saja (tanpa setup nginx)
# Gunakan script ini jika hanya ingin build project

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR=$(pwd)
BUILD_DIR="$PROJECT_DIR/dist"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Hexa Suite - Build Script${NC}"
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

# Check Node.js installation
check_nodejs() {
    print_status "Memeriksa instalasi Node.js..."
    
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
    
    # Show build size
    BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
    print_status "Ukuran build: $BUILD_SIZE"
}

# Show summary
show_summary() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Build Selesai!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${GREEN}Build Directory:${NC} $BUILD_DIR"
    echo ""
    echo -e "${GREEN}Langkah Selanjutnya:${NC}"
    echo "  1. Copy isi folder dist ke web server"
    echo "  2. Atau jalankan: sudo ./deploy-ubuntu.sh untuk setup nginx otomatis"
    echo ""
}

# Main execution
main() {
    print_status "Memulai build..."
    echo ""
    
    # Step 1: Check Node.js
    check_nodejs
    echo ""
    
    # Step 2: Install dependencies
    install_dependencies
    echo ""
    
    # Step 3: Build project
    build_project
    echo ""
    
    # Show summary
    show_summary
}

# Run main function
main

