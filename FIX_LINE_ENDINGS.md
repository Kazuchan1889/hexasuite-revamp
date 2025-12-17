# Fix Line Endings untuk Script Bash

## Masalah

Jika script dibuat di Windows, line endings biasanya CRLF (`\r\n`), sedangkan Linux membutuhkan LF (`\n`). Ini menyebabkan error:

```
sudo: unable to execute ./redeploy.sh: No such file or directory
```

## Solusi Cepat

Di server Ubuntu, jalankan:

```bash
# Fix semua script bash sekaligus
sed -i 's/\r$//' *.sh
chmod +x *.sh
```

Atau untuk file spesifik:

```bash
# Fix redeploy.sh
sed -i 's/\r$//' redeploy.sh
chmod +x redeploy.sh

# Fix deploy-ubuntu.sh
sed -i 's/\r$//' deploy-ubuntu.sh
chmod +x deploy-ubuntu.sh

# Fix reset-nginx.sh
sed -i 's/\r$//' reset-nginx.sh
chmod +x reset-nginx.sh

# Fix build-only.sh
sed -i 's/\r$//' build-only.sh
chmod +x build-only.sh
```

## Verifikasi

Setelah fix, verifikasi:

```bash
# Cek line endings (harus output: ASCII text)
file redeploy.sh

# Cek permission (harus ada 'x')
ls -la redeploy.sh

# Test shebang
head -n 1 redeploy.sh
```

## Alternative: Gunakan dos2unix

Jika tersedia:

```bash
# Install dos2unix
sudo apt-get install -y dos2unix

# Convert file
dos2unix redeploy.sh
chmod +x redeploy.sh
```

## Alternative: Jalankan dengan bash langsung

Jika masih error, bypass shebang:

```bash
sudo bash redeploy.sh
```

## Pencegahan

Untuk mencegah masalah ini di masa depan:

1. **Gunakan Git dengan autocrlf=false**:
   ```bash
   git config core.autocrlf false
   ```

2. **Atau gunakan .gitattributes**:
   ```
   *.sh text eol=lf
   ```

3. **Edit file langsung di server** (jika memungkinkan)

