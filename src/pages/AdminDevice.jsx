import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useTheme } from '../contexts/ThemeContext'
import { API_URL } from '../utils/api'

const IconRefresh = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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

export default function AdminDevice() {
  const { theme } = useTheme()
  const [deviceConfig, setDeviceConfig] = useState({
    middlewareIP: '',
    deviceKey: '',
    secret: ''
  })
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('config')
  const [persons, setPersons] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [accessGroups, setAccessGroups] = useState([])
  const [faceData, setFaceData] = useState([])
  const [selectedPersonSn, setSelectedPersonSn] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Auto-refresh state for Log tab
  const [autoRefresh, setAutoRefresh] = useState(true) // Enable by default
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 seconds
  const [lastRefreshTime, setLastRefreshTime] = useState(null)
  
  // Person form state - simplified (only essential fields)
  const [personForm, setPersonForm] = useState({
    personId: '',      // personSn - wajib
    personName: '',    // name - wajib
    phone: '',         // opsional
    gender: '',        // opsional (M/F -> 1/2)
    faceImage: null,   // faceBase64 - opsional
    faceImagePreview: null
  })
  const [editingPerson, setEditingPerson] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // Face registration state
  const [faceForm, setFaceForm] = useState({
    personId: '',
    image: null,
    imagePreview: null
  })
  
  // Palm registration state
  const [palmForm, setPalmForm] = useState({
    personId: '',
    palmImage: null,
    palmImagePreview: null,
    palmId: '',
    palmNum: '1' // 1 = left, 2 = right
  })

  useEffect(() => {
    // Load saved device config from localStorage
    const savedConfig = localStorage.getItem('deviceConfig')
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        // Migrate from old format (ip, password) to new format (middlewareIP, deviceKey, secret)
        if (parsed.ip && parsed.password && !parsed.middlewareIP) {
          // Old format detected, migrate to new format
          setDeviceConfig({
            middlewareIP: parsed.ip || '',
            deviceKey: parsed.deviceKey || '',
            secret: parsed.password || ''
          })
          // Save migrated config
          localStorage.setItem('deviceConfig', JSON.stringify({
            middlewareIP: parsed.ip || '',
            deviceKey: parsed.deviceKey || '',
            secret: parsed.password || ''
          }))
        } else {
          // New format or no migration needed
          setDeviceConfig({
            middlewareIP: parsed.middlewareIP || '',
            deviceKey: parsed.deviceKey || '',
            secret: parsed.secret || ''
          })
        }
      } catch (err) {
        console.error('Error parsing device config:', err)
        // Reset to default if parsing fails
        setDeviceConfig({
          middlewareIP: '',
          deviceKey: '',
          secret: ''
        })
      }
    } else {
      // Set default values for testing
      setDeviceConfig({
        middlewareIP: '192.168.31.231',
        deviceKey: '30EC19CE8B9D2A49',
        secret: '123456'
      })
    }
  }, [])

  // Auto-load data when switching to Info or Persons tab
  useEffect(() => {
    // Only auto-load if config is complete
    const hasConfig = deviceConfig.middlewareIP && 
                      deviceConfig.middlewareIP.trim() !== '' &&
                      deviceConfig.deviceKey && 
                      deviceConfig.deviceKey.trim() !== '' &&
                      deviceConfig.secret && 
                      deviceConfig.secret.trim() !== ''

    if (!loading) {
      if (activeTab === 'info' && !deviceInfo && hasConfig) {
        // Auto-load device info when opening Info tab (requires config)
        console.log('[Auto-load] Loading device info...')
        getDeviceInfo()
      } else if (activeTab === 'persons' && persons.length === 0 && hasConfig) {
        // Auto-load persons when opening Persons tab (requires config)
        console.log('[Auto-load] Loading persons...')
        loadPersons()
      } else if (activeTab === 'log' && attendanceRecords.length === 0) {
        // Auto-load attendance records when opening Log tab (no config required!)
        console.log('[Auto-load] Loading attendance records from database...')
        loadAttendanceRecords()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Auto-refresh for Log tab (polling every X seconds)
  useEffect(() => {
    let intervalId = null
    
    // Only auto-refresh when:
    // 1. Auto-refresh is enabled
    // 2. Log tab is active
    // NOTE: No need to check deviceConfig - it's optional for query
    
    if (autoRefresh && activeTab === 'log') {
      console.log('[Auto-Refresh] Enabled for Log tab (interval: ' + (refreshInterval / 1000) + 's)')
      
      // Initial load (not silent, show message)
      if (attendanceRecords.length === 0) {
        console.log('[Auto-Refresh] Initial load...')
        loadAttendanceRecords(false)
      }
      
      // Set up polling interval (silent mode - no loading spinner, no success messages)
      intervalId = setInterval(() => {
        console.log('[Auto-Refresh] Fetching new scan records (silent mode)...')
        loadAttendanceRecords(true) // silent = true
        setLastRefreshTime(new Date())
      }, refreshInterval)
    } else if (activeTab !== 'log') {
      console.log('[Auto-Refresh] Not on Log tab, auto-refresh disabled')
    } else if (!autoRefresh) {
      console.log('[Auto-Refresh] Manual mode, auto-refresh disabled')
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

  const saveDeviceConfig = () => {
    // Trim all values before saving
    const trimmedConfig = {
      middlewareIP: deviceConfig.middlewareIP?.trim() || '',
      deviceKey: deviceConfig.deviceKey?.trim() || '',
      secret: deviceConfig.secret?.trim() || ''
    }
    
    if (!trimmedConfig.middlewareIP || !trimmedConfig.deviceKey || !trimmedConfig.secret) {
      const missing = []
      if (!trimmedConfig.middlewareIP) missing.push('Middleware IP')
      if (!trimmedConfig.deviceKey) missing.push('Device Key')
      if (!trimmedConfig.secret) missing.push('Secret')
      showMessage('error', `Field wajib diisi: ${missing.join(', ')}`)
      return
    }
    
    // Update state with trimmed values
    setDeviceConfig(trimmedConfig)
    
    // Save to localStorage
    localStorage.setItem('deviceConfig', JSON.stringify(trimmedConfig))
    console.log('Device config saved:', { ...trimmedConfig, secret: '***' })
    showMessage('success', 'Konfigurasi device berhasil disimpan')
  }

  const getDeviceInfo = async () => {
    // Validate all required fields
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      const missing = []
      if (!deviceConfig.middlewareIP || deviceConfig.middlewareIP.trim() === '') missing.push('Middleware IP')
      if (!deviceConfig.deviceKey || deviceConfig.deviceKey.trim() === '') missing.push('Device Key')
      if (!deviceConfig.secret || deviceConfig.secret.trim() === '') missing.push('Secret')
      showMessage('error', `Silakan lengkapi konfigurasi: ${missing.join(', ')}`)
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        showMessage('error', 'Token tidak ditemukan. Silakan login ulang.')
        setLoading(false)
        return
      }

      const requestData = {
        middlewareIP: deviceConfig.middlewareIP.trim(),
        deviceKey: deviceConfig.deviceKey.trim(),
        secret: deviceConfig.secret.trim()
      }
      
      // Debug log
      console.log('[Frontend] Requesting device info:', { 
        middlewareIP: requestData.middlewareIP,
        deviceKey: requestData.deviceKey,
        secret: '***'
      })
      
      const res = await axios.post(
        `${API_URL}/api/device/info`,
        requestData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )
      
      console.log('[Frontend] Device info response:', res.data)
      
      if (res.data) {
        setDeviceInfo(res.data)
        showMessage('success', 'Informasi device berhasil diambil')
      } else {
        showMessage('error', 'Tidak ada data yang diterima dari server')
      }
    } catch (err) {
      console.error('[Frontend] Error getting device info:', err)
      const errorMsg = err.response?.data?.message || err.message || 'Gagal mengambil informasi device'
      showMessage('error', errorMsg)
      setDeviceInfo(null)
    }
    setLoading(false)
  }

  const loadPersons = async () => {
    // Validate all required fields
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      const missing = []
      if (!deviceConfig.middlewareIP || deviceConfig.middlewareIP.trim() === '') missing.push('Middleware IP')
      if (!deviceConfig.deviceKey || deviceConfig.deviceKey.trim() === '') missing.push('Device Key')
      if (!deviceConfig.secret || deviceConfig.secret.trim() === '') missing.push('Secret')
      showMessage('error', `Silakan lengkapi konfigurasi: ${missing.join(', ')}`)
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        showMessage('error', 'Token tidak ditemukan. Silakan login ulang.')
        setLoading(false)
        return
      }

      const requestData = {
        middlewareIP: deviceConfig.middlewareIP.trim(),
        deviceKey: deviceConfig.deviceKey.trim(),
        secret: deviceConfig.secret.trim()
      }
      
      // Debug log
      console.log('[Frontend] Requesting persons:', { 
        middlewareIP: requestData.middlewareIP,
        deviceKey: requestData.deviceKey,
        secret: '***'
      })
      
      const res = await axios.post(
        `${API_URL}/api/device/persons`,
        requestData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )
      
      console.log('[Frontend] Persons response:', {
        status: res.status,
        dataType: Array.isArray(res.data) ? 'array' : typeof res.data,
        dataLength: Array.isArray(res.data) ? res.data.length : 'N/A',
        data: res.data
      })
      
      if (Array.isArray(res.data)) {
        setPersons(res.data)
        if (res.data.length > 0) {
          showMessage('success', `Berhasil memuat ${res.data.length} person`)
        } else {
          showMessage('warning', 'Tidak ada data person yang ditemukan di device')
        }
      } else if (res.data) {
        // If data is not array but exists, convert to array
        setPersons([res.data])
        showMessage('success', 'Berhasil memuat data person')
      } else {
        setPersons([])
        showMessage('warning', 'Tidak ada data person yang ditemukan')
      }
    } catch (err) {
      console.error('[Frontend] Error loading persons:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      })
      
      let errorMsg = 'Gagal memuat data person'
      
      if (err.response) {
        // Server responded with error
        errorMsg = err.response.data?.message || err.response.data?.msg || err.response.statusText || errorMsg
        if (err.response.data?.code) {
          errorMsg += ` (Code: ${err.response.data.code})`
        }
      } else if (err.request) {
        // Request made but no response
        errorMsg = 'Tidak dapat terhubung ke server. Pastikan backend berjalan.'
      } else {
        // Error setting up request
        errorMsg = err.message || errorMsg
      }
      
      showMessage('error', errorMsg)
      setPersons([])
    }
    setLoading(false)
  }

  const loadAttendanceRecords = async (silent = false) => {
    console.log('[Frontend] loadAttendanceRecords called:', { silent, activeTab })
    
    // Don't set loading to true for silent refresh (auto-refresh)
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

      // Get scan records from database (not from middleware)
      // Optional: filter by deviceKey if configured
      const requestData = {
        ...(deviceConfig.deviceKey && deviceConfig.deviceKey.trim() && {
          deviceKey: deviceConfig.deviceKey.trim()
        }),
        limit: 500, // Get more records
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
            showMessage('warning', 'Tidak ada data log scan. Pastikan device sudah dikonfigurasi untuk mengirim callback.')
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

  const loadAccessGroups = async () => {
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      const missing = []
      if (!deviceConfig.middlewareIP) missing.push('Middleware IP')
      if (!deviceConfig.deviceKey) missing.push('Device Key')
      if (!deviceConfig.secret) missing.push('Secret')
      showMessage('error', `Silakan lengkapi konfigurasi: ${missing.join(', ')}`)
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/api/device/access-groups`,
        {
          middlewareIP: deviceConfig.middlewareIP,
          deviceKey: deviceConfig.deviceKey,
          secret: deviceConfig.secret
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setAccessGroups(res.data || [])
      showMessage('success', 'Data access group berhasil dimuat')
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal memuat data access group')
    }
    setLoading(false)
  }

  const loadFaceData = async () => {
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      const missing = []
      if (!deviceConfig.middlewareIP) missing.push('Middleware IP')
      if (!deviceConfig.deviceKey) missing.push('Device Key')
      if (!deviceConfig.secret) missing.push('Secret')
      showMessage('error', `Silakan lengkapi konfigurasi: ${missing.join(', ')}`)
      return
    }

    if (!selectedPersonSn) {
      showMessage('error', 'Silakan pilih person terlebih dahulu')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/api/device/face/find`,
        {
          middlewareIP: deviceConfig.middlewareIP,
          deviceKey: deviceConfig.deviceKey,
          secret: deviceConfig.secret,
          personSn: selectedPersonSn
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setFaceData(res.data || [])
      showMessage('success', 'Data face berhasil dimuat')
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal memuat data face')
    }
    setLoading(false)
  }

  const syncUsersToDevice = async () => {
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      const missing = []
      if (!deviceConfig.middlewareIP) missing.push('Middleware IP')
      if (!deviceConfig.deviceKey) missing.push('Device Key')
      if (!deviceConfig.secret) missing.push('Secret')
      showMessage('error', `Silakan lengkapi konfigurasi: ${missing.join(', ')}`)
      return
    }

    if (!confirm('Apakah Anda yakin ingin menyinkronkan semua user ke device? Operasi ini mungkin memakan waktu.')) {
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/api/device/sync-users`,
        {
          middlewareIP: deviceConfig.middlewareIP,
          deviceKey: deviceConfig.deviceKey,
          secret: deviceConfig.secret
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showMessage('success', res.data.message || 'Sinkronisasi user berhasil')
      loadPersons()
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal menyinkronkan user')
    }
    setLoading(false)
  }

  const deletePerson = async (personSn) => {
    if (!personSn) {
      showMessage('error', 'Person SN tidak ditemukan')
      return
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus person dengan SN: ${personSn}?`)) {
      return
    }

    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      showMessage('error', 'Silakan lengkapi konfigurasi middleware terlebih dahulu')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        showMessage('error', 'Token tidak ditemukan. Silakan login ulang.')
        setLoading(false)
        return
      }

      const requestData = {
        middlewareIP: deviceConfig.middlewareIP.trim(),
        deviceKey: deviceConfig.deviceKey.trim(),
        secret: deviceConfig.secret.trim(),
        personSn: personSn.trim()
      }

      console.log('[Frontend] Deleting person:', { ...requestData, secret: '***' })

      await axios.post(
        `${API_URL}/api/device/person/delete`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )
      showMessage('success', 'Person berhasil dihapus')
      loadPersons()
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal menghapus person')
    }
    setLoading(false)
  }

  const deleteFace = async (personSn, faceId) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus face data dengan ID: ${faceId}?`)) {
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${API_URL}/api/device/face/delete`,
        {
          middlewareIP: deviceConfig.middlewareIP,
          deviceKey: deviceConfig.deviceKey,
          secret: deviceConfig.secret,
          personSn,
          faceId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showMessage('success', 'Face data berhasil dihapus')
      loadFaceData()
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal menghapus face data')
    }
    setLoading(false)
  }

  // Handle face image upload with compression
  const handleFaceImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showMessage('error', 'File harus berupa gambar')
        return
      }
      // Validate file size (max 2MB to avoid 413 error)
      if (file.size > 2 * 1024 * 1024) {
        showMessage('error', 'Ukuran file maksimal 2MB. Silakan kompres gambar terlebih dahulu.')
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result
        
        // Compress image if needed
        const img = new Image()
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Resize if too large (max 800px on longest side)
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
          
          // Convert to base64 with quality 0.8 (80% quality)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
          
          // Check final size
          const base64Size = compressedBase64.length
          const estimatedSize = (base64Size * 3) / 4 // Approximate binary size
          
          if (estimatedSize > 1.5 * 1024 * 1024) {
            showMessage('warning', 'Gambar masih cukup besar. Mungkin menyebabkan error. Coba kompres lebih kecil.')
          }
          
          setPersonForm({
            ...personForm,
            faceImage: compressedBase64, // Compressed base64 string
            faceImagePreview: compressedBase64
          })
        }
        
        img.onerror = () => {
          showMessage('error', 'Gagal memproses gambar')
        }
        
        img.src = base64String
      }
      reader.readAsDataURL(file)
    }
  }

  // Add Person using /api/person/merge endpoint
  const addPerson = async () => {
    // Validate all required fields
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      showMessage('error', 'Silakan lengkapi konfigurasi middleware terlebih dahulu')
      return
    }

    // Validate required fields with trim - ensure they are not empty
    const trimmedPersonId = personForm.personId ? personForm.personId.trim() : ''
    const trimmedPersonName = personForm.personName ? personForm.personName.trim() : ''
    
    if (!trimmedPersonId || trimmedPersonId === '') {
      showMessage('error', 'Person ID (SN) wajib diisi dan tidak boleh kosong')
      return
    }
    
    if (!trimmedPersonName || trimmedPersonName === '') {
      showMessage('error', 'Person Name wajib diisi dan tidak boleh kosong')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        showMessage('error', 'Token tidak ditemukan. Silakan login ulang.')
        setLoading(false)
        return
      }
      
      console.log('[Frontend] Validating person data before send:', {
        personId: trimmedPersonId,
        personIdLength: trimmedPersonId.length,
        personName: trimmedPersonName,
        personNameLength: trimmedPersonName.length
      })

      // Prepare request data according to /api/person/merge format
      // Check face image size before including it
      let faceBase64ToSend = null
      if (personForm.faceImage) {
        // Remove data:image/...;base64, prefix if present
        let base64Data = personForm.faceImage.includes(',') 
          ? personForm.faceImage.split(',')[1] 
          : personForm.faceImage
        
        // Check size (base64 is ~33% larger than binary)
        const base64Size = base64Data.length
        const estimatedBinarySize = (base64Size * 3) / 4
        
        // If larger than 1.5MB binary (approx 2MB base64), skip face to avoid 413 error
        if (estimatedBinarySize > 1.5 * 1024 * 1024) {
          showMessage('warning', 'Foto wajah terlalu besar dan akan dilewati untuk menghindari error. Silakan daftarkan wajah secara terpisah.')
          faceBase64ToSend = null
        } else {
          faceBase64ToSend = personForm.faceImage
        }
      }
      
      // Ensure personSn is not empty before sending
      if (!trimmedPersonId || trimmedPersonId === '') {
        showMessage('error', 'Person ID (SN) tidak boleh kosong')
        setLoading(false)
        return
      }
      
      // Build request data - only include provided fields
      // IMPORTANT: Use personSn (not personId) to match backend expectation
      const requestData = {
        middlewareIP: deviceConfig.middlewareIP.trim(),
        deviceKey: deviceConfig.deviceKey.trim(),
        secret: deviceConfig.secret.trim(),
        personSn: trimmedPersonId, // Use already trimmed and validated value - this is the Person SN
        name: trimmedPersonName, // Use already trimmed and validated value
        ...(personForm.phone && personForm.phone.trim() && { phone: personForm.phone.trim() }),
        ...(personForm.gender && personForm.gender.trim() && { gender: personForm.gender.trim() }),
        ...(faceBase64ToSend && { faceBase64: faceBase64ToSend })
      }

      // Final validation before sending
      if (!requestData.personSn || requestData.personSn.trim() === '') {
        showMessage('error', 'Person SN tidak boleh kosong. Silakan isi Employee ID dengan benar.')
        setLoading(false)
        return
      }

      console.log('[Frontend] Adding person via merge:', { 
        middlewareIP: requestData.middlewareIP,
        deviceKey: requestData.deviceKey,
        secret: '***',
        personSn: requestData.personSn,
        personSnLength: requestData.personSn.length,
        name: requestData.name,
        hasPhone: !!requestData.phone,
        hasGender: !!requestData.gender,
        hasFace: !!requestData.faceBase64
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

      showMessage('success', res.data.message || 'User berhasil ditambahkan/diperbarui')
      // Reset form
      setPersonForm({ 
        personId: '', 
        personName: '', 
        phone: '', 
        gender: '',
        faceImage: null,
        faceImagePreview: null
      })
      // Reload persons list
      loadPersons()
    } catch (err) {
      console.error('[Frontend] Error adding person:', err)
      
      // Handle 413 error (Request Entity Too Large)
      if (err.response?.status === 413) {
        if (personForm.faceImage) {
          showMessage('error', 'Request terlalu besar (413). Foto wajah terlalu besar. Silakan coba lagi tanpa foto wajah atau kompres foto lebih kecil.')
        } else {
          showMessage('error', 'Request terlalu besar (413). Silakan kurangi data yang dikirim.')
        }
      } else {
        const errorMsg = err.response?.data?.message || err.message || 'Gagal menambahkan user'
        showMessage('error', errorMsg)
      }
    }
    setLoading(false)
  }

  // Update Person
  const updatePerson = async () => {
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      showMessage('error', 'Silakan lengkapi konfigurasi middleware terlebih dahulu')
      return
    }

    if (!personForm.personId || !personForm.personName) {
      showMessage('error', 'Person ID dan Person Name wajib diisi')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        showMessage('error', 'Token tidak ditemukan. Silakan login ulang.')
        setLoading(false)
        return
      }

      // Use merge endpoint - if personSn exists, it will update; if not, it will add
      const requestData = {
        middlewareIP: deviceConfig.middlewareIP.trim(),
        deviceKey: deviceConfig.deviceKey.trim(),
        secret: deviceConfig.secret.trim(),
        personSn: personForm.personId.trim(),
        name: personForm.personName.trim(),
        ...(personForm.phone && personForm.phone.trim() && { phone: personForm.phone.trim() }),
        ...(personForm.gender && personForm.gender.trim() && { gender: personForm.gender.trim() })
      }

      console.log('[Frontend] Updating person via merge:', { ...requestData, secret: '***' })

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

      showMessage('success', res.data.message || 'Person berhasil diperbarui')
      setShowEditModal(false)
      setEditingPerson(null)
      setPersonForm({ 
        personId: '', 
        personName: '', 
        phone: '', 
        gender: '',
        faceImage: null,
        faceImagePreview: null
      })
      // Reload persons list
      loadPersons()
    } catch (err) {
      console.error('[Frontend] Error updating person:', err)
      const errorMsg = err.response?.data?.message || err.message || 'Gagal memperbarui person'
      showMessage('error', errorMsg)
    }
    setLoading(false)
  }

  // Handle image upload for face
  const handleFaceImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1] // Remove data:image/...;base64, prefix
        setFaceForm({
          ...faceForm,
          image: base64,
          imagePreview: reader.result
        })
      }
      reader.readAsDataURL(file)
    }
  }

  // Register Face
  const registerFace = async () => {
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      showMessage('error', 'Silakan lengkapi konfigurasi middleware terlebih dahulu')
      return
    }

    if (!faceForm.personId || !faceForm.image) {
      showMessage('error', 'Person ID dan Image wajib diisi')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/api/device/face/register`,
        {
          middlewareIP: deviceConfig.middlewareIP,
          deviceKey: deviceConfig.deviceKey,
          secret: deviceConfig.secret,
          personId: faceForm.personId,
          image: faceForm.image
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showMessage('success', res.data.message || 'Face berhasil didaftarkan')
      setFaceForm({ personId: '', image: null, imagePreview: null })
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal mendaftarkan face')
    }
    setLoading(false)
  }

  // Handle image upload for palm
  const handlePalmImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1] // Remove data:image/...;base64, prefix
        setPalmForm({
          ...palmForm,
          palmImage: base64,
          palmImagePreview: reader.result
        })
      }
      reader.readAsDataURL(file)
    }
  }

  // Register Palm
  const registerPalm = async () => {
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      showMessage('error', 'Silakan lengkapi konfigurasi middleware terlebih dahulu')
      return
    }

    if (!palmForm.personId || !palmForm.palmImage) {
      showMessage('error', 'Person ID dan Palm Image wajib diisi')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/api/device/palm/register`,
        {
          middlewareIP: deviceConfig.middlewareIP,
          deviceKey: deviceConfig.deviceKey,
          secret: deviceConfig.secret,
          personId: palmForm.personId,
          palmImage: palmForm.palmImage,
          palmId: palmForm.palmId || undefined,
          palmNum: palmForm.palmNum
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showMessage('success', res.data.message || 'Palm berhasil didaftarkan')
      setPalmForm({ personId: '', palmImage: null, palmImagePreview: null, palmId: '', palmNum: '1' })
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal mendaftarkan palm')
    }
    setLoading(false)
  }

  // Sync Device Time
  const syncDeviceTime = async () => {
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      showMessage('error', 'Silakan lengkapi konfigurasi middleware terlebih dahulu')
      return
    }

    if (!confirm('Apakah Anda yakin ingin menyinkronkan waktu device dengan server?')) {
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/api/device/sync-time`,
        {
          middlewareIP: deviceConfig.middlewareIP,
          deviceKey: deviceConfig.deviceKey,
          secret: deviceConfig.secret
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showMessage('success', res.data.message || 'Waktu device berhasil disinkronkan')
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal menyinkronkan waktu device')
    }
    setLoading(false)
  }

  // Restart Device
  const restartDevice = async () => {
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      showMessage('error', 'Silakan lengkapi konfigurasi middleware terlebih dahulu')
      return
    }

    if (!confirm('Apakah Anda yakin ingin me-restart device? Device akan mati dan hidup kembali.')) {
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/api/device/restart`,
        {
          middlewareIP: deviceConfig.middlewareIP,
          deviceKey: deviceConfig.deviceKey,
          secret: deviceConfig.secret
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showMessage('success', res.data.message || 'Device berhasil direstart')
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal me-restart device')
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
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2">Device Management (Cloud Middleware)</h1>
          <p className="text-xs md:text-sm opacity-70">Kelola koneksi dan sinkronisasi dengan face recognition device melalui middleware server</p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-3 md:mb-4 p-3 md:p-4 rounded-lg flex items-center gap-2 text-sm md:text-base ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-300' 
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {message.type === 'success' ? <IconCheck /> : <IconX />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tabs - config, info, daftar, add user, dan log */}
        <div className={`mb-4 md:mb-6 border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent">
            <div className="flex gap-1 md:gap-2 min-w-max pb-1">
              {[
                { key: 'config', label: 'Konfigurasi', shortLabel: 'Config', compact: 'Config' },
                { key: 'info', label: 'Info Device', shortLabel: 'Info', compact: 'Info' },
                { key: 'persons', label: 'Daftar Person', shortLabel: 'Daftar', compact: 'Daftar' },
                { key: 'add-user', label: 'Add User', shortLabel: 'Add User', compact: 'Add' },
                { key: 'log', label: 'Log Scan', shortLabel: 'Log', compact: 'Log' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 md:px-4 py-2 font-medium text-xs md:text-sm transition-all whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.key
                      ? theme === 'dark'
                        ? 'text-white border-b-2 border-purple-500 bg-purple-500/10'
                        : 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                      : theme === 'dark'
                        ? 'text-white/60 hover:text-white hover:bg-white/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  title={tab.label}
                >
                  <span className="hidden md:inline">{tab.shortLabel}</span>
                  <span className="md:hidden">{tab.compact}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className={`rounded-lg md:rounded-xl shadow-lg p-4 md:p-6 transition-colors ${
          theme === 'dark' ? 'bg-[#26355D]' : 'bg-white'
        }`}>
          {/* Config Tab */}
          {activeTab === 'config' && (
            <div className="space-y-4 md:space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-700'
                }`}>
                  Middleware Server IP Address
                </label>
                <input
                  type="text"
                  value={deviceConfig.middlewareIP}
                  onChange={(e) => setDeviceConfig({ ...deviceConfig, middlewareIP: e.target.value })}
                  placeholder="192.168.1.100"
                  className={`w-full px-3 md:px-4 py-2 rounded-lg border transition-colors text-sm md:text-base ${
                    theme === 'dark'
                      ? 'bg-[#1a2440] border-white/20 text-white placeholder-white/50'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  IP address server tempat middleware berjalan (port 8190)
                </p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-700'
                }`}>
                  Device SN (Serial Number) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deviceConfig.deviceKey}
                  onChange={(e) => setDeviceConfig({ ...deviceConfig, deviceKey: e.target.value })}
                  placeholder="30EC19CE8B9D2A49"
                  maxLength={16}
                  className={`w-full px-3 md:px-4 py-2 rounded-lg border transition-colors text-sm md:text-base ${
                    theme === 'dark'
                      ? 'bg-[#1a2440] border-white/20 text-white placeholder-white/50'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  Serial number device (16 digit) - Contoh: 30EC19CE8B9D2A49
                </p>
                <p className={`text-xs mt-1 font-semibold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  ⚠️ Catatan: Device SN berbeda dengan Person SN. Device SN adalah ID device, Person SN adalah ID karyawan.
                </p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-700'
                }`}>
                  Secret (Password) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={deviceConfig.secret}
                  onChange={(e) => setDeviceConfig({ ...deviceConfig, secret: e.target.value })}
                  placeholder="123456"
                  className={`w-full px-3 md:px-4 py-2 rounded-lg border transition-colors text-sm md:text-base ${
                    theme === 'dark'
                      ? 'bg-[#1a2440] border-white/20 text-white placeholder-white/50'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  Password server yang diset pada device - Contoh: 123456
                </p>
              </div>
              <div className="flex gap-2 md:gap-3">
                <button
                  onClick={saveDeviceConfig}
                  className="px-4 md:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm md:text-base"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            </div>
          )}

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Device Information
                </h3>
                <button
                  onClick={getDeviceInfo}
                  disabled={loading}
                  className="px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm md:text-base"
                >
                  <IconRefresh />
                  Refresh
                </button>
              </div>
              {deviceInfo ? (
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {Object.entries(deviceInfo).map(([key, value]) => (
                    <div key={key} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <div className="text-xs opacity-70 mb-1 break-words">{key}</div>
                      <div className="font-medium text-sm md:text-base break-words">{String(value)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  Klik tombol Refresh untuk mengambil informasi device
                </div>
              )}
            </div>
          )}

          {/* Persons Tab */}
          {activeTab === 'persons' && (
            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Person List
                </h3>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={syncUsersToDevice}
                    disabled={loading}
                    className="px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm md:text-base"
                  >
                    Sync Users
                  </button>
                  <button
                    onClick={() => loadPersons(1)}
                    disabled={loading}
                    className="px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm md:text-base"
                  >
                    <IconRefresh />
                    Refresh
                  </button>
                </div>
              </div>
              {persons.length > 0 ? (
                <>
                  <div className="overflow-x-auto -mx-4 md:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-white/10 text-white' : 'divide-gray-200 text-gray-900'}`}>
                        <thead className={theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}>
                          <tr>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Person SN</th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Name</th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold hidden sm:table-cell">Type</th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold hidden md:table-cell">Face Count</th>
                            <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-gray-100'}`}>
                          {persons.map((person, idx) => (
                            <tr key={idx} className={theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm whitespace-nowrap">{person.personSn || '-'}</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm">{person.name || '-'}</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm hidden sm:table-cell">{person.personType || '-'}</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm hidden md:table-cell">{person.faceCount || 0}</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm">
                                <div className="flex gap-1 md:gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingPerson(person)
                                      setPersonForm({
                                        personId: person.personSn || '',
                                        personName: person.name || '',
                                        phone: person.phone || '',
                                        gender: person.gender || '',
                                        personType: person.personType?.toString() || '0'
                                      })
                                      setShowEditModal(true)
                                    }}
                                    className="px-2 md:px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs md:text-sm"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deletePerson(person.personSn)}
                                    className="px-2 md:px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs md:text-sm"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Total count info */}
                  <div className={`text-sm mt-4 pt-4 border-t ${theme === 'dark' ? 'border-white/10 text-white/70' : 'border-gray-200 text-gray-600'}`}>
                    Total: {persons.length} person
                  </div>
                </>
              ) : (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  {loading ? 'Memuat data...' : 'Tidak ada data person. Klik Refresh untuk memuat data.'}
                </div>
              )}
            </div>
          )}

          {/* Add User Tab - Simplified */}
          {activeTab === 'add-user' && (
            <div className="space-y-4 md:space-y-6">
              <div>
                <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Tambah User Baru
                </h3>
                <p className={`text-xs md:text-sm mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  Tambah user baru ke device. Minimal isi Employee ID dan Nama. Upload foto wajah untuk langsung aktifkan facial recognition.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {/* Person ID (SN) - Wajib */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Person SN (Employee ID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={personForm.personId}
                    onChange={(e) => setPersonForm({ ...personForm, personId: e.target.value })}
                    placeholder="EMP001"
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                    Nomor unik karyawan/user (wajib) - Contoh: EMP001, EMP002, dll
                  </p>
                  <p className={`text-xs mt-1 font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                    ℹ️ Catatan: Person SN berbeda dengan Device SN. Person SN adalah ID karyawan, Device SN adalah ID device (30EC19CE8B9D2A49).
                  </p>
                </div>

                {/* Name - Wajib */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={personForm.personName}
                    onChange={(e) => setPersonForm({ ...personForm, personName: e.target.value })}
                    placeholder="Nama Lengkap"
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                    Nama user (wajib)
                  </p>
                </div>

                {/* Phone - Opsional */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Nomor HP (Opsional)
                  </label>
                  <input
                    type="text"
                    value={personForm.phone}
                    onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })}
                    placeholder="081234567890"
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>

                {/* Gender - Opsional */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Gender (Opsional)
                  </label>
                  <select
                    value={personForm.gender}
                    onChange={(e) => setPersonForm({ ...personForm, gender: e.target.value })}
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    <option value="">Pilih Gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>

                {/* Upload Foto Wajah - Opsional */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Foto Wajah (Opsional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFaceImageChange}
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  {personForm.faceImagePreview && (
                    <div className="mt-3">
                      <img 
                        src={personForm.faceImagePreview} 
                        alt="Preview" 
                        className="max-w-xs rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => setPersonForm({ ...personForm, faceImage: null, faceImagePreview: null })}
                        className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Hapus Foto
                      </button>
                    </div>
                  )}
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                    Upload foto wajah untuk langsung mendaftarkan wajah ke device. Jika tidak diisi, user bisa daftarkan wajah nanti di device.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-2">
                <button
                  onClick={addPerson}
                  disabled={loading || !personForm.personId || !personForm.personName}
                  className="px-4 md:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm md:text-base"
                >
                  {loading ? 'Menambahkan...' : 'Tambah User'}
                </button>
                <button
                  onClick={() => {
                    setPersonForm({ 
                      personId: '', 
                      personName: '', 
                      phone: '', 
                      gender: '',
                      faceImage: null,
                      faceImagePreview: null
                    })
                  }}
                  className="px-4 md:px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm md:text-base"
                >
                  Reset Form
                </button>
              </div>
            </div>
          )}

          {/* Log Tab - Attendance Records */}
          {activeTab === 'log' && (
            <div className="space-y-3 md:space-y-4">
              {/* Info Box - Callback URL Configuration */}
              <div className={`p-3 md:p-4 rounded-lg border ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                <h4 className={`text-sm md:text-base font-semibold mb-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
                  📡 Konfigurasi Callback URL
                </h4>
                <p className={`text-xs md:text-sm mb-3 ${theme === 'dark' ? 'text-blue-200/80' : 'text-blue-800'}`}>
                  Agar device dapat mengirim log scan secara real-time, set callback URL berikut di device melalui middleware:
                </p>
                <div className={`p-2 md:p-3 rounded bg-black/10 font-mono text-xs md:text-sm break-all ${theme === 'dark' ? 'text-blue-200' : 'text-blue-900'}`}>
                  {API_URL}/api/device/scan
                </div>
                <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-blue-200/70' : 'text-blue-700'}`}>
                  <strong>Device IP 192.168.31.49:10010:</strong> Backend sudah dikonfigurasi untuk menerima data dari device ini.
                </p>
                <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-blue-200/70' : 'text-blue-700'}`}>
                  <strong>Endpoint untuk set di device:</strong> POST http://{deviceConfig.middlewareIP || 'MIDDLEWARE_IP'}:8190/api/device/setSevConfig<br/>
                  <strong>Body:</strong> deviceKey={deviceConfig.deviceKey || 'DEVICE_KEY'}&secret={deviceConfig.secret || 'SECRET'}&sevUploadRecRecordUrl={API_URL}/api/device/scan&sevUploadRecSnapshotEnable=1
                </p>
                <button
                  onClick={async () => {
                    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
                      showMessage('error', 'Silakan lengkapi konfigurasi middleware terlebih dahulu di tab Config')
                      return
                    }
                    
                    setLoading(true)
                    try {
                      const token = localStorage.getItem('token')
                      const callbackUrl = `${API_URL}/api/device/scan`
                      
                      const res = await axios.post(
                        `${API_URL}/api/device/set-callback-url`,
                        {
                          middlewareIP: deviceConfig.middlewareIP.trim(),
                          deviceKey: deviceConfig.deviceKey.trim(),
                          secret: deviceConfig.secret.trim(),
                          callbackUrl: callbackUrl
                        },
                        {
                          headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          timeout: 30000
                        }
                      )
                      
                      showMessage('success', res.data.message || 'Callback URL berhasil dikonfigurasi di device')
                    } catch (err) {
                      console.error('[Frontend] Error setting callback URL:', err)
                      const errorMsg = err.response?.data?.message || err.message || 'Gagal mengkonfigurasi callback URL'
                      showMessage('error', errorMsg)
                    }
                    setLoading(false)
                  }}
                  disabled={loading || !deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret}
                  className="mt-3 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-xs md:text-sm"
                >
                  {loading ? 'Mengkonfigurasi...' : 'Set Callback URL ke Device'}
                </button>
              </div>

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
                    onClick={loadAttendanceRecords}
                    disabled={loading}
                    className="px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm md:text-base"
                  >
                    <IconRefresh className={loading ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>
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
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold hidden lg:table-cell">Device</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-gray-100'}`}>
                        {attendanceRecords.map((record, idx) => {
                          // Determine scan method
                          let scanMethod = '-'
                          if (record.faceFlag === 1) scanMethod = 'Face'
                          else if (record.palmFlag === 1) scanMethod = 'Palm'
                          else if (record.cardFlag === 1) scanMethod = 'Card'
                          else if (record.fingerFlag === 1) scanMethod = 'Finger'
                          
                          // Determine status
                          let statusText = '-'
                          let statusClass = 'bg-gray-100 text-gray-800'
                          if (record.resultFlag === 1) {
                            statusText = 'Success'
                            statusClass = 'bg-green-100 text-green-800'
                          } else if (record.resultFlag === 2) {
                            statusText = 'Failed'
                            statusClass = 'bg-red-100 text-red-800'
                          } else if (record.resultFlag === 3) {
                            statusText = 'No Permission'
                            statusClass = 'bg-yellow-100 text-yellow-800'
                          }
                          
                          if (record.strangerFlag === 1) {
                            statusText = 'Stranger'
                            statusClass = 'bg-orange-100 text-orange-800'
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
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm whitespace-nowrap">{record.personSn || '-'}</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm">{record.personName || '-'}</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm hidden sm:table-cell">{scanMethod}</td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm hidden md:table-cell">
                                <span className={`px-2 py-1 rounded text-xs ${statusClass}`}>
                                  {statusText}
                                </span>
                              </td>
                              <td className="px-3 md:px-4 py-2 md:py-3 text-sm hidden lg:table-cell">{record.deviceKey || '-'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  {loading ? (
                    'Memuat data...'
                  ) : (
                    <div className="space-y-2">
                      <p>Tidak ada data log scan.</p>
                      <p className="text-xs">
                        Pastikan device sudah dikonfigurasi untuk mengirim callback ke:<br/>
                        <code className={`px-2 py-1 rounded ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'}`}>
                          {API_URL}/api/device/scan
                        </code>
                      </p>
                      <p className="text-xs mt-2">
                        Gunakan tombol "Set Callback URL ke Device" di atas untuk mengkonfigurasi secara otomatis.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Attendance Tab - Removed */}
          {false && activeTab === 'attendance' && (
            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Attendance Records
                </h3>
                <button
                  onClick={loadAttendanceRecords}
                  disabled={loading}
                  className="px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm md:text-base"
                >
                  <IconRefresh />
                  Refresh
                </button>
              </div>
              {attendanceRecords.length > 0 ? (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-white/10 text-white' : 'divide-gray-200 text-gray-900'}`}>
                      <thead className={theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}>
                        <tr>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Person SN</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Time</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold hidden sm:table-cell">Type</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-gray-100'}`}>
                        {attendanceRecords.map((record, idx) => (
                          <tr key={idx} className={theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm whitespace-nowrap">{record.personSn || '-'}</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm">{record.time ? new Date(record.time).toLocaleString('id-ID') : '-'}</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm hidden sm:table-cell">{record.type || '-'}</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm">{record.status || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className={`text-center py-6 md:py-8 text-sm md:text-base ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  Tidak ada data attendance. Klik Refresh untuk memuat data.
                </div>
              )}
            </div>
          )}

          {/* Access Groups Tab - Removed */}
          {false && activeTab === 'access-groups' && (
            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Access Control Groups
                </h3>
                <button
                  onClick={loadAccessGroups}
                  disabled={loading}
                  className="px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm md:text-base"
                >
                  <IconRefresh />
                  Refresh
                </button>
              </div>
              {accessGroups.length > 0 ? (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-white/10 text-white' : 'divide-gray-200 text-gray-900'}`}>
                      <thead className={theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}>
                        <tr>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Group Number</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Name</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold hidden sm:table-cell">Time Period 1</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold hidden md:table-cell">Time Period 2</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold hidden lg:table-cell">Verify Style</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-gray-100'}`}>
                        {accessGroups.map((group, idx) => (
                          <tr key={idx} className={theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm">{group.acGroupNumber || '-'}</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm">{group.name || '-'}</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm hidden sm:table-cell">{group.acTzNumber1 || '-'}</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm hidden md:table-cell">{group.acTzNumber2 || '-'}</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm hidden lg:table-cell">{group.verifyStyle || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className={`text-center py-6 md:py-8 text-sm md:text-base ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  Tidak ada data access group. Klik Refresh untuk memuat data.
                </div>
              )}
            </div>
          )}

          {/* Person Management Tab - Removed */}
          {false && activeTab === 'person-mgmt' && (
            <div className="space-y-4 md:space-y-6">
              <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingPerson ? 'Update Person' : 'Tambah Person Baru'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Person ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={personForm.personId}
                    onChange={(e) => setPersonForm({ ...personForm, personId: e.target.value })}
                    placeholder="EMP-20241201-001"
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Person Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={personForm.personName}
                    onChange={(e) => setPersonForm({ ...personForm, personName: e.target.value })}
                    placeholder="Nama Lengkap"
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Phone (Opsional)
                  </label>
                  <input
                    type="text"
                    value={personForm.phone}
                    onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })}
                    placeholder="081234567890"
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Gender (Opsional)
                  </label>
                  <select
                    value={personForm.gender}
                    onChange={(e) => setPersonForm({ ...personForm, gender: e.target.value })}
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    <option value="">Pilih Gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                <button
                  onClick={editingPerson ? updatePerson : addPerson}
                  disabled={loading}
                  className="px-4 md:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm md:text-base"
                >
                  {editingPerson ? 'Update Person' : 'Tambah Person'}
                </button>
                {editingPerson && (
                  <button
                    onClick={() => {
                      setEditingPerson(null)
                      setPersonForm({ personId: '', personName: '', phone: '', gender: '', personType: '0' })
                    }}
                    className="px-4 md:px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm md:text-base"
                  >
                    Batal
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Face Registration Tab - Removed */}
          {false && activeTab === 'face-reg' && (
            <div className="space-y-4 md:space-y-6">
              <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Daftarkan Face
              </h3>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Person ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={faceForm.personId}
                    onChange={(e) => setFaceForm({ ...faceForm, personId: e.target.value })}
                    placeholder="EMP-20241201-001"
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Upload Foto Wajah <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFaceImageUpload}
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  {faceForm.imagePreview && (
                    <div className="mt-3 md:mt-4">
                      <img src={faceForm.imagePreview} alt="Preview" className="max-w-full md:max-w-xs rounded-lg border" />
                    </div>
                  )}
                </div>
                <button
                  onClick={registerFace}
                  disabled={loading || !faceForm.personId || !faceForm.image}
                  className="w-full sm:w-auto px-4 md:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm md:text-base"
                >
                  Daftarkan Face
                </button>
              </div>
            </div>
          )}

          {/* Palm Registration Tab - Removed */}
          {false && activeTab === 'palm-reg' && (
            <div className="space-y-4 md:space-y-6">
              <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Daftarkan Palm
              </h3>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Person ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={palmForm.personId}
                    onChange={(e) => setPalmForm({ ...palmForm, personId: e.target.value })}
                    placeholder="EMP-20241201-001"
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Upload Foto Telapak Tangan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePalmImageUpload}
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  {palmForm.palmImagePreview && (
                    <div className="mt-3 md:mt-4">
                      <img src={palmForm.palmImagePreview} alt="Preview" className="max-w-full md:max-w-xs rounded-lg border" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                      Palm ID (Opsional)
                    </label>
                    <input
                      type="text"
                      value={palmForm.palmId}
                      onChange={(e) => setPalmForm({ ...palmForm, palmId: e.target.value })}
                      placeholder="Auto-generated jika kosong"
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#1a2440] border-white/20 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                      Tangan
                    </label>
                    <select
                      value={palmForm.palmNum}
                      onChange={(e) => setPalmForm({ ...palmForm, palmNum: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#1a2440] border-white/20 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    >
                      <option value="1">Kiri</option>
                      <option value="2">Kanan</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={registerPalm}
                  disabled={loading || !palmForm.personId || !palmForm.palmImage}
                  className="w-full sm:w-auto px-4 md:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm md:text-base"
                >
                  Daftarkan Palm
                </button>
              </div>
            </div>
          )}

          {/* Device Control Tab - Removed */}
          {false && activeTab === 'device-control' && (
            <div className="space-y-4 md:space-y-6">
              <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Device Control
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className={`p-4 md:p-6 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                  <h4 className={`font-semibold mb-2 text-sm md:text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Sync Device Time
                  </h4>
                  <p className={`text-xs md:text-sm mb-3 md:mb-4 ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
                    Sinkronkan waktu device dengan waktu server
                  </p>
                  <button
                    onClick={syncDeviceTime}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm md:text-base"
                  >
                    Sync Time
                  </button>
                </div>
                <div className={`p-4 md:p-6 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                  <h4 className={`font-semibold mb-2 text-sm md:text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Restart Device
                  </h4>
                  <p className={`text-xs md:text-sm mb-3 md:mb-4 ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
                    Restart device (device akan mati dan hidup kembali)
                  </p>
                  <button
                    onClick={restartDevice}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm md:text-base"
                  >
                    Restart Device
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Face Data Tab - Removed */}
          {false && activeTab === 'face' && (
            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Face Data
                </h3>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {persons.length === 0 ? (
                    <button
                      onClick={loadPersons}
                      disabled={loading}
                      className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm md:text-base"
                    >
                      Load Persons First
                    </button>
                  ) : (
                    <>
                      <select
                        value={selectedPersonSn}
                        onChange={(e) => setSelectedPersonSn(e.target.value)}
                        className={`px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                          theme === 'dark'
                            ? 'bg-[#1a2440] border-white/20 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      >
                        <option value="">Pilih Person SN</option>
                        {persons.map((person, idx) => (
                          <option key={idx} value={person.personSn}>
                            {person.personSn} - {person.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={loadFaceData}
                        disabled={loading || !selectedPersonSn}
                        className="px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm md:text-base"
                      >
                        <IconRefresh />
                        Load Face Data
                      </button>
                    </>
                  )}
                </div>
              </div>
              {faceData.length > 0 ? (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-white/10 text-white' : 'divide-gray-200 text-gray-900'}`}>
                      <thead className={theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}>
                        <tr>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Face ID</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Person SN</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold hidden sm:table-cell">Face Number</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold hidden md:table-cell">Create Time</th>
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-gray-100'}`}>
                        {faceData.map((face, idx) => (
                          <tr key={idx} className={theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm whitespace-nowrap">{face.faceId || '-'}</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm">{face.personSn || '-'}</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm hidden sm:table-cell">{face.faceNum || '-'}</td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm hidden md:table-cell">
                              {face.createTime ? new Date(face.createTime).toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="px-3 md:px-4 py-2 md:py-3 text-sm">
                              <button
                                onClick={() => deleteFace(face.personSn, face.faceId)}
                                className="px-2 md:px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs md:text-sm"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className={`text-center py-6 md:py-8 text-sm md:text-base ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  {selectedPersonSn 
                    ? 'Tidak ada data face untuk person ini. Pilih person lain atau klik Load Face Data.'
                    : 'Silakan pilih Person SN terlebih dahulu untuk melihat face data.'}
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                <span>Memproses...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Person Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`w-full max-w-md rounded-lg shadow-xl ${theme === 'dark' ? 'bg-[#26355D]' : 'bg-white'} p-4 md:p-6`}>
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h3 className={`text-lg md:text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Edit Person
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingPerson(null)
                  setPersonForm({ personId: '', personName: '', phone: '', gender: '' })
                }}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <IconX />
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                  Person ID (SN) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={personForm.personId}
                  onChange={(e) => setPersonForm({ ...personForm, personId: e.target.value })}
                  placeholder="EMP-20241201-001"
                  disabled
                  className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/20 text-white/70'
                      : 'bg-gray-50 border-gray-300 text-gray-500'
                  } focus:outline-none cursor-not-allowed`}
                />
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  Person ID tidak dapat diubah
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                  Person Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={personForm.personName}
                  onChange={(e) => setPersonForm({ ...personForm, personName: e.target.value })}
                  placeholder="Nama Lengkap"
                  className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                    theme === 'dark'
                      ? 'bg-[#1a2440] border-white/20 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
              </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Phone (Opsional)
                  </label>
                  <input
                    type="text"
                    value={personForm.phone}
                    onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })}
                    placeholder="081234567890"
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Gender (Opsional)
                  </label>
                  <select
                    value={personForm.gender}
                    onChange={(e) => setPersonForm({ ...personForm, gender: e.target.value })}
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    <option value="">Pilih Gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mt-4 md:mt-6">
                <button
                  onClick={updatePerson}
                  disabled={loading || !personForm.personId || !personForm.personName}
                  className="flex-1 px-4 md:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm md:text-base"
                >
                  {loading ? 'Menyimpan...' : 'Update Person'}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingPerson(null)
                    setPersonForm({ personId: '', personName: '', phone: '', gender: '' })
                  }}
                  className="flex-1 px-4 md:px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm md:text-base"
                >
                  Batal
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  )
}
