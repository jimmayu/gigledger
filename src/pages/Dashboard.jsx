import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon, ChartBarIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [taxYear, setTaxYear] = useState(new Date().getFullYear())
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadSummary()
  }, [taxYear])

  const loadSummary = async () => {
    try {
      setError(null) // Reset error on retry
      const response = await fetch(`${API_BASE}/summary?year=${taxYear}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      } else {
        // Handle API errors
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || `Failed to load dashboard data: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to load summary:', error)
      setError(error.message || 'Network error occurred. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-96 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h2 className="text-lg font-medium text-gray-900">
                Failed to load dashboard
              </h2>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {error}
            </p>
          </div>
          <button
            onClick={loadSummary}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const { financials, depreciation, tax_estimation } = summary || {}

  return (
    <div className="space-y-6">
      {/* Header with Year Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-gray-600 mt-1">Your business overview for {taxYear}</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(parseInt(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
            <option value={new Date().getFullYear() - 2}>{new Date().getFullYear() - 2}</option>
          </select>
          <Link
            to="/transactions"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Transaction
          </Link>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-full">
              <ArrowUpIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(financials?.total_income)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-full">
              <ArrowDownIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Expenses</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(financials?.total_expenses)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-full">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(financials?.net_income)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-full">
              <ChartBarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Depreciation</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(depreciation?.total_deduction)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Summary */}
      {tax_estimation && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Projection</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(tax_estimation.total_tax)}
              </p>
              <p className="text-sm text-gray-600">Est. Total Tax</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(tax_estimation.estimated_tax_savings)}
              </p>
              <p className="text-sm text-gray-600">Tax Savings from Depreciation</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-blue-600">
                {(tax_estimation.effective_tax_rate * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Effective Tax Rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/transactions"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <PlusIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Record Transaction</h3>
              <p className="text-sm text-gray-600">Add income or expense</p>
            </div>
          </div>
        </Link>

        <Link
          to="/assets"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <ChartBarIcon className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Manage Assets</h3>
              <p className="text-sm text-gray-600">Track equipment and depreciation</p>
            </div>
          </div>
        </Link>

        <Link
          to="/reports"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <ChartBarIcon className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">View Reports</h3>
              <p className="text-sm text-gray-600">Detailed financial analysis</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
            <Link
              to="/transactions"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              View All →
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {summary?.recent_transactions?.slice(0, 5).map((transaction) => (
            <div key={transaction.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {transaction.description || transaction.category}
                </p>
                <p className="text-sm text-gray-600">
                  {transaction.type} • {new Date(transaction.date).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                transaction.type === 'INCOME'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {transaction.type === 'INCOME' ? '+' : '-'}
                {formatCurrency(transaction.amount / 100)}
              </span>
            </div>
          )) || (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">No transactions yet</p>
              <Link
                to="/transactions"
                className="mt-2 inline-flex items-center text-blue-600 hover:text-blue-500"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add your first transaction
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}