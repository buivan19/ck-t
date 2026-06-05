import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import CreateSessionModal from '../components/CreateSessionModal'
import SessionCard from '../components/SessionCard'
import axios from 'axios'
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

const IconX    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
const IconCheck= () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
const IconClock= () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const IconWarn = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>

const API = 'http://localhost:8000/api'

export default function Dashboard() {
  const { sessions, stats, loading, error } = useApp()
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [detailSession, setDetailSession] = useState(null)

  const activeSessions = sessions.filter(s => !s.ended)

  const personalizationMessage = user
    ? `Xin chào ${user.name}, hệ thống đã cá nhân hóa giao diện theo vai trò ${user.role}.`
    : 'Chào mừng bạn đến với hệ thống giám sát mề đay.'

  return (
    <div className="main-content">
      <div style={{ marginBottom: 20, padding: 20, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 700, marginBottom: 6 }}>Giao diện cá nhân hóa</div>
        <div style={{ fontSize: 15, color: '#475569' }}>{personalizationMessage}</div>
      </div>
      {/* Error banner */}
      {error && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA',
          color: '#DC2626', borderRadius: 10, padding: '12px 16px',
          marginBottom: 20, fontSize: 14,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Action button */}
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ background: '#EF4444' }}>
          <IconPlus /> Gán thiết bị giám sát bệnh nhân
        </button>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card red">
          <div>
            <div className="num">{loading ? '...' : stats.error}</div>
            <div className="lbl">Nguy cơ bùng phát</div>
          </div>
          <div className="icon-box"><IconX /></div>
        </div>
        <div className="stat-card green">
          <div>
            <div className="num">{loading ? '...' : stats.active}</div>
            <div className="lbl">Chỉ số ổn định</div>
          </div>
          <div className="icon-box"><IconCheck /></div>
        </div>
        <div className="stat-card orange">
          <div>
            <div className="num">{loading ? '...' : stats.warning}</div>
            <div className="lbl">Cần lưu ý</div>
          </div>
          <div className="icon-box"><IconClock /></div>
        </div>
        <div className="stat-card gray">
          <div>
            <div className="num">{loading ? '...' : stats.waiting}</div>
            <div className="lbl">Thiết bị sẵn sàng</div>
          </div>
          <div className="icon-box"><IconWarn /></div>
        </div>
      </div>

      {/* Sessions list */}
      <div className="section-hdr">Danh sách bệnh nhân đang theo dõi</div>
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Đang tải...</p>
      ) : activeSessions.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 0',
          color: 'var(--text-secondary)', fontSize: 14,
        }}>
          Chưa có bệnh nhân nào được gắn thiết bị giám sát mề đay.<br/>
          <span style={{ color: '#EF4444', cursor: 'pointer', fontWeight: 600 }} onClick={() => setShowModal(true)}>
            Gán thiết bị ngay →
          </span>
        </div>
      ) : (
        <div className="sessions-grid">
          {activeSessions.map(s => (
            <SessionCard key={s.id} session={s} onViewDetail={setDetailSession} />
          ))}
        </div>
      )}

      {showModal && <CreateSessionModal onClose={() => setShowModal(false)} />}
      
      {detailSession && (
        <DetailChartModal session={detailSession} onClose={() => setDetailSession(null)} />
      )}
    </div>
  )
}

function DetailChartModal({ session, onClose }) {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/sessions/${session.id}/metrics`)
      const formatted = res.data.map(d => {
        const t = new Date(d.recordedAt)
        return {
          ...d,
          time: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`
        }
      })
      setChartData(formatted)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [session.id])

  useEffect(() => {
    fetchMetrics()
    const id = setInterval(fetchMetrics, 3000)
    return () => clearInterval(id)
  }, [fetchMetrics])

  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div className="modal-overlay" onClick={handleOverlay}>
      <div className="modal-box" style={{ maxWidth: 750, width: '90%' }}>
        <div className="modal-head">
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>
            Biểu đồ chi tiết: {session.patientName} (Phòng {session.room} - Giường {session.bed})
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '16px 0' }}>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Nhiệt độ hiện tại</span>
            <strong style={{ fontSize: 24, color: '#ef4444' }}>{session.temperature ? `${session.temperature}°C` : '—'}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Độ ẩm hiện tại</span>
            <strong style={{ fontSize: 24, color: '#0284c7' }}>{session.humidity ? `${session.humidity}%` : '—'}</strong>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16, borderLeft: '4px solid #EF4444' }}>
          <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Chẩn đoán hiện tại</span>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{session.diagnosisText}</div>
        </div>

        {loading && chartData.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>Đang tải biểu đồ...</p>
        ) : (
          <div style={{ width: '100%', height: 300, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: 10 }} />
                <YAxis yAxisId="left" stroke="#ef4444" style={{ fontSize: 10 }} domain={[34, 40]} unit="°C" />
                <YAxis yAxisId="right" orientation="right" stroke="#0284c7" style={{ fontSize: 10 }} domain={[40, 100]} unit="%" />
                <Tooltip />
                <Legend style={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="temperature" name="Nhiệt độ (°C)" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="humidity" name="Độ ẩm (%)" stroke="#0284c7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
