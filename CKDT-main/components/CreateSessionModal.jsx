import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function CreateSessionModal({ onClose }) {
  const { startMonitoring, devices, patients, sessions } = useApp()
  const [patientId, setPatientId] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Filter available devices
  const availableDevices = devices.filter(d => d.status === 'available')

  // Filter patients that are not currently being monitored
  const activePatientIds = sessions.map(s => s.id) // Session id maps to patient id in sessions response
  const unmonitoredPatients = patients.filter(p => !activePatientIds.includes(p.id))

  const handleSubmit = async () => {
    if (!patientId || !deviceId) {
      setErr('Vui lòng chọn cả bệnh nhân và thiết bị.')
      return
    }
    setSaving(true)
    try {
      await startMonitoring(patientId, deviceId)
      onClose()
    } catch (e) {
      setErr(e.response?.data?.error || 'Lỗi khi gán thiết bị.')
    } finally {
      setSaving(false)
    }
  }

  // Close on overlay click
  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div className="modal-overlay" onClick={handleOverlay}>
      <div className="modal-box" style={{ maxWidth: 450 }}>
        <div className="modal-head">
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Gán thiết bị giám sát</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
              Chọn bệnh nhân <span style={{color:'red'}}>*</span>
            </label>
            <select 
              value={patientId} 
              onChange={e => setPatientId(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
            >
              <option value="">-- Chọn bệnh nhân --</option>
              {unmonitoredPatients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.fullName} (Phòng {p.roomNumber || '—'} - Giường {p.bedNumber || '—'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
              Chọn thiết bị đeo (MAC) <span style={{color:'red'}}>*</span>
            </label>
            <select 
              value={deviceId} 
              onChange={e => setDeviceId(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
            >
              <option value="">-- Chọn thiết bị --</option>
              {availableDevices.map(d => (
                <option key={d.id} value={d.id}>
                  {d.macAddress} ({d.location || 'Kho'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {err && (
          <p style={{ color: '#DC2626', fontSize: 13, marginTop: 12 }}>⚠ {err}</p>
        )}

        <div className="form-submit" style={{ marginTop: 24 }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit} 
            disabled={saving}
            style={{ width: '100%', background: '#EF4444' }}
          >
            {saving ? 'Đang lưu...' : 'Bắt đầu theo dõi'}
          </button>
        </div>
      </div>
    </div>
  )
}
