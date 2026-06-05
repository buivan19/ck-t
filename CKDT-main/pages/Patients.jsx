import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function Patients() {
  const { patients, createPatient, deletePatient } = useApp()
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({
    fullName: '', age: '', gender: 'Nam', phone: '',
    roomNumber: '', bedNumber: '', email: '', password: ''
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.fullName) {
      setErr('Họ và tên bắt buộc phải nhập.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      await createPatient({
        ...form,
        age: form.age ? Number(form.age) : null
      })
      setShowAddForm(false)
      setForm({
        fullName: '', age: '', gender: 'Nam', phone: '',
        roomNumber: '', bedNumber: '', email: '', password: ''
      })
    } catch (error) {
      setErr(error.response?.data?.error || 'Lỗi khi thêm bệnh nhân.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ bệnh nhân ${name}? Thiết bị đeo gắn kèm (nếu có) sẽ tự động được thu hồi.`)) {
      try {
        await deletePatient(id)
      } catch (error) {
        alert('Lỗi khi xóa hồ sơ bệnh nhân.')
      }
    }
  }

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="page-title">Hồ sơ bệnh nhân</div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ background: '#EF4444' }}
        >
          {showAddForm ? 'Hủy' : '+ Thêm bệnh nhân mới'}
        </button>
      </div>

      {showAddForm && (
        <div className="table-card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Đăng ký bệnh nhân</h3>
          <form onSubmit={handleCreate}>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Họ và tên *</label>
                <input required value={form.fullName} onChange={e => set('fullName', e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Tuổi</label>
                <input type="number" value={form.age} onChange={e => set('age', e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Giới tính</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }}>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Điện thoại</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Số phòng</label>
                <input value={form.roomNumber} onChange={e => set('roomNumber', e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Số giường</label>
                <input value={form.bedNumber} onChange={e => set('bedNumber', e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Email liên kết (để Patient login)</label>
                <input type="email" placeholder="VD: pat@email.com" value={form.email} onChange={e => set('email', e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Mật khẩu đăng nhập</label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
              </div>
            </div>

            {err && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>⚠ {err}</p>}

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ background: '#10B981', borderColor: '#10B981' }}>
                {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Tên bệnh nhân</th>
              <th>Tuổi</th>
              <th>Giới tính</th>
              <th>Phòng/Giường</th>
              <th>Điện thoại</th>
              <th>Thiết bị gắn kèm</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 32 }}>
                  Chưa có bệnh nhân nào được đăng ký
                </td>
              </tr>
            ) : patients.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600, color: '#0f172a' }}>{p.fullName}</td>
                <td>{p.age ?? '—'}</td>
                <td>{p.gender ?? '—'}</td>
                <td>
                  {p.roomNumber ? `Phòng ${p.roomNumber}` : '—'} 
                  {p.bedNumber ? ` - Giường ${p.bedNumber}` : ''}
                </td>
                <td>{p.phone ?? '—'}</td>
                <td>
                  {p.deviceMac ? (
                    <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                      {p.deviceMac}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Chưa gắn thiết bị</span>
                  )}
                </td>
                <td>
                  <button 
                    onClick={() => handleDelete(p.id, p.fullName)}
                    className="btn btn-danger" 
                    style={{ padding: '4px 8px', fontSize: 12, background: '#EF4444' }}
                  >
                    Xóa hồ sơ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
