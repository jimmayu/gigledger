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
  const [error, setError] = useState(null)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      setError(null) // Reset error on retry

      // First check the auth mode
      const modeResponse = await fetch(`${API_BASE}/auth/mode`, {
        credentials: 'include'
      })

      if (!modeResponse.ok) {
        throw new Error(`Failed to check auth mode: ${modeResponse.status}`)
      }

      const modeData = await modeResponse.json()

      if (modeData.authMode === 'disabled') {
        // When authentication is disabled, use default user
        setUser({ id: 1, username: 'default-user' })
      } else {
        const response = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else if (response.status === 401) {
        } else {
          const errorData = await response.json().catch(() => ({}))
          setError(errorData.error || `Authentication failed: ${response.status}`)
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setError(error.message || 'Unable to verify authentication status. Please check your connection.')
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
    if (error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-medium text-gray-900">
                  Authentication Error
                </h2>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                {error}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Refresh Page
              </button>
              <button
                onClick={checkAuthStatus}
                className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )
    }
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