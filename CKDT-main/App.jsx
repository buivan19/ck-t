import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider }           from './context/AppContext'
import Sidebar                   from './components/Sidebar'
import Dashboard                 from './pages/Dashboard'
import Patients                  from './pages/Patients'
import Notifications             from './pages/Notifications'
import Settings                  from './pages/Settings'
import LoginPage                 from './pages/LoginPage'
import RegisterPage              from './pages/RegisterPage'
import TechnicianPage            from './pages/TechnicianPage'
import PatientDashboard          from './pages/PatientDashboard'
import AdminPage                 from './pages/AdminPage'

// Private route wrapper with role restrictions
function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>
      Đang tải...
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to default home of the user's role
    if (user.role === 'engineer') return <Navigate to="/thiet-bi" replace />
    if (user.role === 'patient') return <Navigate to="/dashboard" replace />
    return <Navigate to="/" replace />
  }

  return children
}

// Doctor and Admin Layout with sidebar
function DoctorLayout() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'engineer') return <Navigate to="/thiet-bi" replace />
  if (user.role === 'patient') return <Navigate to="/dashboard" replace />
  
  return (
    <AppProvider>
      <div className="app-shell">
        <Sidebar />
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/benh-nhan" element={<Patients />} />
          <Route path="/thong-bao" element={<Notifications />} />
          <Route path="/cai-dat"   element={<Settings />} />
        </Routes>
      </div>
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login Page */}
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Engineer Dashboard */}
          <Route
            path="/thiet-bi"
            element={
              <PrivateRoute allowedRoles={['engineer', 'admin']}>
                <TechnicianPage />
              </PrivateRoute>
            }
          />

          {/* Patient Dashboard */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute allowedRoles={['patient']}>
                <PatientDashboard />
              </PrivateRoute>
            }
          />

          {/* Admin Dashboard */}
          <Route
            path="/admin"
            element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminPage />
              </PrivateRoute>
            }
          />

          {/* Doctor Layout (Default) */}
          <Route
            path="/*"
            element={
              <PrivateRoute allowedRoles={['doctor']}>
                <DoctorLayout />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

// LoginGuard redirects active sessions
function LoginGuard() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) {
    if (user.role === 'engineer') return <Navigate to="/thiet-bi" replace />
    if (user.role === 'patient') return <Navigate to="/dashboard" replace />
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/" replace />
  }
  return <LoginPage />
}
