import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const IconHeart = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)

export default function LoginPage() {
  const { login } = useAuth()
  const navigate   = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      
      // Redirect according to user role
      if (user.role === 'engineer') {
        navigate('/thiet-bi', { replace: true })
      } else if (user.role === 'patient') {
        navigate('/dashboard', { replace: true })
      } else if (user.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại.')
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
        width: 380,
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        padding: '40px 36px',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: '#EF4444', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconHeart />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.08em', fontWeight: 600 }}>MONITORING SYSTEM</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              THEO DÕI MỀ ĐAY
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
          Đăng nhập
        </h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 28 }}>
          Hệ thống giám sát chỉ số da thời gian thực
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Tên đăng nhập
            </label>
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

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
              required
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid #cbd5e1', borderRadius: 8,
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
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
              background: loading ? '#fca5a5' : '#EF4444',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div style={{ marginTop: 18, textAlign: 'center', color: '#475569', fontSize: 14 }}>
          <div>Bạn chưa có tài khoản?</div>
          <Link to="/register" style={{ color: '#EF4444', fontWeight: 700 }}>Tạo tài khoản mới</Link>
        </div>

        {/* Account Tips */}
        <div style={{
          marginTop: 24, padding: '12px 14px',
          background: '#fef2f2', borderRadius: 8,
          fontSize: 12, color: '#991b1b', lineHeight: 1.7,
          border: '1px solid #fee2e2',
        }}>
          <strong>Tài khoản thử nghiệm:</strong><br/>
          👨‍⚕️ Bác sĩ: bacsi@hospital.com / 123456<br/>
          🔧 Kỹ sư: engineer@hospital.com / 123456<br/>
          👤 Bệnh nhân: benhnhan@hospital.com / 123456
        </div>
      </div>
    </div>
  )
}
