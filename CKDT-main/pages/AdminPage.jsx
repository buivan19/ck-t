import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

export default function AdminPage() {
  const { user, logout } = useAuth()
  const { sessions, patients, devices } = useApp()

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Admin Portal</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '10px 0 0' }}>Xin chào, {user?.name}</h1>
            <p style={{ color: '#64748b', marginTop: 8 }}>Giao diện riêng cho admin, quản lý tài khoản và dữ liệu giám sát.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600 }}>{user?.email}</div>
            <button
              onClick={logout}
              style={{ padding: '10px 18px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}
            >Đăng xuất</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: 24 }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Tổng số phiên theo dõi</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#0f172a' }}>{sessions.length}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: 24 }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Tổng bệnh nhân</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#0f172a' }}>{patients.length}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: 24 }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Tổng thiết bị</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#0f172a' }}>{devices.length}</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Chức năng admin</h2>
          <p style={{ color: '#475569', lineHeight: 1.7 }}>Admin có thể quản lý tài khoản, xem tổng quan dữ liệu và kiểm soát quyền truy cập. Với mỗi tài khoản mới đăng ký, hệ thống sẽ lưu lại đầy đủ thông tin để đăng nhập và phân quyền riêng biệt.</p>
        </div>
      </div>
    </div>
  )
}
