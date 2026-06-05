import { useState } from 'react'
import { useApp } from '../context/AppContext'

const IconWarn  = ({ color = '#DC2626' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

export default function Notifications() {
  const { diagnoses } = useApp()
  const [filter, setFilter] = useState('all') // 'all' | 'urgent' | 'warning' | 'normal'

  const filteredDiagnoses = diagnoses.filter(d => {
    if (filter === 'all') return true
    return d.alert_type === filter
  })

  const statusConfig = {
    urgent: {
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
      label: 'Nguy cơ bùng phát'
    },
    warning: {
      color: '#ea580c',
      bg: '#fff7ed',
      border: '#fed7aa',
      label: 'Cần lưu ý'
    },
    normal: {
      color: '#16a34a',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      label: 'Ổn định'
    }
  }

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="page-title">Nhật ký chẩn đoán tự động</div>
        
        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { value: 'all', label: 'Tất cả' },
            { value: 'urgent', label: 'Nguy cơ bùng phát' },
            { value: 'warning', label: 'Cần lưu ý' },
            { value: 'normal', label: 'Ổn định' }
          ].map(btn => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: filter === btn.value ? '#334155' : '#fff',
                color: filter === btn.value ? '#fff' : '#475569',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredDiagnoses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, color: '#64748b' }}>
            Không có nhật ký nào trùng khớp.
          </div>
        ) : filteredDiagnoses.map(d => {
          const cfg = statusConfig[d.alert_type] || statusConfig.normal
          const dateStr = new Date(d.triggered_at).toLocaleString('vi-VN')
          return (
            <div 
              key={d.id} 
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: 16,
                border: '1px solid #e2e8f0',
                borderLeft: `5px solid ${cfg.color}`,
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{d.patientName}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Phòng {d.room || '—'} - Giường {d.bed || '—'}
                  </span>
                  <span style={{ 
                    fontSize: 10, 
                    fontWeight: 750, 
                    color: cfg.color, 
                    background: cfg.bg, 
                    padding: '2px 6px', 
                    borderRadius: 4, 
                    border: `1px solid ${cfg.border}` 
                  }}>
                    {cfg.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#334155', fontWeight: 500, margin: '6px 0' }}>
                  {d.message}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Chỉ số lúc đo: Nhiệt độ: {d.temperature}°C, Độ ẩm: {d.humidity}% | Thời gian: {dateStr}
                </div>
              </div>
              
              {d.alert_type !== 'normal' && (
                <div style={{ color: cfg.color }}>
                  <IconWarn color={cfg.color} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
