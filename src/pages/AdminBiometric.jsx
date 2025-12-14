import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useTheme } from '../contexts/ThemeContext'
import { API_URL } from '../utils/api'

// Icons
const IconFingerprint = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
  </svg>
)

const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const IconX = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const IconRefresh = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

export default function AdminBiometric() {
  const { theme } = useTheme()
  
  // Configuration - Fixed values as per requirements
  const config = {
    middlewareIP: '192.168.31.231',
    deviceKey: '30EC19CE8B9D2A49',
    secret: '123456',
    deviceIP: '192.168.31.49'
  }

  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Dashboard state
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('unknown')
  
  // User list state
  const [userList, setUserList] = useState([])
  
  // Log/Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [autoRefresh, setAutoRefresh] = useState(true) // Enable by default
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 seconds
  const [lastRefreshTime, setLastRefreshTime] = useState(null)
  
  // Add user form
  const [userForm, setUserForm] = useState({
    personSn: '',
    name: '',
    gender: '',
    phone: '',
    deptName: '',
    idNumber: '',
    password: ''
  })
  
  // Biometric registration form
  const [bioForm, setBioForm] = useState({
    personSn: '',
    bioType: 'face', // face, palm, card
    feature: '',
    image: null,
    imagePreview: null,
    palmNum: '1', // for palm: 1=left, 2=right
    cardNumber: '' // for card
  })
  
  // Available users for biometric registration (filtered by bioType)
  const [availableUsers, setAvailableUsers] = useState([])
  const [loadingAvailableUsers, setLoadingAvailableUsers] = useState(false)

  useEffect(() => {
    // Auto check connection on mount
    if (activeTab === 'dashboard') {
      checkConnection()
    } else if (activeTab === 'log' && attendanceRecords.length === 0) {
      // Auto-load log data when opening Log tab
      console.log('[Auto-load] Loading attendance records...')
      loadAttendanceRecords(false)
    } else if (activeTab === 'biometric') {
      // Auto-load available users when opening Biometric registration tab
      console.log('[Auto-load] Loading available users for biometric registration...')
      loadAvailableUsersForBiometric()
    }
  }, [activeTab])
  
  // Load available users when bioType changes
  useEffect(() => {
    if (activeTab === 'biometric') {
      loadAvailableUsersForBiometric()
    }
  }, [bioForm.bioType])

  // Auto-refresh for Log tab (polling every X seconds)
  useEffect(() => {
    let intervalId = null
    
    if (autoRefresh && activeTab === 'log') {
      console.log('[Auto-Refresh] Enabled for Log tab (interval: ' + (refreshInterval / 1000) + 's)')
      
      // Set up polling interval (silent mode - no loading spinner, no success messages)
      intervalId = setInterval(() => {
        console.log('[Auto-Refresh] Fetching new scan records (silent mode)...')
        loadAttendanceRecords(true) // silent = true
        setLastRefreshTime(new Date())
      }, refreshInterval)
    }
    
    // Cleanup: clear interval when component unmounts or dependencies change
    return () => {
      if (intervalId) {
        console.log('[Auto-Refresh] Cleanup: clearing interval')
        clearInterval(intervalId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, activeTab, refreshInterval])

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  // Check device connection
  const checkConnection = async () => {
    setLoading(true)
    setConnectionStatus('checking')
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/api/device/info`,
        {
          middlewareIP: config.middlewareIP,
          deviceKey: config.deviceKey,
          secret: config.secret
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (res.data) {
        setDeviceInfo(res.data)
        setConnectionStatus('connected')
        showMessage('success', 'Device terhubung dengan baik!')
      }
    } catch (err) {
      console.error(err)
      setConnectionStatus('disconnected')
      showMessage('error', err.response?.data?.message || 'Gagal terhubung ke device')
      setDeviceInfo(null)
    }
    setLoading(false)
  }

  // Load attendance records (scan logs)
  const loadAttendanceRecords = async (silent = false) => {
    console.log('[Frontend] loadAttendanceRecords called:', { silent, activeTab })
    
    if (!silent) {
      setLoading(true)
    }
    
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('[Frontend] No token found')
        if (!silent) {
          showMessage('error', 'Token tidak ditemukan. Silakan login ulang.')
        }
        setLoading(false)
        return
      }

      // Get scan records from database
      // Filter by deviceKey from config
      const requestData = {
        deviceKey: config.deviceKey,
        limit: 500,
        offset: 0
      }

      console.log('[Frontend] Requesting scan records from database:', requestData)

      const res = await axios.post(
        `${API_URL}/api/device/scan/records`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      console.log('[Frontend] Scan records response:', {
        status: res.status,
        total: res.data?.total || 0,
        recordsLength: res.data?.records?.length || 0,
        sampleData: res.data?.records?.[0] || 'No data'
      })

      if (res.data && res.data.records && Array.isArray(res.data.records)) {
        console.log('[Frontend] Setting attendanceRecords:', res.data.records.length, 'records')
        setAttendanceRecords(res.data.records)
        if (!silent) {
          if (res.data.records.length > 0) {
            showMessage('success', `Berhasil memuat ${res.data.records.length} log scan (Total: ${res.data.total})`)
          } else {
            showMessage('warning', 'Tidak ada data log scan.')
          }
        }
      } else {
        console.warn('[Frontend] No records in response or invalid format')
        setAttendanceRecords([])
        if (!silent) {
          showMessage('warning', 'Tidak ada data log scan')
        }
      }
    } catch (err) {
      console.error('[Frontend] Error loading scan records:', err)
      console.error('[Frontend] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      })
      if (!silent) {
        const errorMsg = err.response?.data?.message || err.message || 'Gagal memuat data log scan'
        showMessage('error', errorMsg)
      }
      setAttendanceRecords([])
    }
    
    if (!silent) {
      setLoading(false)
    }
  }

  // Load available users for biometric registration (filter by bioType)
  const loadAvailableUsersForBiometric = async () => {
    setLoadingAvailableUsers(true)
    try {
      const token = localStorage.getItem('token')
      
      console.log('[Biometric] Loading all users from device...')
      
      // Step 1: Get all users from device
      const usersRes = await axios.post(
        `${API_URL}/api/device/persons`,
        {
          middlewareIP: config.middlewareIP,
          deviceKey: config.deviceKey,
          secret: config.secret
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (!Array.isArray(usersRes.data) || usersRes.data.length === 0) {
        console.log('[Biometric] No users found on device')
        setAvailableUsers([])
        setLoadingAvailableUsers(false)
        return
      }
      
      console.log(`[Biometric] Found ${usersRes.data.length} users. Checking biometric data...`)
      
      // Step 2: For each user, check if they already have the selected biometric type
      const usersWithBioStatus = await Promise.all(
        usersRes.data.map(async (user) => {
          const personSn = user.sn || user.personSn
          
          let hasFace = false
          let hasPalm = false
          
          // Check Face data
          if (bioForm.bioType === 'face') {
            try {
              const faceRes = await axios.post(
                `${API_URL}/api/device/face/find`,
                {
                  middlewareIP: config.middlewareIP,
                  deviceKey: config.deviceKey,
                  secret: config.secret,
                  personSn: personSn
                },
                { headers: { Authorization: `Bearer ${token}` } }
              )
              hasFace = faceRes.data && (Array.isArray(faceRes.data) ? faceRes.data.length > 0 : !!faceRes.data.faceId)
            } catch (err) {
              // If error (e.g., no face data), assume no face
              hasFace = false
            }
          }
          
          // Check Palm data
          if (bioForm.bioType === 'palm') {
            try {
              const palmRes = await axios.post(
                `${API_URL}/api/palm/find`,
                {
                  middlewareIP: config.middlewareIP,
                  deviceKey: config.deviceKey,
                  secret: config.secret,
                  personSn: personSn
                },
                { headers: { Authorization: `Bearer ${token}` } }
              )
              hasPalm = palmRes.data && (Array.isArray(palmRes.data) ? palmRes.data.length > 0 : !!palmRes.data.palmId)
            } catch (err) {
              // If error (e.g., no palm data), assume no palm
              hasPalm = false
            }
          }
          
          return {
            ...user,
            personSn: personSn,
            hasFace: hasFace,
            hasPalm: hasPalm
          }
        })
      )
      
      // Step 3: Filter based on bioType
      let filtered = []
      if (bioForm.bioType === 'face') {
        filtered = usersWithBioStatus.filter(u => !u.hasFace)
        console.log(`[Biometric] ${filtered.length} users without Face data`)
      } else if (bioForm.bioType === 'palm') {
        filtered = usersWithBioStatus.filter(u => !u.hasPalm)
        console.log(`[Biometric] ${filtered.length} users without Palm data`)
      } else {
        // For card, show all users
        filtered = usersWithBioStatus
      }
      
      setAvailableUsers(filtered)
    } catch (err) {
      console.error('[Biometric] Error loading available users:', err)
      showMessage('error', err.response?.data?.message || 'Gagal memuat daftar user')
      setAvailableUsers([])
    }
    setLoadingAvailableUsers(false)
  }

  // Load user list
  const loadUserList = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/api/device/persons`,
        {
          middlewareIP: config.middlewareIP,
          deviceKey: config.deviceKey,
          secret: config.secret
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (Array.isArray(res.data)) {
        setUserList(res.data)
        showMessage('success', `Berhasil memuat ${res.data.length} user dari device`)
      } else {
        setUserList([])
        showMessage('warning', 'Tidak ada data user')
      }
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal memuat data user')
      setUserList([])
    }
    setLoading(false)
  }

  // Add new user
  const addUser = async () => {
    // Validate required fields with trim
    const trimmedPersonSn = userForm.personSn ? userForm.personSn.trim() : ''
    const trimmedName = userForm.name ? userForm.name.trim() : ''
    
    if (!trimmedPersonSn || trimmedPersonSn === '') {
      showMessage('error', 'Person SN (Employee ID) wajib diisi dan tidak boleh kosong')
      return
    }
    
    if (!trimmedName || trimmedName === '') {
      showMessage('error', 'Nama wajib diisi dan tidak boleh kosong')
      return
    }

    console.log('[Biometric] Adding user - validation passed:', {
      personSn: trimmedPersonSn,
      personSnLength: trimmedPersonSn.length,
      name: trimmedName,
      nameLength: trimmedName.length
    })

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      
      // Build request data - ensure no empty strings for optional fields
      const requestData = {
        middlewareIP: config.middlewareIP,
        deviceKey: config.deviceKey,
        secret: config.secret,
        personSn: trimmedPersonSn,
        name: trimmedName
      }
      
      // Only add optional fields if they are not empty
      if (userForm.gender && userForm.gender.trim()) {
        requestData.gender = userForm.gender.trim()
      }
      if (userForm.phone && userForm.phone.trim()) {
        requestData.phone = userForm.phone.trim()
      }
      if (userForm.deptName && userForm.deptName.trim()) {
        requestData.deptName = userForm.deptName.trim()
      }
      if (userForm.idNumber && userForm.idNumber.trim()) {
        requestData.idNumber = userForm.idNumber.trim()
      }
      if (userForm.password && userForm.password.trim()) {
        requestData.password = userForm.password.trim()
      }
      
      console.log('[Biometric] Sending request to backend:', {
        endpoint: '/api/device/person/merge',
        middlewareIP: requestData.middlewareIP,
        deviceKey: requestData.deviceKey,
        secret: '***',
        personSn: requestData.personSn,
        name: requestData.name,
        optionalFields: {
          gender: requestData.gender || 'N/A',
          phone: requestData.phone || 'N/A',
          deptName: requestData.deptName || 'N/A',
          idNumber: requestData.idNumber || 'N/A',
          password: requestData.password ? '***' : 'N/A'
        }
      })
      
      const res = await axios.post(
        `${API_URL}/api/device/person/merge`,
        requestData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )
      
      console.log('[Biometric] Add user response:', res.data)
      
      showMessage('success', res.data.message || 'User berhasil ditambahkan ke device!')
      
      // Reset form
      setUserForm({
        personSn: '',
        name: '',
        gender: '',
        phone: '',
        deptName: '',
        idNumber: '',
        password: ''
      })
      
      // Auto refresh user list
      if (activeTab === 'users') {
        loadUserList()
      }
    } catch (err) {
      console.error('[Biometric] Add user error:', err)
      console.error('[Biometric] Error response:', err.response?.data)
      const errorMsg = err.response?.data?.message || err.message || 'Gagal menambahkan user'
      showMessage('error', errorMsg)
    }
    setLoading(false)
  }

  // Register biometric (face/palm/card)
  const registerBiometric = async () => {
    // Validate Person SN selected
    if (!bioForm.personSn || !bioForm.personSn.trim()) {
      showMessage('error', 'Silakan pilih user terlebih dahulu dari dropdown')
      return
    }

    // Validate based on type
    if (bioForm.bioType === 'face' && !bioForm.feature && !bioForm.image) {
      showMessage('error', 'Silakan upload foto wajah atau masukkan feature')
      return
    }
    
    if (bioForm.bioType === 'palm' && !bioForm.feature && !bioForm.image) {
      showMessage('error', 'Silakan upload foto telapak tangan atau masukkan feature')
      return
    }
    
    if (bioForm.bioType === 'card' && !bioForm.cardNumber) {
      showMessage('error', 'Nomor kartu wajib diisi')
      return
    }

    console.log('[Biometric Registration] Starting registration:', {
      personSn: bioForm.personSn,
      bioType: bioForm.bioType,
      hasFeature: !!bioForm.feature,
      hasImage: !!bioForm.image
    })

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      let endpoint = ''
      let payload = {
        middlewareIP: config.middlewareIP,
        deviceKey: config.deviceKey,
        secret: config.secret,
        personSn: bioForm.personSn.trim()
      }

      if (bioForm.bioType === 'face') {
        endpoint = '/api/device/face/register'
        payload.image = bioForm.feature || bioForm.image
        console.log('[Biometric Registration] Face endpoint:', endpoint)
      } else if (bioForm.bioType === 'palm') {
        endpoint = '/api/palm/register'
        payload.palmId = `PALM_${bioForm.personSn}_${Date.now()}`
        payload.palmNum = parseInt(bioForm.palmNum)
        payload.feature = bioForm.feature || bioForm.image
        console.log('[Biometric Registration] Palm endpoint:', endpoint, {
          palmId: payload.palmId,
          palmNum: payload.palmNum
        })
      } else if (bioForm.bioType === 'card') {
        // Card endpoint - using person/merge with card field
        endpoint = '/api/device/person/merge'
        payload.cardNumber = bioForm.cardNumber
        console.log('[Biometric Registration] Card endpoint:', endpoint)
      }

      console.log('[Biometric Registration] Sending request to:', `${API_URL}${endpoint}`)
      
      const res = await axios.post(`${API_URL}${endpoint}`, payload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      })
      
      console.log('[Biometric Registration] Response:', res.data)
      
      const bioTypeName = bioForm.bioType === 'face' ? 'Face' : bioForm.bioType === 'palm' ? 'Palm' : 'Card'
      showMessage('success', res.data.message || `${bioTypeName} berhasil didaftarkan!`)
      
      // Reset form
      setBioForm({
        personSn: '',
        bioType: bioForm.bioType, // Keep same bioType
        feature: '',
        image: null,
        imagePreview: null,
        palmNum: '1',
        cardNumber: ''
      })
      
      // Reload available users
      loadAvailableUsersForBiometric()
    } catch (err) {
      console.error('[Biometric Registration] Error:', err)
      console.error('[Biometric Registration] Error response:', err.response?.data)
      const errorMsg = err.response?.data?.message || err.message || 'Gagal mendaftarkan biometric'
      showMessage('error', errorMsg)
    }
    setLoading(false)
  }

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        showMessage('error', 'File harus berupa gambar')
        return
      }
      
      if (file.size > 2 * 1024 * 1024) {
        showMessage('error', 'Ukuran file maksimal 2MB')
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result
        
        // Compress image
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          const maxDimension = 800
          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width
            width = maxDimension
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height
            height = maxDimension
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
          
          setBioForm({
            ...bioForm,
            image: compressedBase64,
            imagePreview: compressedBase64
          })
        }
        
        img.src = base64String
      }
      reader.readAsDataURL(file)
    }
  }

  // Delete user
  const deleteUser = async (personSn) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus user dengan SN: ${personSn}?`)) {
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${API_URL}/api/device/person/delete`,
        {
          middlewareIP: config.middlewareIP,
          deviceKey: config.deviceKey,
          secret: config.secret,
          personSn: personSn
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      showMessage('success', 'User berhasil dihapus')
      loadUserList()
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal menghapus user')
    }
    setLoading(false)
  }

  return (
    <div className={`p-4 md:p-6 min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#1a2440]' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`mb-4 md:mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          <div className="flex items-center gap-3 mb-2">
            <IconFingerprint />
            <h1 className="text-2xl md:text-3xl font-bold">Biometric Management</h1>
          </div>
          <p className="text-sm md:text-base opacity-70">
            Kelola device biometric, user, dan registrasi face/palm/card
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs md:text-sm opacity-60">
            <span>Device: {config.deviceIP}</span>
            <span>•</span>
            <span>Middleware: {config.middlewareIP}:{8190}</span>
            <span>•</span>
            <span>SN: {config.deviceKey}</span>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-4 p-3 md:p-4 rounded-lg flex items-center gap-2 text-sm md:text-base ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-300' 
              : message.type === 'warning'
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {message.type === 'success' ? <IconCheck /> : <IconX />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className={`mb-4 md:mb-6 border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent">
            <div className="flex gap-2 min-w-max pb-1">
              {[
                { key: 'dashboard', label: 'Dashboard', icon: '📊' },
                { key: 'adduser', label: 'Add User', icon: '➕' },
                { key: 'biometric', label: 'Register Biometric', icon: '🔐' },
                { key: 'users', label: 'User List', icon: '👥' },
                { key: 'log', label: 'Log', icon: '📝' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key)
                    if (tab.key === 'users') loadUserList()
                    if (tab.key === 'log' && attendanceRecords.length === 0) loadAttendanceRecords(false)
                  }}
                  className={`px-4 py-2 font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab.key
                      ? theme === 'dark'
                        ? 'text-white border-b-2 border-purple-500 bg-purple-500/10'
                        : 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                      : theme === 'dark'
                        ? 'text-white/60 hover:text-white hover:bg-white/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className={`rounded-lg shadow-lg p-4 md:p-6 transition-colors ${
          theme === 'dark' ? 'bg-[#26355D]' : 'bg-white'
        }`}>
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Device Connection Status
                </h2>
                
                {/* Connection Status Indicator */}
                <div className="flex justify-center mb-6">
                  <div className={`relative w-32 h-32 rounded-full flex items-center justify-center border-4 ${
                    connectionStatus === 'connected' 
                      ? 'border-green-500 bg-green-50' 
                      : connectionStatus === 'disconnected'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 bg-gray-50 animate-pulse'
                  }`}>
                    <div className={`text-4xl ${
                      connectionStatus === 'connected' 
                        ? 'text-green-500' 
                        : connectionStatus === 'disconnected'
                          ? 'text-red-500'
                          : 'text-gray-400'
                    }`}>
                      {connectionStatus === 'connected' ? '✓' : connectionStatus === 'disconnected' ? '✗' : '?'}
                    </div>
                  </div>
                </div>

                <p className={`text-lg font-medium mb-2 ${
                  connectionStatus === 'connected' 
                    ? 'text-green-600' 
                    : connectionStatus === 'disconnected'
                      ? 'text-red-600'
                      : theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                }`}>
                  {connectionStatus === 'connected' ? '🟢 Device Connected' : connectionStatus === 'disconnected' ? '🔴 Device Disconnected' : '🟡 Checking Connection...'}
                </p>

                <button
                  onClick={checkConnection}
                  disabled={loading}
                  className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  <IconRefresh />
                  {loading ? 'Checking...' : 'Check Connection'}
                </button>
              </div>

              {/* Device Info */}
              {deviceInfo && (
                <div className={`mt-6 p-4 rounded-lg border ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                  <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Device Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {Object.entries(deviceInfo).map(([key, value]) => (
                      <div key={key} className={theme === 'dark' ? 'text-white/80' : 'text-gray-700'}>
                        <span className="font-medium">{key}:</span>{' '}
                        <span>{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add User Tab */}
          {activeTab === 'adduser' && (
            <div className="space-y-4">
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Tambah User Baru
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Person SN (Employee ID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.personSn}
                    onChange={(e) => setUserForm({ ...userForm, personSn: e.target.value })}
                    placeholder="EMP001"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    placeholder="Nama Karyawan"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Gender
                  </label>
                  <select
                    value={userForm.gender}
                    onChange={(e) => setUserForm({ ...userForm, gender: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    <option value="">Pilih Gender</option>
                    <option value="1">Male</option>
                    <option value="2">Female</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Nomor HP
                  </label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="08123456789"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Departemen
                  </label>
                  <input
                    type="text"
                    value={userForm.deptName}
                    onChange={(e) => setUserForm({ ...userForm, deptName: e.target.value })}
                    placeholder="IT Department"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    ID Number (KTP)
                  </label>
                  <input
                    type="text"
                    value={userForm.idNumber}
                    onChange={(e) => setUserForm({ ...userForm, idNumber: e.target.value })}
                    placeholder="1234567890123456"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    PIN Device
                  </label>
                  <input
                    type="text"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="123456"
                    maxLength={6}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
              </div>
              
              <button
                onClick={addUser}
                disabled={loading}
                className="w-full md:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Menambahkan...' : '➕ Tambah User ke Device'}
              </button>
            </div>
          )}

          {/* Register Biometric Tab */}
          {activeTab === 'biometric' && (
            <div className="space-y-4">
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Register Biometric (Face / Palm / Card)
              </h2>
              
              {/* Biometric Type Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                  Tipe Biometric <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'face', label: 'Face', icon: '😀' },
                    { value: 'palm', label: 'Palm', icon: '🖐️' },
                    { value: 'card', label: 'Card', icon: '💳' }
                  ].map(type => (
                    <button
                      key={type.value}
                      onClick={() => setBioForm({ ...bioForm, bioType: type.value, feature: '', image: null, imagePreview: null })}
                      className={`px-4 py-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                        bioForm.bioType === type.value
                          ? 'border-purple-500 bg-purple-500/10'
                          : theme === 'dark'
                            ? 'border-white/20 hover:border-white/40'
                            : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Person SN - Dropdown Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                  Pilih User <span className="text-red-500">*</span>
                </label>
                
                {loadingAvailableUsers ? (
                  <div className={`px-4 py-3 rounded-lg border ${
                    theme === 'dark' ? 'bg-[#1a2440] border-white/20 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <IconRefresh className="animate-spin" />
                      <span>Memuat daftar user...</span>
                    </div>
                  </div>
                ) : availableUsers.length > 0 ? (
                  <>
                    <select
                      value={bioForm.personSn}
                      onChange={(e) => setBioForm({ ...bioForm, personSn: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#1a2440] border-white/20 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    >
                      <option value="">-- Pilih User --</option>
                      {availableUsers.map((user) => {
                        const personSn = user.personSn || user.sn
                        const displayName = `${personSn} - ${user.name || 'No Name'}`
                        return (
                          <option key={personSn} value={personSn}>
                            {displayName}
                          </option>
                        )
                      })}
                    </select>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                      {bioForm.bioType === 'face' && (
                        <>✅ Menampilkan {availableUsers.length} user yang belum memiliki Face ID</>
                      )}
                      {bioForm.bioType === 'palm' && (
                        <>✅ Menampilkan {availableUsers.length} user yang belum memiliki Palm data</>
                      )}
                      {bioForm.bioType === 'card' && (
                        <>✅ Menampilkan {availableUsers.length} user untuk registrasi Card</>
                      )}
                    </p>
                  </>
                ) : (
                  <div className={`px-4 py-3 rounded-lg border ${
                    theme === 'dark' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                  }`}>
                    <p className={`text-sm ${theme === 'dark' ? 'text-orange-300' : 'text-orange-800'}`}>
                      {bioForm.bioType === 'face' && (
                        <>⚠️ Semua user sudah memiliki Face ID. Tidak ada user yang perlu didaftarkan.</>
                      )}
                      {bioForm.bioType === 'palm' && (
                        <>⚠️ Semua user sudah memiliki Palm data. Tidak ada user yang perlu didaftarkan.</>
                      )}
                      {bioForm.bioType === 'card' && (
                        <>⚠️ Tidak ada user tersedia. Tambahkan user terlebih dahulu di tab "Add User".</>
                      )}
                    </p>
                    <button
                      onClick={loadAvailableUsersForBiometric}
                      className={`mt-2 px-3 py-1 rounded text-xs font-medium ${
                        theme === 'dark' 
                          ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300' 
                          : 'bg-orange-100 hover:bg-orange-200 text-orange-800'
                      }`}
                    >
                      🔄 Refresh Daftar User
                    </button>
                  </div>
                )}
              </div>
              
              {/* Face/Palm - Image Upload */}
              {(bioForm.bioType === 'face' || bioForm.bioType === 'palm') && (
                <>
                  {bioForm.bioType === 'palm' && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                        Tangan
                      </label>
                      <select
                        value={bioForm.palmNum}
                        onChange={(e) => setBioForm({ ...bioForm, palmNum: e.target.value })}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          theme === 'dark'
                            ? 'bg-[#1a2440] border-white/20 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      >
                        <option value="1">👈 Kiri (Left)</option>
                        <option value="2">👉 Kanan (Right)</option>
                      </select>
                    </div>
                  )}
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                      Upload {bioForm.bioType === 'face' ? 'Foto Wajah' : 'Foto Telapak Tangan'}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#1a2440] border-white/20 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    />
                    {bioForm.imagePreview && (
                      <div className="mt-3">
                        <img src={bioForm.imagePreview} alt="Preview" className="max-w-xs rounded-lg border" />
                      </div>
                    )}
                  </div>
                  
                  <div className={`text-center ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                    <span>─────  ATAU  ─────</span>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                      Feature String
                    </label>
                    <textarea
                      value={bioForm.feature}
                      onChange={(e) => setBioForm({ ...bioForm, feature: e.target.value })}
                      placeholder="Rk1SACAyMAAAAAF6AAAA/AFEAMUAxQ..."
                      rows={4}
                      className={`w-full px-4 py-2 rounded-lg border font-mono text-sm ${
                        theme === 'dark'
                          ? 'bg-[#1a2440] border-white/20 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    />
                  </div>
                </>
              )}
              
              {/* Card - Card Number */}
              {bioForm.bioType === 'card' && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Nomor Kartu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bioForm.cardNumber}
                    onChange={(e) => setBioForm({ ...bioForm, cardNumber: e.target.value })}
                    placeholder="1234567890"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
              )}
              
              <button
                onClick={registerBiometric}
                disabled={loading}
                className="w-full md:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Mendaftarkan...' : `🔐 Register ${bioForm.bioType === 'face' ? 'Face' : bioForm.bioType === 'palm' ? 'Palm' : 'Card'}`}
              </button>
            </div>
          )}

          {/* User List Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Daftar User di Device
                </h2>
                <button
                  onClick={loadUserList}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <IconRefresh />
                  Refresh
                </button>
              </div>
              
              {userList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-white/10 text-white' : 'divide-gray-200 text-gray-900'}`}>
                    <thead className={theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}>
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Person SN</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Nama</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Gender</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Dept</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-gray-100'}`}>
                      {userList.map((user, idx) => {
                        const personSn = user.sn || user.personSn
                        return (
                          <tr key={personSn || idx} className={theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-3 text-sm font-medium">{personSn || '-'}</td>
                            <td className="px-4 py-3 text-sm">{user.name || '-'}</td>
                            <td className="px-4 py-3 text-sm">{user.gender === 1 ? 'Male' : user.gender === 2 ? 'Female' : '-'}</td>
                            <td className="px-4 py-3 text-sm">{user.mobile || user.phone || '-'}</td>
                            <td className="px-4 py-3 text-sm">{user.deptName || '-'}</td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => deleteUser(personSn)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className={`mt-3 text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                    Total: {userList.length} users
                  </div>
                </div>
              ) : (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  {loading ? 'Memuat data...' : 'Tidak ada data user. Klik Refresh untuk memuat data.'}
                </div>
              )}
            </div>
          )}

          {/* Log Tab - Scan Records */}
          {activeTab === 'log' && (
            <div className="space-y-3 md:space-y-4">
              {/* Info Box */}
              <div className={`p-3 md:p-4 rounded-lg border ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                <h4 className={`text-sm md:text-base font-semibold mb-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
                  📡 Real-time Biometric Scan Logs
                </h4>
                <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-blue-200/80' : 'text-blue-800'}`}>
                  Data log scan biometrik yang diterima dari device secara real-time. Auto-refresh setiap 5 detik.
                </p>
              </div>

              {/* Header with auto-refresh controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Log Scan Biometrik (Real-time)
                    </h3>
                    {/* Auto-refresh indicator */}
                    {autoRefresh && activeTab === 'log' && (
                      <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-green-100 border border-green-300">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-green-700">Auto-refresh ON</span>
                      </div>
                    )}
                  </div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                    Data log scan yang diterima langsung dari device. 
                    {lastRefreshTime && (
                      <span className="ml-1">
                        Last updated: {lastRefreshTime.toLocaleTimeString('id-ID')}
                      </span>
                    )}
                  </p>
                </div>
                
                {/* Controls */}
                <div className="flex items-center gap-2">
                  {/* Interval selector */}
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                    className={`px-2 py-2 text-xs rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    <option value="3000">3s</option>
                    <option value="5000">5s</option>
                    <option value="10000">10s</option>
                    <option value="30000">30s</option>
                    <option value="60000">60s</option>
                  </select>
                  
                  {/* Auto-refresh toggle */}
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-medium ${
                      autoRefresh
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : theme === 'dark'
                          ? 'bg-gray-600 hover:bg-gray-700 text-white'
                          : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
                    }`}
                  >
                    {autoRefresh ? '🟢 Auto' : '⏸️ Manual'}
                  </button>
                  
                  {/* Manual refresh button */}
                  <button
                    onClick={() => loadAttendanceRecords(false)}
                    disabled={loading}
                    className="px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm md:text-base"
                  >
                    <IconRefresh className={loading ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              {attendanceRecords.length > 0 ? (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-white/10 text-white' : 'divide-gray-200 text-gray-900'}`}>
                      <thead className={theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}>
                        <tr>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Waktu Scan</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Person SN</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Nama</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold hidden sm:table-cell">Metode</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold hidden md:table-cell">Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-gray-100'}`}>
                        {attendanceRecords.map((record, idx) => {
                          // Determine scan method
                          let scanMethod = '-'
                          let methodIcon = ''
                          if (record.faceFlag === 1) { scanMethod = 'Face'; methodIcon = '😀' }
                          else if (record.palmFlag === 1) { scanMethod = 'Palm'; methodIcon = '🖐️' }
                          else if (record.cardFlag === 1) { scanMethod = 'Card'; methodIcon = '💳' }
                          else if (record.fingerFlag === 1) { scanMethod = 'Finger'; methodIcon = '👆' }
                          
                          // Determine status
                          let statusText = '-'
                          let statusClass = 'bg-gray-100 text-gray-800'
                          let statusIcon = '❓'
                          if (record.resultFlag === 1) {
                            statusText = 'Success'
                            statusClass = 'bg-green-100 text-green-800'
                            statusIcon = '✅'
                          } else if (record.resultFlag === 2) {
                            statusText = 'Failed'
                            statusClass = 'bg-red-100 text-red-800'
                            statusIcon = '❌'
                          } else if (record.resultFlag === 3) {
                            statusText = 'No Permission'
                            statusClass = 'bg-yellow-100 text-yellow-800'
                            statusIcon = '⚠️'
                          }
                          
                          if (record.strangerFlag === 1) {
                            statusText = 'Stranger'
                            statusClass = 'bg-orange-100 text-orange-800'
                            statusIcon = '👤'
                          }
                          
                          // Format time
                          const scanTime = record.recordTimeTs 
                            ? new Date(record.recordTimeTs).toLocaleString('id-ID', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })
                            : record.recordTime
                              ? new Date(parseInt(record.recordTime)).toLocaleString('id-ID', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })
                              : '-'
                          
                          return (
                            <tr key={record.id || idx} className={theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm whitespace-nowrap">{scanTime}</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm whitespace-nowrap font-medium">{record.personSn || '-'}</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm">{record.personName || '-'}</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm hidden sm:table-cell">
                                <span className="flex items-center gap-1">
                                  {methodIcon} {scanMethod}
                                </span>
                              </td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm hidden md:table-cell">
                                <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 w-fit ${statusClass}`}>
                                  {statusIcon} {statusText}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className={`mt-3 text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                    Total: {attendanceRecords.length} records
                  </div>
                </div>
              ) : (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  {loading ? (
                    'Memuat data...'
                  ) : (
                    <div className="space-y-2">
                      <p className="text-lg">📭 Tidak ada data log scan.</p>
                      <p className="text-xs">
                        Data scan akan muncul otomatis saat user melakukan scan di device.
                      </p>
                      <p className="text-xs">
                        Device: <code className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'}`}>{config.deviceIP}</code>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

