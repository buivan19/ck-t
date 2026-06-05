import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import { io } from 'socket.io-client'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

const API = 'http://localhost:8000/api'

export default function PatientDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [dashboardData, setDashboardData] = useState(null)
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [claimIdentifier, setClaimIdentifier] = useState('')
  const [claimStatus, setClaimStatus] = useState(null)
  const [socket, setSocket] = useState(null)
  const [watchingTag, setWatchingTag] = useState(null)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const watchDevice = () => {
    const identifier = claimIdentifier.trim()
    if (!identifier) {
      setClaimStatus({ type: 'error', message: 'Vui lòng nhập Device Tag hoặc MAC address của thiết bị.' })
      return
    }
    if (!socket) {
      setClaimStatus({ type: 'error', message: 'Kết nối realtime chưa sẵn sàng. Vui lòng tải lại trang.' })
      return
    }

    socket.emit('patient:watch-device', identifier)
    setWatchingTag(identifier)
    setClaimStatus({ type: 'success', message: `Đang chờ ESP32 ${identifier} gửi dữ liệu để tự động gán.` })
  }

  const clearWatch = () => {
    if (!socket || !watchingTag) return
    socket.emit('patient:unwatch-device', watchingTag)
    setWatchingTag(null)
  }

  const claimDevice = async () => {
    if (!claimIdentifier.trim()) {
      setClaimStatus({ type: 'error', message: 'Vui lòng nhập Device Tag hoặc MAC address của thiết bị.' })
      return
    }

    try {
      const identifier = claimIdentifier.trim()
      const res = await axios.post(`${API}/patient/claim-device`, {
        deviceTag: identifier,
        macAddress: identifier
      })
      setClaimStatus({ type: 'success', message: res.data.message || 'Đã gán thiết bị thành công.' })
      setClaimIdentifier('')
      setWatchingTag(null)
      fetchPatientData()
    } catch (err) {
      console.error(err)
      const message = err?.response?.data?.error || err.message || 'Không thể gán thiết bị.'
      setClaimStatus({ type: 'error', message })
    }
  }

  const fetchPatientData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/patient/dashboard`)
      setDashboardData(res.data)

      if (res.data.profile?.id) {
        const metricsRes = await axios.get(`${API}/sessions/${res.data.profile.id}/metrics`)
        // Format time for XAxis
        const formatted = metricsRes.data.map(d => {
          const t = new Date(d.recordedAt)
          return {
            ...d,
            time: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`
          }
        })
        setChartData(formatted)
      }
      setError(null)
    } catch (err) {
      console.error(err)
      setError('Lỗi kết nối server hoặc bạn chưa được gán thiết bị theo dõi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPatientData()
    // Poll data every 3 seconds
    const interval = setInterval(fetchPatientData, 3000)
    return () => clearInterval(interval)
  }, [fetchPatientData])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const socketClient = io('http://localhost:8000', {
      auth: { token }
    })

    socketClient.on('connect', () => {
      console.log('[PatientSocket] connected')
    })

    socketClient.on('disconnect', () => {
      console.log('[PatientSocket] disconnected')
      setWatchingTag(null)
    })

    setSocket(socketClient)

    return () => {
      if (watchingTag) {
        socketClient.emit('patient:unwatch-device', watchingTag)
      }
      socketClient.disconnect()
    }
  }, [])

  if (loading && !dashboardData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        Đang tải thông tin theo dõi...
      </div>
    )
  }

  const profile = dashboardData?.profile
  const device = dashboardData?.device
  const latestData = dashboardData?.latestData
  const latestDiagnosis = dashboardData?.latestDiagnosis
  const deviceLabel = device?.deviceTag || device?.macAddress || 'Chưa gán'

  // Styling based on diagnosis status
  const statusConfig = {
    urgent: {
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
      label: 'CẢNH BÁO URGENT'
    },
    warning: {
      color: '#ea580c',
      bg: '#fff7ed',
      border: '#fed7aa',
      label: 'CẢNH BÁO CẦN LƯU Ý'
    },
    normal: {
      color: '#16a34a',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      label: 'AN TOÀN'
    }
  }

  const currentStatus = statusConfig[latestDiagnosis?.status || 'normal']

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 20, padding: 18, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hồ sơ cá nhân</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{user?.name}</div>
            <div style={{ fontSize: 14, color: '#475569', marginTop: 6 }}>Email: {user?.email}</div>
            <div style={{ fontSize: 14, color: '#475569', marginTop: 2 }}>Vai trò: {user?.role}</div>
          </div>
          <div style={{ minWidth: 180, padding: 14, background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Truy cập lần cuối</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        </div>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, background: '#fff', padding: '16px 24px', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
          <div>
            <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 700, letterSpacing: '0.05em' }}>PATIENT PORTAL</span>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '4px 0 0 0' }}>
              Xin chào, {profile?.full_name || user?.name}
            </h1>
            <div style={{ marginTop: 8, fontSize: 14, color: '#475569' }}>
              Tài khoản: {user?.email} • Vai trò: {user?.role}
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.target.style.background = '#e2e8f0'}
            onMouseOut={e => e.target.style.background = '#f1f5f9'}
          >
            Đăng xuất
          </button>
        </div>

        {error && (
          <div style={{ padding: '14px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#dc2626', marginBottom: 24, fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Top Widgets Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
          
          {/* Temperature Widget */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Nhiệt độ da</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>
                {latestData ? `${latestData.temperature}°C` : '—'}
              </div>
            </div>
          </div>

          {/* Humidity Widget */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Độ ẩm da</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>
                {latestData ? `${latestData.humidity}%` : '—'}
              </div>
            </div>
          </div>

          {/* Device Widget */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
            </div>
            <div style={{ width: '100%' }}>
              <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Thiết bị đeo</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                {deviceLabel}
              </div>
              <div style={{ fontSize: 12, color: device ? '#16a34a' : '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: device ? '#16a34a' : '#cbd5e1', display: 'inline-block' }}></span>
                {device ? 'Đang hoạt động' : 'Chưa gán thiết bị'}
              </div>

              {!device && (
                <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                  <div style={{ fontSize: 13, color: '#475569' }}>
                    Nhập Device Tag hoặc MAC address của thiết bị ESP32 để tự động gán cho bạn.
                  </div>
                  <input
                    value={claimIdentifier}
                    onChange={e => setClaimIdentifier(e.target.value)}
                    placeholder="VD: ESP32-01 hoặc 24:6F:28:3A:1B:5C"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none', fontSize: 14 }}
                  />
                  <div style={{ display: 'grid', gap: 10 }}>
                    <button
                      onClick={watchDevice}
                      style={{ padding: '10px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}
                    >
                      Chờ ESP32 gửi để tự động gán
                    </button>
                    <button
                      onClick={claimDevice}
                      style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}
                    >
                      Gán ngay lập tức
                    </button>
                  </div>
                  {watchingTag && (
                    <div style={{ color: '#0f172a', fontSize: 13, marginTop: 8 }}>
                      Đang chờ auto-claim cho tag: <strong>{watchingTag}</strong>
                    </div>
                  )}
                  {claimStatus && (
                    <div style={{ color: claimStatus.type === 'error' ? '#b91c1c' : '#166534', fontSize: 13 }}>
                      {claimStatus.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Diagnosis / Alert Callout */}
        <div style={{ 
          background: currentStatus.bg, 
          border: `1px solid ${currentStatus.border}`, 
          borderRadius: 16, 
          padding: 24, 
          marginBottom: 24, 
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' 
        }}>
          <span style={{ 
            display: 'inline-block', 
            padding: '4px 10px', 
            background: currentStatus.color, 
            color: '#fff', 
            fontSize: 11, 
            fontWeight: 800, 
            borderRadius: 6, 
            letterSpacing: '0.05em', 
            marginBottom: 10 
          }}>
            {currentStatus.label}
          </span>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
            Chẩn đoán lâm sàng tự động:
          </h2>
          <p style={{ fontSize: 16, fontWeight: 600, color: currentStatus.color, margin: 0 }}>
            {latestDiagnosis ? latestDiagnosis.text : 'Chưa nhận được dữ liệu chẩn đoán.'}
          </p>
        </div>

        {/* Chart Card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 20px 0' }}>
            Biểu đồ xu hướng chỉ số da (1 giờ qua)
          </h3>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              onClick={async () => {
                try {
                  const patientId = profile?.id;
                  if (!patientId) return alert('Không tìm thấy hồ sơ bệnh nhân.');
                  const res = await axios.get(`${API}/export/sensor-logs`, {
                    params: { patientId, limit: 1000 },
                    responseType: 'blob'
                  });
                  const blob = new Blob([res.data], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `sensor_logs_${patientId}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  console.error(err);
                  const serverMsg = err?.response?.data ? JSON.stringify(err.response.data) : err.message || 'Không rõ';
                  alert('Không thể xuất CSV. Chi tiết: ' + serverMsg);
                }
              }}
              style={{ padding: '8px 12px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
            >
              Export CSV
            </button>
          </div>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: 11 }} />
                <YAxis yAxisId="left" stroke="#ef4444" style={{ fontSize: 11 }} domain={[34, 40]} unit="°C" />
                <YAxis yAxisId="right" orientation="right" stroke="#0284c7" style={{ fontSize: 11 }} domain={[40, 100]} unit="%" />
                <Tooltip contentStyle={{ background: '#fff', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                <Legend style={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="temperature" name="Nhiệt độ (°C)" stroke="#ef4444" strokeWidth={2.5} activeDot={{ r: 6 }} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="humidity" name="Độ ẩm (%)" stroke="#0284c7" strokeWidth={2.5} activeDot={{ r: 6 }} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
