# 🚀 Deploy Instructions untuk Vercel

## ⚠️ Current Issue

Vercel masih menggunakan commit lama: **84f5ca6**

File konfigurasi baru (`vite.config.js`, `vercel.json`) **belum di-push ke GitHub!**

---

## ✅ Solution: Push File Baru ke GitHub

### Option 1: Pakai Script Otomatis (Recommended)

Double-click file: **`deploy-to-github.bat`**

Script akan:
1. ✅ Check git status
2. ✅ Add all files
3. ✅ Commit dengan message
4. ✅ Push ke GitHub

**Jika diminta credentials:**
- Username: `Kazuchan1889`
- Password: **Personal Access Token** (bukan password biasa!)

---

### Option 2: Manual via Terminal

```bash
cd "C:\Users\LENOVO\Downloads\kerja\alone\HRedia - Copy - Copy\FE - Copy"

# Add files
git add .

# Commit
git commit -m "Add Vercel deployment configuration"

# Push
git push origin main
```

---

### Option 3: Via VS Code

1. Open folder `FE - Copy` di VS Code
2. Go to Source Control (Ctrl+Shift+G)
3. Stage all changes (Click +)
4. Enter commit message: "Add Vercel deployment configuration"
5. Click "Commit"
6. Click "Sync Changes" or "Push"

---

### Option 4: Via GitHub Desktop

1. Open GitHub Desktop
2. Add repository: `FE - Copy`
3. Check all changed files
4. Commit message: "Add Vercel deployment configuration"
5. Click "Commit to main"
6. Click "Push origin"

---

## 📦 Files yang Perlu di-Push

### New Files:
- ✅ `vite.config.js` - Vite build configuration
- ✅ `vercel.json` - Vercel deployment settings
- ✅ `.gitignore` - Git ignore rules
- ✅ `deploy-to-github.bat` - Helper script

### Modified Files:
- ✅ `package.json` - Added @vitejs/plugin-react
- ✅ `README.md` - Updated documentation

---

## 🔑 GitHub Authentication

### Personal Access Token (Recommended)

Jika belum punya:

1. **Generate Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name: "Vercel Deploy"
   - Expiration: 90 days (or no expiration)
   - **Select scopes:**
     - ✅ `repo` (full control of private repositories)
   - Click "Generate token"
   - **COPY TOKEN** (won't be shown again!)

2. **Use Token as Password:**
   ```
   Username: Kazuchan1889
   Password: ghp_xxxxxxxxxxxxxxxxxxxx (your token)
   ```

### GitHub CLI (Alternative)

```bash
# Install GitHub CLI
winget install --id GitHub.cli

# Login
gh auth login

# Push
cd "FE - Copy"
git push origin main
```

---

## ✅ Verify Push Berhasil

### Check GitHub:
https://github.com/Kazuchan1889/hexasuite-revamp

**You should see:**
- ✅ Latest commit message: "Add Vercel deployment configuration"
- ✅ New files: `vite.config.js`, `vercel.json`
- ✅ Commit different from `84f5ca6`

---

## 🔄 Redeploy di Vercel

### Option 1: Auto Redeploy
Vercel akan auto-detect push dan redeploy otomatis!

### Option 2: Manual Redeploy
1. Go to: https://vercel.com/dashboard
2. Select project: `hexasuite-revamp`
3. Click "Redeploy" button
4. Select latest commit
5. Click "Redeploy"

---

## 📋 Checklist

- [ ] Files committed locally
- [ ] Pushed to GitHub successfully
- [ ] Verify on GitHub.com (new files visible)
- [ ] Vercel auto-redeploy or manual redeploy
- [ ] Check build logs (should complete successfully)
- [ ] Test deployed site

---

## 🐛 Common Issues

### Issue: "fatal: Authentication failed"

**Solution 1: Use Personal Access Token**
- Generate token from GitHub settings
- Use token as password (not your GitHub password)

**Solution 2: Update Git Credentials**
```bash
# Windows Credential Manager
# Search "Credential Manager" → Windows Credentials
# Remove GitHub credentials
# Try push again (will prompt for new credentials)
```

### Issue: "Permission denied"

**Solution:**
Make sure your Personal Access Token has `repo` scope enabled.

### Issue: "Everything up-to-date"

**Solution:**
Files not committed yet:
```bash
git status
git add .
git commit -m "Add Vercel config"
git push
```

---

## 💡 Quick Test

After push, check this URL to verify commit:
```
https://github.com/Kazuchan1889/hexasuite-revamp/commits/main
```

Latest commit should be newer than `84f5ca6`!

---

## 🎯 Expected Build (After Push)

Vercel logs should show:
```
✓ Cloning github.com/Kazuchan1889/hexasuite-revamp (Branch: main, Commit: NEW_COMMIT_HASH)
✓ Installing dependencies...
✓ Building production bundle...
✓ vite v5.3.0 building for production...
✓ ✓ built in XXs
✓ Build Completed
✓ Deployment Ready
```

---

## ⚡ After Successful Deploy

1. **Get Deployment URL**
   ```
   https://hexasuite-revamp.vercel.app
   ```

2. **Set Environment Variable**
   - Vercel Dashboard → Settings → Environment Variables
   - Add: `VITE_API_URL` = `http://localhost:4000/api`
   - Or your production backend URL

3. **Test Application**
   - Open deployed URL
   - Try login: `admin` / `admin123`
   - Check if features work

---

**Need help with authentication?** 

Let me know dan saya bisa buatkan guide untuk setup GitHub credentials!


