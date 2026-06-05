import { useApp } from '../context/AppContext'

const IconPulse = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)
const IconTemp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
  </svg>
)
const IconHumid = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  </svg>
)
const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconChart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)

export default function SessionCard({ session, onViewDetail }) {
  const { endMonitoring } = useApp()

  const handleEnd = () => {
    if (window.confirm(`Dừng giám sát bệnh nhân ${session.patientName}?`)) {
      endMonitoring(session.id)
    }
  }

  const statusColors = {
    normal:  'status-green',
    warning: 'status-orange',
    urgent:  'status-red',
  }

  const pulseColors = {
    normal:  'var(--green)',
    warning: 'var(--orange)',
    urgent:  'var(--red)',
  }

  return (
    <div className={`session-card ${statusColors[session.status] ?? 'status-gray'}`}>
      {/* Header */}
      <div className="card-header">
        <div>
          <div className="card-name">{session.patientName}</div>
          <div className="card-room">Phòng {session.room} - Giường {session.bed}</div>
        </div>
        <span className="card-pulse" style={{ color: pulseColors[session.status] ?? 'var(--gray)' }}>
          <IconPulse />
        </span>
      </div>

      {/* Body */}
      <div className="card-body" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div style={{ background: '#f8fafc', padding: 8, borderRadius: 8, textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
              <IconTemp /> Nhiệt độ da
            </span>
            <span style={{ fontSize: 16, fontWeight: 750, color: session.status === 'urgent' || (session.temperature > 37.5) ? '#ef4444' : '#0f172a' }}>
              {session.temperature ? `${session.temperature}°C` : '—'}
            </span>
          </div>
          <div style={{ background: '#f8fafc', padding: 8, borderRadius: 8, textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
              <IconHumid /> Độ ẩm da
            </span>
            <span style={{ fontSize: 16, fontWeight: 750, color: session.status === 'urgent' || (session.humidity > 80) ? '#0284c7' : '#0f172a' }}>
              {session.humidity ? `${session.humidity}%` : '—'}
            </span>
          </div>
        </div>

        <div style={{ fontSize: 12, lineHeight: 1.4, color: '#334155', background: '#f1f5f9', padding: '8px 10px', borderRadius: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <span style={{ color: pulseColors[session.status] || '#64748b', marginTop: 2 }}><IconAlert /></span>
          <div>
            <strong style={{ display: 'block', fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chẩn đoán tự động</strong>
            {session.diagnosisText}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card-actions">
        <button className="btn btn-neutral" onClick={() => onViewDetail(session)}>
          <IconChart /> Xem chi tiết
        </button>
        <button className="btn btn-danger" onClick={handleEnd} style={{ background: '#64748b' }}>
          <IconCheck /> Dừng
        </button>
      </div>
    </div>
  )
}
