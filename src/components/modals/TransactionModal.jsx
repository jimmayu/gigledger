import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api'

export default function TransactionModal({ transaction, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    date: '',
    type: 'INCOME',
    category: '',
    amount: '',
    description: '',
    payment_method: '',
    venue: '',
    vendor: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (transaction) {
      setFormData({
        date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : '',
        type: transaction.type || 'INCOME',
        category: transaction.category || '',
        amount: transaction.amount?.toString() || '',
        description: transaction.description || '',
        payment_method: transaction.payment_method || '',
        venue: transaction.venue || '',
        vendor: transaction.vendor || ''
      })
    } else {
      // Reset for new transaction
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'INCOME',
        category: '',
        amount: '',
        description: '',
        payment_method: '',
        venue: '',
        vendor: ''
      })
    }
  }, [transaction])

  const incomeCategories = [
    'Gig Income',
    'Recording',
    'Lesson Fees',
    'Equipment Sale',
    'Merchandise',
    'Miscellaneous Income'
  ]

  const expenseCategories = [
    'Equipment',
    'Software',
    'Travel',
    'Marketing',
    'Insurance',
    'Professional Services',
    'Office Supplies',
    'Education',
    'Miscellaneous Expense'
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount)
      }

      const method = transaction ? 'PUT' : 'POST'
      const url = transaction ? `${API_BASE}/transactions/${transaction.id}` : `${API_BASE}/transactions`

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (response.ok) {
        onSave()
      } else {
        setError(result.error || 'Failed to save transaction')
      }
    } catch (error) {
      setError('Connection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTypeChange = (newType) => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      category: '', // Reset category when type changes
      venue: newType === 'INCOME' ? prev.venue : '',
      vendor: newType === 'EXPENSE' ? prev.vendor : ''
    }))
  }

  const categories = formData.type === 'INCOME' ? incomeCategories : expenseCategories

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {transaction ? 'Edit Transaction' : 'Add New Transaction'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selector */}
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="INCOME"
                  checked={formData.type === 'INCOME'}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="form-radio h-4 w-4 text-green-600"
                />
                <span className="ml-2 text-green-700 font-medium">Income</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="EXPENSE"
                  checked={formData.type === 'EXPENSE'}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="form-radio h-4 w-4 text-red-600"
                />
                <span className="ml-2 text-red-700 font-medium">Expense</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="">Select a category...</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount ({formData.type === 'INCOME' ? 'Received' : 'Spent'}) *
                </label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="0.00"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="">Select method...</option>
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Venmo">Venmo</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Venue (for income) */}
              {formData.type === 'INCOME' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Venue/Location</label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Club name, venue, or location..."
                    disabled={loading}
                  />
                </div>
              )}

              {/* Vendor (for expenses) */}
              {formData.type === 'EXPENSE' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Vendor/Payee</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Company or person paid..."
                    disabled={loading}
                  />
                </div>
              )}

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Additional details..."
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (transaction ? 'Update Transaction' : 'Add Transaction')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}