# Troubleshooting Redeploy Script

## Error: "No such file or directory"

Error ini biasanya terjadi karena:

### 1. Line Endings (CRLF vs LF)

Jika file dibuat di Windows, line endings mungkin CRLF, sedangkan Linux membutuhkan LF.

**Solusi:**

```bash
# Di server Ubuntu, jalankan:
sed -i 's/\r$//' redeploy.sh
chmod +x redeploy.sh
sudo ./redeploy.sh
```

Atau gunakan script fix:

```bash
# Upload fix-redeploy.sh ke server, lalu:
bash fix-redeploy.sh
sudo ./redeploy.sh
```

### 2. File Belum Ada

Pastikan file `redeploy.sh` ada di direktori project:

```bash
# Cek apakah file ada
ls -la redeploy.sh

# Jika tidak ada, pastikan Anda di direktori yang benar
pwd
```

### 3. Permission

Pastikan file memiliki permission execute:

```bash
chmod +x redeploy.sh
ls -la redeploy.sh  # Harus ada 'x' di permission
```

### 4. Shebang Line

Pastikan baris pertama file adalah:

```bash
#!/bin/bash
```

Bukan:

```
#!/bin/bash
```

(dengan CRLF di akhir)

## Cara Fix Manual

### Di Server Ubuntu:

```bash
# 1. Masuk ke direktori project
cd /path/to/project

# 2. Fix line endings
sed -i 's/\r$//' redeploy.sh

# 3. Set permission
chmod +x redeploy.sh

# 4. Cek file
head -n 1 redeploy.sh  # Harus output: #!/bin/bash

# 5. Jalankan
sudo ./redeploy.sh
```

### Atau Recreate File:

Jika masih error, buat ulang file di server:

```bash
# 1. Hapus file lama (jika ada)
rm -f redeploy.sh

# 2. Download dari git atau copy manual
# Atau buat dengan cat/heredoc

# 3. Set permission
chmod +x redeploy.sh

# 4. Jalankan
sudo ./redeploy.sh
```

## Cek File Type

```bash
# Cek line endings
file redeploy.sh

# Cek apakah executable
ls -la redeploy.sh

# Test shebang
head -n 1 redeploy.sh | od -c
```

## Alternative: Gunakan bash langsung

Jika masih error, jalankan dengan bash langsung:

```bash
sudo bash redeploy.sh
```

Ini akan bypass shebang line dan langsung menggunakan bash.

