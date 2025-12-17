# Migrasi API URL ke Konfigurasi Terpusat

Semua hardcoded URL `http://192.168.1.44:4000` telah diganti menjadi menggunakan konfigurasi terpusat dari `src/config/api.js`.

## File yang Sudah Diupdate

✅ **src/config/api.js** - Menambahkan helper functions:
- `API_URL` - Base URL untuk API
- `getApiUrl(path)` - Helper untuk mendapatkan full API URL
- `getFileUrl(path)` - Helper untuk mendapatkan full URL untuk file/gambar

✅ **src/pages/AdminDailyReport.jsx** - Sudah menggunakan `API_URL` dan `getFileUrl`
✅ **src/pages/Login.jsx** - Sudah menggunakan `API_URL`
✅ **src/pages/AdminDashboard.jsx** - Sudah menggunakan `API_URL`

## Cara Menggunakan

### 1. Import di setiap file pages:

```javascript
import { API_URL, getFileUrl } from '../config/api'
```

Atau jika hanya perlu API_URL:

```javascript
import { API_URL } from '../config/api'
```

### 2. Untuk API calls:

**Sebelum:**
```javascript
const res = await axios.get('http://192.168.1.44:4000/api/users', {
  headers: { Authorization: `Bearer ${token}` }
})
```

**Sesudah:**
```javascript
const res = await axios.get(`${API_URL}/api/users`, {
  headers: { Authorization: `Bearer ${token}` }
})
```

### 3. Untuk file/gambar URLs:

**Sebelum:**
```javascript
<img src={`http://192.168.1.44:4000${user.profilePicture}`} />
```

**Sesudah:**
```javascript
<img src={getFileUrl(user.profilePicture)} />
```

## File yang Perlu Diupdate

File-file berikut masih perlu diupdate (kecuali AdminBiometric.jsx yang memiliki konfigurasi device khusus):

- [ ] src/pages/AdminAttendance.jsx
- [ ] src/pages/AdminAttendanceStatusRequests.jsx
- [ ] src/pages/AdminDailyReportEditRequests.jsx
- [ ] src/pages/AdminLeave.jsx
- [ ] src/pages/AdminPayroll.jsx
- [ ] src/pages/Attendance.jsx
- [ ] src/pages/Calendar.jsx
- [ ] src/pages/DailyReport.jsx
- [ ] src/pages/Leave.jsx
- [ ] src/pages/MyPerformance.jsx
- [ ] src/pages/Notifications.jsx
- [ ] src/pages/Payroll.jsx
- [ ] src/pages/Performance.jsx
- [ ] src/pages/Profile.jsx
- [ ] src/pages/Reports.jsx
- [ ] src/pages/UserDashboard.jsx
- [ ] src/pages/Users.jsx
- [ ] src/components/Layout.jsx
- [ ] src/App.jsx

## Catatan Penting

⚠️ **AdminBiometric.jsx** TIDAK perlu diupdate karena memiliki konfigurasi device khusus (middlewareIP, deviceKey, dll) yang berbeda dari API URL utama.

## Mengubah IP Backend

Sekarang cukup ubah di **satu tempat saja**:

**File: `src/config/api.js`**

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.44:4000';
```

Atau set environment variable:
```bash
VITE_API_URL=http://new-ip:4000
```

Semua file akan otomatis menggunakan IP baru!

