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

const IconHand = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
  </svg>
)

export default function AdminDevice2() {
  const { theme } = useTheme()
  const [deviceConfig, setDeviceConfig] = useState({
    middlewareIP: '',
    deviceKey: '',
    secret: ''
  })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('config')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [palmList, setPalmList] = useState([])
  const [personList, setPersonList] = useState([])
  const [selectedPersonSn, setSelectedPersonSn] = useState('')
  const [personPalmData, setPersonPalmData] = useState({}) // Store palm data for each person
  const [expandedRows, setExpandedRows] = useState(new Set()) // Track expanded rows
  const [loadingPalm, setLoadingPalm] = useState(false) // Loading state for palm data
  
  // Palm registration form
  const [palmForm, setPalmForm] = useState({
    personSn: '',
    palmId: '',
    palmNum: '1', // 1=left hand, 2=right hand
    feature: '',
    palmImage: null,
    palmImagePreview: null
  })

  // Batch palm registration
  const [batchPalmList, setBatchPalmList] = useState([])

  useEffect(() => {
    // Load saved device config from localStorage
    const savedConfig = localStorage.getItem('deviceConfig')
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        setDeviceConfig({
          middlewareIP: parsed.middlewareIP || '192.168.31.231',
          deviceKey: parsed.deviceKey || '30EC19CE8B9D2A49',
          secret: parsed.secret || '123456'
        })
      } catch (err) {
        console.error('Error parsing device config:', err)
        setDeviceConfig({
          middlewareIP: '192.168.31.231',
          deviceKey: '30EC19CE8B9D2A49',
          secret: '123456'
        })
      }
    } else {
      setDeviceConfig({
        middlewareIP: '192.168.31.231',
        deviceKey: '30EC19CE8B9D2A49',
        secret: '123456'
      })
    }
  }, [])

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  const saveDeviceConfig = () => {
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
      showMessage('error', `${missing.join(', ')} wajib diisi`)
      return
    }
    
    localStorage.setItem('deviceConfig', JSON.stringify(trimmedConfig))
    setDeviceConfig(trimmedConfig)
    showMessage('success', 'Konfigurasi device berhasil disimpan')
  }

  // Register Palm (Single)
  const registerPalm = async () => {
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      showMessage('error', 'Silakan lengkapi konfigurasi middleware terlebih dahulu')
      return
    }

    if (!palmForm.personSn || !palmForm.palmId || !palmForm.feature) {
      showMessage('error', 'Person SN, Palm ID, dan Feature wajib diisi')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/api/palm/register`,
        {
          middlewareIP: deviceConfig.middlewareIP.trim(),
          deviceKey: deviceConfig.deviceKey.trim(),
          secret: deviceConfig.secret.trim(),
          personSn: palmForm.personSn.trim(),
          palmId: palmForm.palmId.trim(),
          palmNum: parseInt(palmForm.palmNum),
          feature: palmForm.feature.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showMessage('success', res.data.message || 'Palm berhasil didaftarkan')
      setPalmForm({ personSn: '', palmId: '', palmNum: '1', feature: '', palmImage: null, palmImagePreview: null })
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal mendaftarkan palm')
    }
    setLoading(false)
  }

  // Batch Register Palm
  const batchRegisterPalm = async () => {
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      showMessage('error', 'Silakan lengkapi konfigurasi middleware terlebih dahulu')
      return
    }

    if (batchPalmList.length === 0) {
      showMessage('error', 'Silakan tambahkan minimal 1 palm untuk batch register')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/api/palm/batch-register`,
        {
          middlewareIP: deviceConfig.middlewareIP.trim(),
          deviceKey: deviceConfig.deviceKey.trim(),
          secret: deviceConfig.secret.trim(),
          palmMergeList: batchPalmList
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showMessage('success', res.data.message || 'Batch palm berhasil didaftarkan')
      setBatchPalmList([])
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal batch register palm')
    }
    setLoading(false)
  }

  // Delete Palm
  const deletePalm = async (personSn, palmId) => {
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      showMessage('error', 'Silakan lengkapi konfigurasi middleware terlebih dahulu')
      return
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus palm ${palmId} untuk person ${personSn}?`)) {
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/api/palm/delete`,
        {
          middlewareIP: deviceConfig.middlewareIP.trim(),
          deviceKey: deviceConfig.deviceKey.trim(),
          secret: deviceConfig.secret.trim(),
          personSn: personSn.trim(),
          palmId: palmId.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      showMessage('success', res.data.message || 'Palm berhasil dihapus')
      
      // Reload person list to refresh palm data
      if (activeTab === 'persons') {
        loadPersonList()
      } else {
        loadPalmList()
      }
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal menghapus palm')
    }
    setLoading(false)
  }

  // Find/Search Palm
  const loadPalmList = async (personSn = null) => {
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      showMessage('error', 'Silakan lengkapi konfigurasi middleware terlebih dahulu')
      return
    }

    const searchPersonSn = personSn || palmForm.personSn
    if (!searchPersonSn) {
      showMessage('error', 'Silakan isi Person SN untuk mencari palm')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/api/palm/find`,
        {
          middlewareIP: deviceConfig.middlewareIP.trim(),
          deviceKey: deviceConfig.deviceKey.trim(),
          secret: deviceConfig.secret.trim(),
          personSn: searchPersonSn.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (res.data && Array.isArray(res.data.data)) {
        setPalmList(res.data.data)
        showMessage('success', `Berhasil memuat ${res.data.data.length} palm data`)
      } else {
        setPalmList([])
        showMessage('warning', 'Tidak ada data palm ditemukan')
      }
    } catch (err) {
      console.error(err)
      showMessage('error', err.response?.data?.message || 'Gagal memuat data palm')
      setPalmList([])
    }
    setLoading(false)
  }

  const addToBatchList = () => {
    if (!palmForm.personSn || !palmForm.palmId || !palmForm.feature) {
      showMessage('error', 'Person SN, Palm ID, dan Feature wajib diisi')
      return
    }

    const newPalm = {
      personSn: palmForm.personSn.trim(),
      palmId: palmForm.palmId.trim(),
      palmNum: parseInt(palmForm.palmNum),
      feature: palmForm.feature.trim()
    }

    setBatchPalmList([...batchPalmList, newPalm])
    setPalmForm({ personSn: '', palmId: '', palmNum: '1', feature: '', palmImage: null, palmImagePreview: null })
    showMessage('success', 'Palm ditambahkan ke batch list')
  }

  const removeFromBatchList = (index) => {
    const newList = batchPalmList.filter((_, i) => i !== index)
    setBatchPalmList(newList)
  }

  // Load Person List with Palm Data
  // Uses /api/device/persons which internally calls middleware's /api/person/findList
  const loadPersonList = async () => {
    if (!deviceConfig.middlewareIP || !deviceConfig.deviceKey || !deviceConfig.secret) {
      showMessage('error', 'Silakan lengkapi konfigurasi middleware terlebih dahulu')
      return
    }

    setLoading(true)
    setPersonList([]) // Clear existing data
    setPersonPalmData({}) // Clear existing palm data
    
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${API_URL}/api/device/persons`,
        {
          middlewareIP: deviceConfig.middlewareIP.trim(),
          deviceKey: deviceConfig.deviceKey.trim(),
          secret: deviceConfig.secret.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      console.log('[Device2] Person list RAW response:', res.data)
      console.log('[Device2] Person list length:', res.data?.length)
      
      if (Array.isArray(res.data) && res.data.length > 0) {
        // Log first person to see structure
        console.log('[Device2] First person data:', res.data[0])
        
        setPersonList(res.data)
        setLoading(false) // Stop loading person list
        setLoadingPalm(true) // Start loading palm data
        showMessage('info', `Memuat data palm untuk ${res.data.length} person...`)
        
        // Load palm data for each person
        const palmDataMap = {}
        let loadedCount = 0
        
        for (const person of res.data) {
          const personSn = person.sn || person.personSn // Use 'sn' field from API response
          console.log(`[Device2] Loading palm for person: ${personSn} (${person.name})`)
          
          try {
            const palmRes = await axios.post(
              `${API_URL}/api/palm/find`,
              {
                middlewareIP: deviceConfig.middlewareIP.trim(),
                deviceKey: deviceConfig.deviceKey.trim(),
                secret: deviceConfig.secret.trim(),
                personSn: personSn
              },
              { headers: { Authorization: `Bearer ${token}` } }
            )
            
            console.log(`[Device2] Palm response for ${personSn}:`, palmRes.data)
            
            if (palmRes.data && Array.isArray(palmRes.data.data)) {
              palmDataMap[personSn] = palmRes.data.data
              console.log(`[Device2] Found ${palmRes.data.data.length} palms for ${personSn}`)
            } else {
              palmDataMap[personSn] = []
              console.log(`[Device2] No palm data for ${personSn}`)
            }
            loadedCount++
          } catch (palmErr) {
            console.error(`[Device2] Error loading palm for ${personSn}:`, palmErr)
            console.error(`[Device2] Error details:`, palmErr.response?.data)
            palmDataMap[personSn] = []
          }
        }
        
        console.log('[Device2] Final palm data map:', palmDataMap)
        setPersonPalmData(palmDataMap)
        setLoadingPalm(false)
        showMessage('success', `Berhasil memuat ${res.data.length} person (${loadedCount} dengan data palm)`)
      } else {
        setPersonList([])
        setPersonPalmData({})
        showMessage('warning', 'Tidak ada data person di device')
      }
    } catch (err) {
      console.error('[Device2] Error loading person list:', err)
      console.error('[Device2] Error response:', err.response?.data)
      showMessage('error', err.response?.data?.message || 'Gagal memuat data person')
      setPersonList([])
      setPersonPalmData({})
      setLoading(false)
      setLoadingPalm(false)
    }
  }

  const toggleRowExpansion = (sn) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(sn)) {
      newExpanded.delete(sn)
    } else {
      newExpanded.add(sn)
    }
    setExpandedRows(newExpanded)
  }

  return (
    <div className={`p-4 md:p-6 min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#1a2440]' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`mb-4 md:mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2 flex items-center gap-2">
            <IconHand />
            Device 2 - Palm Management
          </h1>
          <p className="text-xs md:text-sm opacity-70">Kelola palm print/palm vein melalui middleware server</p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-3 md:mb-4 p-3 md:p-4 rounded-lg flex items-center gap-2 text-sm md:text-base ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-300' 
              : message.type === 'warning'
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                : message.type === 'info'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {message.type === 'success' ? <IconCheck /> : message.type === 'info' ? <IconRefresh /> : <IconX />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className={`mb-4 md:mb-6 border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent">
            <div className="flex gap-1 md:gap-2 min-w-max pb-1">
              {[
                { key: 'config', label: 'Konfigurasi' },
                { key: 'persons', label: 'Daftar Person' },
                { key: 'register', label: 'Register Palm' },
                { key: 'batch', label: 'Batch Register' },
                { key: 'search', label: 'Cari Palm' }
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
                >
                  {tab.label}
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
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                  Middleware Server IP Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deviceConfig.middlewareIP}
                  onChange={(e) => setDeviceConfig({ ...deviceConfig, middlewareIP: e.target.value })}
                  placeholder="192.168.31.231"
                  className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                    theme === 'dark'
                      ? 'bg-[#1a2440] border-white/20 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                  Device SN (Serial Number) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={deviceConfig.deviceKey}
                  onChange={(e) => setDeviceConfig({ ...deviceConfig, deviceKey: e.target.value })}
                  placeholder="30EC19CE8B9D2A49"
                  maxLength={16}
                  className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                    theme === 'dark'
                      ? 'bg-[#1a2440] border-white/20 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                  Secret (Password) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={deviceConfig.secret}
                  onChange={(e) => setDeviceConfig({ ...deviceConfig, secret: e.target.value })}
                  placeholder="123456"
                  className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                    theme === 'dark'
                      ? 'bg-[#1a2440] border-white/20 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
              </div>
              <button
                onClick={saveDeviceConfig}
                className="px-4 md:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm md:text-base"
              >
                Simpan Konfigurasi
              </button>
            </div>
          )}

          {/* Daftar Person Tab */}
          {activeTab === 'persons' && (
            <div className="space-y-4 md:space-y-6">
              <div className="flex justify-between items-center">
                <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Daftar Person
                </h3>
                <button
                  onClick={loadPersonList}
                  disabled={loading || loadingPalm}
                  className="px-4 md:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm md:text-base"
                >
                  <IconRefresh />
                  {loading ? 'Memuat Person...' : loadingPalm ? 'Memuat Palm...' : 'Refresh'}
                </button>
              </div>

              {personList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-white/10 text-white' : 'divide-gray-200 text-gray-900'}`}>
                    <thead className={theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Person SN</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Nama</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Gender</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Phone</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Palm Data</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-gray-100'}`}>
                      {personList.map((person, idx) => {
                        console.log(`[Device2 Render] Person ${idx}:`, person)
                        const personSn = person.sn || person.personSn // Use 'sn' field
                        const palmData = personPalmData[personSn] || []
                        const isExpanded = expandedRows.has(personSn)
                        
                        return (
                          <React.Fragment key={personSn || idx}>
                            <tr className={theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                              <td className="px-3 py-2 text-sm font-medium">{personSn || '-'}</td>
                              <td className="px-3 py-2 text-sm">{person.name || '-'}</td>
                              <td className="px-3 py-2 text-sm">{person.gender === 1 ? 'Male' : person.gender === 2 ? 'Female' : '-'}</td>
                              <td className="px-3 py-2 text-sm">{person.mobile || person.phone || '-'}</td>
                              <td className="px-3 py-2 text-sm">
                                {loadingPalm ? (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-600 animate-pulse">
                                    Loading...
                                  </span>
                                ) : (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    palmData.length > 0 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {palmData.length} palm
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm">
                                {palmData.length > 0 ? (
                                  <button
                                    onClick={() => toggleRowExpansion(personSn)}
                                    className="text-purple-600 hover:text-purple-800 font-medium"
                                  >
                                    {isExpanded ? 'Sembunyikan' : 'Lihat Detail'}
                                  </button>
                                ) : (
                                  <span className={`text-xs ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`}>
                                    No palm data
                                  </span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && palmData.length > 0 && (
                              <tr className={theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}>
                                <td colSpan="6" className="px-3 py-3">
                                  <div className="pl-8">
                                    <h4 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                      Palm Data untuk {person.name}:
                                    </h4>
                                    <table className={`min-w-full text-xs ${theme === 'dark' ? 'text-white/80' : 'text-gray-700'}`}>
                                      <thead>
                                        <tr className={theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}>
                                          <th className="px-2 py-1 text-left">Palm ID</th>
                                          <th className="px-2 py-1 text-left">Hand</th>
                                          <th className="px-2 py-1 text-left">Create Time</th>
                                          <th className="px-2 py-1 text-left">Feature</th>
                                          <th className="px-2 py-1 text-left">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {palmData.map((palm, pIdx) => (
                                          <tr key={pIdx} className={theme === 'dark' ? 'border-t border-white/5' : 'border-t border-gray-200'}>
                                            <td className="px-2 py-1">{palm.palmId}</td>
                                            <td className="px-2 py-1">
                                              {palm.palmNum === 1 ? '👈 Left' : palm.palmNum === 2 ? '👉 Right' : palm.palmNum}
                                            </td>
                                            <td className="px-2 py-1">
                                              {palm.createTime ? new Date(palm.createTime).toLocaleString('id-ID', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              }) : '-'}
                                            </td>
                                            <td className="px-2 py-1 truncate max-w-xs" title={palm.feature}>
                                              {palm.feature?.substring(0, 30)}...
                                            </td>
                                            <td className="px-2 py-1">
                                              <button
                                                onClick={() => deletePalm(personSn, palm.palmId)}
                                                className="text-red-600 hover:text-red-800 font-medium"
                                              >
                                                Hapus
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className={`mt-3 text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                    Total: {personList.length} person
                  </div>
                </div>
              ) : (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  {loading ? 'Memuat data...' : 'Tidak ada data person. Klik Refresh untuk memuat data.'}
                </div>
              )}
            </div>
          )}

          {/* Register Palm Tab */}
          {activeTab === 'register' && (
            <div className="space-y-4 md:space-y-6">
              <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Register Palm Print/Palm Vein
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Person SN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={palmForm.personSn}
                    onChange={(e) => setPalmForm({ ...palmForm, personSn: e.target.value })}
                    placeholder="EMP001"
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Palm ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={palmForm.palmId}
                    onChange={(e) => setPalmForm({ ...palmForm, palmId: e.target.value })}
                    placeholder="001"
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Palm Number <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={palmForm.palmNum}
                    onChange={(e) => setPalmForm({ ...palmForm, palmNum: e.target.value })}
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    <option value="1">1 - Left Hand</option>
                    <option value="2">2 - Right Hand</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Feature (Base64) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={palmForm.feature}
                    onChange={(e) => setPalmForm({ ...palmForm, feature: e.target.value })}
                    placeholder="Rk1SACAyMAAAAAF6AAAA/AFEAMUAxQEAAABm..."
                    rows={4}
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                    Feature value dalam format base64
                  </p>
                </div>
              </div>
              <button
                onClick={registerPalm}
                disabled={loading}
                className="px-4 md:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm md:text-base"
              >
                {loading ? 'Mendaftarkan...' : 'Register Palm'}
              </button>
            </div>
          )}

          {/* Batch Register Tab */}
          {activeTab === 'batch' && (
            <div className="space-y-4 md:space-y-6">
              <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Batch Register Palm
              </h3>
              
              {/* Form to add to batch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Person SN
                  </label>
                  <input
                    type="text"
                    value={palmForm.personSn}
                    onChange={(e) => setPalmForm({ ...palmForm, personSn: e.target.value })}
                    placeholder="EMP001"
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Palm ID
                  </label>
                  <input
                    type="text"
                    value={palmForm.palmId}
                    onChange={(e) => setPalmForm({ ...palmForm, palmId: e.target.value })}
                    placeholder="001"
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Palm Number
                  </label>
                  <select
                    value={palmForm.palmNum}
                    onChange={(e) => setPalmForm({ ...palmForm, palmNum: e.target.value })}
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  >
                    <option value="1">1 - Left Hand</option>
                    <option value="2">2 - Right Hand</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    Feature (Base64)
                  </label>
                  <textarea
                    value={palmForm.feature}
                    onChange={(e) => setPalmForm({ ...palmForm, feature: e.target.value })}
                    placeholder="Rk1SACAyMAAAAAF6AAAA/AFEAMUAxQEAAABm..."
                    rows={3}
                    className={`w-full px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-[#1a2440] border-white/20 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                </div>
              </div>
              <button
                onClick={addToBatchList}
                className="px-4 md:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
              >
                Tambah ke Batch List
              </button>

              {/* Batch List */}
              {batchPalmList.length > 0 && (
                <div className="mt-6">
                  <h4 className={`text-sm md:text-base font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Batch List ({batchPalmList.length} items)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-white/10 text-white' : 'divide-gray-200 text-gray-900'}`}>
                      <thead className={theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold">Person SN</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold">Palm ID</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold">Palm Num</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold">Feature</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-gray-100'}`}>
                        {batchPalmList.map((palm, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-sm">{palm.personSn}</td>
                            <td className="px-3 py-2 text-sm">{palm.palmId}</td>
                            <td className="px-3 py-2 text-sm">{palm.palmNum === 1 ? 'Left' : 'Right'}</td>
                            <td className="px-3 py-2 text-sm truncate max-w-xs">{palm.feature.substring(0, 30)}...</td>
                            <td className="px-3 py-2 text-sm">
                              <button
                                onClick={() => removeFromBatchList(idx)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={batchRegisterPalm}
                    disabled={loading}
                    className="mt-4 px-4 md:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm md:text-base"
                  >
                    {loading ? 'Mendaftarkan...' : `Batch Register (${batchPalmList.length} items)`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Search Palm Tab */}
          {activeTab === 'search' && (
            <div className="space-y-4 md:space-y-6">
              <h3 className={`text-base md:text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Cari Palm Data
              </h3>
              
              {/* Info box */}
              <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-blue-200/80' : 'text-blue-800'}`}>
                  💡 <strong>Tip:</strong> Tidak tahu Person SN? Buka tab <strong>"Daftar Person"</strong> untuk melihat semua person yang terdaftar dan langsung cari palm mereka.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={palmForm.personSn}
                  onChange={(e) => setPalmForm({ ...palmForm, personSn: e.target.value })}
                  placeholder="Masukkan Person SN (e.g., EMP001)"
                  className={`flex-1 px-3 md:px-4 py-2 rounded-lg border text-sm md:text-base ${
                    theme === 'dark'
                      ? 'bg-[#1a2440] border-white/20 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
                <button
                  onClick={() => loadPalmList()}
                  disabled={loading}
                  className="px-4 md:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm md:text-base"
                >
                  <IconRefresh />
                  Cari
                </button>
              </div>

              {palmList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-white/10 text-white' : 'divide-gray-200 text-gray-900'}`}>
                    <thead className={theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Person SN</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Palm ID</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Palm Num</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Create Time</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Feature</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-gray-100'}`}>
                      {palmList.map((palm, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-sm">{palm.personSn}</td>
                          <td className="px-3 py-2 text-sm">{palm.palmId}</td>
                          <td className="px-3 py-2 text-sm">{palm.palmNum === 1 ? 'Left Hand' : 'Right Hand'}</td>
                          <td className="px-3 py-2 text-sm">
                            {palm.createTime ? new Date(palm.createTime).toLocaleString('id-ID') : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm truncate max-w-xs">{palm.feature?.substring(0, 30)}...</td>
                          <td className="px-3 py-2 text-sm">
                            <button
                              onClick={() => deletePalm(palm.personSn, palm.palmId)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                  {loading ? 'Memuat data...' : 'Tidak ada data palm. Masukkan Person SN dan klik Cari.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

