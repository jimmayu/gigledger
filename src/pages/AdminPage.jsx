import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api'

export default function AdminPage({ user }) {
  const [users, setUsers] = useState([])
  const [loginAttempts, setLoginAttempts] = useState([])
  const [loginStats, setLoginStats] = useState(null)
  const [activeTab, setActiveTab] = useState('users')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    await Promise.all([fetchUsers(), fetchLoginAttempts()])
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/users`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch users')
      }
    } catch (error) {
      setError('Connection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchLoginAttempts = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/login-attempts`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setLoginAttempts(data.attempts)
        setLoginStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch login attempts:', error)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          role: formData.role
        })
      })

      const data = await response.json()

      if (response.ok) {
        setUsers([data, ...users])
        setShowAddModal(false)
        setFormData({ username: '', password: '', role: 'user' })
      } else {
        setError(data.error || 'Failed to create user')
      }
    } catch (error) {
      setError('Connection failed. Please try again.')
    }
  }

  const handleEditUser = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch(`${API_BASE}/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username,
          role: formData.role
        })
      })

      const data = await response.json()

      if (response.ok) {
        setUsers(users.map(u => u.id === selectedUser.id ? data : u))
        setShowEditModal(false)
        setSelectedUser(null)
        setFormData({ username: '', password: '', role: 'user' })
      } else {
        setError(data.error || 'Failed to update user')
      }
    } catch (error) {
      setError('Connection failed. Please try again.')
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch(`${API_BASE}/admin/users/${selectedUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: formData.password })
      })

      const data = await response.json()

      if (response.ok) {
        setShowPasswordModal(false)
        setSelectedUser(null)
        setFormData({ ...formData, password: '' })
        alert('Password reset successful')
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch (error) {
      setError('Connection failed. Please try again.')
    }
  }

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        setUsers(users.filter(u => u.id !== userId))
      } else {
        setError(data.error || 'Failed to delete user')
      }
    } catch (error) {
      setError('Connection failed. Please try again.')
    }
  }

  const handleClearLoginAttempts = async () => {
    if (!confirm('Are you sure you want to clear all login attempts? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/admin/login-attempts`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        setLoginAttempts([])
        setLoginStats(null)
      } else {
        setError(data.error || 'Failed to clear login attempts')
      }
    } catch (error) {
      setError('Connection failed. Please try again.')
    }
  }

  const openEditModal = (user) => {
    setSelectedUser(user)
    setFormData({ username: user.username, password: '', role: user.role })
    setShowEditModal(true)
  }

  const openPasswordModal = (user) => {
    setSelectedUser(user)
    setFormData({ username: '', password: '', role: '' })
    setShowPasswordModal(true)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const formatDateWithTime = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Console</h1>
            <p className="mt-1 text-sm text-gray-500">Manage users and monitor security</p>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('users')}
                className={`${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`${
                  activeTab === 'security'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Security
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'users' && (
          <>
            <div className="md:flex md:items-center md:justify-between mb-4">
              <div></div>
              <div className="mt-4 md:mt-0">
                <button
                  onClick={() => {
                    setFormData({ username: '', password: '', role: 'user' })
                    setShowAddModal(true)
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add User
                </button>
              </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                        No users found. Add a user to get started.
                      </td>
                    </tr>
                  ) : (
                    users.map((userItem) => {
                      const isLocked = userItem.locked_until && new Date(userItem.locked_until) > new Date()

                      return (
                        <tr key={userItem.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {userItem.username}
                              {userItem.id === user.id && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              userItem.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {userItem.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(userItem.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateWithTime(userItem.last_activity)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isLocked ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Locked
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                            {userItem.failed_attempts > 0 && (
                              <span className="ml-2 text-xs text-red-600">
                                ({userItem.failed_attempts} failed)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openEditModal(userItem)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openPasswordModal(userItem)}
                              className="text-yellow-600 hover:text-yellow-900 mr-3"
                            >
                              Reset Password
                            </button>
                            {userItem.id !== user.id && (
                              <button
                                onClick={() => handleDeleteUser(userItem.id, userItem.username)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="md:flex md:items-center md:justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Login Statistics
                  </h3>
                  {loginAttempts.length > 0 && (
                    <button
                      onClick={handleClearLoginAttempts}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Clear History
                    </button>
                  )}
                </div>

                {loginStats && (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
                    <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
                      <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Attempts
                        </dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">
                          {loginStats.totalAttempts}
                        </dd>
                      </div>
                    </div>
                    <div className="bg-green-50 overflow-hidden shadow rounded-lg">
                      <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-green-600 truncate">
                          Successful
                        </dt>
                        <dd className="mt-1 text-3xl font-semibold text-green-900">
                          {loginStats.successfulAttempts}
                        </dd>
                      </div>
                    </div>
                    <div className="bg-red-50 overflow-hidden shadow rounded-lg">
                      <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-red-600 truncate">
                          Failed
                        </dt>
                        <dd className="mt-1 text-3xl font-semibold text-red-900">
                          {loginStats.failedAttempts}
                        </dd>
                      </div>
                    </div>
                    <div className="bg-yellow-50 overflow-hidden shadow rounded-lg">
                      <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-yellow-600 truncate">
                          Recent Failed (15m)
                        </dt>
                        <dd className="mt-1 text-3xl font-semibold text-yellow-900">
                          {loginStats.recentFailed}
                        </dd>
                      </div>
                    </div>
                  </div>
                )}

                <h4 className="text-md font-medium text-gray-900 mb-3">
                  Recent Login Attempts
                </h4>

                {loginAttempts.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500">
                    No login attempts recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Username
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            IP Address
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {loginAttempts.slice(0, 50).map((attempt) => (
                          <tr key={attempt.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateWithTime(attempt.attempted_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {attempt.username || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {attempt.ip_address || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {attempt.success ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Success
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Failed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showAddModal && (
          <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleAddUser}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Add New User
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                          Username
                        </label>
                        <input
                          type="text"
                          id="username"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                          Password (min. 8 characters)
                        </label>
                        <input
                          type="password"
                          id="password"
                          required
                          minLength={8}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                          Role
                        </label>
                        <select
                          id="role"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Create User
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => setShowAddModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showEditModal && selectedUser && (
          <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleEditUser}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Edit User: {selectedUser.username}
                    </h3>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700">
                          Username
                        </label>
                        <input
                          type="text"
                          id="edit-username"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700">
                          Role
                        </label>
                        <select
                          id="edit-role"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => setShowEditModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showPasswordModal && selectedUser && (
          <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPasswordModal(false)}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handlePasswordReset}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Reset Password for {selectedUser.username}
                    </h3>
                    <div className="mt-4">
                      <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                        New Password (min. 8 characters)
                      </label>
                      <input
                        type="password"
                        id="new-password"
                        required
                        minLength={8}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Reset Password
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => setShowPasswordModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
