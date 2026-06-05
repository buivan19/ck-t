import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('patient')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password || !name || !role) {
      setError('Vui lòng điền đầy đủ thông tin.')
      setLoading(false)
      return
    }

    try {
      await register(email, password, name, role)
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng ký thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
    }}>
      <div style={{
        width: 420,
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        padding: '40px 36px',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: '#2563eb', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>A</div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.08em', fontWeight: 600 }}>MONITORING SYSTEM</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>TẠO TÀI KHOẢN MỚI</div>
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Đăng ký tài khoản</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 28 }}>
          Vui lòng điền tên đăng nhập, mật khẩu, tên hiển thị và loại tài khoản.
          Sau khi tạo xong, bạn sẽ quay về trang đăng nhập để dùng tên đăng nhập và mật khẩu này.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Tên đăng nhập</label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vd: myusername123"
              required
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid #cbd5e1', borderRadius: 8,
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid #cbd5e1', borderRadius: 8,
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Tên người dùng</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tên hiển thị"
              required
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid #cbd5e1', borderRadius: 8,
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Đối tượng</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid #cbd5e1', borderRadius: 8,
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            >
              <option value="patient">Bệnh nhân</option>
              <option value="doctor">Bác sĩ</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', fontSize: 13, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              background: loading ? '#c7d2fe' : '#2563eb',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </form>

        <div style={{ marginTop: 18, textAlign: 'center', color: '#475569', fontSize: 14 }}>
          <div>Đã có tài khoản?</div>
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 700 }}>Quay lại đăng nhập</Link>
        </div>
      </div>
    </div>
  )
}
