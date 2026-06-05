import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'

const API = 'http://localhost:8000/api'
const SOCKET_URL = 'http://localhost:8000'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [sessions, setSessions]           = useState([]) // Active monitoring sessions
  const [patients, setPatients]           = useState([]) // Patient profiles
  const [devices, setDevices]             = useState([]) // Connected devices
  const [diagnoses, setDiagnoses]         = useState([]) // Historical diagnoses
  const [realtimeData, setRealtimeData]   = useState({}) // Real-time sensor data from ESP32
  const [autoRefresh, setAutoRefresh]     = useState(true)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)

  // ── Fetch active sessions ─────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/sessions`)
      setSessions(res.data)
      setError(null)
    } catch {
      setError('Không kết nối được Backend. Kiểm tra server đang chạy chưa.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Fetch devices ─────────────────────────────────────────────────
  const fetchDevices = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/devices`)
      setDevices(res.data)
    } catch { /* ignore */ }
  }, [])

  // ── Fetch patients ────────────────────────────────────────────────
  const fetchPatients = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/patients`)
      setPatients(res.data)
    } catch { /* ignore */ }
  }, [])

  // ── Fetch diagnoses ───────────────────────────────────────────────
  const fetchDiagnoses = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/diagnoses`)
      setDiagnoses(res.data)
    } catch { /* ignore */ }
  }, [])

  // Load initial data
  useEffect(() => {
    fetchSessions()
    fetchDevices()
    fetchPatients()
    fetchDiagnoses()
  }, [fetchSessions, fetchDevices, fetchPatients, fetchDiagnoses])

  // Socket.IO real-time listener for ESP32 sensor data
  useEffect(() => {
    const token = localStorage.getItem('token') || null;
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })

    socket.on('sensor-data', (data) => {
      console.log('[Socket.IO] Received sensor data:', data)
      // Update real-time data
      setRealtimeData(prev => ({
        ...prev,
        [data.deviceId]: data
      }))
      // Also refresh diagnoses to update UI
      fetchDiagnoses()
    })

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to server')
    })

    socket.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected from server')
    })

    return () => {
      socket.off('sensor-data')
      socket.off('connect')
      socket.off('disconnect')
      socket.disconnect()
    }
  }, [fetchDiagnoses])

  // Periodic auto refresh
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => {
      fetchSessions()
      fetchDevices()
      fetchDiagnoses()
    }, 3000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchSessions, fetchDevices, fetchDiagnoses])

  // ── Devices Actions ───────────────────────────────────────────────
  const createDevice = async (deviceData) => {
    await axios.post(`${API}/devices`, deviceData)
    fetchDevices()
  }

  const deleteDevice = async (deviceId) => {
    await axios.delete(`${API}/devices/${deviceId}`)
    fetchDevices()
  }

  const reportDeviceIssue = async (deviceId, reason) => {
    await axios.post(`${API}/devices/${deviceId}/report`, { reason })
    fetchSessions()
    fetchDevices()
    fetchDiagnoses()
  }

  // ── Patients Actions ──────────────────────────────────────────────
  const createPatient = async (patientData) => {
    await axios.post(`${API}/patients`, patientData)
    fetchPatients()
  }

  const deletePatient = async (patientId) => {
    await axios.delete(`${API}/patients/${patientId}`)
    fetchPatients()
    fetchSessions()
  }

  // ── Sessions / Monitoring Actions ──────────────────────────────────
  const startMonitoring = async (patientId, deviceId) => {
    await axios.post(`${API}/sessions`, { patientId, deviceId })
    fetchSessions()
    fetchDevices()
  }

  const endMonitoring = async (patientId) => {
    await axios.patch(`${API}/sessions/${patientId}/end`)
    fetchSessions()
    fetchDevices()
  }

  // ── Derived Stats ─────────────────────────────────────────────────
  const stats = {
    error:   sessions.filter(s => s.status === 'urgent').length,
    active:  sessions.filter(s => s.status === 'normal').length,
    warning: sessions.filter(s => s.status === 'warning').length,
    waiting: devices.filter(d => d.status === 'available').length,
  }

  return (
    <AppContext.Provider value={{
      sessions, stats, devices, patients, diagnoses, realtimeData, loading, error, autoRefresh,
      setAutoRefresh,
      createDevice, deleteDevice, reportDeviceIssue,
      createPatient, deletePatient,
      startMonitoring, endMonitoring,
      fetchSessions, fetchDevices, fetchPatients, fetchDiagnoses
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)