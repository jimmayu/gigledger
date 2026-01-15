import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api'

export default function AssetModal({ asset, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    purchase_date: '',
    cost_basis: '',
    depreciation_method: 'ST_5YEAR',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || '',
        purchase_date: asset.purchase_date ? new Date(asset.purchase_date).toISOString().split('T')[0] : '',
        cost_basis: asset.cost_basis?.toString() || '',
        depreciation_method: asset.depreciation_method || 'ST_5YEAR',
        notes: asset.notes || ''
      })
    } else {
      // Reset for new asset
      setFormData({
        name: '',
        purchase_date: new Date().toISOString().split('T')[0],
        cost_basis: '',
        depreciation_method: 'ST_5YEAR',
        notes: ''
      })
    }
  }, [asset])

  const depreciationMethods = [
    { value: 'ST_3YEAR', label: '3-Year MACRS (musical instruments)' },
    { value: 'ST_5YEAR', label: '5-Year MACRS (sound equipment, computers)' },
    { value: 'ST_7YEAR', label: '7-Year MACRS (other equipment)' },
    { value: 'BONUS_100', label: '100% Bonus Depreciation (max tax savings)' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = {
        ...formData,
        cost_basis: parseFloat(formData.cost_basis)
      }

      const method = asset ? 'PUT' : 'POST'
      const url = asset ? `${API_BASE}/assets/${asset.id}` : `${API_BASE}/assets`

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (response.ok) {
        onSave()
      } else {
        setError(result.error || 'Failed to save asset')
      }
    } catch (error) {
      setError('Connection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {asset ? 'Edit Equipment' : 'Add New Equipment'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Equipment Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., Fender Bass Guitar, Roland Keyboard..."
                  disabled={loading}
                />
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Purchase Date *</label>
                <input
                  type="date"
                  required
                  value={formData.purchase_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>

              {/* Cost Basis */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Cost Basis *</label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.cost_basis}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost_basis: e.target.value }))}
                    className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="0.00"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Depreciation Method */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Depreciation Method *</label>
                <select
                  required
                  value={formData.depreciation_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, depreciation_method: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={loading}
                >
                  {depreciationMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  {formData.depreciation_method === 'BONUS_100' &&
                    '100% Bonus: Deduct the entire cost in the first year for maximum tax savings'}
                  {formData.depreciation_method === 'ST_3YEAR' &&
                    '3-Year MACRS: For musical instruments used professionally'}
                  {formData.depreciation_method === 'ST_5YEAR' &&
                    '5-Year MACRS: For sound equipment, computers, and recording gear'}
                  {formData.depreciation_method === 'ST_7YEAR' &&
                    '7-Year MACRS: For furniture, fixtures, and other business equipment'}
                </p>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Model number, serial number, warranty info..."
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* IRS Compliance Note */}
            {!asset && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>IRS Compliance Note:</strong> Keep all purchase receipts and documentation.
                      This software calculates depreciation according to MACRS rules but is not a substitute for professional tax advice.
                    </p>
                  </div>
                </div>
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
                {loading ? 'Saving...' : (asset ? 'Update Equipment' : 'Add Equipment')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}