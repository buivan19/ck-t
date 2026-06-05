import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = 'http://localhost:8000/api'

const STATUS_LABEL = {
  available:  { text: 'Sẵn sàng',   color: '#16a34a', bg: '#dcfce7' },
  active:     { text: 'Đang hoạt động',  color: '#ef4444', bg: '#fee2e2' },
  error:      { text: 'Lỗi',        color: '#d97706', bg: '#fef3c7' }
}

function StatusBadge({ status }) {
  const s = STATUS_LABEL[status] || { text: status, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 99,
      fontSize: 12, fontWeight: 600,
      color: s.color, background: s.bg,
    }}>{s.text}</span>
  )
}

export default function TechnicianPage() {
  const { user, logout } = useAuth()
  const [devices, setDevices]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState({ macAddress: '', location: 'Kho thiết bị' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')

  // Stats
  const stats = {
    total:     devices.length,
    active:    devices.filter(d => d.status === 'active').length,
    available: devices.filter(d => d.status === 'available').length,
    error:     devices.filter(d => d.status === 'error').length,
  }

  const fetchDevices = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/devices`)
      setDevices(res.data)
    } catch (err) {
      console.error('Lỗi tải thiết bị:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
    const id = setInterval(fetchDevices, 4000)
    return () => clearInterval(id)
  }, [fetchDevices])

  const handleAddDevice = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      await axios.post(`${API}/devices`, form)
      setShowModal(false)
      setForm({ macAddress: '', location: 'Kho thiết bị' })
      fetchDevices()
    } catch (err) {
      setFormError(err.response?.data?.error || 'Thêm thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (device) => {
    if (!window.confirm(`Xoá thiết bị ${device.macAddress}?`)) return
    try {
      await axios.delete(`${API}/devices/${device.id}`)
      fetchDevices()
    } catch (err) {
      alert(err.response?.data?.error || 'Xoá thất bại.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#EF4444', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>❤️</div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>SYSTEM ENGINEER</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>THEO DÕI MỀ ĐAY</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{user?.name} • {user?.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Kỹ sư quản trị</div>
          </div>
          <button
            onClick={logout}
            style={{
              padding: '6px 14px', border: '1px solid #cbd5e1',
              borderRadius: 8, fontSize: 13, background: '#fff',
              color: '#475569', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: 24, maxWidth: 1000, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Quản lý thiết bị đeo phần cứng (ESP32)
          </h2>
          <div style={{ textAlign: 'right', color: '#475569', fontSize: 13 }}>
            <div>Xin chào, {user?.name}</div>
            <div style={{ marginTop: 4 }}>Vai trò: {user?.role}</div>
          </div>
          <button
            onClick={() => { setShowModal(true); setFormError('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', background: '#EF4444',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            + Đăng ký thiết bị đeo
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'Tổng thiết bị đeo',  value: stats.total,     color: '#0f172a' },
            { label: 'Đang theo dõi', value: stats.active,    color: '#ef4444' },
            { label: 'Sẵn sàng',       value: stats.available, color: '#16a34a' },
            { label: 'Cần bảo trì',            value: stats.error,     color: '#d97706' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 12,
              border: '1px solid #e2e8f0', padding: '16px 20px',
              boxShadow: '0 1px 3px 0 rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{
          background: '#fff', borderRadius: 12,
          border: '1px solid #e2e8f0', overflow: 'hidden',
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.02)'
        }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải danh sách...</div>
          ) : devices.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              Chưa có thiết bị đeo nào được đăng ký trong hệ thống.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Địa chỉ MAC', 'Vị trí hiện tại', 'Bệnh nhân đang đeo', 'Trạng thái', 'Hành động'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: 12, color: '#64748b', fontWeight: 600,
                      borderBottom: '1px solid #e2e8f0',
                      textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#334155' }}>
                      {d.macAddress}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      {d.location || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 500 }}>
                      {d.patientName ? (
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>👤 {d.patientName}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Chưa gán</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={d.status} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {d.status !== 'active' ? (
                        <button
                          onClick={() => handleDelete(d)}
                          style={{
                            padding: '6px 12px', border: '1px solid #fca5a5',
                            borderRadius: 8, fontSize: 12, fontWeight: 600,
                            color: '#dc2626', background: '#fff', cursor: 'pointer',
                          }}
                        >
                          Xoá
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Đang khóa</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modal thêm thiết bị */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15, 23, 42, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16,
            padding: '32px 28px', width: 400,
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 20, marginTop: 0 }}>
              Đăng ký thiết bị đeo (ESP32)
            </h3>
            <form onSubmit={handleAddDevice}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Địa chỉ MAC (Hardware ID) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.macAddress}
                  onChange={e => setForm(f => ({ ...f, macAddress: e.target.value }))}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  required
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1px solid #cbd5e1', borderRadius: 8,
                    fontSize: 14, boxSizing: 'border-box',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Vị trí cất giữ / phòng trực
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="VD: Kho thiết bị A, Phòng 101"
                  style={{
                    width: '100%', padding: '10px 12px',
                    border: '1px solid #cbd5e1', borderRadius: 8,
                    fontSize: 14, boxSizing: 'border-box',
                  }}
                />
              </div>
              {formError && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: '#fef2f2', border: '1px solid #fecaca',
                  color: '#dc2626', fontSize: 13, marginBottom: 16,
                }}>{formError}</div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1, padding: '10px', border: '1px solid #cbd5e1',
                    borderRadius: 8, fontSize: 14, background: '#fff',
                    color: '#475569', cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1, padding: '10px',
                    background: submitting ? '#fca5a5' : '#EF4444',
                    color: '#fff', border: 'none', borderRadius: 8,
                    fontSize: 14, fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Đang đăng ký...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
