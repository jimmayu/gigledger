import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/AuthPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Transactions from './pages/Transactions.jsx'
import Assets from './pages/Assets.jsx'
import Reports from './pages/Reports.jsx'
import NavBar from './components/NavBar.jsx'

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      // First check the auth mode
      const modeResponse = await fetch(`${API_BASE}/auth/mode`, {
        credentials: 'include'
      })
      const modeData = await modeResponse.json()

      if (modeData.authMode === 'disabled') {
        // When authentication is disabled, use default user
        setUser({ id: 1, username: 'default-user' })
      } else {
        // Standard authentication flow
        const response = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })
      setUser(null)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={user} onLogout={handleLogout} />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App