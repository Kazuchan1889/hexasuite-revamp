import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useTheme } from '../contexts/ThemeContext'

export default function AdminAttendance() {
  const { theme } = useTheme()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState({ date: '', userId: '' })
  const [users, setUsers] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({
    checkInTime: '08:00',
    checkOutTime: '17:00',
    breakStartTime: '12:00',
    breakEndTime: '13:00',
    checkInTolerance: 15, // minutes
    breakDuration: 60 // minutes
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAttendance, setSelectedAttendance] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    load()
    loadUsers()
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('http://localhost:4000/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const settingsData = {}
      res.data.forEach(s => {
        settingsData[s.key] = s.value
      })
      setSettings({
        checkInTime: settingsData.checkInTime || '08:00',
        checkOutTime: settingsData.checkOutTime || '17:00',
        breakStartTime: settingsData.breakStartTime || '12:00',
        breakEndTime: settingsData.breakEndTime || '13:00',
        checkInTolerance: parseInt(settingsData.checkInTolerance) || 15,
        breakDuration: parseInt(settingsData.breakDuration) || 60
      })
    } catch (err) {
      console.error('Error loading settings:', err)
    }
  }

  async function saveSettings() {
    setSavingSettings(true)
    try {
      const token = localStorage.getItem('token')
      const settingsToSave = [
        { key: 'checkInTime', value: settings.checkInTime },
        { key: 'checkOutTime', value: settings.checkOutTime },
        { key: 'breakStartTime', value: settings.breakStartTime },
        { key: 'breakEndTime', value: settings.breakEndTime },
        { key: 'checkInTolerance', value: String(settings.checkInTolerance) },
        { key: 'breakDuration', value: String(settings.breakDuration) }
      ]
      
      for (const setting of settingsToSave) {
        await axios.post('http://localhost:4000/api/settings', setting, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      
      alert('Pengaturan berhasil disimpan')
      setShowSettings(false)
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan pengaturan')
      console.error(err)
    }
    setSavingSettings(false)
  }

  async function loadUsers() {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('http://localhost:4000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('http://localhost:4000/api/attendances', {
        headers: { Authorization: `Bearer ${token}` }
      })
      let data = res.data.reverse()
      
      // Apply filters
      if (filter.date) {
        data = data.filter(a => a.date === filter.date)
      }
      if (filter.userId) {
        data = data.filter(a => a.userId === parseInt(filter.userId))
      }
      
      setList(data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [filter])

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold mb-2 transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Master <span className="gradient-text">Absensi</span> 📋
          </h1>
          <p className={`transition-colors ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Lihat dan kelola data absensi semua user</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Pengaturan Waktu
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`card-strong mb-6 border transition-colors ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200'
        }`}>
          <h2 className={`text-xl font-bold mb-4 transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Pengaturan Waktu Absensi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Waktu Check In *</label>
              <input
                type="time"
                value={settings.checkInTime}
                onChange={e => setSettings({ ...settings, checkInTime: e.target.value })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Waktu Check Out *</label>
              <input
                type="time"
                value={settings.checkOutTime}
                onChange={e => setSettings({ ...settings, checkOutTime: e.target.value })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Waktu Mulai Istirahat *</label>
              <input
                type="time"
                value={settings.breakStartTime}
                onChange={e => setSettings({ ...settings, breakStartTime: e.target.value })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Waktu Selesai Istirahat *</label>
              <input
                type="time"
                value={settings.breakEndTime}
                onChange={e => setSettings({ ...settings, breakEndTime: e.target.value })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Toleransi Check In (menit) *</label>
              <input
                type="number"
                min="0"
                value={settings.checkInTolerance}
                onChange={e => setSettings({ ...settings, checkInTolerance: parseInt(e.target.value) || 0 })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
                placeholder="15"
              />
              <p className={`text-xs mt-1 transition-colors ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Jika check in tepat waktu = On Time<br/>
                Jika melewati waktu tapi belum melebihi toleransi = Almost Late<br/>
                Jika melewati toleransi = Late
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Durasi Istirahat (menit) *</label>
              <input
                type="number"
                min="0"
                value={settings.breakDuration}
                onChange={e => setSettings({ ...settings, breakDuration: parseInt(e.target.value) || 0 })}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
                placeholder="60"
              />
              <p className={`text-xs mt-1 transition-colors ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Jika selesai istirahat melewati durasi yang ditentukan = Break Late
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setShowSettings(false)
                loadSettings() // Reset to saved values
              }}
              className={`px-6 py-3 rounded-lg hover:opacity-80 transition-colors font-medium ${
                theme === 'dark' 
                  ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' 
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Batal
            </button>
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </div>
      )}

      <div className={`card-strong mb-6 transition-colors ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Filter Tanggal</label>
            <input
              type="date"
              value={filter.date}
              onChange={e => setFilter({ ...filter, date: e.target.value })}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Filter User</label>
            <select
              value={filter.userId}
              onChange={e => setFilter({ ...filter, userId: e.target.value })}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300'
              }`}
            >
              <option value="">Semua User</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setFilter({ date: '', userId: '' })}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              theme === 'dark' 
                ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Reset Filter
          </button>
        </div>
      </div>

      <div className={`card-strong transition-colors ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Data Absensi</h2>
          <div className={`text-sm transition-colors ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{list.length} catatan</div>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className={`mt-2 transition-colors ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Memuat data...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.length === 0 && (
              <div className="text-center py-12">
                <svg className={`w-16 h-16 mx-auto mb-4 transition-colors ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className={`transition-colors ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Tidak ada data absensi</p>
              </div>
            )}
            {list.map((a) => (
              <div 
                key={a.id} 
                className={`card transition-colors cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 hover:border-purple-500' 
                    : 'bg-white border-gray-200 hover:border-indigo-300'
                }`}
                onClick={() => {
                  setSelectedAttendance(a)
                  setShowDetailModal(true)
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <div className={`font-semibold transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{a.date}</div>
                      {/* Status Izin/Sakit/Alfa - tampilkan jika bukan Hadir */}
                      {a.status === 'Izin' && (
                        <span className="status-chip status-warning">
                          Izin
                        </span>
                      )}
                      {a.status === 'Sakit' && (
                        <span className="status-chip status-danger">
                          Sakit
                        </span>
                      )}
                      {a.status === 'Alfa' && (
                        <span className="status-chip status-default">
                          Alfa
                        </span>
                      )}
                      {/* Status Check In - tampilkan sebagai status utama jika Hadir */}
                      {a.status === 'Hadir' && a.checkIn && a.checkInStatus && (
                        <span
                          className={`status-chip font-semibold ${
                            a.checkInStatus === 'onTime'
                              ? 'bg-green-100 text-green-800 border-2 border-green-400'
                              : a.checkInStatus === 'almostLate'
                              ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
                              : 'bg-red-100 text-red-800 border-2 border-red-400'
                          }`}
                        >
                          {a.checkInStatus === 'onTime' ? '✓ On Time' : a.checkInStatus === 'almostLate' ? '⚠ Almost Late' : '✗ Late'}
                        </span>
                      )}
                      {/* Jika Hadir tapi belum ada checkInStatus, tampilkan Hadir */}
                      {a.status === 'Hadir' && a.checkIn && !a.checkInStatus && (
                        <span className="status-chip status-success">
                          Hadir
                        </span>
                      )}
                      {/* Status Break Late */}
                      {a.breakLate && (
                        <span className="status-chip bg-orange-100 text-orange-800 border border-orange-300 font-medium">
                          ⏰ Break Late
                        </span>
                      )}
                      {/* Status Early Leave */}
                      {a.earlyLeave && (
                        <span className="status-chip bg-blue-100 text-blue-800 border border-blue-300 font-medium">
                          🏃 Early Leave
                        </span>
                      )}
                      {/* Jika tidak ada status apapun */}
                      {!a.checkIn && a.status !== 'Izin' && a.status !== 'Sakit' && a.status !== 'Alfa' && (
                        <span className="status-chip status-default">
                          Belum Absen
                        </span>
                      )}
                    </div>
                    <div className={`text-sm mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      <div className={`font-medium mb-1 transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {a.User ? a.User.name : `User ID: ${a.userId}`}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          CheckIn: {a.checkIn || '-'}
                        </span>
                        {(a.breakStart || a.breakEnd) && (
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Break: {a.breakStart || '-'} - {a.breakEnd || '-'}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          CheckOut: {a.checkOut || '-'}
                        </span>
                      </div>
                    </div>
                    {a.note && (
                      <div className={`text-sm rounded-lg p-2 border transition-colors ${
                        theme === 'dark' 
                          ? 'text-gray-300 bg-gray-700 border-gray-600' 
                          : 'text-gray-600 bg-gray-50 border-gray-200'
                      }`}>
                        {a.note}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAttendance && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-colors ${
          theme === 'dark' ? 'bg-black/80' : 'bg-black/50'
        }`} onClick={() => setShowDetailModal(false)}>
          <div className={`rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white'
          }`} onClick={(e) => e.stopPropagation()}>
            <div className={`sticky top-0 border-b px-6 py-4 flex items-center justify-between transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-2xl font-bold transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Detail Absensi</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className={`transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* User Info */}
              <div className={`flex items-center gap-4 mb-6 pb-6 border-b transition-colors ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}>
                {selectedAttendance.User?.profilePicture ? (
                  <img
                    src={selectedAttendance.User.profilePicture.startsWith('data:') 
                      ? selectedAttendance.User.profilePicture 
                      : `http://localhost:4000${selectedAttendance.User.profilePicture}`}
                    alt={selectedAttendance.User.name}
                    className={`w-16 h-16 rounded-full object-cover border-2 transition-colors ${
                      theme === 'dark' ? 'border-purple-500' : 'border-indigo-200'
                    }`}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                    {selectedAttendance.User?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h3 className={`text-xl font-bold transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedAttendance.User?.name || `User ID: ${selectedAttendance.userId}`}</h3>
                  <p className={`transition-colors ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>@{selectedAttendance.User?.username || 'N/A'}</p>
                  <p className={`text-sm mt-1 transition-colors ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Tanggal: {selectedAttendance.date}</p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedAttendance.status === 'Izin' && (
                  <span className="status-chip status-warning">Izin</span>
                )}
                {selectedAttendance.status === 'Sakit' && (
                  <span className="status-chip status-danger">Sakit</span>
                )}
                {selectedAttendance.status === 'Alfa' && (
                  <span className="status-chip status-default">Alfa</span>
                )}
                {selectedAttendance.status === 'Hadir' && selectedAttendance.checkIn && selectedAttendance.checkInStatus && (
                  <span
                    className={`status-chip font-semibold ${
                      selectedAttendance.checkInStatus === 'onTime'
                        ? 'bg-green-100 text-green-800 border-2 border-green-400'
                        : selectedAttendance.checkInStatus === 'almostLate'
                        ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400'
                        : 'bg-red-100 text-red-800 border-2 border-red-400'
                    }`}
                  >
                    {selectedAttendance.checkInStatus === 'onTime' ? '✓ On Time' : selectedAttendance.checkInStatus === 'almostLate' ? '⚠ Almost Late' : '✗ Late'}
                  </span>
                )}
                {selectedAttendance.status === 'Hadir' && selectedAttendance.checkIn && !selectedAttendance.checkInStatus && (
                  <span className="status-chip status-success">Hadir</span>
                )}
                {selectedAttendance.breakLate && (
                  <span className="status-chip bg-orange-100 text-orange-800 border border-orange-300 font-medium">
                    ⏰ Break Late
                  </span>
                )}
                {selectedAttendance.earlyLeave && (
                  <span className="status-chip bg-blue-100 text-blue-800 border border-blue-300 font-medium">
                    🏃 Early Leave
                  </span>
                )}
                {!selectedAttendance.checkIn && selectedAttendance.status !== 'Izin' && selectedAttendance.status !== 'Sakit' && selectedAttendance.status !== 'Alfa' && (
                  <span className="status-chip status-default">Belum Absen</span>
                )}
              </div>

              {/* Time Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className={`rounded-lg p-4 border transition-colors ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className={`text-sm mb-1 transition-colors ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Check In</div>
                  <div className={`text-lg font-semibold transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedAttendance.checkIn || '-'}
                  </div>
                </div>
                {(selectedAttendance.breakStart || selectedAttendance.breakEnd) && (
                  <div className={`rounded-lg p-4 border transition-colors ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`text-sm mb-1 transition-colors ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Break</div>
                    <div className={`text-lg font-semibold transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {selectedAttendance.breakStart || '-'} - {selectedAttendance.breakEnd || '-'}
                    </div>
                  </div>
                )}
                <div className={`rounded-lg p-4 border transition-colors ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className={`text-sm mb-1 transition-colors ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Check Out</div>
                  <div className={`text-lg font-semibold transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedAttendance.checkOut || '-'}
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {selectedAttendance.checkInPhotoPath ? (
                  <div>
                    <div className={`text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Foto Check In</div>
                    <div className="relative">
                      <img
                        src={`http://localhost:4000${selectedAttendance.checkInPhotoPath}`}
                        alt="Check In Photo"
                        className={`w-full rounded-lg border shadow-sm object-cover transition-colors ${
                          theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                        }`}
                        onError={(e) => {
                          e.target.style.display = 'none'
                          const errorDiv = e.target.parentElement.querySelector('.error-message')
                          if (errorDiv) errorDiv.style.display = 'block'
                        }}
                      />
                      <div className={`error-message hidden text-sm text-center py-4 rounded-lg border transition-colors ${
                        theme === 'dark' 
                          ? 'text-gray-400 bg-gray-700 border-gray-600' 
                          : 'text-gray-500 bg-gray-50 border-gray-200'
                      }`}>
                        Foto tidak tersedia
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className={`text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Foto Check In</div>
                    <div className={`text-sm text-center py-8 rounded-lg border transition-colors ${
                      theme === 'dark' 
                        ? 'text-gray-400 bg-gray-700 border-gray-600' 
                        : 'text-gray-500 bg-gray-50 border-gray-200'
                    }`}>
                      Tidak ada foto
                    </div>
                  </div>
                )}
                {selectedAttendance.checkOutPhotoPath ? (
                  <div>
                    <div className={`text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Foto Check Out</div>
                    <div className="relative">
                      <img
                        src={`http://localhost:4000${selectedAttendance.checkOutPhotoPath}`}
                        alt="Check Out Photo"
                        className={`w-full rounded-lg border shadow-sm object-cover transition-colors ${
                          theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                        }`}
                        onError={(e) => {
                          e.target.style.display = 'none'
                          const errorDiv = e.target.parentElement.querySelector('.error-message')
                          if (errorDiv) errorDiv.style.display = 'block'
                        }}
                      />
                      <div className={`error-message hidden text-sm text-center py-4 rounded-lg border transition-colors ${
                        theme === 'dark' 
                          ? 'text-gray-400 bg-gray-700 border-gray-600' 
                          : 'text-gray-500 bg-gray-50 border-gray-200'
                      }`}>
                        Foto tidak tersedia
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className={`text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Foto Check Out</div>
                    <div className={`text-sm text-center py-8 rounded-lg border transition-colors ${
                      theme === 'dark' 
                        ? 'text-gray-400 bg-gray-700 border-gray-600' 
                        : 'text-gray-500 bg-gray-50 border-gray-200'
                    }`}>
                      Tidak ada foto
                    </div>
                  </div>
                )}
              </div>

              {/* Note */}
              {selectedAttendance.note && (
                <div className={`rounded-lg p-4 border transition-colors ${
                  theme === 'dark' 
                    ? 'bg-blue-900/30 border-blue-700' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className={`text-sm font-medium mb-1 transition-colors ${
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-900'
                  }`}>Catatan</div>
                  <div className={`text-sm transition-colors ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>{selectedAttendance.note}</div>
                </div>
              )}
            </div>

            <div className={`sticky bottom-0 border-t px-6 py-4 flex justify-end transition-colors ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 transition-colors ${
          theme === 'dark' ? 'bg-black/80' : 'bg-black/50'
        }`}>
          <div className={`w-full max-w-md rounded-xl shadow-2xl p-6 transition-colors ${
            theme === 'dark' 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold transition-colors ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Export Excel</h2>
              <button 
                onClick={() => setShowExportModal(false)} 
                className={`transition-colors ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tanggal Mulai <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={exportDateRange.startDate}
                  onChange={e => setExportDateRange({ ...exportDateRange, startDate: e.target.value })}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tanggal Akhir <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={exportDateRange.endDate}
                  onChange={e => setExportDateRange({ ...exportDateRange, endDate: e.target.value })}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              <div className={`border rounded-lg p-3 transition-colors ${
                theme === 'dark' 
                  ? 'bg-blue-900/30 border-blue-700' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm transition-colors ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                  <strong>Catatan:</strong> File Excel akan berisi 2 sheet:
                  <br />• Sheet 1: Data Absensi (check in, check out, break, status, dll)
                  <br />• Sheet 2: Data Laporan Harian (konten laporan, file, dll)
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowExportModal(false)} 
                className={`px-6 py-3 rounded-lg hover:opacity-80 transition-colors font-medium ${
                  theme === 'dark' 
                    ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' 
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  if (!exportDateRange.startDate || !exportDateRange.endDate) {
                    alert('Tanggal mulai dan tanggal akhir wajib diisi')
                    return
                  }

                  if (new Date(exportDateRange.startDate) > new Date(exportDateRange.endDate)) {
                    alert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir')
                    return
                  }

                  setExporting(true)
                  try {
                    const token = localStorage.getItem('token')
                    const response = await axios.get('http://localhost:4000/api/reports/export-excel', {
                      params: {
                        startDate: exportDateRange.startDate,
                        endDate: exportDateRange.endDate
                      },
                      headers: { Authorization: `Bearer ${token}` },
                      responseType: 'blob'
                    })

                    // Create download link
                    const url = window.URL.createObjectURL(new Blob([response.data]))
                    const link = document.createElement('a')
                    link.href = url
                    link.setAttribute('download', `export_absensi_laporan_${exportDateRange.startDate}_${exportDateRange.endDate}.xlsx`)
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                    window.URL.revokeObjectURL(url)

                    setShowExportModal(false)
                    alert('Export berhasil! File sedang didownload.')
                  } catch (err) {
                    console.error('Export error:', err)
                    alert(err.response?.data?.message || 'Gagal export Excel')
                  } finally {
                    setExporting(false)
                  }
                }}
                disabled={exporting}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export & Download
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

