#!/bin/bash

# Script untuk fix line endings pada redeploy.sh
# Jalankan di server Ubuntu: bash fix-redeploy.sh

if [ -f "redeploy.sh" ]; then
    # Convert CRLF to LF
    sed -i 's/\r$//' redeploy.sh
    
    # Set executable permission
    chmod +x redeploy.sh
    
    echo "✅ redeploy.sh sudah diperbaiki!"
    echo "Sekarang jalankan: sudo ./redeploy.sh"
else
    echo "❌ File redeploy.sh tidak ditemukan"
    echo "Pastikan Anda berada di direktori project yang benar"
fi

