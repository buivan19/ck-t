import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000/api'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
const [user, setUser] = useState(() => {
  const stored = localStorage.getItem('user')
  return stored ? JSON.parse(stored) : null
})
  const [token, setToken]   = useState(() => localStorage.getItem('token') || null)
  const [loading, setLoading] = useState(true)

  // Gán token vào header mặc định của axios
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  // Khi load lại trang: kiểm tra token cũ còn hợp lệ không
  useEffect(() => {
    if (!token) { setLoading(false); return }
    axios.get(`${API}/auth/me`)
      .then(res => {
        setUser(res.data.user)
        localStorage.setItem('user', JSON.stringify(res.data.user))
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password })
    const { token: newToken, user: newUser } = res.data
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    return newUser
  }

  const register = async (email, password, name, role) => {
    const res = await axios.post(`${API}/auth/register`, { email, password, name, role })
    return res.data
  }

  const logout = async () => {
    try { await axios.post(`${API}/auth/logout`) } catch { /* ignore */ }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
